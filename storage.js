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
