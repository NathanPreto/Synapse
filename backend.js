(function(){
  // Fronteira entre a interface e a implementação de backend.
  // Nesta etapa, o adaptador ainda usa Supabase por baixo; o frontend não precisa conhecer essa implementação.
  const provider = window.SynapseSupabase;
  const auth = provider?.client?.auth || null;
  if (!provider) {
    window.SynapseLogger?.warn('Adaptador de backend iniciado sem o provedor de dados.');
  }
  window.SynapseBackend = {
    auth,
    syncUserRows: provider?.syncUserRows,
    deleteCloudRow: provider?.deleteCloudRow,
    syncSettings: provider?.syncSettings,
    loadSynapseData: provider?.loadSynapseData,
    requireClient: provider?.requireClient,
    provider: 'supabase'
  };
})();
