/*
 * Detecção de risco emocional e respostas de segurança da Syn.
 *
 * FONTE ÚNICA da lógica de segurança: este arquivo é usado pela Edge Function (Deno)
 * e copiado para src/safety.js para o navegador (`npm run sync:shared`; um teste
 * garante que as cópias são idênticas). Publica `globalThis.SynapseSafety`.
 *
 * A detecção é propositalmente conservadora: prefere falso positivo (mostrar recursos
 * de apoio sem necessidade) a falso negativo (ignorar um pedido de ajuda).
 */
(function () {
  function normalize(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Risco imediato: ideação suicida, automutilação, plano ou meio.
  const CRISIS_PATTERNS = [
    /\bsuicid/,
    /\b(me|vou me|quero me|queria me|pensando em me|penso em me|vontade de me|desejo de me|ia me)\s+(matar|enforcar|cortar|machucar|ferir|envenenar|explodir)\b/,
    /\bme\s+(jogar|atirar)\s+(da|do|de|na frente|no|na)\b/,
    /\b(quero|queria|vou|penso em|pensando em|vontade de|desejo de|prefiro|preferia|melhor|decidi)\s+(morrer|sumir de vez|desaparecer de vez|acabar com tudo|acabar com minha vida|acabar com a minha vida|acabar com a vida|tirar minha vida|tirar a minha vida|tirar minha propria vida|tirar a propria vida)\b/,
    /\b(nao|n)\s+(quero|aguento|consigo|suporto)\s+mais\s+(viver|continuar vivo|continuar viva|existir)\b/,
    /\bnao\s+(vale a pena|vejo sentido em)\s+(mais\s+)?(viver|continuar|seguir|minha vida|a vida)\b/,
    /\b(acabar|terminar)\s+com\s+(tudo|minha vida|a minha vida|a vida)\b/,
    /\bauto\s?mutila/,
    /\boverdose\b/,
    /\btomar\s+(todos\s+os|todo\s+o|um\s+monte\s+de)\s+(remedios?|comprimidos?|medicamentos?)\b/,
    /\bmelhor\s+(sem mim|se eu nao existisse|se eu morresse|se eu sumisse)\b/,
    /\b(ninguem|todos)\s+(sentiria|sentiriam)\s+(a\s+)?(minha\s+)?falta\b/,
    /\bquero\s+(dar\s+fim|por\s+fim)\s+(a|na|em)\s+(minha\s+)?vida\b/
  ];

  // Sofrimento intenso, sem menção a autoagressão: continua a conversa, com cuidado extra.
  const DISTRESS_PATTERNS = [
    /\bdepress(ao|ivo|iva)\b/,
    /\bcrise\s+(de\s+)?(ansiedade|panico|choro)\b/,
    /\bataque\s+(de\s+)?(panico|ansiedade)\b/,
    /\bburn\s?out\b/,
    /\besgotamento\b/,
    /\bnao\s+(aguento|consigo|suporto)\s+mais\b/,
    /\bsem\s+esperanca\b/,
    /\bdesesper/,
    /\b(sem forcas?|sem vontade)\s+(pra|para|de)\s+(nada|viver|levantar)\b/,
    /\bnao\s+consigo\s+(dormir|comer|respirar|parar de chorar)\b/,
    /\b(chorando|chorei)\s+(o dia todo|muito|sem parar)\b/,
    /\bme\s+sinto\s+(um\s+)?(fracasso|inutil|incapaz|sozinho|sozinha|vazio|vazia)\b/
  ];

  function detectRisk(text) {
    const t = normalize(text);
    if (!t) return null;
    if (CRISIS_PATTERNS.some(re => re.test(t))) return 'crisis';
    if (DISTRESS_PATTERNS.some(re => re.test(t))) return 'distress';
    return null;
  }

  const CRISIS_RESPONSE =
    'Sinto muito que você esteja passando por isso, e fico feliz que tenha escrito. ' +
    'Sua vida importa mais do que qualquer meta ou venda, e você não precisa enfrentar isso sozinho(a).\n\n' +
    'Se existe risco imediato, ligue agora para o SAMU (192) ou vá ao pronto-socorro mais próximo. ' +
    'Você também pode falar com o CVV pelo 188 (ligação gratuita, 24 horas) ou pelo chat em cvv.org.br. ' +
    'Se puder, avise agora uma pessoa de confiança e não fique sozinho(a).\n\n' +
    'Sou uma assistente virtual e não substituo atendimento profissional de saúde mental.';

  const DISTRESS_NOTE =
    '\n\nSe isso estiver pesado demais, vale conversar com um profissional de saúde mental. ' +
    'O CVV atende pelo 188, gratuito e 24 horas. Sou uma assistente virtual e não substituo terapia.';

  const NOT_THERAPY_NOTICE =
    'A Syn e o Synapse não substituem terapia, diagnóstico ou atendimento médico. ' +
    'Em crise, ligue 188 (CVV, 24h) ou 192 (SAMU).';

  globalThis.SynapseSafety = {
    normalize,
    detectRisk,
    CRISIS_RESPONSE,
    DISTRESS_NOTE,
    NOT_THERAPY_NOTICE
  };
})();
