/* Raiz da aplicação e inicialização (deve ser o último script carregado). */

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  useEffect(() => {
    let active = true;
    if (!auth) {
      setAuthLoading(false);
      return () => {};
    }
    auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) window.SynapseLogger?.warn('Falha ao recuperar sessão do Synapse.', error);
        setSession(data?.session || null);
        setAuthLoading(false);
      })
      .catch(error => {
        window.SynapseLogger?.warn('Falha ao recuperar sessão do Synapse.', error);
        if (active) {
          setSession(null);
          setAuthLoading(false);
        }
      });
    const { data: listener } = auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      setSession(nextSession);
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);
  if (authLoading) return React.createElement(AuthLoading, null);
  if (!auth) return React.createElement(AuthScreen, null);
  if (recoveryMode && session)
    return React.createElement(PasswordRecoveryScreen, { onDone: () => setRecoveryMode(false) });
  if (!session) return React.createElement(AuthScreen, null);
  return React.createElement(AccountGate, {
    user: session.user,
    onLogout: () => auth.signOut()
  });
}
function AuthLoading() {
  return React.createElement(
    'main',
    { className: 'auth-screen' },
    React.createElement(
      'div',
      { className: 'auth-card auth-card-single auth-loading' },
      React.createElement(AuthBrand, null),
      React.createElement('div', { className: 'auth-copy' }, 'Carregando seu espaço...')
    )
  );
}
window.addEventListener('error', event => {
  try {
    const root = document.getElementById('root');
    if (root && !root.hasChildNodes()) {
      root.innerHTML =
        '<div style=\"min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0A0A0A;color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-align:center\"><div><strong style=\"font-size:18px\">Synapse</strong><p style=\"color:#B4BAC4;max-width:420px;line-height:1.5\">O sistema encontrou um erro ao iniciar. Recarregue a página. Se o problema continuar, abra o arquivo pelo Safari ou por um endereço HTTPS.</p></div></div>';
    }
  } catch (e) {}
});
if (window.React && window.ReactDOM && document.getElementById('root')) {
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
} else {
  document.getElementById('root').innerHTML =
    '<div style=\"padding:24px;color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif\">Não foi possível carregar o aplicativo. Verifique sua conexão e recarregue.</div>';
}
