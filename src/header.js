/* Cabeçalho do workspace e barra superior. */

function WorkspaceHeader({ tab, setTab, theme, toggleTheme, user, onLogout, onSettings }) {
  const labels = {
    painel: 'Seu dia, em movimento.',
    mental: 'Clareza para seguir em frente.',
    clientes: 'Clientes e oportunidades.',
    lembretes: 'Nada importante passa despercebido.',
    foco: 'Foco no que move o dia.'
  };
  const now = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });
  const [open, setOpen] = useState(false);
  const name =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Conta pessoal';
  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
  return React.createElement(
    'header',
    { className: 'workspace-header' },
    React.createElement(
      'div',
      null,
      React.createElement('div', { className: 'workspace-eyebrow' }, now),
      React.createElement('h1', null, labels[tab] || labels.painel)
    ),
    React.createElement(
      'div',
      { className: 'workspace-actions' },
      React.createElement(
        'button',
        {
          onClick: toggleTheme,
          className: 'header-icon',
          title: theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'
        },
        theme === 'dark' ? '☀' : '◐'
      ),
      React.createElement(
        'button',
        { onClick: () => setTab('clientes'), className: 'header-primary' },
        '+ Novo cliente'
      ),
      React.createElement(
        'div',
        { className: 'header-account' },
        React.createElement(
          'button',
          {
            onClick: () => setOpen(v => !v),
            className: 'header-account-trigger',
            title: 'Abrir menu da conta',
            'aria-expanded': open
          },
          avatar
            ? React.createElement('img', { src: avatar, alt: '', referrerPolicy: 'no-referrer' })
            : React.createElement('span', null, (name || 'S').slice(0, 1).toUpperCase())
        ),
        open &&
          React.createElement(
            'div',
            { className: 'header-account-menu' },
            React.createElement(
              'div',
              { className: 'header-account-user' },
              avatar
                ? React.createElement('img', {
                    src: avatar,
                    alt: '',
                    referrerPolicy: 'no-referrer'
                  })
                : React.createElement(
                    'span',
                    { className: 'header-account-avatar-fallback' },
                    (name || 'S').slice(0, 1).toUpperCase()
                  ),
              React.createElement(
                'div',
                null,
                React.createElement('b', null, name),
                React.createElement('small', null, user?.email || '')
              )
            ),
            React.createElement(
              'div',
              { className: 'header-account-legal' },
              React.createElement(
                'a',
                { href: 'privacidade.html', onClick: () => setOpen(false) },
                'Privacidade'
              ),
              React.createElement(
                'a',
                { href: 'termos.html', onClick: () => setOpen(false) },
                'Termos de Uso'
              )
            ),
            React.createElement(
              'button',
              {
                onClick: () => {
                  setOpen(false);
                  onSettings?.();
                },
                className: 'header-account-settings'
              },
              'Configurações'
            ),
            React.createElement(
              'button',
              {
                onClick: () => {
                  setOpen(false);
                  onLogout();
                },
                className: 'header-account-logout'
              },
              'Sair da conta'
            )
          )
      )
    )
  );
}
function TopBar({
  streak,
  tab,
  setTab,
  exportBackup,
  importBackup,
  importExcel,
  theme,
  toggleTheme,
  user,
  onLogout,
  onSettings,
  onSidebarChange
}) {
  const fileInputRef = React.useRef(null);
  const sidebarRef = React.useRef(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const openSidebar = React.useCallback(() => {
    setSidebarOpen(true);
    onSidebarChange?.(true);
  }, [onSidebarChange]);
  const closeSidebarIfUnfocused = React.useCallback(event => {
    const next = event?.relatedTarget;
    if (!next || !sidebarRef.current?.contains(next)) {
      setSidebarOpen(false);
      onSidebarChange?.(false);
    }
  }, []);
  const excelInputRef = React.useRef(null);
  const items = [
    { key: 'painel', label: 'Painel', IconC: LayoutDashboard },
    { key: 'mental', label: 'Mental', IconC: Sparkles },
    { key: 'clientes', label: 'Clientes', IconC: Users },
    { key: 'lembretes', label: 'Lembretes', IconC: Bell },
    { key: 'foco', label: 'Foco do Dia', IconC: ListChecks }
  ];
  const backupButtons = React.createElement(
    'div',
    { className: 'flex items-center gap-1 pl-2', style: { borderLeft: '1px solid var(--border)' } },
    React.createElement(
      'button',
      {
        onClick: exportBackup,
        title: 'Baixar backup (.json)',
        className: 'p-1.5 rounded',
        style: { color: 'var(--muted)' }
      },
      React.createElement(Download, { size: 15 })
    ),
    React.createElement(
      'button',
      {
        onClick: () => fileInputRef.current?.click(),
        title: 'Importar backup (.json)',
        className: 'p-1.5 rounded',
        style: { color: 'var(--muted)' }
      },
      React.createElement(Upload, { size: 15 })
    ),
    React.createElement(
      'button',
      {
        onClick: () => excelInputRef.current?.click(),
        title: 'Importar clientes do Excel',
        className: 'p-1.5 rounded',
        style: { color: 'var(--teal)' }
      },
      React.createElement(Users, { size: 15 })
    ),
    React.createElement('input', {
      ref: fileInputRef,
      type: 'file',
      accept: 'application/json',
      className: 'hidden',
      onChange: e => {
        const f = e.target.files?.[0];
        if (f) importBackup(f);
        e.target.value = '';
      }
    }),
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
  );
  return React.createElement(
    'aside',
    {
      ref: sidebarRef,
      className: 'synapse-sidebar' + (sidebarOpen ? ' is-open' : ''),
      onMouseEnter: openSidebar,
      onMouseLeave: closeSidebarIfUnfocused,
      onFocusCapture: openSidebar,
      onBlurCapture: closeSidebarIfUnfocused,
      'aria-label': 'Navegação principal'
    },
    React.createElement(
      'div',
      { className: 'sidebar-brand' },
      React.createElement(
        'div',
        { className: 'brand-mark' },
        React.createElement('img', { src: 'standard-logo.svg?v=12', alt: 'Synapse' })
      ),
      React.createElement(
        'div',
        null,
        React.createElement('b', null, 'Synapse'),
        React.createElement('small', null, 'espaço comercial')
      )
    ),
    React.createElement(
      'nav',
      { className: 'sidebar-nav' },
      items.map(({ key, label, IconC }) =>
        React.createElement(
          'button',
          { key, onClick: () => setTab(key), className: tab === key ? 'active' : '', title: label },
          React.createElement(IconC, { size: 17 }),
          React.createElement('span', null, label)
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'sidebar-bottom' },
      React.createElement(
        'div',
        { className: 'sidebar-tools' },
        React.createElement(
          'div',
          {
            className: 'flex items-center gap-1.5 text-sm',
            style: { color: streak > 0 ? 'var(--ember)' : 'var(--muted)' }
          },
          React.createElement(Flame, { size: 16, strokeWidth: 2 }),
          React.createElement('span', null, streak, ' ', streak === 1 ? 'dia' : 'dias')
        ),
        backupButtons
      ),
      React.createElement(
        'div',
        { className: 'account-name' },
        React.createElement(
          'span',
          { className: 'account-avatar' },
          (user?.email || 'S').slice(0, 1).toUpperCase()
        ),
        React.createElement(
          'div',
          null,
          React.createElement('small', null, 'Conta pessoal'),
          React.createElement('b', null, user?.email || 'Synapse')
        ),
        React.createElement(
          'button',
          { onClick: onSettings, className: 'top-settings', title: 'Configurações da conta' },
          'Config.'
        ),
        React.createElement('button', { onClick: onLogout, className: 'top-logout' }, 'Sair')
      )
    )
  );
}
