// Comportamento real da fila de persistência (módulo carregado como no navegador, backend simulado).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createWindow, load } = require('./helpers/browser');
const plain = x => JSON.parse(JSON.stringify(x));

const U = 'user-1';
const FAST = { iterations: 1000 };

function makeEnv({ files = new Map(), vault = false, backend: overrides = {} } = {}) {
  const calls = { upsert: [], del: [], settings: [] };
  const state = { offline: false, failWith: null };
  const backend = {
    syncUserRows: async (table, u, rows) => {
      if (state.offline) throw new TypeError('Failed to fetch');
      if (state.failWith) throw state.failWith(table, rows);
      calls.upsert.push({ table, row: rows[0] });
    },
    deleteCloudRow: async (table, u, id) => {
      if (state.offline) throw new TypeError('Failed to fetch');
      calls.del.push({ table, id });
    },
    syncSettings: async (u, s) => {
      if (state.offline) throw new TypeError('Failed to fetch');
      calls.settings.push(s);
    },
    loadSynapseData: async () => ({
      clients: [],
      reminders: [],
      checkins: [],
      entries: [],
      pinned: null,
      templates: [],
      theme: null,
      hasCloudData: false
    }),
    ...overrides
  };
  const warnings = [];
  const events = [];
  const win = createWindow({
    SynapseBackend: backend,
    SynapseLogger: { warn: (...a) => warnings.push(a), error: (...a) => warnings.push(a) },
    dispatchEvent: e => (events.push(e), true)
  });
  const persistent = {
    getItem: k => (files.has(k) ? files.get(k) : null),
    setItem: (k, v) => void files.set(k, String(v)),
    removeItem: k => void files.delete(k)
  };
  win.SynapseStorage = {
    persistentStorage: persistent,
    storage: {
      get: async k => (files.has(k) ? { key: k, value: files.get(k) } : null),
      set: async (k, v) => (files.set(k, v), { key: k, value: v })
    }
  };
  load(win, 'src/vault.js');
  load(win, 'services/persistence.js');
  return {
    win,
    P: win.SynapsePersistence,
    V: win.SynapseVault,
    calls,
    state,
    files,
    warnings,
    events,
    backend
  };
}

const client = (id, name = 'Ana') => ({
  id,
  name,
  contact: '11 91234-5678',
  stage: 'novo',
  temp: 'morno',
  lastContact: '2026-09-20',
  createdAt: '2026-09-01',
  notes: '',
  lostReason: '',
  lostTags: [],
  closedAt: null
});

test('envia para a nuvem em ordem e esvazia a fila', async () => {
  const { P, calls } = makeEnv();
  await P.queueUpsert(U, 'clients', client('c1'));
  await P.flush(U);
  assert.equal(calls.upsert.length, 1);
  assert.equal((await P.getPending(U)).length, 0);
});

test('cada gravação carrega client_updated_at (ISO) do momento da edição', async () => {
  const { P, calls } = makeEnv();
  const before = Date.now();
  await P.queueUpsert(U, 'clients', client('c1'));
  await P.flush(U);
  const at = calls.upsert[0].row.client_updated_at;
  assert.ok(Date.parse(at) >= before - 1000 && Date.parse(at) <= Date.now() + 1000);
  assert.match(at, /^\d{4}-\d{2}-\d{2}T/);
});

test('edições rápidas do mesmo registro são consolidadas (vale a última)', async () => {
  const { P, state } = makeEnv();
  state.offline = true;
  await P.queueUpsert(U, 'clients', client('c1', 'A'));
  await P.queueUpsert(U, 'clients', client('c1', 'AB'));
  await P.queueUpsert(U, 'clients', client('c1', 'ABC'));
  const q = await P.getPending(U);
  assert.equal(q.length, 1);
  assert.equal(q[0].row.name, 'ABC');
});

test('excluir substitui um upsert pendente do mesmo registro', async () => {
  const { P, state } = makeEnv();
  state.offline = true;
  await P.queueUpsert(U, 'clients', client('c1'));
  await P.queueDelete(U, 'clients', 'c1');
  const q = await P.getPending(U);
  assert.deepEqual(plain(q.map(o => o.type)), ['delete']);
});

test('sem rede: a fila é mantida e enviada quando a conexão volta', async () => {
  const { P, state, calls } = makeEnv();
  state.offline = true;
  await P.queueUpsert(U, 'clients', client('c1'));
  await P.flush(U);
  assert.equal((await P.getPending(U)).length, 1);
  state.offline = false;
  await P.flush(U);
  assert.equal((await P.getPending(U)).length, 0);
  assert.equal(calls.upsert.length, 1);
});

test('a fila sobrevive a recarregar a página', async () => {
  const files = new Map();
  const a = makeEnv({ files });
  a.state.offline = true;
  await a.P.queueUpsert(U, 'clients', client('c1'));
  const b = makeEnv({ files });
  assert.equal((await b.P.getPending(U)).length, 1);
  await b.P.flush(U);
  assert.equal(b.calls.upsert.length, 1);
});

