/* Foco do Dia e Lembretes. */

function FocoDoDia({ items, toggleReminder, goTo }) {
  const rows = items.map((item, i) => {
    const action =
      item.type === 'client'
        ? React.createElement(
            'button',
            { onClick: () => goTo('clientes'), className: 'mini-action primary' },
            'Abrir clientes'
          )
        : React.createElement(
            'button',
            { onClick: () => toggleReminder(item.id), className: 'mini-action primary' },
            React.createElement(Check, { size: 13 }),
            ' Marcar como feito'
          );
    const detail =
      item.type === 'client'
        ? 'Cliente aguardando um próximo contato há ' + item.idle + ' dias'
        : item.due && item.due < todayStr()
          ? 'Lembrete que ficou para trás'
          : 'Lembrete previsto para hoje';
    return React.createElement(
      'div',
      { key: item.type + '-' + item.id, className: 'focus-card' },
      React.createElement('div', { className: 'focus-rank' }, String(i + 1).padStart(2, '0')),
      React.createElement(
        'div',
        { className: 'flex-1 min-w-0' },
        React.createElement('div', { className: 'text-sm', style: { fontWeight: 700 } }, item.text),
        React.createElement(
          'div',
          { className: 'text-xs mt-1', style: { color: 'var(--muted)' } },
          detail
        ),
        React.createElement('div', { className: 'flex gap-2 mt-3' }, action)
      )
    );
  });
  return React.createElement(
    'div',
    { className: 'pop' },
    React.createElement(
      Section,
      {
        title: 'Próximos Passos do Dia',
        right: React.createElement(
          'span',
          { className: 'text-xs', style: { color: 'var(--muted)' } },
          items.length ? items.length + ' prioridades' : 'sem prioridades'
        )
      },
      rows.length
        ? React.createElement('div', { className: 'focus-list' }, rows)
        : React.createElement(
            'div',
            { className: 'empty-soft' },
            'Nada precisa disputar sua atenção agora. Quando surgir algo, ele aparecerá aqui por prioridade.'
          )
    )
  );
}
function Lembretes({
  followUps,
  reminders,
  addReminder,
  toggleReminder,
  updateReminder,
  removeReminder,
  markContacted
}) {
  const [text, setText] = useState('');
  const [due, setDue] = useState(todayStr());
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDue, setEditDue] = useState('');
  const pending = reminders
    .filter(r => !r.done)
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const done = reminders.filter(r => r.done);
  const beginEdit = r => {
    setEditingId(r.id);
    setEditText(r.text);
    setEditDue(r.due || '');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditDue('');
  };
  const saveEdit = id => {
    if (!editText.trim()) return;
    updateReminder(id, { text: editText.trim(), due: editDue });
    cancelEdit();
  };
  return React.createElement(
    'div',
    { className: 'pop' },
    followUps.length > 0 &&
      React.createElement(
        Section,
        { title: 'Sugeridos pelo sistema' },
        React.createElement(
          'div',
          { className: 'space-y-2' },
          followUps.map(c =>
            React.createElement(
              'div',
              {
                key: c.id,
                className: 'flex items-center justify-between p-3 rounded text-sm',
                style: { background: 'var(--surface)', border: '1px solid var(--border)' }
              },
              React.createElement(
                'span',
                null,
                React.createElement('b', null, c.name),
                ' ',
                c.idle,
                ' dias sem contato. Que tal dar um oi acolhedor hoje?'
              ),
              React.createElement(
                'button',
                {
                  onClick: () => markContacted(c.id),
                  className: 'text-xs px-2 py-1 rounded',
                  style: { background: 'var(--teal)', color: 'var(--on-accent)' }
                },
                'Registrar contato'
              )
            )
          )
        )
      ),
    React.createElement(
      Section,
      { title: 'Meus lembretes' },
      React.createElement(
        'div',
        {
          className: 'p-3 rounded mb-3 flex flex-col md:flex-row gap-2',
          style: { background: 'var(--surface)', border: '1px solid var(--border)' }
        },
        React.createElement('input', {
          value: text,
          onChange: e => setText(e.target.value),
          placeholder: 'O que fazer',
          className: 'flex-1 p-2 rounded text-sm'
        }),
        React.createElement('input', {
          type: 'date',
          value: due,
          onChange: e => setDue(e.target.value),
          className: 'p-2 rounded text-sm'
        }),
        React.createElement(
          'button',
          {
            onClick: () => {
              if (!text.trim()) return;
              addReminder(text.trim(), due);
              setText('');
            },
            className: 'px-3 py-2 rounded text-sm',
            style: { background: 'var(--ember)', color: 'var(--on-accent)', fontWeight: 500 }
          },
          'Adicionar'
        )
      ),
      React.createElement(
        'div',
        { className: 'space-y-2' },
        pending.length === 0 &&
          React.createElement(
            'div',
            { className: 'text-sm', style: { color: 'var(--muted)' } },
            'Nada pendente.'
          ),
        pending.map(r => {
          const overdue = r.due && r.due < todayStr();
          if (editingId === r.id) {
            return React.createElement(
              'div',
              {
                key: r.id,
                className:
                  'flex flex-col md:flex-row items-stretch md:items-center gap-2 p-3 rounded text-sm',
                style: { background: 'var(--surface)', border: '1px solid var(--teal)' }
              },
              React.createElement('input', {
                value: editText,
                onChange: e => setEditText(e.target.value),
                className: 'flex-1 p-2 rounded text-sm',
                placeholder: 'O que fazer'
              }),
              React.createElement('input', {
                type: 'date',
                value: editDue,
                onChange: e => setEditDue(e.target.value),
                className: 'p-2 rounded text-sm'
              }),
              React.createElement(
                'div',
                { className: 'flex gap-2' },
                React.createElement(
                  'button',
                  {
                    onClick: () => saveEdit(r.id),
                    className: 'px-2 py-1 rounded text-xs',
                    style: { background: 'var(--teal)', color: 'var(--on-accent)', fontWeight: 600 }
                  },
                  'Salvar'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: cancelEdit,
                    className: 'px-2 py-1 rounded text-xs',
                    style: { color: 'var(--muted)' }
                  },
                  'Cancelar'
                )
              )
            );
          }
          return React.createElement(
            'div',
            {
              key: r.id,
              className: 'flex items-center gap-3 p-3 rounded text-sm',
              style: { background: 'var(--surface)', border: '1px solid var(--border)' }
            },
            React.createElement('button', {
              onClick: () => toggleReminder(r.id),
              title: 'Marcar como feito',
              className: 'w-4 h-4 rounded-full shrink-0',
              style: { border: '1.5px solid var(--muted)' }
            }),
            React.createElement('div', { className: 'flex-1' }, r.text),
            React.createElement(
              'div',
              { className: 'text-xs', style: { color: overdue ? 'var(--gold)' : 'var(--muted)' } },
              fmtDate(r.due)
            ),
            React.createElement(
              'button',
              {
                onClick: () => beginEdit(r),
                title: 'Editar lembrete',
                style: { color: 'var(--muted)' }
              },
              React.createElement(Edit3, { size: 13 })
            ),
            React.createElement(
              'button',
              {
                onClick: () => removeReminder(r.id),
                title: 'Excluir lembrete',
                style: { color: 'var(--muted)' }
              },
              React.createElement(X, { size: 14 })
            )
          );
        })
      ),
      done.length > 0 &&
        React.createElement(
          'div',
          { className: 'mt-4 space-y-1.5' },
          done.map(r =>
            React.createElement(
              'div',
              {
                key: r.id,
                className: 'flex items-center gap-3 p-2 rounded text-xs',
                style: { color: 'var(--muted)' }
              },
              React.createElement(
                'button',
                {
                  onClick: () => toggleReminder(r.id),
                  title: 'Desmarcar como feito',
                  style: { color: 'var(--teal)', display: 'flex', alignItems: 'center' }
                },
                React.createElement(Check, { size: 12 })
              ),
              React.createElement('div', { className: 'flex-1 line-through' }, r.text),
              React.createElement(
                'button',
                { onClick: () => removeReminder(r.id), title: 'Excluir lembrete' },
                React.createElement(X, { size: 12 })
              )
            )
          )
        )
    )
  );
}
