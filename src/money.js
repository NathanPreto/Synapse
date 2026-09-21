/*
 * Valor da negociação (R$). Guardamos um número (reais, 2 casas) e exibimos em formato brasileiro.
 * A entrada é texto livre: "1500", "1.500", "1.500,50", "R$ 1.500,50", "1500.5"...
 */
(function () {
  const MAX = 999999999999.99;

  function parse(input) {
    if (typeof input === 'number') {
      if (!Number.isFinite(input) || input < 0) return 0;
      return Math.min(MAX, Math.round(input * 100) / 100);
    }
    let s = String(input == null ? '' : input).replace(/[^\d.,]/g, '');
    if (!s) return 0;
    if (s.includes(',')) {
      // Vírgula é o separador decimal; pontos são milhar.
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      // "1.500" / "1.234.567": milhar no padrão brasileiro.
      s = s.replace(/\./g, '');
    } else if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, '');
    }
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(MAX, Math.round(n * 100) / 100);
  }

  function format(value) {
    const n = parse(value);
    return n.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /** Texto para editar no campo: "1500,5" -> "1.500,50"; 0 -> "". */
  function toInput(value) {
    const n = parse(value);
    if (!n) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function sum(values) {
    return Math.round(values.reduce((t, v) => t + parse(v), 0) * 100) / 100;
  }

  window.SynapseMoney = { parse, format, toInput, sum, MAX };
})();
