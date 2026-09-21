/* Painel inicial (Hoje, Foco, Ações, Pipeline, Perdas). */

// span: largura (de 12 colunas) da seção no desktop — 7 principal, 5 lateral, 12 largura total.
function Section({ title, right, children, span }) {
  return React.createElement(
    'div',
    { className: 'mb-8' + (span ? ' sec-' + span : '') },
    React.createElement(
      'div',
      { className: 'flex items-center justify-between mb-3' },
      React.createElement(
        'h2',
        { className: 'serif text-base', style: { color: 'var(--text)' } },
        title
      ),
      right
    ),
    children
  );
}
function FocusSection({ dailyFocus, goTo }) {
  const rows = dailyFocus.slice(0, 3).map(item =>
    React.createElement(
      'div',
      {
        key: item.type + '-' + item.id,
        className: 'focus-item flex items-center gap-3 p-3 rounded text-sm',
        style: { background: 'var(--surface)', border: '1px solid var(--border)' }
      },
      React.createElement('div', {
        className: 'focus-dot',
        style: { background: item.type === 'client' ? 'var(--teal)' : 'var(--blue)' }
      }),
      React.createElement('div', { className: 'flex-1 min-w-0' }, item.text),
      React.createElement(
        'div',
        { className: 'text-xs', style: { color: 'var(--muted)' } },
        item.type === 'client' ? item.idle + 'd' : 'hoje'
      )
    )
  );
  return React.createElement(
    Section,
    {
      span: 7,
      title: 'Foco do Dia',
      right: React.createElement(
        'button',
        { onClick: () => goTo('foco'), className: 'text-xs', style: { color: 'var(--teal)' } },
        'ver tudo →'
      )
    },
    rows.length
      ? React.createElement('div', { className: 'space-y-2' }, rows)
      : React.createElement(
          'div',
          { className: 'text-sm', style: { color: 'var(--muted)' } },
          'Nada precisa ser priorizado agora.'
        )
  );
}
function LossSection({ lossReasons }) {
  const rows = lossReasons.slice(0, 5).map(([reason, n]) =>
    React.createElement(
      'div',
      {
        key: reason,
        className: 'p-3 rounded text-sm',
        style: { background: 'var(--surface)', border: '1px solid var(--border)' }
      },
      React.createElement('span', { className: 'loss-reason-label' }, reason),
      React.createElement(
        'b',
        { className: 'loss-reason-count', style: { color: 'var(--muted)' } },
        n
      )
    )
  );
  return lossReasons.length
    ? React.createElement(
        Section,
        { title: 'Motivos de perda', span: 12 },
        React.createElement('div', { className: 'loss-grid' }, rows)
      )
    : null;
}
function PainelHoje({ todayCheckin, pinnedPhrase, onCalm, goTo }) {
  const children = [];
  if (pinnedPhrase)
    children.push(
      React.createElement(
        'div',
        {
          key: 'pin',
          className: 'pinned-phrase mb-3',
          style: { background: 'var(--surface2)', border: '1px solid var(--border)' }
        },
        React.createElement(
          'div',
          { className: 'text-xs', style: { color: 'var(--teal)' } },
          'Frase de hoje'
        ),
        React.createElement(
          'div',
          { className: 'text-sm mt-1', style: { fontWeight: 600 } },
          pinnedPhrase.text
        )
      )
    );
  if (todayCheckin)
    children.push(
      React.createElement(
        'div',
        { key: 'check', className: 'text-sm', style: { color: 'var(--muted)' } },
        'Identidade de hoje',
        React.createElement(
          'div',
          { className: 'mt-1', style: { color: 'var(--text)', fontSize: 15, fontWeight: 600 } },
          todayCheckin.identity || 'Check-in feito hoje'
        ),
        todayCheckin.reframe &&
          React.createElement(
            'div',
            { className: 'text-xs mt-2', style: { color: 'var(--muted)' } },
            'Ação de hoje: ',
            React.createElement('span', { style: { color: 'var(--text)' } }, todayCheckin.reframe)
          ),
        React.createElement(
          'div',
          { className: 'text-xs mt-2', style: { color: 'var(--muted2)' } },
          'A identidade e a ação que você definiu no check-in da aba Mental.'
        )
      )
    );
  else
    children.push(
      React.createElement(
        'button',
        {
          key: 'go',
          onClick: () => goTo('mental'),
          className: 'w-full p-4 rounded text-left',
          style: {
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            color: 'var(--teal)'
          }
        },
        'Ainda não fez o check-in de hoje. Que tal começar por aqui?'
      )
    );
  return React.createElement(
    Section,
    {
      span: 7,
      title: 'Hoje',
      right: React.createElement(
        'button',
        {
          onClick: onCalm,
          className: 'calm-button px-3 py-2 rounded text-xs flex items-center gap-1.5',
          style: {
            background: 'var(--surface2)',
            color: 'var(--teal)',
            border: '1px solid var(--border)'
          }
        },
        React.createElement(Wind, { size: 15 }),
        ' Modo Calma'
      )
    },
    React.createElement(
      'div',
      {
        className: 'p-4 rounded',
        style: { background: 'var(--surface)', border: '1px solid var(--border)' }
      },
      children
    )
  );
}
function PainelAcoes({ followUps, pendingReminders, goTo }) {
  const rows = [];
  followUps.slice(0, 3).forEach(c =>
    rows.push(
      React.createElement(
        'div',
        {
          key: 'c' + c.id,
          className: 'flex items-center justify-between p-3 rounded text-sm',
          style: { background: 'var(--surface)', border: '1px solid var(--border)' }
        },
        React.createElement(
          'span',
          null,
          React.createElement('b', null, c.name),
          ' está há ',
          c.idle,
          ' dias sem contato. Que tal dar um oi acolhedor hoje?'
        ),
        React.createElement(
          'button',
          { onClick: () => goTo('lembretes'), style: { color: 'var(--teal)' } },
          'ver →'
        )
      )
    )
  );
  pendingReminders
    .filter(r => r.due && r.due < todayStr())
    .slice(0, 3)
    .forEach(r =>
      rows.push(
        React.createElement(
          'div',
          {
            key: 'r' + r.id,
            className: 'flex items-center justify-between p-3 rounded text-sm',
            style: { background: 'var(--surface)', border: '1px solid var(--border)' }
          },
          React.createElement('span', { style: { color: 'var(--muted)' } }, r.text),
          React.createElement(
            'button',
            { onClick: () => goTo('lembretes'), style: { color: 'var(--teal)' } },
            'ver →'
          )
        )
      )
    );
  return React.createElement(
    Section,
    { title: 'Ações sugeridas', span: 5 },
    rows.length
      ? React.createElement('div', { className: 'space-y-2' }, rows)
      : React.createElement(
          'div',
          { className: 'text-sm', style: { color: 'var(--muted)' } },
          'Nada parado no momento. O pipeline está em dia. Siga no seu ritmo.'
        )
  );
}
function PainelPipeline({ clients }) {
  const counts = STAGES.map(s => ({ ...s, n: clients.filter(c => c.stage === s.key).length }));
  const maxN = Math.max(1, ...counts.map(s => s.n));
  const rows = counts.map(s =>
    React.createElement(
      'div',
      { key: s.key, className: 'flex items-center gap-3 text-sm' },
      React.createElement(
        'div',
        { className: 'w-28 shrink-0', style: { color: 'var(--muted)' } },
        s.label
      ),
      React.createElement(
        'div',
        { className: 'flex-1 h-2 rounded', style: { background: 'var(--surface2)' } },
        React.createElement('div', {
          className: 'h-2 rounded',
          style: { width: (s.n / maxN) * 100 + '%', background: s.color }
        })
      ),
      React.createElement('div', { className: 'w-5 text-right' }, s.n)
    )
  );
  return React.createElement(
    Section,
    { title: 'Pipeline', span: 5 },
    React.createElement('div', { className: 'space-y-2' }, rows)
  );
}
function Painel({
  todayCheckin,
  clients,
  followUps,
  pendingReminders,
  correlation,
  lossReasons,
  dailyFocus,
  pinnedPhrase,
  goTo,
  onCalm
}) {
  const sections = [
    React.createElement(PainelHoje, { key: 'hoje', todayCheckin, pinnedPhrase, onCalm, goTo }),
    React.createElement(PainelAcoes, { key: 'acoes', followUps, pendingReminders, goTo }),
    React.createElement(FocusSection, { key: 'foco', dailyFocus, goTo }),
    React.createElement(PainelPipeline, { key: 'pipeline', clients }),
    React.createElement(LossSection, { key: 'loss', lossReasons })
  ];
  if (correlation.totalClosed > 0) {
    const corrBody = React.createElement(
      'div',
      {
        className: 'correlation-card p-4 rounded text-sm',
        style: { background: 'var(--surface)', border: '1px solid var(--border)' }
      },
      [
        React.createElement(
          'div',
          { key: 'a' },
          'Fechamentos em dias com check-in: ',
          React.createElement('b', { style: { color: 'var(--gold)' } }, correlation.closedWith)
        ),
        React.createElement(
          'div',
          { key: 'b' },
          'Fechamentos em dias sem check-in: ',
          React.createElement('b', { style: { color: 'var(--muted)' } }, correlation.closedWithout)
        )
      ]
    );
    sections.push(
      React.createElement(
        Section,
        { key: 'corr', title: 'Mentalidade × resultado', span: 12 },
        corrBody
      )
    );
  }
  return React.createElement('div', { className: 'pop' }, sections);
}
