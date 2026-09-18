(function(){
  const listeners = new Set();
  const safeString = value => {
    try { return typeof value === 'string' ? value : JSON.stringify(value); } catch (_) { return String(value); }
  };
  function friendlyRuntimeMessage(error, fallbackMessage) {
    const raw = String(error?.message || error || fallbackMessage || '').trim();
    const lower = raw.toLowerCase();
    if (!raw) return 'Erro inesperado em tempo de execução.';
    if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network error') || lower.includes('fetch')) {
      return 'Não foi possível concluir a operação porque a conexão com o servidor falhou.';
    }
    if (lower.includes('row-level security') || lower.includes('rls') || lower.includes('permission denied') || lower.includes('not authorized')) {
      return 'A operação foi bloqueada por uma permissão de acesso. Seus dados locais não foram apagados.';
    }
    if (lower.includes('duplicate key') || lower.includes('unique constraint')) {
      return 'A alteração não pôde ser salva porque já existe um registro com o mesmo identificador.';
    }
    if (lower.includes('column') && lower.includes('does not exist')) {
      return 'A alteração não pôde ser salva porque a estrutura do banco de dados não está compatível com esta versão do Synapse.';
    }
    if (lower.includes('relation') && lower.includes('does not exist')) {
      return 'A operação não pôde ser concluída porque uma tabela necessária não foi encontrada no banco de dados.';
    }
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return 'A operação demorou demais para responder. Verifique sua conexão e tente novamente.';
    }
    if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('too many requests')) {
      return 'O serviço atingiu um limite temporário. Aguarde alguns instantes e tente novamente.';
    }
    if (lower.includes('syntaxerror') || lower.includes('unexpected token')) {
      return 'O aplicativo encontrou um erro ao carregar um componente. Recarregue a página e tente novamente.';
    }
    if (fallbackMessage && !/^erro inesperado em tempo de execução\\.?$/i.test(String(fallbackMessage).trim()) && !/^falha assíncrona não tratada\\.?$/i.test(String(fallbackMessage).trim())) {
      return String(fallbackMessage).trim();
    }
    return 'Erro inesperado em tempo de execução.';
  }
  function emit(level, message, error, context) {
    const resolvedMessage = level === 'error' ? friendlyRuntimeMessage(error, message) : safeString(message);
    const payload = { level, message: safeString(resolvedMessage), error: error?.message || error || null, context: context || null, at: new Date().toISOString() };
    try { console[level === 'error' ? 'error' : 'warn']('[Synapse]', payload); } catch (_) {}
    listeners.forEach(fn => { try { fn(payload); } catch (_) {} });
    try { window.dispatchEvent(new CustomEvent('synapse:error', { detail: payload })); } catch (_) {}
  }
  let busyCount = 0;
  window.SynapseFeedback = {
    start(label){ busyCount += 1; try { window.dispatchEvent(new CustomEvent('synapse:busy', { detail:{ busy:true, label:label || 'Processando...' } })); } catch (_) {} },
    end(){ busyCount = Math.max(0, busyCount - 1); try { window.dispatchEvent(new CustomEvent('synapse:busy', { detail:{ busy:busyCount > 0 } })); } catch (_) {} }
  };
  window.SynapseLogger = {
    error(message, error, context){ emit('error', message, error, context); },
    warn(message, error, context){ emit('warn', message, error, context); },
    subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
  };
  window.addEventListener('error', event => emit('error', 'Erro inesperado em tempo de execução.', event.error || event.message, { source: event.filename, line: event.lineno, column: event.colno }));
  window.addEventListener('unhandledrejection', event => emit('error', 'Falha assíncrona não tratada.', event.reason));
})();
(function(){
  function sanitizeInput(value, maxLength = 20000) {
    if (value === null || value === undefined) return '';
    let text = String(value);
    if (text.length > maxLength) text = text.slice(0, maxLength);
    try {
      const el = document.createElement('textarea');
      el.textContent = text;
      return el.value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    } catch (_) {
      return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    }
  }
  function sanitizeRecord(record, fields) {
    const next = { ...record };
    (fields || Object.keys(next)).forEach(key => {
      if (typeof next[key] === 'string') next[key] = sanitizeInput(next[key]);
    });
    return next;
  }
  window.SynapseSecurity = { sanitizeInput, sanitizeRecord };
  window.sanitizeInput = sanitizeInput;
})();
(function(){
  function getSafeStorage(type) {
    try {
      const s = window[type];
      if (!s) return null;
      const probe = '__synapse_storage_probe__';
      s.setItem(probe, '1'); s.removeItem(probe); return s;
    } catch (_) { return null; }
  }
  const persistentStorage = getSafeStorage('localStorage');
  const sessionStorageSafe = getSafeStorage('sessionStorage');
  const memoryStorage = Object.create(null);
  const storage = {
    async get(key) {
      try { const value = persistentStorage ? persistentStorage.getItem(key) : memoryStorage[key]; return value == null ? null : { key, value }; }
      catch (error) { window.SynapseLogger?.warn('Falha ao ler armazenamento local.', error, { key }); return memoryStorage[key] == null ? null : { key, value: memoryStorage[key] }; }
    },
    async set(key, value) {
      memoryStorage[key] = value;
      try { persistentStorage?.setItem(key, value); }
      catch (error) { window.SynapseLogger?.warn('Falha ao persistir armazenamento local.', error, { key }); }
      return { key, value };
    }
  };
  function safeSessionGet(key){ try { return sessionStorageSafe ? sessionStorageSafe.getItem(key) : null; } catch (_) { return null; } }
  function safeSessionSet(key,value){ try { sessionStorageSafe?.setItem(key,value); } catch (_) {} }
  window.SynapseStorage = { persistentStorage, sessionStorageSafe, storage, safeSessionGet, safeSessionSet, getSafeStorage };
})();
(function(){
  const cfg = window.SYNAPSE_CONFIG || {};
  const url = cfg.supabaseUrl || '';
  const key = cfg.supabaseKey || '';
  const client = (window.supabase && url && key) ? window.supabase.createClient(url, key) : null;
  function requireClient(){ if (!client) throw new Error('A conexão com o Supabase não foi configurada.'); return client; }
  async function syncUserRows(table, userId, rows) {
    if (!client || !userId) return;
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return;
    const payload = safeRows.map(row => ({ ...row, id: String(row.id), user_id: userId }));
    window.SynapseFeedback?.start('Sincronizando dados');
    try {
      const { error } = await client.from(table).upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } finally { window.SynapseFeedback?.end(); }
  }
  async function deleteCloudRow(table, userId, id) {
    if (!client || !userId || !id) return;
    window.SynapseFeedback?.start('Atualizando dados');
    try {
      const { error } = await client.from(table).delete().eq('user_id', userId).eq('id', String(id));
      if (error) throw error;
    } finally { window.SynapseFeedback?.end(); }
  }
  async function syncSettings(userId, settings) {
    if (!client || !userId) return;
    window.SynapseFeedback?.start('Sincronizando configurações');
    try {
      const { error } = await client.from('app_settings').upsert({ user_id:userId, id:userId, desidentification_entries:settings.entries||[], pinned_phrase:settings.pinned||null, templates:settings.templates||[], theme:settings.theme||'dark' }, { onConflict:'user_id' });
      if (error) throw error;
    } finally { window.SynapseFeedback?.end(); }
  }
  async function loadSynapseData(userId) {
    const api = requireClient();
    window.SynapseFeedback?.start('Carregando seus dados');
    try {
      const [clients, reminders, checkins, settings] = await Promise.all([
        api.from('clients').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
        api.from('reminders').select('*').eq('user_id',userId).order('due',{ascending:true}),
        api.from('checkins').select('*').eq('user_id',userId).order('date',{ascending:false}),
        api.from('app_settings').select('*').eq('user_id',userId).maybeSingle()
      ]);
      for (const result of [clients,reminders,checkins,settings]) if(result.error) throw result.error;
      const clean = window.SynapseSecurity?.sanitizeInput || (v => String(v ?? ''));
      return {
        clients:(clients.data||[]).map(r=>({id:r.id,name:clean(r.name),contact:clean(r.contact),stage:r.stage||'novo',temp:r.temp||'morno',lastContact:r.last_contact||'',createdAt:r.created_at_date||'',notes:clean(r.notes),lostReason:clean(r.lost_reason),lostTags:Array.isArray(r.lost_tags)?r.lost_tags.map(clean):[],closedAt:r.closed_at||null})),
        reminders:(reminders.data||[]).map(r=>({id:r.id,text:clean(r.text),due:r.due||'',clientId:r.client_id||null,done:!!r.done})),
        checkins:(checkins.data||[]).map(r=>({id:r.id,date:r.date,mood:r.mood,identity:clean(r.identity),note:clean(r.note),reframe:clean(r.reframe),mentalStages:r.mental_stages||{}})),
        entries:settings.data?.desidentification_entries||[], pinned:settings.data?.pinned_phrase||null, templates:settings.data?.templates||[], theme:settings.data?.theme||null,
        hasCloudData:!!(clients.data?.length||reminders.data?.length||checkins.data?.length||settings.data?.desidentification_entries?.length||settings.data?.templates?.length||settings.data?.pinned_phrase)
      };
    } finally { window.SynapseFeedback?.end(); }
  }
  window.SynapseSupabase = { client, url, key, syncUserRows, deleteCloudRow, syncSettings, loadSynapseData, requireClient };
})();
(function(){
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Nenhum arquivo foi selecionado.'));
      if (file.size > MAX_FILE_BYTES) return reject(new Error('O arquivo excede o limite de 15 MB.'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
      reader.onabort = () => reject(new Error('A leitura do arquivo foi cancelada.'));
      try { reader.readAsArrayBuffer(file); } catch (error) { reject(error); }
    });
  }
  function readText(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Nenhum arquivo foi selecionado.'));
      if (file.size > MAX_FILE_BYTES) return reject(new Error('O arquivo excede o limite de 15 MB.'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
      reader.onabort = () => reject(new Error('A leitura do arquivo foi cancelada.'));
      try { reader.readAsText(file); } catch (error) { reject(error); }
    });
  }
  async function parse(file) {
    window.SynapseFeedback?.start('Processando planilha');
    try {
    if (!window.XLSX) throw new Error('A biblioteca de planilhas não foi carregada.');
    const buffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(new Uint8Array(buffer), { type:'array', cellDates:true });
    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) throw new Error('Nenhuma aba foi encontrada na planilha.');
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval:'', raw:true });
    if (!rows.length) throw new Error('A planilha está vazia.');
    const headers = Object.keys(rows[0] || {});
    if (!headers.length) throw new Error('Não foi possível encontrar cabeçalhos na primeira linha.');
    // Pré-processamento fora do DOM: para planilhas grandes, o fragmento evita
    // múltiplas inserções individuais caso uma prévia nativa precise ser montada.
    const fragment = document.createDocumentFragment();
    const sample = rows.slice(0, Math.min(rows.length, 50));
    sample.forEach(row => { const marker = document.createElement('span'); marker.textContent = JSON.stringify(row); fragment.appendChild(marker); });
    return { workbook, sheetName, rows, headers, previewFragment: fragment };
    } finally { window.SynapseFeedback?.end(); }
  }
  window.SynapseSpreadsheet = { parse, readText, readFileAsArrayBuffer, MAX_FILE_BYTES };
})();
