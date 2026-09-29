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

  async function loadProspecting(userId) {
    const api = requireClient();
    return withFeedback('Carregando prospecção', async () => {
      const [runs, prospects, contacts, sources] = await Promise.all([
        api.from('prospecting_runs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        api.from('prospects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        api.from('prospect_contacts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        api.from('prospect_sources').select('*').eq('user_id', userId).order('captured_at', { ascending: false })
      ]);
      for (const result of [runs, prospects, contacts, sources]) if (result.error) throw result.error;
      return {
        runs: (runs.data || []).map(r => ({
          id: r.id, name: clean(r.name), product: clean(r.product), region: clean(r.region),
          segments: Array.isArray(r.segments) ? r.segments : [], keywords: Array.isArray(r.keywords) ? r.keywords : [],
          requestedLimit: r.requested_limit, status: r.status, createdAt: r.created_at
        })),
        prospects: (prospects.data || []).map(r => ({
          id: r.id, runId: r.run_id, companyName: clean(r.company_name), tradeName: clean(r.trade_name),
          domain: clean(r.domain), website: clean(r.website), industry: clean(r.industry),
          description: clean(r.description), city: clean(r.city), state: clean(r.state), country: clean(r.country),
          potential: r.potential, potentialReason: clean(r.potential_reason), analysisStatus: r.analysis_status,
          analysis: r.analysis || {}, evidence: r.evidence || [], unknowns: r.unknowns || [], status: r.status,
          convertedClientId: r.converted_client_id, createdAt: r.created_at,
          contacts: (contacts.data || []).filter(x => x.prospect_id === r.id).map(x => ({
            id: x.id, name: clean(x.name), email: clean(x.email), phone: clean(x.phone),
            jobTitle: clean(x.job_title), department: clean(x.department), emailStatus: x.email_status,
            emailConfidence: x.email_confidence, source: clean(x.source), sourceUrl: clean(x.source_url), isPrimary: !!x.is_primary
          })),
          sources: (sources.data || []).filter(x => x.prospect_id === r.id).map(x => ({
            id: x.id, type: x.source_type, name: clean(x.source_name), url: clean(x.source_url), evidence: clean(x.evidence), capturedAt: x.captured_at
          }))
        }))
      };
    });
  }

  async function searchProspecting(userId, input) {
    const api = requireClient();
    const { data: sessionData } = await api.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente.');
    const runId = input?.runId || null;
    const { data, error } = await api.functions.invoke('prospecting-search', {
      body: {
        product: clean(input?.product).slice(0, 200) || 'Soprador radial',
        region: clean(input?.region).slice(0, 200) || 'Brasil',
        segments: Array.isArray(input?.segments) ? input.segments : [],
        keywords: Array.isArray(input?.keywords) ? input.keywords : [],
        limit: Math.max(1, Math.min(10, Number(input?.limit) || 10))
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    if (error) {
      let code = '';
      try {
        const payload = await error.context?.json?.();
        code = String(payload?.code || '').toUpperCase();
      } catch (_) {}
      if (code === 'DAILY_PROSPECT_LIMIT') throw new Error('Você já atingiu o limite de 10 prospects úteis hoje. Novas prospecções ficam disponíveis amanhã.');
      if (code === 'RATE_LIMITED') throw new Error('A busca atingiu o limite gratuito de uso por agora. Aguarde e tente novamente.');
      if (code === 'CONFIG_MISSING') throw new Error('A busca de prospecção ainda não está configurada no servidor.');
      if (code === 'SEARCH_PROVIDER_ERROR') throw new Error('O provedor de pesquisa não respondeu. Tente novamente em alguns instantes.');
      if (code === 'SEARCH_QUOTA_EXCEEDED') throw new Error('O limite gratuito de pesquisa foi atingido. O Synapse não usa uma rota paga; tente novamente quando a cota gratuita for renovada.');
      if (code === 'SEARCH_INCOMPLETE') throw new Error('A pesquisa externa não terminou a tempo. Tente novamente.');
      if (code === 'EMPTY_SEARCH_RESULT') throw new Error('A pesquisa externa não retornou resultados utilizáveis.');
      if (code === 'DATABASE_ERROR') throw new Error('A busca encontrou um problema ao acessar os dados da prospecção.');
      throw new Error('Não foi possível concluir a descoberta de empresas agora.');
    }
    const prospects = Array.isArray(data?.prospects) ? data.prospects : [];
    if (!prospects.length) return { prospects: [] };

    const rows = prospects.map(p => ({
      user_id: userId,
      run_id: runId,
      company_name: p.company_name,
      domain: p.domain,
      website: p.website,
      industry: p.industry,
      description: p.description,
      city: p.city,
      state: p.state,
      country: p.country || 'Brasil',
      potential: p.potential,
      potential_reason: p.potential_reason,
      analysis_status: p.analysis_status,
      analysis: { ...(p.analysis || {}), suggested_subject: p.suggested_subject || '', suggested_body: p.suggested_body || '' },
      evidence: p.evidence || [],
      unknowns: p.unknowns || [],
      status: 'new'
    }));
    const inserted = await api.from('prospects').insert(rows).select('*');
    if (inserted.error) {
      if (String(inserted.error.message || '').includes('DAILY_PROSPECT_LIMIT_REACHED')) {
        throw new Error('Você já atingiu o limite de 10 prospects úteis hoje. Novas prospecções ficam disponíveis amanhã.');
      }
      throw inserted.error;
    }

    const byName = new Map((inserted.data || []).map(row => [row.company_name, row]));
    const contactRows = [];
    const sourceRows = [];
    for (const p of prospects) {
      const row = byName.get(p.company_name);
      if (!row) continue;
      for (const contact of Array.isArray(p.contacts) ? p.contacts : []) {
        if (!contact.email && !contact.phone && !contact.name) continue;
        contactRows.push({
          prospect_id: row.id, user_id: userId, name: contact.name || '', email: contact.email || '',
          phone: contact.phone || '', job_title: contact.job_title || '', department: contact.department || '',
          email_status: contact.email_status || 'unknown', email_confidence: contact.email_confidence || 'unknown',
          source: contact.source || '', source_url: contact.source_url || '', is_primary: !!contact.is_primary
        });
      }
      for (const source of Array.isArray(p.evidence) ? p.evidence : []) {
        if (!source.url) continue;
        sourceRows.push({
          prospect_id: row.id, user_id: userId, source_type: 'web', source_name: source.source_name || 'Google Search',
          source_url: source.url, evidence: source.evidence || ''
        });
      }
    }
    if (contactRows.length) {
      const contacts = await api.from('prospect_contacts').insert(contactRows);
      if (contacts.error) throw contacts.error;
    }
    if (sourceRows.length) {
      const sources = await api.from('prospect_sources').insert(sourceRows);
      if (sources.error) throw sources.error;
    }
    if (runId) {
      await api.from('prospecting_runs').update({ status: 'completed' }).eq('id', runId).eq('user_id', userId);
    }
    return { prospects: inserted.data || [] };
  }


  async function createProspectingRun(userId, input) {
    const api = requireClient();
    const segments = Array.isArray(input?.segments) ? input.segments.filter(s => ["Plásticos","Alimentos","Química","Papel e celulose","Tratamento de água"].includes(s)) : [];
    const keywords = Array.isArray(input?.keywords) ? input.keywords.map(v => clean(v)).filter(Boolean).slice(0, 20) : [];
    const payload = {
      user_id: userId,
      name: clean(input?.name).slice(0, 200) || 'Nova prospecção',
      product: clean(input?.product).slice(0, 200) || 'Soprador radial',
      region: clean(input?.region).slice(0, 200),
      segments,
      keywords,
      requested_limit: Math.max(1, Math.min(10, Number(input?.requestedLimit) || 10)),
      status: 'draft'
    };
    const { data, error } = await api.from('prospecting_runs').insert(payload).select('*').single();
    if (error) throw error;
    return { id: data.id, name: clean(data.name), product: clean(data.product), region: clean(data.region), segments: data.segments || [], keywords: data.keywords || [], requestedLimit: data.requested_limit, status: data.status, createdAt: data.created_at };
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
          value: window.SynapseMoney.parse(r.deal_value),
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
    deleteAccount,
    loadProspecting,
    createProspectingRun,
    searchProspecting
  };
})();