test('erro permanente (restrição violada) vai para os rejeitados e não trava as demais gravações', async () => {
  const sent = [];
  const env = makeEnv({
    backend: {
      syncUserRows: async (table, u, rows) => {
        if (rows[0].id === 'bad')
          throw Object.assign(new Error('check violation'), { code: '23514' });
        sent.push(rows[0].id);
      }
    }
  });
  env.state.offline = true; // segura o envio até as duas edições estarem na fila
  await env.P.queueUpsert(U, 'clients', client('bad'));
  await env.P.queueUpsert(U, 'clients', client('good'));
  env.state.offline = false;
  await env.P.flush(U);
  assert.equal((await env.P.getPending(U)).length, 0);
  const rejected = await env.P.getRejected(U);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].id, 'bad');
  assert.equal(rejected[0].code, '23514');
  assert.deepEqual(plain(sent), ['good']);
  assert.ok(env.events.some(e => e.type === 'synapse:sync-rejected'));
});

test('banco desatualizado (coluna inexistente) NÃO descarta dados: a fila espera a migração', async () => {
  const { P } = makeEnv({
    backend: {
      syncUserRows: async () => {
        throw Object.assign(new Error('column "client_updated_at" does not exist'), {
          code: '42703'
        });
      }
    }
  });
  await P.queueUpsert(U, 'clients', client('c1'));
  await P.flush(U);
  assert.equal((await P.getPending(U)).length, 1);
  assert.equal((await P.getRejected(U)).length, 0);
});

test('edições concorrentes não se perdem (fila serializada)', async () => {
  const { P, state } = makeEnv();
  state.offline = true;
  await Promise.all(
    Array.from({ length: 25 }, (_, i) => P.queueUpsert(U, 'clients', client('c' + i)))
  );
  assert.equal((await P.getPending(U)).length, 25);
});

test('pendências sobrepõem dados antigos da nuvem na tela', async () => {
  const { P, state } = makeEnv();
  state.offline = true;
  await P.queueUpsert(U, 'clients', client('c1', 'Novo nome'));
  await P.queueDelete(U, 'clients', 'c2');
  const cloud = {
    clients: [client('c1', 'Nome velho'), client('c2', 'Vai sumir')],
    reminders: [],
    checkins: [],
    entries: [],
    pinned: null,
    templates: [],
    theme: null,
    hasCloudData: true
  };
  const r = await P.applyPending(cloud, await P.getPending(U));
  assert.deepEqual(plain(r.clients.map(c => [c.id, c.name])), [['c1', 'Novo nome']]);
});

test('configurações pendentes substituem as antigas', async () => {
  const { P, state } = makeEnv();
  state.offline = true;
  await P.queueSettings(U, {
    entries: [{ id: 'e1' }],
    pinned: { text: 'Firme' },
    templates: [{ id: 't' }],
    theme: 'light'
  });
  const r = await P.applyPending(
    {
      clients: [],
      reminders: [],
      checkins: [],
      entries: [],
      pinned: null,
      templates: [],
      theme: 'dark'
    },
    await P.getPending(U)
  );
  assert.equal(r.theme, 'light');
  assert.equal(r.pinned.text, 'Firme');
  assert.equal(r.entries.length, 1);
});

/* ------------------------- cofre ------------------------- */
const checkin = {
  id: 'k1',
  date: '2026-09-21',
  mood: 2,
  identity: 'Eu não sou a ansiedade',
  note: 'Mês fraco',
  reframe: 'Foco no próximo passo',
  mentalStages: { pensar: 'medo do mês' }
};

async function vaultEnv(files) {
  const env = makeEnv({ files });
  env.V.configure(U, null);
  await env.V.create('senha-do-cofre-123', FAST);
  return env;
}

test('cofre ativo: check-in vai cifrado para a fila e para a nuvem; mood segue em claro', async () => {
  const { P, state, calls, files } = await vaultEnv();
  await P.queueUpsert(U, 'checkins', checkin);
  const raw = [...files.values()].join('\n');
  assert.ok(
    !raw.includes('ansiedade') && !raw.includes('Mês fraco') && !raw.includes('medo do mês')
  );
  await P.flush(U);
  const row = calls.upsert[0].row;
  assert.equal(row.identity, '');
  assert.equal(row.note, '');
  assert.deepEqual(plain(row.mental_stages), {});
  assert.match(row.enc, /^v1\./);
  assert.equal(row.mood, 2);
  void state;
});

