/*
 * Atalho para a conversa do cliente no WhatsApp.
 * O campo "contato" é texto livre (telefone, e-mail, "Maria - 11 91234-5678"...), então
 * extraímos o primeiro telefone plausível e o normalizamos para o formato do wa.me
 * (somente dígitos, com código do país). Sem DDD não há como abrir a conversa com segurança.
 */
(function () {
  const PHONE_CANDIDATE = /\+?\d[\d\s().-]{6,}\d/g;
  // DDDs existentes no Brasil (evita gerar link para prefixos que não existem).
  const VALID_DDD = new Set(
    (
      '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 ' +
      '51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 ' +
      '91 92 93 94 95 96 97 98 99'
    ).split(' ')
  );

  /** Retorna os dígitos no formato internacional (ex.: "5511912345678") ou null. */
  function parsePhone(contact) {
    const text = String(contact == null ? '' : contact);
    if (!text) return null;
    const candidates = text.match(PHONE_CANDIDATE) || [];
    for (const raw of candidates) {
      const hasPlus = raw.trim().startsWith('+');
      let digits = raw.replace(/\D/g, '');
      if (hasPlus && !digits.startsWith('55')) {
        // número internacional explícito
        if (digits.length >= 8 && digits.length <= 15) return digits;
        continue;
      }
      digits = digits.replace(/^00/, '');
      if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
      digits = digits.replace(/^0+/, ''); // prefixo de operadora/tronco: 011..., 0 11...
      if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
      if (digits.length === 10 || digits.length === 11) {
        if (VALID_DDD.has(digits.slice(0, 2))) return '55' + digits;
      }
    }
    return null;
  }

  function firstName(name) {
    const n =
      String(name || '')
        .trim()
        .split(/\s+/)[0] || '';
    return n;
  }

  function fillTemplate(text, clientName) {
    return String(text || '').replace(/\{nome\}/gi, firstName(clientName) || 'tudo bem');
  }

  /** URL da conversa. `message` (opcional) vai pré-preenchida; a pessoa ainda precisa enviar. */
  function buildLink(contact, message) {
    const phone = parsePhone(contact);
    if (!phone) return null;
    const base = 'https://wa.me/' + phone;
    const text = String(message || '').trim();
    return text ? base + '?text=' + encodeURIComponent(text) : base;
  }

  window.SynapseWhatsApp = { parsePhone, firstName, fillTemplate, buildLink };
})();
