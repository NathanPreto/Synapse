/* Aba Clientes: pipeline, cartões, modelos de mensagem. */

function Clientes({
  clients,
  addClient,
  updateClient,
  removeClient,
  importExcel,
  templates,
  setTemplates,
  userId
}) {
  const [showAdd, setShowAdd] = useState(false);
  const excelInputRef = React.useRef(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [collapsedStages, setCollapsedStages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`synapse-clientes-collapsed-${userId}`) || '{}');
    } catch (_) {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`synapse-clientes-collapsed-${userId}`, JSON.stringify(collapsedStages));
    } catch (_) {}
  }, [collapsedStages, userId]);
  const [showTemplates, setShowTemplates] = useState(false);
  return React.createElement(
    'div',
    { className: 'pop clientes-ui' },
    React.createElement(Section, {
      title: 'Clientes',
      right: React.createElement(
        'div',
        { className: 'flex items-center gap-3' },
        React.createElement(
          'button',
          {
            onClick: () => excelInputRef.current?.click(),
            className: 'flex items-center gap-1 text-sm',
            style: { color: 'var(--teal)' }
          },
          React.createElement(Upload, { size: 15 }),
          ' importar Excel'
        ),
        React.createElement(
          'button',
          {
            onClick: () => setShowAdd(v => !v),
            className: 'flex items-center gap-1 text-sm',
            style: { color: 'var(--teal)' }
          },
          React.createElement(Plus, { size: 15 }),
          ' novo'
        ),
        React.createElement(
          'button',
          {
            onClick: () => setShowTemplates(true),
            className: 'flex items-center gap-1 text-sm',
            style: { color: 'var(--teal)' }
          },
          React.createElement(CopyIcon, { size: 15 }),
          ' modelos'
        ),
        React.createElement('input', {
          ref: excelInputRef,
          type: 'file',
          accept:
            '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv',
          className: 'hidden',
          onChange: e => {
            const f = e.target.files?.[0];
            if (f) importExcel(f);
            e.target.value = '';
          }
        })
      )
    }),
    showTemplates &&
      React.createElement(TemplatesModal, {
        templates,
        setTemplates,
        onClose: () => setShowTemplates(false)
      }),
    showAdd &&
      React.createElement(
        'div',
        {
          className: 'p-3 rounded mb-3 flex flex-col md:flex-row gap-2',
          style: { background: 'var(--surface)', border: '1px solid var(--border)' }
        },
        React.createElement('input', {
          value: name,
          onChange: e => setName(e.target.value),
          placeholder: 'Nome',
          className: 'flex-1 p-2 rounded text-sm'
        }),
        React.createElement('input', {
          value: contact,
          onChange: e => setContact(e.target.value),
          placeholder: 'Contato (telefone/e-mail)',
          className: 'flex-1 p-2 rounded text-sm'
        }),
        React.createElement(
          'button',
          {
            onClick: () => {
              if (!name.trim()) return;
              addClient(name.trim(), contact.trim());
              setName('');
              setContact('');
              setShowAdd(false);
            },
            className: 'px-3 py-2 rounded text-sm',
            style: { background: 'var(--teal)', color: 'var(--on-accent)', fontWeight: 500 }
          },
          'Adicionar'
        )
      ),
    React.createElement(
      'div',
      { className: 'clientes-pipeline' },
      STAGES.map(stage => {
        const stageClients = clients.filter(c => c.stage === stage.key);
        const collapsed = !!collapsedStages[stage.key];
        return React.createElement(
          'div',
          { key: stage.key, className: 'cliente-stage' + (collapsed ? ' is-collapsed' : '') },
          React.createElement(
            'div',
            {
              className: 'cliente-stage-header flex items-center justify-between gap-2',
              style: { color: stage.color }
            },
            React.createElement(
              'div',
              { className: 'flex items-center gap-1.5 text-xs min-w-0' },
              React.createElement('div', {
                className: 'w-1.5 h-1.5 rounded-full shrink-0',
                style: { background: stage.color }
              }),
              React.createElement('span', { className: 'cliente-stage-title' }, stage.label),
              React.createElement(
                'span',
                { className: 'cliente-stage-count' },
                ' · ' + stageClients.length
              )
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'cliente-stage-toggle',
                onClick: e => {
                  e.stopPropagation();
                  setCollapsedStages(prev => ({ ...prev, [stage.key]: !prev[stage.key] }));
                },
                'aria-expanded': !collapsed,
                'aria-label': (collapsed ? 'Expandir ' : 'Minimizar ') + stage.label,
                title: collapsed ? 'Expandir' : 'Minimizar'
              },
              React.createElement(ChevronDown, { size: 15 })
            )
          ),
          React.createElement(
            'div',
            { className: 'cliente-stage-body' },
            React.createElement(
              'div',
              { className: 'space-y-2' },
              stageClients.map(c =>
                React.createElement(ClientCard, {
                  key: c.id,
                  client: c,
                  expanded: expanded === c.id,
                  onToggle: () => setExpanded(expanded === c.id ? null : c.id),
                  updateClient,
                  removeClient,
                  templates
                })
              )
            )
          )
        );
      })
    )
  );
}
function whatsappLinkFor(client, templates) {
  const t =
    [...templates, ...DEFAULT_TEMPLATES].find(x => x.category === client.temp) ||
    DEFAULT_TEMPLATES[0];
  return SynapseWhatsApp.buildLink(
    client.contact,
    SynapseWhatsApp.fillTemplate(t.text, client.name)
  );
}

