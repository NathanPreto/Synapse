/*
 * Implementação do backend sobre Supabase (Auth + Postgres com RLS + Edge Functions).
 * O cliente Supabase fica encapsulado aqui; o restante do app usa window.SynapseBackend.
 */
(function () {
  const cfg = window.SYNAPSE_CONFIG || {};
  const url = cfg.supabaseUrl || '';
  const key = cfg.supabaseKey || '';
  const client = window.supabase && url && key ? window.supabase.createClient(url, key) : null;

  function requireClient() {
    if (!client) throw new Error('A conexão com o Supabase não foi configurada.');
    return client;
  }
  const clean = value => (window.SynapseSecurity?.sanitizeInput || (v => String(v ?? '')))(value);

  async function withFeedback(label, task) {
    window.SynapseFeedback?.start(label);
    try {
      return await task();
    } finally {
      window.SynapseFeedback?.end();
    }
  }

  async function syncUserRows(table, userId, rows) {
    if (!client || !userId) return;
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return;
    const payload = safeRows.map(row => ({ ...row, id: String(row.id), user_id: userId }));
    await withFeedback('Sincronizando dados', async () => {
      const { error } = await client.from(table).upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    });
  }

  async function deleteCloudRow(table, userId, id) {
    if (!client || !userId || !id) return;
    await withFeedback('Atualizando dados', async () => {
      const { error } = await client
        .from(table)
        .delete()
        .eq('user_id', userId)
        .eq('id', String(id));
      if (error) throw error;
    });
  }

  async function syncSettings(userId, settings) {
    if (!client || !userId) return;
    await withFeedback('Sincronizando configurações', async () => {
      const { error } = await client.from('app_settings').upsert(
        {
          user_id: userId,
          id: userId,
          desidentification_entries: settings.entries || [],
          pinned_phrase: settings.pinned || null,
          private_enc: settings.privateEnc || null,
          templates: settings.templates || [],
          theme: settings.theme || 'dark',
          client_updated_at: settings.clientUpdatedAt || new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    });
  }

  /* ---------- Perfil: consentimentos (LGPD) e metadados do cofre ---------- */
  const PROFILE_COLUMNS =
    'id,full_name,consent_version,consent_terms_at,consent_sensitive_at,consent_ai_at,vault_salt,vault_verifier,vault_iterations';

  async function loadProfile(userId) {
    const api = requireClient();
    const { data, error } = await api
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || { id: userId };
  }

  async function saveProfile(userId, patch) {
    const api = requireClient();
    const { error } = await api
      .from('profiles')
      .upsert({ ...patch, id: userId }, { onConflict: 'id' });
    if (error) throw error;
  }

  /** Apaga check-ins e diário (dados de bem-estar) da nuvem. Não mexe em clientes/lembretes. */
  async function deleteWellbeingData(userId) {
    const api = requireClient();
    await withFeedback('Apagando registros de bem-estar', async () => {
      const del = await api.from('checkins').delete().eq('user_id', userId);
      if (del.error) throw del.error;
      const upd = await api
        .from('app_settings')
        .update({
          desidentification_entries: [],
          pinned_phrase: null,
          private_enc: null,
          client_updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      if (upd.error) throw upd.error;
    });
  }

  /* ---------- Funções de servidor ---------- */
  async function errorCode(error) {
    try {
      if (error?.context?.json) {
        const payload = await error.context.json();
        return String(payload?.code || '').toUpperCase();
      }
    } catch (_) {}
    return '';
  }

  async function deleteAccount() {
    const api = requireClient();
    const { data: sessionData } = await api.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error('Sua sessão expirou. Entre novamente para excluir a conta.');
    const { data, error } = await api.functions.invoke('delete-account', {
      body: {},
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (error) {
      const code = await errorCode(error);
      if (code === 'UNAUTHORIZED')
        throw new Error('Sua sessão expirou. Entre novamente e tente outra vez.');
      if (code === 'CONFIG_MISSING')
        throw new Error('A exclusão de conta ainda não está configurada no servidor.');
      throw new Error('Não foi possível excluir sua conta agora. Tente novamente.');
    }
    if (!data?.ok) throw new Error('Não foi possível excluir sua conta agora. Tente novamente.');
    return data;
  }

  const AI_ERRORS = {
    CONFIG_MISSING: 'A Syn ainda não está configurada no servidor.',
    FORBIDDEN_ORIGIN: 'A Syn não está liberada para este endereço do aplicativo.',
    UPSTREAM_AUTH: 'A Syn não conseguiu validar sua configuração no servidor.',
    UPSTREAM_QUOTA: 'A Syn atingiu um limite de uso. Tente novamente em alguns instantes.',
    RATE_LIMITED:
      'Você atingiu o limite de mensagens da Syn por agora. Tente novamente mais tarde.',
    UPSTREAM_TIMEOUT: 'A Syn demorou mais do que o esperado para responder. Tente novamente.',
    UPSTREAM_UNAVAILABLE:
      'A Syn está temporariamente indisponível. Tente novamente em alguns instantes.',
    QUOTA_UNAVAILABLE:
      'A Syn está temporariamente indisponível. Tente novamente em alguns instantes.',
    UNAUTHORIZED: 'Sua sessão expirou. Entre novamente para usar a Syn.'
  };

  /** Envia SOMENTE o histórico da conversa. O prompt e o contexto do vendedor são montados no servidor. */
  async function askAI(payload) {
    const api = requireClient();
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    const { data: sessionData } = await api.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error('Sua sessão expirou. Entre novamente para usar a Syn.');
    const { data, error } = await api.functions.invoke('synapse-ai', {
      body: { messages },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (error) {
      const code = await errorCode(error);
      const err = new Error(
        AI_ERRORS[code] || 'Não foi possível concluir a resposta da Syn agora.'
      );
      err.code = code;
      throw err;
    }
    if (!data?.answer) throw new Error('A Syn não retornou uma resposta.');
    return { answer: String(data.answer), safety: data.safety || null };
  }

  /* ---------- Leitura dos dados do usuário ---------- */
  async function loadSynapseData(userId) {
    const api = requireClient();
    return withFeedback('Carregando seus dados', async () => {
      const [clients, reminders, checkins, settings] = await Promise.all([
        api
          .from('clients')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        api.from('reminders').select('*').eq('user_id', userId).order('due', { ascending: true }),
        api.from('checkins').select('*').eq('user_id', userId).order('date', { ascending: false }),
        api.from('app_settings').select('*').eq('user_id', userId).maybeSingle()
      ]);
      for (const result of [clients, reminders, checkins, settings])
        if (result.error) throw result.error;
      return {
        clients: (clients.data || []).map(r => ({
          id: r.id,
          name: clean(r.name),
          contact: clean(r.contact),
          stage: r.stage || 'novo',
          temp: r.temp || 'morno',
          lastContact: r.last_contact || '',
          createdAt: r.created_at_date || '',
          notes: clean(r.notes),
          lostReason: clean(r.lost_reason),
          lostTags: Array.isArray(r.lost_tags) ? r.lost_tags.map(clean) : [],
          closedAt: r.closed_at || null
        })),
        reminders: (reminders.data || []).map(r => ({
          id: r.id,
          text: clean(r.text),
          due: r.due || '',
          clientId: r.client_id || null,
          done: !!r.done
        })),
        checkins: (checkins.data || []).map(r => ({
          id: r.id,
          date: r.date,
          mood: r.mood,
          identity: clean(r.identity),
          note: clean(r.note),
          reframe: clean(r.reframe),
          mentalStages: r.mental_stages || {},
          enc: r.enc || null
        })),
        entries: settings.data?.desidentification_entries || [],
        pinned: settings.data?.pinned_phrase || null,
        privateEnc: settings.data?.private_enc || null,
        templates: settings.data?.templates || [],
        theme: settings.data?.theme || null,
        hasCloudData: !!(
          clients.data?.length ||
          reminders.data?.length ||
          checkins.data?.length ||
          settings.data?.desidentification_entries?.length ||
          settings.data?.private_enc ||
          settings.data?.templates?.length ||
          settings.data?.pinned_phrase
        )
      };
    });
  }

  window.SynapseSupabase = {
    auth: client?.auth || null,
    syncUserRows,
    deleteCloudRow,
    syncSettings,
    loadSynapseData,
    loadProfile,
    saveProfile,
    deleteWellbeingData,
    askAI,
    deleteAccount
  };
})();
