(function(){
  // Contrato público consumido pelo frontend.
  // A implementação concreta fica isolada em services/supabase.js.
  const provider = window.SynapseSupabase;
  if (!provider) {
    window.SynapseLogger?.warn('Backend iniciado sem um provedor de dados.');
  }
  window.SynapseBackend = {
    auth: provider?.auth || null,
    syncUserRows: provider?.syncUserRows,
    deleteCloudRow: provider?.deleteCloudRow,
    syncSettings: provider?.syncSettings,
    loadSynapseData: provider?.loadSynapseData,
    askAI: provider?.askAI,
    deleteAccount: provider?.deleteAccount
  };
})();