function WhatsAppButton({ client, templates, compact }) {
  const href = whatsappLinkFor(client, templates);
  if (!href) {
    return compact
      ? null
      : React.createElement(
          'span',
          {
            className: 'whatsapp-btn is-disabled',
            title: 'Adicione um telefone com DDD no contato'
          },
          React.createElement(MessageCircle, { size: 14 }),
          ' Adicione um telefone com DDD'
        );
  }
  return React.createElement(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'whatsapp-btn' + (compact ? ' is-compact' : ''),
      title: 'Abrir conversa no WhatsApp',
      'aria-label': 'Abrir conversa com ' + client.name + ' no WhatsApp',
      onClick: e => e.stopPropagation()
    },
    React.createElement(MessageCircle, { size: compact ? 16 : 14 }),
    compact ? null : ' Abrir conversa no WhatsApp'
  );
}

function ClientCard({ client, expanded, onToggle, updateClient, removeClient, templates = [] }) {
  const temp = TEMPS.find(t => t.key === client.temp);
  const idle = daysBetween(client.lastContact || client.createdAt, todayStr());
  const header = React.createElement(
    'div',
    { className: 'flex items-center justify-between cursor-pointer', onClick: onToggle },
    React.createElement(
      'div',
      null,
      React.createElement('div', null, client.name),
      React.createElement(
        'div',
        { className: 'text-xs flex items-center gap-1.5 mt-0.5', style: { color: 'var(--muted)' } },
        React.createElement(
          'span',
          { style: { color: temp === null || temp === void 0 ? void 0 : temp.color } },
          temp === null || temp === void 0 ? void 0 : temp.label
        ),
        ' \u00B7 ',
        idle,
        'd sem contato'
      )
    ),
    React.createElement(
      'div',
      { className: 'flex items-center gap-2' },
      React.createElement(WhatsAppButton, { client, templates, compact: true }),
      React.createElement(ChevronDown, {
        size: 14,
        style: { color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'none' }
      })
    )
  );
  const expandedContent = !expanded
    ? null
    : React.createElement(
        'div',
        { className: 'mt-3 space-y-2 pt-3', style: { borderTop: '1px solid var(--border)' } },
        client.contact &&
          React.createElement(
            'div',
            { className: 'text-xs flex items-center gap-1', style: { color: 'var(--muted)' } },
            React.createElement(Phone, { size: 11 }),
            client.contact
          ),
        React.createElement(WhatsAppButton, { client, templates }),
        React.createElement(
          'button',
          {
            onClick: () => {
              const t =
                [...templates, ...DEFAULT_TEMPLATES].find(x => x.category === client.temp) ||
                DEFAULT_TEMPLATES[0];
              copyText(t.text.replace(/\{nome\}/g, client.name));
            },
            className: 'text-xs flex items-center gap-1',
            style: { color: 'var(--teal)' }
          },
          React.createElement(CopyIcon, { size: 12 }),
          ' Copiar mensagem sugerida'
        ),
        React.createElement(
          'div',
          { className: 'cliente-stage-actions flex gap-1.5 flex-wrap' },
          STAGES.map(s =>
            React.createElement(
              'button',
              {
                key: s.key,
                onClick: () => updateClient(client.id, { stage: s.key }),
                className: 'cliente-pill px-2 py-1 rounded text-xs',
                style: {
                  background: client.stage === s.key ? s.color : 'var(--surface2)',
                  color: client.stage === s.key ? 'var(--on-accent)' : 'var(--muted)'
                }
              },
              s.label
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'cliente-temp-actions flex gap-1.5' },
          TEMPS.map(t =>
            React.createElement(
              'button',
              {
                key: t.key,
                onClick: () => updateClient(client.id, { temp: t.key }),
                className: 'cliente-temp-pill px-2 py-1 rounded text-xs',
                style: {
                  background: client.temp === t.key ? t.color : 'var(--surface2)',
                  color: client.temp === t.key ? 'var(--on-accent)' : 'var(--muted)'
                }
              },
              t.label
            )
          )
        ),
        client.stage === 'perdido' && React.createElement(LostReasonTags, { client, updateClient }),
        React.createElement('textarea', {
          value: client.notes || '',
          onChange: e => updateClient(client.id, { notes: e.target.value }),
          placeholder: 'Notas',
          rows: 2,
          className: 'w-full p-2 rounded text-xs'
        }),
        React.createElement(
          'div',
          { className: 'flex items-center gap-2 flex-wrap', style: { color: 'var(--muted)' } },
          React.createElement(Clock, { size: 12 }),
          React.createElement('span', { className: 'text-xs' }, 'Último contato'),
          React.createElement('input', {
            type: 'date',
            value: client.lastContact || '',
            onChange: e => updateClient(client.id, { lastContact: e.target.value }),
            className: 'p-1.5 rounded text-xs',
            style: { flex: '0 0 auto' }
          }),
          React.createElement(
            'button',
            {
              onClick: () => updateClient(client.id, { lastContact: todayStr() }),
              className: 'text-xs',
              style: { color: 'var(--teal)' }
            },
            'hoje'
          )
        ),
        React.createElement(
          'div',
          { className: 'flex items-center justify-end pt-1' },
          React.createElement(
            'button',
            {
              onClick: () => removeClient(client.id),
              className: 'text-xs flex items-center gap-1',
              style: { color: 'var(--rose)' }
            },
            React.createElement(Trash2, { size: 13 }),
            ' excluir cliente'
          )
        )
      );
  return React.createElement(
    'div',
    {
      className: 'p-2.5 rounded text-sm',
      style: { background: 'var(--surface)', border: '1px solid var(--border)' }
    },
    header,
    expandedContent
  );
}
const TEMPLATE_CATEGORIES = [
  { key: 'frio', label: 'Frio' },
  { key: 'morno', label: 'Morno' },
  { key: 'quente', label: 'Quente' },
  { key: 'fechamento', label: 'Fechamento' }
];
const DEFAULT_TEMPLATES = [
  {
    id: 'default-frio',
    title: 'Primeiro oi',
    category: 'frio',
    text: 'Oi, {nome}! Passando para me apresentar e entender se faz sentido conversarmos sobre isso. Se preferir, posso te mandar um resumo por aqui.'
  },
  {
    id: 'default-morno',
    title: 'Retomada leve',
    category: 'morno',
    text: 'Oi, {nome}! Tudo bem? Lembrei da nossa conversa e queria saber como está o momento por aí. Se fizer sentido, posso te ajudar a dar o próximo passo.'
  },
  {
    id: 'default-quente',
    title: 'Próximo passo',
    category: 'quente',
    text: 'Oi, {nome}! Percebi que estamos perto de avançar. Quer alinharmos o próximo passo e deixar tudo simples para você?'
  },
  {
    id: 'default-fechamento',
    title: 'Fechamento acolhedor',
    category: 'fechamento',
    text: '{nome}, obrigado pela confiança. Se estiver tudo certo por aí, posso organizar os próximos passos para deixarmos a contratação bem tranquila.'
  }
];
function LostReasonTags({ client, updateClient }) {
  const tags = Array.isArray(client.lostTags) ? client.lostTags : [];
  const toggle = tag =>
    updateClient(client.id, {
      lostTags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
    });
  return React.createElement(
    'div',
    { className: 'lost-reason-box' },
    React.createElement(
      'div',
      { className: 'flex items-center gap-2' },
      React.createElement(Tag, { size: 13, style: { color: 'var(--muted)' } }),
      React.createElement(
        'div',
        { className: 'text-xs', style: { fontWeight: 650 } },
        'Por que este lead foi perdido?'
      ),
      React.createElement(
        'span',
        { className: 'text-xs', style: { color: 'var(--muted2)' } },
        'opcional'
      )
    ),
    React.createElement(
      'div',
      { className: 'lost-tags' },
      LOST_TAGS.map(tag =>
        React.createElement(
          'button',
          {
            key: tag,
            onClick: () => toggle(tag),
            className: 'lost-tag',
            style: {
              background: tags.includes(tag)
                ? 'color-mix(in srgb, var(--teal) 12%, var(--surface2))'
                : 'var(--surface2)',
              color: tags.includes(tag) ? 'var(--teal)' : 'var(--muted)',
              borderColor: tags.includes(tag)
                ? 'color-mix(in srgb, var(--teal) 45%, var(--border))'
                : 'var(--border)'
            }
          },
          tags.includes(tag) ? '✓ ' : '',
          tag
        )
      )
    ),
    React.createElement('input', {
      value: client.lostReason || '',
      onChange: e => updateClient(client.id, { lostReason: e.target.value }),
      placeholder: 'Observação opcional',
      className: 'w-full p-2.5 rounded text-xs'
    })
  );
}
function TemplatesModal({ templates, setTemplates, onClose }) {
  const [category, setCategory] = useState('frio');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('todos');
  const all = [...DEFAULT_TEMPLATES, ...templates];
  const visible = all.filter(t => filter === 'todos' || t.category === filter);
  const reset = () => {
    setTitle('');
    setText('');
    setEditing(null);
  };
  const save = () => {
    if (!title.trim() || !text.trim()) return;
    const item = {
      id: editing || uid(),
      title: sanitizeInput(title.trim(), 200),
      category: sanitizeInput(category, 40),
      text: sanitizeInput(text.trim(), 5000)
    };
    setTemplates(prev =>
      editing ? prev.map(x => (x.id === editing ? item : x)) : [...prev, item]
    );
    reset();
  };
  const beginEdit = t => {
    setEditing(t.id);
    setTitle(t.title);
    setText(t.text);
    setCategory(t.category);
  };
  return React.createElement(
    'div',
    { className: 'modal-backdrop' },
    React.createElement(
      'div',
      { className: 'smart-modal templates-modal' },
      React.createElement(
        'div',
        { className: 'modal-head' },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { className: 'text-lg', style: { fontWeight: 750 } },
            'Modelos de mensagens'
          ),
          React.createElement(
            'div',
            { className: 'text-xs mt-1', style: { color: 'var(--muted)' } },
            'Mensagens prontas para reduzir a fadiga de decidir o que escrever.'
          )
        ),
        React.createElement(
          'button',
          { onClick: onClose, className: 'icon-button' },
          React.createElement(X, { size: 18 })
        )
      ),
      React.createElement(
        'div',
        { className: 'template-tabs' },
        React.createElement(
          'button',
          { onClick: () => setFilter('todos'), className: filter === 'todos' ? 'active' : '' },
          'Todos'
        ),
        TEMPLATE_CATEGORIES.map(c =>
          React.createElement(
            'button',
            {
              key: c.key,
              onClick: () => setFilter(c.key),
              className: filter === c.key ? 'active' : ''
            },
            c.label
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'template-editor' },
        React.createElement(
          'div',
          { className: 'text-sm', style: { fontWeight: 700 } },
          editing ? 'Editar modelo' : 'Novo modelo'
        ),
        React.createElement(
          'div',
          { className: 'template-editor-grid' },
          React.createElement(
            'select',
            {
              value: category,
              onChange: e => setCategory(e.target.value),
              className: 'p-3 rounded text-sm'
            },
            TEMPLATE_CATEGORIES.map(c =>
              React.createElement('option', { key: c.key, value: c.key }, c.label)
            )
          ),
          React.createElement('input', {
            value: title,
            onChange: e => setTitle(e.target.value),
            placeholder: 'Nome do modelo',
            className: 'p-3 rounded text-sm'
          })
        ),
        React.createElement('textarea', {
          value: text,
          onChange: e => setText(e.target.value),
          rows: 4,
          placeholder: 'Escreva a mensagem. Use {nome} para personalizar.',
          className: 'w-full p-3 rounded text-sm mt-2'
        }),
        React.createElement(
          'div',
          { className: 'flex gap-2 mt-2' },
          React.createElement(
            'button',
            {
              onClick: save,
              disabled: !title.trim() || !text.trim(),
              className: 'px-3 py-2 rounded text-sm',
              style: {
                background: title.trim() && text.trim() ? 'var(--teal)' : 'var(--surface2)',
                color: title.trim() && text.trim() ? 'var(--on-accent)' : 'var(--muted)',
                fontWeight: 700
              }
            },
            editing ? 'Salvar alterações' : 'Adicionar modelo'
          ),
          editing &&
            React.createElement(
              'button',
              {
                onClick: reset,
                className: 'px-3 py-2 rounded text-sm',
                style: { background: 'var(--surface2)', color: 'var(--muted)' }
              },
              'Cancelar'
            )
        )
      ),
      React.createElement(
        'div',
        { className: 'template-list' },
        visible.map(t =>
          React.createElement(
            'div',
            { key: t.id, className: 'template-card' },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between gap-2' },
              React.createElement(
                'span',
                { className: 'template-category' },
                TEMPLATE_CATEGORIES.find(c => c.key === t.category)?.label || t.category
              ),
              !t.id.startsWith('default-') &&
                React.createElement(
                  'span',
                  { className: 'text-xs', style: { color: 'var(--muted2)' } },
                  'Meu modelo'
                )
            ),
            React.createElement(
              'div',
              { className: 'text-sm mt-2', style: { fontWeight: 700 } },
              t.title
            ),
            React.createElement(
              'div',
              {
                className: 'text-sm mt-1',
                style: { color: 'var(--muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }
              },
              t.text
            ),
            React.createElement(
              'div',
              { className: 'flex flex-wrap gap-2 mt-3' },
              React.createElement(
                'button',
                { onClick: () => copyText(t.text), className: 'mini-action primary' },
                React.createElement(CopyIcon, { size: 13 }),
                ' Copiar'
              ),
              !t.id.startsWith('default-') &&
                React.createElement(
                  'button',
                  { onClick: () => beginEdit(t), className: 'mini-action' },
                  React.createElement(Edit3, { size: 13 }),
                  ' Editar'
                ),
              !t.id.startsWith('default-') &&
                React.createElement(
                  'button',
                  {
                    onClick: () => {
                      if (confirm('Excluir este modelo?'))
                        setTemplates(prev => prev.filter(x => x.id !== t.id));
                    },
                    className: 'mini-action danger'
                  },
                  'Excluir'
                )
            )
          )
        )
      )
    )
  );
}
function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  } catch (e) {}
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch (e) {}
  ta.remove();
}
