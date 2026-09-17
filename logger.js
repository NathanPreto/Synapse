(function(){
  const listeners = new Set();
  const safeString = value => {
    try { return typeof value === 'string' ? value : JSON.stringify(value); } catch (_) { return String(value); }
  };
  function emit(level, message, error, context) {
    const payload = { level, message: safeString(message), error: error?.message || error || null, context: context || null, at: new Date().toISOString() };
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
