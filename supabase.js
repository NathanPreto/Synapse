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
