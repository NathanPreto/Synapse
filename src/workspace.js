/* Estado principal do espaço de trabalho (clientes, lembretes, check-ins, sincronização, Syn). */

function SynapseWorkspace({ user, onLogout, account }) {
  if (
    !auth ||
    typeof loadSynapseData !== 'function' ||
    typeof persistence.queueUpsert !== 'function'
  )
    return React.createElement(
      'div',
      { className: 'auth-screen' },
      React.createElement(
        'div',
        { className: 'auth-card auth-card-single' },
        React.createElement(
          'div',
          { className: 'auth-copy' },
          'O Synapse não conseguiu iniciar. Atualize a página e tente novamente.'
        )
      )
    );
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadNonce, setLoadNonce] = useState(0);
  const [tab, setTab] = useState('painel');
  const [checkins, setCheckins] = useState([]);
  const [clients, setClients] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [desidentificationEntries, setDesidentificationEntries] = useState([]);
  const [pinnedPhrase, setPinnedPhrase] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [calmOpen, setCalmOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return persistentStorage?.getItem('mental-vendas-theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  const [excelReview, setExcelReview] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);
  const [operationBusy, setOperationBusy] = useState(false);
  const busyTimerRef = React.useRef(null);
  const [runtimeError, setRuntimeError] = useState('');
  const consent = account?.consent || { terms: true, sensitive: true, ai: true };
  const settingsBaselineRef = React.useRef(null);
  const latestRef = React.useRef(null);
  const syncingRef = React.useRef(false);
  const encryptedCheckRef = React.useRef(false);
  const settingsEncryptedRef = React.useRef(false);
  useEffect(() => {
    const onBusy = event => {
      const isBusy = !!event.detail?.busy;
      if (isBusy) {
        if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
        busyTimerRef.current = setTimeout(() => setOperationBusy(true), 800);
      } else {
        if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
        busyTimerRef.current = null;
        setOperationBusy(false);
      }
    };
    const onError = event => {
      const message = event.detail?.message || 'Erro inesperado em tempo de execução.';
      setRuntimeError(message);
      setTimeout(() => setRuntimeError(''), 6500);
    };
    const onRejected = () => {
      setSyncError(
        'Uma alteração foi recusada pelo servidor e não foi salva. Atualize a página; se continuar, fale com o suporte.'
      );
    };
    window.addEventListener('synapse:busy', onBusy);
    window.addEventListener('synapse:error', onError);
    window.addEventListener('synapse:sync-rejected', onRejected);
    return () => {
      if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
      window.removeEventListener('synapse:busy', onBusy);
      window.removeEventListener('synapse:error', onError);
      window.removeEventListener('synapse:sync-rejected', onRejected);
    };
  }, []);
  useEffect(() => {
    try {
      if (persistentStorage) persistentStorage.setItem('mental-vendas-theme', theme);
    } catch (e) {}
  }, [theme]);
  const toggleTheme = () => setTheme(v => (v === 'dark' ? 'light' : 'dark'));
  useEffect(() => {
    let active = true;
    setLoaded(false);
    setLoadError('');
    settingsBaselineRef.current = null;
    encryptedCheckRef.current = false;
    (async () => {
      try {
        const cloud = await persistence.load(user.id);
        if (!active) return;
        const pending = await persistence.getPending(user.id);
        const resolved = await persistence.applyPending(cloud, pending);
        if (!active) return;
        if (resolved.hasCloudData || pending.length) {
          applyResolved(resolved);
        } else {
          const [c1, c2, c3, c4, c5] = await Promise.all([
            storage.get('mindset-checkins').catch(() => null),
            storage.get('mindset-clients').catch(() => null),
            storage.get('mindset-reminders').catch(() => null),
            storage.get('mental-vendas-desidentificacao').catch(() => null),
            storage.get('mental-vendas-templates').catch(() => null)
          ]);
          const localClients = c2 ? JSON.parse(c2.value) : [],
            localReminders = c3 ? JSON.parse(c3.value) : [],
            localCheckins = c1 ? JSON.parse(c1.value) : [],
            localMental = c4 ? JSON.parse(c4.value) : {},
            localTemplates = c5 ? JSON.parse(c5.value) : [];
          if (
            localClients.length ||
            localReminders.length ||
            localCheckins.length ||
            localTemplates.length ||
            localMental.entries?.length ||
            localMental.pinned
          ) {
            setLocalMigrationData({
              clients: localClients,
              reminders: localReminders,
              checkins: localCheckins,
              entries: localMental.entries || [],
              pinned: localMental.pinned || null,
              templates: localTemplates
            });
            setMigrationRequested(true);
          }
        }
        if (pending.length) persistence.flush(user.id).catch(() => {});
      } catch (e) {
        window.SynapseLogger?.warn('Falha ao carregar Synapse.', e);
        const cached = await persistence.readCache(user.id).catch(() => null),
          pending = await persistence.getPending(user.id).catch(() => []);
        if (active && cached) {
          const resolved = await persistence.applyPending(cached, pending);
          applyResolved(resolved);
          setSyncError(
            'Sem conexão com a nuvem. Suas alterações ficam na fila e serão sincronizadas quando a conexão voltar.'
          );
        } else if (active) {
          setLoadError(
            'Não foi possível carregar seus dados da nuvem. Seus dados não foram alterados. Verifique a conexão e tente novamente.'
          );
          return;
        }
      }
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [user.id, loadNonce]);
  latestRef.current = {
    clients,
    reminders,
    checkins,
    desidentificationEntries,
    pinnedPhrase,
    templates
  };
  useEffect(() => {
    if (loaded)
      persistence
        .writeCache(user.id, {
          clients,
          reminders,
          checkins,
          entries: desidentificationEntries,
          pinned: pinnedPhrase,
          templates,
          theme
        })
        .catch(() => {});
  }, [
    clients,
    reminders,
    checkins,
    desidentificationEntries,
    pinnedPhrase,
    templates,
    theme,
    loaded,
    user.id
  ]);
  // Configurações só vão para a fila quando o USUÁRIO muda algo. Reenviar o estado carregado
  // (por exemplo, um cache antigo) poderia sobrescrever alterações feitas em outro dispositivo.
  useEffect(() => {
    if (!loaded) return;
    const snapshot = settingsSnapshot(desidentificationEntries, pinnedPhrase, templates, theme);
    if (settingsBaselineRef.current === null || snapshot === settingsBaselineRef.current) {
      settingsBaselineRef.current = snapshot;
      return;
    }
    settingsBaselineRef.current = snapshot;
    persistence
      .queueSettings(user.id, {
        entries: desidentificationEntries,
        pinned: pinnedPhrase,
        templates,
        theme
      })
      .catch(e => {
        window.SynapseLogger?.warn('Falha ao enfileirar configurações.', e);
        setSyncError(
          enqueueMessage(e, 'Não foi possível preparar a sincronização das configurações.')
        );
      });
  }, [desidentificationEntries, pinnedPhrase, templates, theme, loaded, user.id]);
  const [migrationRequested, setMigrationRequested] = useState(false);
  const [localMigrationData, setLocalMigrationData] = useState(null);
  const [syncError, setSyncError] = useState('');
  useEffect(() => {
    if (!syncError) return;
    const t = setTimeout(() => setSyncError(''), 5000);
    return () => clearTimeout(t);
  }, [syncError]);
  useEffect(() => {
    const onOnline = () => persistence.flush(user.id).catch(() => {});
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [user.id]);
  const settingsSnapshot = (entries, pinned, tpls, th) =>
    JSON.stringify({ entries, pinned, templates: tpls, theme: th });
  function enqueueMessage(e, fallback) {
    return String(e?.message || '').includes('VAULT_LOCKED')
      ? 'O cofre está bloqueado. Desbloqueie para salvar seus registros de bem-estar.'
      : fallback;
  }
  // Aplica dados resolvidos (nuvem + pendências) ao estado da tela.
  function applyResolved(resolved) {
    settingsBaselineRef.current = settingsSnapshot(
      resolved.entries,
      resolved.pinned,
      resolved.templates,
      resolved.theme || theme
    );
    settingsEncryptedRef.current = !!resolved.privateEncrypted;
    setClients(resolved.clients);
    setReminders(resolved.reminders);
    setCheckins(resolved.checkins);
    setDesidentificationEntries(resolved.entries);
    setPinnedPhrase(resolved.pinned);
    setTemplates(resolved.templates);
    if (resolved.theme) setTheme(resolved.theme);
  }
  // Sincroniza agora: envia a fila, recarrega a nuvem e aplica (a edição mais recente de cada
  // registro vence). Não aplica nada se o usuário editou algo durante a busca.
  async function syncNow() {
    if (!loaded || syncingRef.current) return;
    syncingRef.current = true;
    try {
      await persistence.flush(user.id);
      const before = persistence.getChangeCounter();
      const cloud = await persistence.load(user.id);
      const pending = await persistence.getPending(user.id);
      if (persistence.getChangeCounter() !== before) return;
      const resolved = await persistence.applyPending(cloud, pending);
      if (persistence.getChangeCounter() !== before) return;
      const cur = latestRef.current || {};
      const same =
        JSON.stringify([
          cur.clients,
          cur.reminders,
          cur.checkins,
          cur.desidentificationEntries,
          cur.pinnedPhrase,
          cur.templates
        ]) ===
        JSON.stringify([
          resolved.clients,
          resolved.reminders,
          resolved.checkins,
          resolved.entries,
          resolved.pinned,
          resolved.templates
        ]);
      if (!same) applyResolved(resolved);
    } catch (e) {
      window.SynapseLogger?.warn('Falha ao atualizar dados da nuvem.', e);
    } finally {
      syncingRef.current = false;
    }
  }
  const syncNowRef = React.useRef(syncNow);
  syncNowRef.current = syncNow;
  useEffect(() => {
    if (!loaded) return;
    const run = () => {
      if (document.visibilityState === 'visible') syncNowRef.current();
    };
    const timer = setInterval(run, 90000);
    window.addEventListener('focus', run);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', run);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [loaded, user.id]);
  // Reenvia check-ins e diário (agora cifrados ou em claro, conforme o cofre) para a nuvem.
  async function syncSensitiveData() {
    await persistence.queueRows(
      user.id,
      'checkins',
      checkins.filter(c => !c.locked)
    );
    await persistence.queueSettings(user.id, {
      entries: desidentificationEntries,
      pinned: pinnedPhrase,
      templates,
      theme
    });
    await persistence.flush(user.id);
  }
  // Cofre ativado depois que já havia registros em claro: cifra o que ficou para trás.
  useEffect(() => {
    if (!loaded || encryptedCheckRef.current) return;
    encryptedCheckRef.current = true;
    if (!SynapseVault.isEnabled() || !SynapseVault.isUnlocked()) return;
    const plainCheckins = checkins.some(c => !c._enc && !c.locked);
    const plainSettings =
      !settingsEncryptedRef.current && (desidentificationEntries.length > 0 || !!pinnedPhrase);
    if (plainCheckins || plainSettings)
      syncSensitiveData().catch(e =>
        window.SynapseLogger?.warn('Falha ao proteger registros existentes com o cofre.', e)
      );
  }, [loaded]);
  async function vaultEnable(passphrase, remember) {
    const meta = await SynapseVault.create(passphrase);
    try {
      await account.updateProfile({
        vault_salt: meta.salt,
        vault_verifier: meta.verifier,
        vault_iterations: meta.iterations
      });
    } catch (e) {
      SynapseVault.configure(user.id, null);
      throw new Error(
        'Não foi possível ativar o cofre agora. Verifique a conexão e tente novamente.'
      );
    }
    if (remember) await SynapseVault.rememberOnDevice();
    await syncSensitiveData();
  }
  async function vaultChange(oldPassphrase, newPassphrase, remember) {
    const previous = SynapseVault.getMeta();
    let meta;
    try {
      meta = await SynapseVault.changePassphrase(oldPassphrase, newPassphrase);
    } catch (e) {
      if (String(e?.message).includes('VAULT_WRONG_PASSPHRASE'))
        throw new Error('A senha atual está incorreta.');
      throw e;
    }
    try {
      await account.updateProfile({
        vault_salt: meta.salt,
        vault_verifier: meta.verifier,
        vault_iterations: meta.iterations
      });
    } catch (e) {
      SynapseVault.configure(user.id, previous);
      throw new Error(
        'Não foi possível trocar a senha agora. Verifique a conexão e tente novamente.'
      );
    }
    await SynapseVault.forgetDevice(user.id);
    if (remember) await SynapseVault.rememberOnDevice();
  }
  async function vaultDisable() {
    SynapseVault.suspend();
    try {
      await syncSensitiveData();
      if ((await persistence.getPending(user.id)).length)
        throw new Error(
          'Ainda há alterações aguardando sincronização. Verifique a conexão e tente novamente.'
        );
      await account.updateProfile({
        vault_salt: null,
        vault_verifier: null,
        vault_iterations: null
      });
    } catch (e) {
      SynapseVault.resume();
      throw e;
    }
    SynapseVault.configure(user.id, null);
    await SynapseVault.forgetDevice(user.id);
  }
  async function deleteWellbeingData() {
    await backendDeleteWellbeing(user.id);
    await persistence.dropWellbeingPending(user.id);
    settingsBaselineRef.current = settingsSnapshot([], null, templates, theme);
    setCheckins([]);
    setDesidentificationEntries([]);
    setPinnedPhrase(null);
  }
  async function migrateLocalData() {
    const data = localMigrationData;
    if (!data) {
      setMigrationRequested(false);
      return;
    }
    try {
      setClients(data.clients);
      setReminders(data.reminders);
      setCheckins(data.checkins);
      setDesidentificationEntries(data.entries);
      setPinnedPhrase(data.pinned);
      setTemplates(data.templates);
      await persistence.queueRows(user.id, 'clients', data.clients);
      await persistence.queueRows(user.id, 'reminders', data.reminders);
      await persistence.queueRows(user.id, 'checkins', data.checkins);
      await persistence.queueSettings(user.id, {
        entries: data.entries,
        pinned: data.pinned,
        templates: data.templates,
        theme
      });
      await persistence.flush(user.id);
      setLocalMigrationData(null);
      setMigrationRequested(false);
      alert('Dados locais importados para sua conta Synapse.');
    } catch (e) {
      window.SynapseLogger?.warn('Falha na migração local.', e);
      alert('Não foi possível concluir a importação. Verifique sua conexão e tente novamente.');
    }
  }
  const streak = useMemo(() => {
    const dates = new Set(checkins.map(c => c.date));
    let n = 0,
      cur = new Date();
    if (!dates.has(todayStr())) cur.setDate(cur.getDate() - 1);
    while (dates.has(localDateStr(cur))) {
      n++;
      cur.setDate(cur.getDate() - 1);
    }
    return n;
  }, [checkins]);
  const todayCheckin = checkins.find(c => c.date === todayStr());
  const followUps = useMemo(() => {
    return clients
      .filter(c => c.stage !== 'fechado' && c.stage !== 'perdido')
      .map(c => ({ ...c, idle: daysBetween(c.lastContact || c.createdAt, todayStr()) }))
      .filter(c => c.idle >= 3)
      .sort((a, b) => b.idle - a.idle);
  }, [clients]);
  const pendingReminders = useMemo(
    () =>
      reminders
        .filter(r => !r.done)
        .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')),
    [reminders]
  );
  const dailyFocus = useMemo(() => {
    const today = todayStr();
    const reminderItems = reminders
      .filter(r => !r.done && r.due === today)
      .map(r => ({
        type: 'reminder',
        id: r.id,
        text: r.text,
        due: r.due,
        priority: 3,
        clientId: r.clientId || null
      }));
    const overdue = reminders
      .filter(r => !r.done && r.due && r.due < today)
      .map(r => ({
        type: 'reminder',
        id: r.id,
        text: r.text,
        due: r.due,
        priority: 4,
        clientId: r.clientId || null
      }));
    const followItems = followUps.map(c => ({
      type: 'client',
      id: c.id,
      text: `Dar um oi acolhedor para ${c.name}`,
      due: today,
      priority: c.idle >= 7 ? 5 : c.idle >= 5 ? 4 : 2,
      clientId: c.id,
      idle: c.idle
    }));
    return [...overdue, ...reminderItems, ...followItems]
      .sort((a, b) => b.priority - a.priority || (b.idle || 0) - (a.idle || 0))
      .slice(0, 6);
  }, [reminders, followUps]);
  const lossReasons = useMemo(() => {
    const counts = {};
    clients.forEach(c => {
      (Array.isArray(c.lostTags) ? c.lostTags : []).forEach(t => {
        const label = String(t || '').trim();
        if (label && LOST_TAGS.includes(label)) counts[label] = (counts[label] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [clients]);
  const correlation = useMemo(() => {
    const checkinDates = new Set(checkins.map(c => c.date));
    let closedWith = 0,
      closedWithout = 0,
      daysWith = checkinDates.size;
    const closed = clients.filter(c => c.closedAt);
    closed.forEach(c => {
      checkinDates.has(c.closedAt) ? closedWith++ : closedWithout++;
    });
    return { closedWith, closedWithout, daysWith, totalClosed: closed.length };
  }, [checkins, clients]);
  function deleteCheckin(id) {
    if (!id) return;
    if (!confirm('Excluir este autorreconhecimento do histórico? Esta ação não pode ser desfeita.'))
      return;
    setCheckins(prev => prev.filter(c => c.id !== id));
    persistence.queueDelete(user.id, 'checkins', id).catch(e => {
      window.SynapseLogger?.warn('Falha ao enfileirar exclusão.', e);
      setSyncError('O check-in foi removido da tela e será sincronizado quando possível.');
    });
  }
  function saveCheckin(mood, identity, note, reframe, mentalStages) {
    if (!consent.sensitive) return;
    identity = sanitizeInput(identity);
    note = sanitizeInput(note);
    reframe = sanitizeInput(reframe);
    const existing = checkins.find(c => c.date === todayStr());
    const next = {
      ...(existing || {}),
      id: (existing && existing.id) || uid(),
      date: todayStr(),
      mood,
      identity,
      note,
      reframe,
      mentalStages: mentalStages || (existing && existing.mentalStages) || {}
    };
    setCheckins(prev => [...prev.filter(c => c.date !== todayStr()), next]);
    persistence.queueUpsert(user.id, 'checkins', next).catch(e => {
      window.SynapseLogger?.warn('Falha ao enfileirar check-in.', e);
      setSyncError(
        enqueueMessage(e, 'O check-in foi salvo localmente e será sincronizado quando possível.')
      );
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }
  function addClient(name, contact, value) {
    name = sanitizeInput(name, 200);
    contact = sanitizeInput(contact, 500);
    const client = {
      id: uid(),
      name,
      contact,
      stage: 'novo',
      temp: 'morno',
      lastContact: todayStr(),
      createdAt: todayStr(),
      notes: '',
      lostReason: '',
      lostTags: [],
      value: SynapseMoney.parse(value),
      closedAt: null
    };
    setClients(prev => [...prev, client]);
    persistence.queueUpsert(user.id, 'clients', client).catch(e => {
      window.SynapseLogger?.warn('Falha ao enfileirar cliente.', e);
      setSyncError('O cliente foi salvo localmente e será sincronizado quando possível.');
    });
  }
  function updateClient(id, patch) {
    const cleanPatch = sanitizeRecord(patch, ['name', 'contact', 'notes', 'lostReason']);
    if (Array.isArray(patch.lostTags))
      cleanPatch.lostTags = patch.lostTags.map(tag => sanitizeInput(tag, 100));
    if ('value' in patch) cleanPatch.value = SynapseMoney.parse(patch.value);
    if (typeof cleanPatch.notes === 'string') cleanPatch.notes = cleanPatch.notes.slice(0, 20000);
    setClients(prev => {
      const current = prev.find(c => c.id === id);
      if (!current) return prev;
      const next = { ...current, ...cleanPatch };
      if (patch.stage === 'fechado' && !current.closedAt) next.closedAt = todayStr();
      if (patch.stage && patch.stage !== 'fechado') next.closedAt = null;
      persistence.queueUpsert(user.id, 'clients', next).catch(e => {
        window.SynapseLogger?.warn('Falha ao enfileirar cliente.', e);
        setSyncError('A alteração foi salva localmente e será sincronizada quando possível.');
      });
      return prev.map(c => (c.id === id ? next : c));
    });
  }
  function removeClient(id) {
    const client = clients.find(c => c.id === id),
      label = client ? '"' + client.name + '"' : 'este cliente';
    if (!confirm('Excluir ' + label + '? Esta ação não pode ser desfeita.')) return;
    setClients(prev => prev.filter(c => c.id !== id));
    persistence.queueDelete(user.id, 'clients', id).catch(e => {
      window.SynapseLogger?.warn('Falha ao enfileirar exclusão.', e);
      setSyncError(
        'O cliente foi removido da tela e a exclusão será sincronizada quando possível.'
      );
    });
  }
  function addReminder(text, due, clientId) {
    text = sanitizeInput(text, 1000);
    const reminder = { id: uid(), text, due, clientId: clientId || null, done: false };
    setReminders(prev => [...prev, reminder]);
    persistence.queueUpsert(user.id, 'reminders', reminder).catch(e => {
      window.SynapseLogger?.warn('Falha ao enfileirar lembrete.', e);
      setSyncError('O lembrete foi salvo localmente e será sincronizado quando possível.');
    });
  }
  function toggleReminder(id) {
    setReminders(prev => {
      const current = prev.find(r => r.id === id);
      if (!current) return prev;
      const next = { ...current, done: !current.done };
      persistence.queueUpsert(user.id, 'reminders', next).catch(e => {
        window.SynapseLogger?.warn('Falha ao enfileirar lembrete.', e);
        setSyncError('A alteração foi salva localmente e será sincronizada quando possível.');
      });
      return prev.map(r => (r.id === id ? next : r));
    });
  }
  function updateReminder(id, patch) {
    patch = sanitizeRecord(patch, ['text']);
    setReminders(prev => {
      const current = prev.find(r => r.id === id);
      if (!current) return prev;
      const next = { ...current, ...patch };
      persistence.queueUpsert(user.id, 'reminders', next).catch(e => {
        window.SynapseLogger?.warn('Falha ao enfileirar lembrete.', e);
        setSyncError('A alteração foi salva localmente e será sincronizada quando possível.');
      });
      return prev.map(r => (r.id === id ? next : r));
    });
  }
  function removeReminder(id) {
    setReminders(prev => prev.filter(r => r.id !== id));
    persistence.queueDelete(user.id, 'reminders', id).catch(e => {
      window.SynapseLogger?.warn('Falha ao enfileirar exclusão.', e);
      setSyncError(
        'O lembrete foi removido da tela e a exclusão será sincronizada quando possível.'
      );
    });
  }
  function exportBackup() {
    const payload = {
      checkins: checkins.map(({ _enc, locked, ...c }) => c),
      clients,
      reminders,
      desidentificationEntries,
      pinnedPhrase,
      templates,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synapse-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function importBackup(file) {
    window.SynapseFeedback?.start('Importando backup');
    SynapseSpreadsheet.readText(file)
      .then(async raw => {
        try {
          const data = JSON.parse(raw);
          if (!confirm('Importar este backup vai substituir todos os dados atuais. Continuar?'))
            return;
          const clean = sanitizeInput;
          // Dados de bem-estar só entram se a pessoa autorizou o tratamento (aba Mental).
          const nextCheckins =
            consent.sensitive && Array.isArray(data.checkins)
              ? data.checkins.map(normalizeCheckin).filter(Boolean)
              : [];
          const nextClients = Array.isArray(data.clients)
            ? data.clients.map(normalizeClient).filter(Boolean)
            : [];
          const nextReminders = Array.isArray(data.reminders)
            ? data.reminders.map(normalizeReminder).filter(Boolean)
            : [];
          const nextEntries =
            consent.sensitive && Array.isArray(data.desidentificationEntries)
              ? data.desidentificationEntries.map(clean)
              : [];
          const nextPinned =
            consent.sensitive && data.pinnedPhrase
              ? sanitizeRecord(data.pinnedPhrase, ['text', 'phrase'])
              : null;
          const nextTemplates = Array.isArray(data.templates)
            ? data.templates.map(t => sanitizeRecord(t, ['title', 'text', 'category']))
            : [];
          setCheckins(nextCheckins);
          setClients(nextClients);
          setReminders(nextReminders);
          setDesidentificationEntries(nextEntries);
          setPinnedPhrase(nextPinned);
          setTemplates(nextTemplates);
          await persistence.replaceAll(user.id, {
            clients: nextClients,
            reminders: nextReminders,
            checkins: nextCheckins,
            entries: nextEntries,
            pinned: nextPinned,
            templates: nextTemplates,
            theme
          });
        } catch (err) {
          window.SynapseLogger?.warn('Backup inválido.', err, { fileName: file?.name });
          alert('Arquivo inválido. Verifique se é um backup exportado pelo Synapse.');
        }
      })
      .catch(err => {
        window.SynapseLogger?.warn('Falha ao ler backup.', err, { fileName: file?.name });
        alert(err.message || 'Não foi possível ler o backup.');
      })
      .finally(() => window.SynapseFeedback?.end());
  }
  function importExcel(file) {
    if (!window.XLSX) {
      alert(
        'A biblioteca para leitura de Excel não foi carregada. Verifique sua conexão com a internet e tente novamente.'
      );
      return;
    }
    SynapseSpreadsheet.parse(file)
      .then(({ rows, headers }) => {
        try {
          const normalize = value =>
            String(value ?? '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .trim()
              .replace(/[_-]+/g, ' ')
              .replace(/\s+/g, ' ');
          const aliases = {
            name: [
              'nome',
              'cliente',
              'nome cliente',
              'nome do cliente',
              'empresa',
              'empresa cliente',
              'lead',
              'razao social',
              'razao',
              'fantasia',
              'nome fantasia',
              'cliente nome',
              'customer',
              'customer name',
              'company',
              'company name'
            ],
            contact: [
              'contato',
              'contact',
              'telefone',
              'tel',
              'fone',
              'celular',
              'mobile',
              'whatsapp',
              'whats app',
              'email',
              'e mail',
              'e-mail',
              'telefone email',
              'telefone e mail',
              'contato telefone',
              'contato email'
            ],
            stage: [
              'etapa',
              'estagio',
              'status',
              'fase',
              'pipeline',
              'etapa do funil',
              'etapa funil',
              'situacao',
              'situação',
              'estado do lead',
              'stage'
            ],
            temp: [
              'temperatura',
              'temp',
              'classificacao',
              'classificação',
              'prioridade',
              'potencial',
              'interesse',
              'temperatura lead',
              'lead temperature'
            ],
            lastContact: [
              'ultimo contato',
              'ultima interacao',
              'ultimo contato em',
              'ultima interacao em',
              'data ultimo contato',
              'data do ultimo contato',
              'ultimo contato data',
              'last contact',
              'last contact date'
            ],
            createdAt: [
              'data cadastro',
              'data de cadastro',
              'criado em',
              'data criacao',
              'data criação',
              'data entrada',
              'data lead',
              'cadastro',
              'created at',
              'created date'
            ],
            notes: [
              'observacoes',
              'notas',
              'nota',
              'comentarios',
              'comentário',
              'comentarios gerais',
              'observacao',
              'obs',
              'descricao',
              'descrição',
              'notes'
            ],
            value: [
              'valor',
              'valor da venda',
              'valor da negociacao',
              'valor da negociação',
              'valor do negocio',
              'valor do negócio',
              'preco',
              'preço',
              'ticket',
              'value'
            ],
            lostReason: [
              'motivo perda',
              'motivo da perda',
              'motivo',
              'razao perda',
              'razão perda',
              'motivo perdido',
              'motivo do perdido',
              'lost reason'
            ]
          };
          const fieldLabels = {
            name: 'Nome do cliente',
            contact: 'Contato',
            stage: 'Etapa',
            temp: 'Temperatura',
            lastContact: 'Último contato',
            createdAt: 'Data de cadastro',
            notes: 'Observações',
            value: 'Valor (R$)',
            lostReason: 'Motivo da perda'
          };
          const fields = Object.keys(fieldLabels);
          const scoreHeader = (header, aliasesForField) => {
            const h = normalize(header);
            let best = 0;
            aliasesForField.forEach(a => {
              const x = normalize(a);
              if (h === x) best = Math.max(best, 100);
              else if (h.includes(x) || x.includes(h)) best = Math.max(best, 72);
              const ht = new Set(h.split(' '));
              const xt = new Set(x.split(' '));
              const common = [...ht].filter(t => t.length > 2 && xt.has(t)).length;
              if (common) best = Math.max(best, 40 + common * 15);
            });
            return best;
          };
          const autoMap = {};
          const confidence = {};
          fields.forEach(field => {
            let bestHeader = '';
            let bestScore = 0;
            headers.forEach(h => {
              const sc = scoreHeader(h, aliases[field]);
              if (sc > bestScore) {
                bestScore = sc;
                bestHeader = h;
              }
            });
            autoMap[field] = bestHeader;
            confidence[field] = bestScore;
          });
          const used = new Set();
          fields.forEach(field => {
            if (autoMap[field] && confidence[field] >= 75) used.add(autoMap[field]);
          });
          fields.forEach(field => {
            if (autoMap[field] && confidence[field] >= 75) return;
            if (autoMap[field] && used.has(autoMap[field])) autoMap[field] = '';
            else if (autoMap[field]) used.add(autoMap[field]);
          });
          setExcelReview({
            rows,
            headers,
            mappings: autoMap,
            confidence,
            fieldLabels,
            fileName: file.name
          });
        } catch (err) {
          window.SynapseLogger?.warn('Falha ao preparar a planilha para importação.', err, {
            fileName: file?.name
          });
          alert(
            'Não foi possível interpretar a planilha. Use .xlsx, .xls ou .csv e mantenha a primeira linha como cabeçalho.'
          );
        }
      })
      .catch(err => {
        window.SynapseLogger?.warn('Falha ao processar planilha.', err, { fileName: file?.name });
        alert(err.message || 'Não foi possível ler a planilha.');
      });
  }
  function completeExcelImport(review) {
    if (!review) return;
    const { rows, mappings } = review;
    const normalize = value =>
      String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    const valueOf = (row, field) => (mappings[field] ? row[mappings[field]] : '');
    const dateToISO = value => {
      if (value === null || value === undefined || value === '') return '';
      if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
      if (typeof value === 'number' && window.XLSX) {
        const d = XLSX.SSF.parse_date_code(value);
        if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
      }
      const text = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
      const br = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (br) return `${br[3]}-${String(br[2]).padStart(2, '0')}-${String(br[1]).padStart(2, '0')}`;
      const parsed = new Date(text);
      return isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
    };
    const mapStage = value => {
      const v = normalize(value);
      if (['novo', 'novo lead', 'lead novo', 'new', 'entrada', 'novo cadastro'].includes(v))
        return 'novo';
      if (['contato', 'contato feito', 'contatado', 'contact', 'em contato'].includes(v))
        return 'contato';
      if (['proposta', 'proposta enviada', 'proposal', 'orcamento', 'orçamento'].includes(v))
        return 'proposta';
      if (['fechado', 'fechada', 'ganho', 'ganha', 'closed', 'won', 'venda'].includes(v))
        return 'fechado';
      if (['perdido', 'perdida', 'sem interesse', 'lost', 'cancelado', 'cancelada'].includes(v))
        return 'perdido';
      return 'novo';
    };
    const mapTemp = value => {
      const v = normalize(value);
      if (['quente', 'hot', 'alta', 'alto', 'high'].includes(v)) return 'quente';
      if (['frio', 'cold', 'baixa', 'baixo', 'low'].includes(v)) return 'frio';
      return 'morno';
    };
    const imported = rows
      .map(row => {
        const name = sanitizeInput(valueOf(row, 'name'), 200).trim();
        if (!name) return null;
        const contact = sanitizeInput(valueOf(row, 'contact'), 500).trim();
        const stage = mapStage(valueOf(row, 'stage'));
        const temp = mapTemp(valueOf(row, 'temp'));
        const lastContact = dateToISO(valueOf(row, 'lastContact')) || todayStr();
        const createdAt = dateToISO(valueOf(row, 'createdAt')) || todayStr();
        return {
          id: uid(),
          name,
          contact,
          stage,
          temp,
          lastContact,
          createdAt,
          notes: sanitizeInput(valueOf(row, 'notes'), 5000).trim(),
          lostReason: sanitizeInput(valueOf(row, 'lostReason'), 1000).trim(),
          value: SynapseMoney.parse(valueOf(row, 'value')),
          closedAt: stage === 'fechado' ? lastContact || todayStr() : null
        };
      })
      .filter(Boolean);
    if (!imported.length) {
      alert(
        'Nenhum cliente válido foi encontrado. Mapeie uma coluna para Nome do cliente e tente novamente.'
      );
      return;
    }
    const existing = [...clients];
    let added = 0,
      updated = 0;
    imported.forEach(incoming => {
      const keyName = normalize(incoming.name),
        keyContact = normalize(incoming.contact);
      const index = existing.findIndex(
        c => normalize(c.name) === keyName && (!keyContact || normalize(c.contact) === keyContact)
      );
      if (index >= 0) {
        existing[index] = { ...existing[index], ...incoming, id: existing[index].id };
        updated++;
      } else {
        existing.push(incoming);
        added++;
      }
    });
    if (
      !confirm(
        `Foram encontrados ${imported.length} clientes.\n\nNovos: ${added}\nAtualizados: ${updated}\n\nOs clientes serão adicionados ou atualizados sem apagar os atuais. Continuar?`
      )
    )
      return;
    setClients(existing);
    setExcelReview(null);
    setTab('clientes');
    alert(`Importação concluída.\n\nNovos clientes: ${added}\nClientes atualizados: ${updated}`);
  }
  async function deleteAccount() {
    if (deleteAccountBusy || typeof backendDeleteAccount !== 'function') return;
    setDeleteAccountBusy(true);
    try {
      await backendDeleteAccount();
      persistence.purgeLocal(user.id);
      await SynapseVault.forgetDevice(user.id);
      try {
        const keys = Object.keys(localStorage);
        keys
          .filter(
            key =>
              key.startsWith('synapse-') ||
              [
                'mental-vendas-theme',
                'mindset-checkins',
                'mindset-clients',
                'mindset-reminders',
                'mental-vendas-desidentificacao',
                'mental-vendas-templates',
                'synapse-layout',
                'synapse-main',
                'synapse-sidebar'
              ].includes(key)
          )
          .forEach(key => localStorage.removeItem(key));
      } catch (_) {}
      setSettingsOpen(false);
      await auth.signOut();
    } catch (error) {
      window.SynapseLogger?.warn('Falha ao excluir conta.', error);
      throw error;
    } finally {
      setDeleteAccountBusy(false);
    }
  }
  const pushSynMessages = (...msgs) =>
    setAiMessages(prev => [
      ...prev,
      ...msgs.map(m => ({ ...m, blocks: m.blocks || formatSynMessage(m.text) }))
    ]);
  async function askAI(override) {
    const question = (typeof override === 'string' ? override : aiQuestion).trim();
    if (!question || aiBusy || typeof backendAskAI !== 'function') return;
    const nextMessages = [...aiMessages, { role: 'user', text: question }];
    setAiQuestion('');
    setAiMessages(nextMessages);
    // Segurança emocional vem antes de qualquer resposta pronta ou chamada de rede:
    // pedido de ajuda nunca depende de conexão, cota ou consentimento.
    const Safety = window.SynapseSafety;
    const risk = Safety?.detectRisk(question);
    if (risk === 'crisis') {
      pushSynMessages({ role: 'model', text: Safety.CRISIS_RESPONSE, safety: 'crisis' });
      return;
    }
    if (!consent.ai) {
      pushSynMessages({
        role: 'model',
        text: 'Para conversar com a Syn, autorize o uso da IA no aviso acima.'
      });
      return;
    }
    setAiBusy(true);
    try {
      // O servidor monta o prompt e o contexto (clientes, lembretes, humor) a partir do banco.
      const history = nextMessages
        .slice(-12)
        .map(message => ({ role: message.role, text: message.text }));
      const result = await backendAskAI({ messages: history });
      const answer = sanitizeInput(result?.answer || 'A Syn não retornou uma resposta.', 20000);
      pushSynMessages({ role: 'model', text: answer, safety: result?.safety || null });
    } catch (err) {
      window.SynapseLogger?.warn('Falha ao consultar a Syn.', err);
      const raw = String(err?.message || '').trim();
      const offline = !raw || /failed to fetch|network|fetch/i.test(raw);
      const message = offline
        ? 'Não consegui falar com a Syn agora. Verifique sua conexão e tente novamente.'
        : raw;
      pushSynMessages({ role: 'model', text: message });
    } finally {
      setAiBusy(false);
    }
  }
  if (loadError) {
    return React.createElement(
      Shell,
      { theme },
      React.createElement(
        'div',
        { className: 'cloud-load-state' },
        React.createElement(
          'div',
          { className: 'cloud-load-card' },
          React.createElement('div', { className: 'cloud-load-icon' }, '↻'),
          React.createElement('h2', null, 'Não foi possível carregar seus dados'),
          React.createElement('p', null, loadError),
          React.createElement(
            'button',
            {
              onClick: () => {
                setLoadError('');
                setLoaded(false);
                setLoadNonce(v => v + 1);
              },
              className: 'cloud-load-retry'
            },
            'Tentar novamente'
          )
        )
      )
    );
  }
  if (!loaded) {
    return React.createElement(
      Shell,
      { theme },
      React.createElement(
        'div',
        { className: 'cloud-load-state' },
        React.createElement(
          'div',
          { className: 'cloud-load-card loading' },
          React.createElement(
            'div',
            { className: 'cloud-load-spinner' },
            React.createElement('img', { src: 'standard-logo.svg?v=15', alt: 'Synapse' })
          ),
          React.createElement('h2', null, 'Carregando seu espaço'),
          React.createElement('p', null, 'Buscando seus dados com segurança.')
        )
      )
    );
  }
  return React.createElement(
    Shell,
    { theme },
    (syncError || runtimeError) &&
      React.createElement('div', { className: 'sync-banner error' }, syncError || runtimeError),
    operationBusy &&
      React.createElement(
        'div',
        { className: 'operation-progress', role: 'status', 'aria-label': 'Processando' },
        React.createElement('span', { className: 'operation-progress-line' })
      ),
    React.createElement(
      'div',
      { className: 'synapse-layout' },
      React.createElement(TopBar, {
        streak,
        tab,
        setTab,
        exportBackup,
        importBackup,
        importExcel,
        theme,
        toggleTheme,
        user,
        onLogout,
        onSettings: () => setSettingsOpen(true)
      }),
      React.createElement(
        'main',
        { className: 'synapse-main' },
        React.createElement(WorkspaceHeader, {
          tab,
          setTab,
          theme,
          toggleTheme,
          user,
          onLogout,
          onSettings: () => setSettingsOpen(true)
        }),
        React.createElement(
          'button',
          { onClick: () => setAiOpen(true), className: 'ai-fab', title: 'Abrir Syn' },
          React.createElement(Sparkles, { size: 17 }),
          ' Syn'
        ),
        React.createElement(
          'div',
          { className: 'workspace-content px-4 sm:px-6 lg:px-8 py-6 w-full max-w-none' },
          tab === 'painel' &&
            React.createElement(Painel, {
              streak,
              todayCheckin,
              clients,
              followUps,
              pendingReminders,
              correlation,
              lossReasons,
              dailyFocus,
              pinnedPhrase,
              goTo: setTab,
              onCalm: () => setCalmOpen(true)
            }),
          tab === 'mental' &&
            !consent.sensitive &&
            React.createElement(MentalConsentCard, {
              onAuthorize: () => account.setConsent({ sensitive: true })
            }),
          tab === 'mental' &&
            consent.sensitive &&
            React.createElement(Mental, {
              checkins,
              todayCheckin,
              saveCheckin,
              deleteCheckin,
              justSaved,
              desidentificationEntries,
              setDesidentificationEntries,
              pinnedPhrase,
              setPinnedPhrase
            }),
          tab === 'clientes' &&
            React.createElement(Clientes, {
              clients,
              addClient,
              updateClient,
              removeClient,
              importExcel,
              templates,
              setTemplates,
              userId: user.id
            }),
          tab === 'lembretes' &&
            React.createElement(Lembretes, {
              followUps,
              reminders,
              addReminder,
              toggleReminder,
              updateReminder,
              removeReminder,
              markContacted: id => updateClient(id, { lastContact: todayStr() }),
              clients
            }),
          tab === 'foco' &&
            React.createElement(FocoDoDia, {
              items: dailyFocus,
              reminders,
              toggleReminder,
              goTo: setTab,
              clients
            })
        )
      )
    ),
    migrationRequested &&
      React.createElement(MigrationModal, {
        onImport: migrateLocalData,
        onSkip: () => setMigrationRequested(false)
      }),
    excelReview &&
      React.createElement(ExcelReviewModal, {
        review: excelReview,
        setReview: setExcelReview,
        onImport: completeExcelImport
      }),
    calmOpen && React.createElement(CalmMode, { onClose: () => setCalmOpen(false) }),
    aiOpen &&
      React.createElement(AIAssistant, {
        messages: aiMessages,
        question: aiQuestion,
        setQuestion: setAiQuestion,
        busy: aiBusy,
        onAsk: askAI,
        aiConsent: consent.ai,
        onAuthorizeAI: () => account.setConsent({ ai: true }),
        onClear: () => {
          setAiMessages([]);
          setAiQuestion('');
        },
        onClose: () => setAiOpen(false)
      }),
    settingsOpen &&
      React.createElement(AccountSettingsModal, {
        user,
        busy: deleteAccountBusy,
        account,
        onClose: () => setSettingsOpen(false),
        onDelete: deleteAccount,
        vault: {
          enable: vaultEnable,
          change: vaultChange,
          disable: vaultDisable,
          lock: () => account.relock()
        },
        onDeleteWellbeing: deleteWellbeingData
      })
  );
}
