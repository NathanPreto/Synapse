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
