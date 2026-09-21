/* Assistente Syn: formatação segura de mensagens e janela de chat. */

function formatSynMessage(text) {
  const value = String(text || '')
    .replace(/\r\n?/g, '\n')
    .trim();
  if (!value) return [{ type: 'text', text: '' }];
  const lines = value.split('\n');
  const blocks = [];
  let list = [];
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'list', items: list });
      list = [];
    }
  };
  lines.forEach(line => {
    const clean = line.trim();
    if (!clean) {
      flushList();
      return;
    }
    const listMatch = clean.match(/^(?:[-*]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      list.push(listMatch[1]);
      return;
    }
    flushList();
    blocks.push({ type: 'text', text: clean });
  });
  flushList();
  return blocks;
}
function renderSynMessage(message) {
  try {
    const blocks =
      Array.isArray(message?.blocks) && message.blocks.length
        ? message.blocks
        : formatSynMessage(message?.text);
    return blocks.map((block, blockIndex) => {
      if (block?.type === 'list' && Array.isArray(block.items)) {
        return React.createElement(
          'ol',
          { key: blockIndex, className: 'ai-message-list' },
          block.items.map((item, itemIndex) =>
            React.createElement('li', { key: itemIndex }, String(item || ''))
          )
        );
      }
      return React.createElement('p', { key: blockIndex }, String(block?.text || ''));
    });
  } catch (_) {
    return React.createElement('p', null, String(message?.text || ''));
  }
}
const AI_SUGGESTIONS = [
  'O que priorizo hoje?',
  'Quais clientes estão parados?',
  'Escreva um follow-up para o cliente mais parado',
  'Estou pressionado hoje. Pode me ajudar?'
];

function AIAssistant({
  messages,
  question,
  setQuestion,
  busy,
  onAsk,
  onClose,
  onClear,
  aiConsent,
  onAuthorizeAI
}) {
  const endRef = React.useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy]);
  const submit = e => {
    e.preventDefault();
    onAsk();
  };
  const [authorizing, setAuthorizing] = useState(false);
  const authorize = async () => {
    setAuthorizing(true);
    try {
      await onAuthorizeAI();
    } catch (_) {
    } finally {
      setAuthorizing(false);
    }
  };
  return React.createElement(
    'div',
    { className: 'modal-backdrop' },
    React.createElement(
      'section',
      { className: 'smart-modal ai-modal ai-chat-modal', 'aria-label': 'Assistente Synapse' },
      React.createElement(
        'header',
        { className: 'ai-chat-header' },
        React.createElement(
          'div',
          { className: 'ai-chat-title' },
          React.createElement(
            'div',
            { className: 'ai-avatar' },
            React.createElement(Sparkles, { size: 16 })
          ),
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'ai-chat-name' }, 'Syn'),
            React.createElement(
              'div',
              { className: 'ai-chat-status' },
              'Assistente Synapse · online'
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'ai-chat-actions' },
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: onClear,
              className: 'ai-chat-action',
              title: 'Nova conversa'
            },
            'Nova conversa'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: onClose,
              className: 'ai-chat-action',
              'aria-label': 'Fechar'
            },
            React.createElement(X, { size: 17 })
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'ai-chat-body' },
        !aiConsent &&
          React.createElement(
            'div',
            { className: 'ai-consent' },
            React.createElement('strong', null, 'Autorize o uso da IA para conversar com a Syn'),
            React.createElement(
              'p',
              null,
              'Suas mensagens e um resumo dos seus clientes, lembretes e humor (números, sem os textos dos seus check-ins) são enviados ao Google Gemini para gerar as respostas. Você pode revogar em Configurações.'
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'ai-consent-button',
                onClick: authorize,
                disabled: authorizing
              },
              authorizing ? 'Salvando...' : 'Autorizar e usar a Syn'
            )
          ),
        messages.length === 0 &&
          React.createElement(
            'div',
            { className: 'ai-welcome' },
            React.createElement(
              'div',
              { className: 'ai-welcome-avatar' },
              React.createElement(Sparkles, { size: 20 })
            ),
            React.createElement('h2', null, 'Como posso te ajudar?'),
            React.createElement(
              'p',
              null,
              'Posso pensar com você sobre seus leads, follow-ups, negociação e rotina comercial.'
            ),
            aiConsent &&
              React.createElement(
                'div',
                { className: 'ai-suggestions' },
                AI_SUGGESTIONS.map(text =>
                  React.createElement(
                    'button',
                    {
                      key: text,
                      type: 'button',
                      className: 'ai-suggestion',
                      onClick: () => onAsk(text)
                    },
                    text
                  )
                )
              )
          ),
        messages.map((message, index) =>
          React.createElement(
            'div',
            {
              key: index,
              className: 'ai-message-row ' + (message.role === 'user' ? 'user' : 'assistant')
            },
            message.role === 'model' &&
              React.createElement(
                'div',
                { className: 'ai-message-avatar' },
                React.createElement(Sparkles, { size: 12 })
              ),
            React.createElement(
              'div',
              {
                className: 'ai-message-bubble' + (message.safety === 'crisis' ? ' is-safety' : '')
              },
              renderSynMessage(message),
              message.safety === 'crisis' &&
                React.createElement(
                  'div',
                  { className: 'ai-crisis-actions' },
                  React.createElement(
                    'a',
                    { href: 'tel:188', className: 'ai-crisis-call' },
                    'Ligar para o CVV (188)'
                  ),
                  React.createElement(
                    'a',
                    { href: 'tel:192', className: 'ai-crisis-call' },
                    'Ligar para o SAMU (192)'
                  )
                )
            )
          )
        ),
        busy &&
          React.createElement(
            'div',
            {
              className: 'ai-message-row assistant',
              role: 'status',
              'aria-label': 'Syn está digitando'
            },
            React.createElement(
              'div',
              { className: 'ai-message-avatar' },
              React.createElement(Sparkles, { size: 12 })
            ),
            React.createElement(
              'div',
              { className: 'ai-message-bubble ai-typing' },
              React.createElement('span'),
              React.createElement('span'),
              React.createElement('span')
            )
          ),
        React.createElement('div', { ref: endRef })
      ),
      React.createElement(
        'form',
        { className: 'ai-chat-composer', onSubmit: submit },
        React.createElement('textarea', {
          value: question,
          onChange: e => setQuestion(e.target.value),
          onKeyDown: e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          },
          placeholder: 'Escreva uma mensagem...',
          rows: 1,
          disabled: busy,
          autoFocus: true
        }),
        React.createElement(
          'button',
          {
            type: 'submit',
            disabled: busy || !question.trim(),
            className: 'ai-send',
            'aria-label': 'Enviar'
          },
          React.createElement('span', null, '↑')
        )
      ),
      React.createElement(
        'p',
        { className: 'ai-disclaimer' },
        window.SynapseSafety?.NOT_THERAPY_NOTICE || ''
      )
    )
  );
}
