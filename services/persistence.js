/*
 * Persistência offline-first do Synapse.
 *
 * - Toda alteração entra numa fila local (sobrevive a recarregar a página) e é enviada à nuvem
 *   em ordem. Alterações repetidas no mesmo registro são consolidadas; excluir substitui um
 *   upsert pendente do mesmo registro.
 * - Cada gravação carrega `client_updated_at` (momento real da edição). O banco mantém a
 *   edição mais recente de cada registro; gravações mais antigas são ignoradas e o app
 *   recarrega a versão da nuvem (ver syncNow em workspace.js).
 * - Erros permanentes (restrição violada, permissão) vão para a "caixa de rejeitados" em vez de
 *   travar a fila; erros temporários (rede) mantêm a fila e tentam de novo com espera crescente.
 * - Com o cofre ativo (SynapseVault), check-ins e diário são cifrados ANTES de entrar na fila,
 *   no cache local e na nuvem.
 */
(function () {
  const storage = window.SynapseStorage?.storage;
  const backend = window.SynapseBackend || {};
  const memory = new Map();
  const flushers = new Map();
  const locks = new Map();
  const retryTimers = new Map();
  const retryAttempts = new Map();
  const RETRY_DELAYS_MS = [5000, 15000, 60000, 300000];
  const MAX_DEAD_LETTERS = 50;

  // Versão "em claro" dos registros pendentes desta sessão (para exibir sem decifrar de novo).
  const plainPending = new Map();
  let changeCounter = 0;

  const vault = () => window.SynapseVault;
  const queueKey = u => 'synapse-persistence-queue-' + String(u);
  const cacheKey = u => 'synapse-persistence-cache-' + String(u);
  const deadKey = u => 'synapse-persistence-dead-' + String(u);
  const opId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);

  /* ---------- armazenamento bruto ---------- */
  async function readJSON(k, fallback) {
    if (memory.has(k)) {
      try {
        const v = JSON.parse(memory.get(k));
        if (v != null) return v;
      } catch (_) {}
    }
    const raw = await storage?.get(k).catch(() => null);
    if (raw?.value) {
      try {
        const v = JSON.parse(raw.value);
        memory.set(k, raw.value);
        return v;
      } catch (_) {}
    }
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  async function writeJSON(k, value) {
    const s = JSON.stringify(value);
    memory.set(k, s);
    if (storage) await storage.set(k, s);
    else
      try {
        localStorage.setItem(k, s);
      } catch (_) {}
  }
  function removeKey(k) {
    memory.delete(k);
    try {
      window.SynapseStorage?.persistentStorage?.removeItem(k);
    } catch (_) {}
  }

  /** Serializa as operações sobre a fila de cada usuário (evita perder edições concorrentes). */
  function withLock(u, fn) {
    const prev = locks.get(u) || Promise.resolve();
    const next = prev.then(fn, fn);
    locks.set(
      u,
      next.catch(() => {})
    );
    return next;
  }

  async function readQueue(u) {
    const q = await readJSON(queueKey(u), []);
    return Array.isArray(q) ? q : [];
  }

  /* ---------- conversão domínio <-> linha do banco ---------- */
  async function dbRow(table, r, u, at) {
    if (table === 'clients')
      return {
        id: String(r.id),
        user_id: u,
        name: r.name || '',
        contact: r.contact || '',
        stage: r.stage || 'novo',
        temp: r.temp || 'morno',
        last_contact: r.lastContact || null,
        created_at_date: r.createdAt || null,
        notes: r.notes || '',
        lost_reason: r.lostReason || '',
        lost_tags: Array.isArray(r.lostTags) ? r.lostTags : [],
        closed_at: r.closedAt || null,
        client_updated_at: at
      };
    if (table === 'reminders')
      return {
        id: String(r.id),
        user_id: u,
        text: r.text || '',
        due: r.due || null,
        client_id: r.clientId || null,
        done: !!r.done,
        client_updated_at: at
      };
    if (table === 'checkins') {
      const base = {
        id: String(r.id),
        user_id: u,
        date: r.date,
        mood: r.mood,
        client_updated_at: at
      };
      if (vault()?.isEnabled()) {
        const enc = await vault().encryptJSON({
          identity: r.identity || '',
          note: r.note || '',
          reframe: r.reframe || '',
          mentalStages: r.mentalStages || {}
        });
        return { ...base, identity: '', note: '', reframe: '', mental_stages: {}, enc };
      }
      return {
        ...base,
        identity: r.identity || '',
        note: r.note || '',
        reframe: r.reframe || '',
        mental_stages: r.mentalStages || {},
        enc: null
      };
    }
    throw Error('Tabela de persistência não suportada: ' + table);
  }

  async function domainRow(table, r) {
    if (table === 'clients')
      return {
        id: String(r.id),
        name: r.name || '',
        contact: r.contact || '',
        stage: r.stage || 'novo',
        temp: r.temp || 'morno',
        lastContact: r.last_contact || '',
        createdAt: r.created_at_date || '',
        notes: r.notes || '',
        lostReason: r.lost_reason || '',
        lostTags: Array.isArray(r.lost_tags) ? r.lost_tags : [],
        closedAt: r.closed_at || null
      };
    if (table === 'reminders')
      return {
        id: String(r.id),
        text: r.text || '',
        due: r.due || '',
        clientId: r.client_id || null,
        done: !!r.done
      };
    if (table === 'checkins') {
      const base = { id: String(r.id), date: r.date, mood: r.mood };
      if (r.enc) return { ...base, ...(await decryptCheckin(r.enc)) };
      return {
        ...base,
        identity: r.identity || '',
        note: r.note || '',
        reframe: r.reframe || '',
        mentalStages: r.mental_stages || {}
      };
    }
    return r;
  }

  async function decryptCheckin(enc) {
    try {
      const d = await vault().decryptJSON(enc);
      return {
        identity: d.identity || '',
        note: d.note || '',
        reframe: d.reframe || '',
        mentalStages: d.mentalStages || {}
      };
    } catch (e) {
      window.SynapseLogger?.warn('Não foi possível decifrar um check-in.', e);
      return { identity: '', note: '', reframe: '', mentalStages: {}, locked: true };
    }
  }

  async function settingsPayload(s) {
    const base = {
      templates: s.templates || [],
      theme: s.theme || 'dark',
      clientUpdatedAt: new Date().toISOString()
    };
    if (vault()?.isEnabled()) {
      const privateEnc = await vault().encryptJSON({
        entries: s.entries || [],
        pinned: s.pinned || null
      });
      return { ...base, entries: [], pinned: null, privateEnc };
    }
    return { ...base, entries: s.entries || [], pinned: s.pinned || null, privateEnc: null };
  }

  async function readSettingsPayload(s) {
    if (!s?.privateEnc) return { entries: s?.entries || [], pinned: s?.pinned || null };
    try {
      const d = await vault().decryptJSON(s.privateEnc);
      return { entries: d.entries || [], pinned: d.pinned || null };
    } catch (e) {
      window.SynapseLogger?.warn('Não foi possível decifrar o diário.', e);
      return { entries: [], pinned: null, privateLocked: true };
    }
  }

  /* ---------- fila ---------- */
  function enqueue(u, op) {
    changeCounter += 1;
    return withLock(u, async () => {
      const q = await readQueue(u);
      const id = String(op.id || '');
      const next = q.filter(
        x => !(x.userId === u && x.table === op.table && String(x.id || '') === id)
      );
      next.push({ ...op, userId: u, opId: opId() });
      await writeJSON(queueKey(u), next);
    }).then(() => {
      flush(u).catch(() => {});
    });
  }

  async function queueUpsert(u, table, record) {
    const at = new Date().toISOString();
    const row = await dbRow(table, record, u, at);
    plainPending.set(`${u}:${table}:${record.id}`, { ...record });
    await enqueue(u, { type: 'upsert', table, id: String(record.id), row });
  }
  async function queueDelete(u, table, id) {
    plainPending.delete(`${u}:${table}:${id}`);
    await enqueue(u, { type: 'delete', table, id: String(id) });
  }
  async function queueRows(u, table, rows) {
    for (const r of rows || []) await queueUpsert(u, table, r);
  }
  async function queueSettings(u, s) {
    const settings = await settingsPayload(s);
    plainPending.set(`${u}:settings`, {
      entries: s.entries || [],
      pinned: s.pinned || null,
      templates: s.templates || [],
      theme: s.theme || null
    });
    await enqueue(u, { type: 'settings', table: 'app_settings', id: String(u), settings });
  }

  async function replaceAll(u, data) {
    const cloud = await backend.loadSynapseData(u).catch(() => null);
    const cached = await readCache(u);
    const source = cloud || cached;
    for (const t of ['clients', 'reminders', 'checkins']) {
      const ids = new Set((data[t] || []).map(r => String(r.id)));
      for (const r of source?.[t] || []) if (!ids.has(String(r.id))) await queueDelete(u, t, r.id);
      await queueRows(u, t, data[t] || []);
    }
    await queueSettings(u, data);
  }

  /* ---------- envio ---------- */
  function isPermanent(e) {
    const code = String(e?.code || '');
    // 22xxx dado inválido, 23xxx restrição violada, 42501 permissão/RLS.
    // (Coluna inexistente = banco desatualizado: NÃO é permanente, a fila espera a migração.)
    return /^(22|23)/.test(code) || code === '42501';
  }

  async function removeOp(u, id) {
    await withLock(u, async () => {
      const q = await readQueue(u);
      await writeJSON(
        queueKey(u),
        q.filter(x => x.opId !== id)
      );
    });
  }

  async function rejectOp(u, op, e) {
    await withLock(u, async () => {
      const dead = await readJSON(deadKey(u), []);
      dead.push({
        at: new Date().toISOString(),
        type: op.type,
        table: op.table,
        id: op.id,
        code: String(e?.code || ''),
        message: String(e?.message || e).slice(0, 300)
      });
      await writeJSON(deadKey(u), dead.slice(-MAX_DEAD_LETTERS));
    });
    await removeOp(u, op.opId);
    window.SynapseLogger?.warn(
      'Uma alteração foi recusada pelo servidor e não será reenviada.',
      e,
      {
        table: op.table
      }
    );
    try {
      window.dispatchEvent(
        new window.CustomEvent('synapse:sync-rejected', { detail: { table: op.table, id: op.id } })
      );
    } catch (_) {}
  }

  function scheduleRetry(u) {
    if (retryTimers.has(u)) return;
    const attempt = retryAttempts.get(u) || 0;
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    retryAttempts.set(u, attempt + 1);
    const t = setTimeout(() => {
      retryTimers.delete(u);
      flush(u).catch(() => {});
    }, delay);
    t.unref?.();
    retryTimers.set(u, t);
  }

  function flush(u) {
    if (flushers.has(u)) return flushers.get(u);
    const p = (async () => {
      while (true) {
        const q = await readQueue(u);
        if (!q.length) {
          retryAttempts.delete(u);
          return;
        }
        const op = q[0];
        try {
          if (op.type === 'upsert') await backend.syncUserRows(op.table, u, [op.row]);
          else if (op.type === 'delete') await backend.deleteCloudRow(op.table, u, op.id);
          else if (op.type === 'settings') await backend.syncSettings(u, op.settings);
          else throw Error('Operação de persistência desconhecida.');
          await removeOp(u, op.opId);
        } catch (e) {
          if (isPermanent(e)) {
            await rejectOp(u, op, e);
            continue;
          }
          window.SynapseLogger?.warn('Falha ao sincronizar fila de persistência.', e, {
            type: op.type,
            table: op.table
          });
          scheduleRetry(u);
          return;
        }
      }
    })().finally(() => flushers.delete(u));
    flushers.set(u, p);
    return p;
  }

  /* ---------- leitura (nuvem + pendências) ---------- */
  /** Decifra os campos protegidos de um resultado de loadSynapseData. */
  async function hydrate(cloud) {
    if (!cloud) return cloud;
    const checkins = [];
    for (const c of cloud.checkins || []) {
      const { enc, ...rest } = c;
      checkins.push(enc ? { ...rest, ...(await decryptCheckin(enc)), _enc: true } : rest);
    }
    const priv = await readSettingsPayload({
      entries: cloud.entries,
      pinned: cloud.pinned,
      privateEnc: cloud.privateEnc
    });
    const { privateEnc, ...rest } = cloud;
    return {
      ...rest,
      checkins,
      entries: priv.entries,
      pinned: priv.pinned,
      privateEncrypted: !!cloud.privateEnc
    };
  }

  async function load(u) {
    return hydrate(await backend.loadSynapseData(u));
  }

  /** Sobrepõe as alterações ainda não sincronizadas aos dados vindos da nuvem/cache. */
  async function applyPending(data, q) {
    const r = {
      clients: [...(data?.clients || [])],
      reminders: [...(data?.reminders || [])],
      checkins: [...(data?.checkins || [])],
      entries: data?.entries || [],
      pinned: data?.pinned || null,
      templates: [...(data?.templates || [])],
      theme: data?.theme || null,
      privateEncrypted: !!data?.privateEncrypted,
      hasCloudData: !!data?.hasCloudData
    };
    for (const op of q || []) {
      if (op.type === 'settings') {
        const plain = plainPending.get(`${op.userId}:settings`);
        const s = plain || {
          ...(await readSettingsPayload(op.settings)),
          templates: op.settings.templates,
          theme: op.settings.theme
        };
        r.entries = s.entries || [];
        r.pinned = s.pinned || null;
        r.templates = s.templates || [];
        r.theme = s.theme || null;
        r.privateEncrypted = !!op.settings.privateEnc;
        continue;
      }
      if (!r[op.table]) continue;
      const id = String(op.id);
      r[op.table] = r[op.table].filter(x => String(x.id) !== id);
      if (op.type === 'upsert') {
        const plain = plainPending.get(`${op.userId}:${op.table}:${id}`);
        r[op.table].push(
          plain
            ? { ...plain, id, _enc: !!op.row.enc || undefined }
            : await domainRow(op.table, op.row)
        );
      }
    }
    r.hasCloudData =
      r.hasCloudData ||
      r.clients.length > 0 ||
      r.reminders.length > 0 ||
      r.checkins.length > 0 ||
      r.entries.length > 0 ||
      r.templates.length > 0 ||
      !!r.pinned;
    return r;
  }

  /* ---------- cache local ---------- */
  async function writeCache(u, d) {
    if (vault()?.isEnabled()) {
      if (!vault().isUnlocked()) return; // sem chave não há como proteger o cache: não grava
      const secure = await vault().encryptJSON({
        checkins: d.checkins || [],
        entries: d.entries || [],
        pinned: d.pinned || null
      });
      await writeJSON(cacheKey(u), {
        clients: d.clients,
        reminders: d.reminders,
        templates: d.templates,
        theme: d.theme,
        checkins: [],
        entries: [],
        pinned: null,
        secure
      });
      return;
    }
    await writeJSON(cacheKey(u), d);
  }
  async function readCache(u) {
    const c = await readJSON(cacheKey(u), null);
    if (!c) return null;
    if (!c.secure) return c;
    if (!vault()?.isUnlocked()) return { ...c, secure: undefined };
    try {
      const s = await vault().decryptJSON(c.secure);
      return { ...c, ...s, secure: undefined };
    } catch (_) {
      return { ...c, secure: undefined };
    }
  }

  /**
   * Descarta da fila e do cache tudo que é dado de bem-estar (check-ins, diário, frase fixada),
   * sem perder edições comerciais pendentes. Usado ao apagar os registros ou redefinir o cofre.
   */
  async function dropWellbeingPending(u) {
    await withLock(u, async () => {
      const q = await readQueue(u);
      const next = q
        .filter(op => op.table !== 'checkins')
        .map(op =>
          op.type === 'settings'
            ? { ...op, settings: { ...op.settings, entries: [], pinned: null, privateEnc: null } }
            : op
        );
      await writeJSON(queueKey(u), next);
    });
    removeKey(cacheKey(u));
    for (const key of [...plainPending.keys()]) {
      if (key.startsWith(`${u}:checkins:`)) plainPending.delete(key);
      else if (key === `${u}:settings`)
        plainPending.set(key, { ...plainPending.get(key), entries: [], pinned: null });
    }
  }

  /** Remove tudo que este dispositivo guarda do usuário (fila, cache, rejeitados). */
  function purgeLocal(u) {
    for (const k of [queueKey(u), cacheKey(u), deadKey(u)]) removeKey(k);
    for (const key of [...plainPending.keys()])
      if (key.startsWith(u + ':')) plainPending.delete(key);
    clearTimeout(retryTimers.get(u));
    retryTimers.delete(u);
  }

  window.SynapsePersistence = {
    getPending: readQueue,
    getRejected: u => readJSON(deadKey(u), []),
    getChangeCounter: () => changeCounter,
    queueUpsert,
    queueDelete,
    queueRows,
    queueSettings,
    replaceAll,
    flush,
    load,
    hydrate,
    applyPending,
    writeCache,
    readCache,
    purgeLocal,
    dropWellbeingPending
  };
})();