test('cofre ativo: diário e frase fixada vão cifrados; modelos e tema não', async () => {
  const { P, calls, files } = await vaultEnv();
  await P.queueSettings(U, {
    entries: [{ id: 'e1', text: 'texto íntimo do diário' }],
    pinned: { text: 'minha frase' },
    templates: [{ id: 't', text: 'Oi {nome}' }],
    theme: 'dark'
  });
  const s = (await P.getPending(U))[0].settings;
  assert.deepEqual(plain(s.entries), []);
  assert.equal(s.pinned, null);
  assert.match(s.privateEnc, /^v1\./);
  assert.ok(![...files.values()].join('\n').includes('texto íntimo'));
  await P.flush(U);
  assert.equal(calls.settings[0].templates[0].text, 'Oi {nome}');
});

test('cofre ativo: após recarregar, pendências cifradas são decifradas para a tela', async () => {
  const files = new Map();
  const a = await vaultEnv(files);
  a.state.offline = true;
  await a.P.queueUpsert(U, 'checkins', checkin);
  const meta = a.V.getMeta();

  const b = makeEnv({ files });
  b.V.configure(U, meta);
  assert.equal(await b.V.unlock('senha-do-cofre-123'), true);
  const r = await b.P.applyPending(
    {
      clients: [],
      reminders: [],
      checkins: [],
      entries: [],
      pinned: null,
      templates: [],
      theme: null
    },
    await b.P.getPending(U)
  );
  assert.equal(r.checkins[0].identity, 'Eu não sou a ansiedade');
  assert.deepEqual(plain(r.checkins[0].mentalStages), { pensar: 'medo do mês' });
});

test('hydrate: decifra check-ins e diário vindos da nuvem; chave errada marca como bloqueado', async () => {
  const a = await vaultEnv();
  const enc = await a.V.encryptJSON({
    identity: 'X',
    note: 'Y',
    reframe: 'Z',
    mentalStages: { a: 1 }
  });
  const privateEnc = await a.V.encryptJSON({ entries: [{ id: 'e' }], pinned: { text: 'p' } });
  const cloud = {
    clients: [],
    reminders: [],
    checkins: [
      {
        id: 'k',
        date: '2026-09-21',
        mood: 3,
        identity: '',
        note: '',
        reframe: '',
        mentalStages: {},
        enc
      }
    ],
    entries: [],
    pinned: null,
    privateEnc,
    templates: [],
    theme: null
  };
  const ok = await a.P.hydrate(cloud);
  assert.equal(ok.checkins[0].identity, 'X');
  assert.equal(ok.checkins[0].enc, undefined);
  assert.equal(ok.entries.length, 1);
  assert.equal(ok.privateEnc, undefined);

  const other = await vaultEnv();
  const bad = await other.P.hydrate(cloud);
  assert.equal(bad.checkins[0].locked, true);
  assert.equal(bad.checkins[0].identity, '');
});

test('cofre ativo: cache local não contém texto em claro e volta íntegro ao destrancar', async () => {
  const { P, V, files } = await vaultEnv();
  await P.writeCache(U, {
    clients: [client('c1')],
    reminders: [],
    checkins: [checkin],
    entries: [{ id: 'e', text: 'segredo do diário' }],
    pinned: { text: 'frase' },
    templates: [],
    theme: 'dark'
  });
  const raw = files.get('synapse-persistence-cache-' + U);
  assert.ok(!raw.includes('ansiedade') && !raw.includes('segredo do diário'));
  assert.ok(raw.includes('Ana')); // dados comerciais seguem legíveis
  const back = await P.readCache(U);
  assert.equal(back.checkins[0].identity, 'Eu não sou a ansiedade');
  assert.equal(back.entries[0].text, 'segredo do diário');
  V.lock();
  const locked = await P.readCache(U);
  assert.deepEqual(plain(locked.checkins), []);
  assert.deepEqual(plain(locked.entries), []);
});

test('cofre ativo mas trancado: recusa gravar (nunca cai para texto aberto)', async () => {
  const { P, V, files } = await vaultEnv();
  V.lock();
  await assert.rejects(() => P.queueUpsert(U, 'checkins', checkin), /VAULT_LOCKED/);
  assert.ok(![...files.values()].join('').includes('ansiedade'));
  assert.equal((await P.getPending(U)).length, 0);
});

test('sem cofre: check-in continua em claro (comportamento anterior) e cache é o objeto inteiro', async () => {
  const { P, calls } = makeEnv();
  await P.queueUpsert(U, 'checkins', checkin);
  await P.flush(U);
  assert.equal(calls.upsert[0].row.identity, 'Eu não sou a ansiedade');
  assert.equal(calls.upsert[0].row.enc, null);
});

test('purgeLocal remove fila, cache e rejeitados do usuário', async () => {
  const { P, win, state } = makeEnv();
  state.offline = true;
  await P.queueUpsert(U, 'clients', client('c1'));
  await P.writeCache(U, {
    clients: [],
    reminders: [],
    checkins: [],
    entries: [],
    pinned: null,
    templates: [],
    theme: 'dark'
  });
  P.purgeLocal(U);
  assert.equal((await P.getPending(U)).length, 0);
  assert.equal(await P.readCache(U), null);
  void win;
});
