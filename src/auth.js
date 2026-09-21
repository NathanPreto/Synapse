/* Telas de autenticação: login, cadastro, recuperação de senha. */

function passwordRules(password) {
  return {
    length: password.length >= 8,
    upper: /[A-ZÀ-Ý]/.test(password),
    lower: /[a-zà-ÿ]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-zÀ-ÿ0-9\s]/.test(password)
  };
}
function isStrongPassword(password) {
  const r = passwordRules(password);
  return r.length && r.upper && r.lower && r.number && r.symbol;
}
function friendlyAuthError(err) {
  const msg = String(err?.message || '');
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (lower.includes('email not confirmed'))
    return 'Confirme seu e-mail antes de entrar no Synapse.';
  if (lower.includes('user already registered'))
    return 'Este e-mail já possui uma conta. Tente entrar ou recuperar a senha.';
  if (lower.includes('password should be at least'))
    return 'A senha precisa ter pelo menos 8 caracteres.';
  if (lower.includes('password')) return 'A senha não atende aos requisitos de segurança.';
  return msg || 'Não foi possível concluir a operação.';
}
function PasswordRules({ password }) {
  const r = passwordRules(password);
  const items = [
    ['length', '8+ caracteres'],
    ['upper', '1 letra maiúscula'],
    ['lower', '1 letra minúscula'],
    ['number', '1 número'],
    ['symbol', '1 símbolo']
  ];
  return React.createElement(
    'div',
    { className: 'password-rules' },
    items.map(([key, label]) =>
      React.createElement(
        'div',
        { key, className: r[key] ? 'password-rule ok' : 'password-rule' },
        React.createElement('span', { className: 'password-rule-dot' }, r[key] ? '✓' : '•'),
        label
      )
    )
  );
}
function GoogleMark() {
  return React.createElement(
    'span',
    { className: 'google-mark', 'aria-hidden': 'true' },
    React.createElement(
      'svg',
      { viewBox: '0 0 48 48', focusable: 'false' },
      React.createElement('path', {
        fill: '#EA4335',
        d: 'M24 9.5c3.54 0 6.7 1.22 9.19 3.61l6.85-6.85C35.9 2.38 30.47 0 24 0 14.61 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.09 17.74 9.5 24 9.5z'
      }),
      React.createElement('path', {
        fill: '#4285F4',
        d: 'M46.98 24.55c0-1.64-.15-3.22-.42-4.73H24v9.02h12.9c-.56 3-2.26 5.54-4.82 7.24l7.79 6.05c4.54-4.19 7.11-10.36 7.11-17.58z'
      }),
      React.createElement('path', {
        fill: '#FBBC05',
        d: 'M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.27-3.14.76-4.59l-7.98-6.19A23.98 23.98 0 0 0 0 24c0 3.87.93 7.53 2.58 10.78l7.96-6.19z'
      }),
      React.createElement('path', {
        fill: '#34A853',
        d: 'M24 48c6.48 0 11.93-2.13 15.9-5.92l-7.79-6.05c-2.16 1.45-4.92 2.3-8.11 2.3-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.61 48 24 48z'
      })
    )
  );
}
function AuthBrand() {
  return React.createElement(
    'div',
    { className: 'auth-brand' },
    React.createElement(
      'div',
      { className: 'auth-brand-mark' },
      React.createElement('img', { src: 'standard-logo.svg?v=12', alt: 'Synapse' })
    ),
    React.createElement(
      'div',
      { className: 'auth-brand-copy' },
      React.createElement('div', { className: 'auth-title' }, 'Synapse'),
      React.createElement('div', { className: 'auth-subtitle' }, 'Gestão comercial e mentalidade')
    )
  );
}
function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (!auth) throw new Error('O serviço de autenticação não foi configurado.');
      if (mode === 'signup') {
        if (!isStrongPassword(password))
          throw new Error(
            'A senha precisa ter 8+ caracteres, maiúscula, minúscula, número e símbolo.'
          );
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.');
        const { data, error } = await auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } }
        });
        if (error) throw error;
        if (!data.session)
          setMessage(
            'Conta criada. Verifique seu e-mail para confirmar o cadastro e depois entre no Synapse.'
          );
        else setMessage('Conta criada.');
      } else if (mode === 'reset') {
        const { error } = await auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setMessage('Enviamos as instruções de recuperação para seu e-mail.');
      } else {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };
  const signInGoogle = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!auth) throw new Error('O serviço de autenticação não foi configurado.');
      const { error } = await auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  };
  const title =
    mode === 'signup'
      ? 'Crie sua conta'
      : mode === 'reset'
        ? 'Recupere seu acesso'
        : 'Bem-vindo de volta';
  const subtitle =
    mode === 'signup'
      ? 'Tenha seu CRM, lembretes e histórico sempre com você.'
      : mode === 'reset'
        ? 'Informe seu e-mail para receber um link de recuperação.'
        : 'Entre para continuar de onde você parou.';
  const switchMode = next => {
    setMode(next);
    setError('');
    setMessage('');
  };
  return React.createElement(
    'main',
    { className: 'auth-screen' },
    React.createElement(
      'section',
      { className: 'auth-shell' },
      React.createElement(
        'div',
        { className: 'auth-side' },
        React.createElement(
          'div',
          { className: 'auth-side-logo' },
          React.createElement('img', { src: 'standard-logo.svg?v=12', alt: 'Synapse' })
        ),
        React.createElement(
          'div',
          { className: 'auth-side-content' },
          React.createElement('div', { className: 'auth-kicker' }, 'Seu espaço comercial'),
          React.createElement('h1', null, 'Venda com clareza.\nDecida com presença.'),
          React.createElement(
            'p',
            null,
            'Uma experiência única para organizar oportunidades e acompanhar sua mentalidade sem perder o foco.'
          )
        ),
        React.createElement(
          'div',
          { className: 'auth-side-footer' },
          React.createElement('span', null, 'SYNAPSE · CRM + MENTALIDADE'),
          React.createElement(
            'span',
            { className: 'auth-legal-links' },
            React.createElement('a', { href: 'privacidade.html' }, 'Privacidade'),
            React.createElement('span', { 'aria-hidden': 'true' }, '·'),
            React.createElement('a', { href: 'termos.html' }, 'Termos de Uso')
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'auth-card' },
        React.createElement(AuthBrand, null),
        React.createElement('div', { className: 'auth-heading' }, title),
        React.createElement('p', { className: 'auth-copy' }, subtitle),
        mode === 'login' &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'button',
              { type: 'button', className: 'auth-google', onClick: signInGoogle, disabled: busy },
              React.createElement(GoogleMark, null),
              React.createElement('span', null, 'Continuar com Google')
            ),
            React.createElement(
              'div',
              { className: 'auth-divider' },
              React.createElement('span', null, 'ou')
            )
          ),
        React.createElement(
          'form',
          { onSubmit: submit, className: 'auth-form' },
          mode === 'signup' &&
            React.createElement(
              'label',
              null,
              React.createElement('span', null, 'Nome'),
              React.createElement('input', {
                value: name,
                onChange: e => setName(e.target.value),
                placeholder: 'Seu nome',
                required: true,
                autoComplete: 'name'
              })
            ),
          React.createElement(
            'label',
            null,
            React.createElement('span', null, 'E-mail'),
            React.createElement('input', {
              type: 'email',
              value: email,
              onChange: e => setEmail(e.target.value),
              placeholder: 'voce@email.com',
              required: true,
              autoComplete: 'email'
            })
          ),
          mode !== 'reset' &&
            React.createElement(
              'label',
              null,
              React.createElement('span', null, 'Senha'),
              React.createElement('input', {
                type: 'password',
                value: password,
                onChange: e => setPassword(e.target.value),
                placeholder: '••••••••',
                required: true,
                minLength: 8,
                autoComplete: mode === 'signup' ? 'new-password' : 'current-password'
              })
            ),
          mode === 'signup' && React.createElement(PasswordRules, { password }),
          mode === 'signup' &&
            React.createElement(
              'label',
              null,
              React.createElement('span', null, 'Confirmar senha'),
              React.createElement('input', {
                type: 'password',
                value: confirmPassword,
                onChange: e => setConfirmPassword(e.target.value),
                placeholder: 'Repita sua senha',
                required: true,
                minLength: 8,
                autoComplete: 'new-password'
              })
            ),
          error && React.createElement('div', { className: 'auth-alert error' }, error),
          message && React.createElement('div', { className: 'auth-alert success' }, message),
          React.createElement(
            'button',
            { type: 'submit', disabled: busy, className: 'auth-submit' },
            busy
              ? 'Aguarde...'
              : mode === 'signup'
                ? 'Criar conta'
                : mode === 'reset'
                  ? 'Enviar recuperação'
                  : 'Entrar'
          )
        ),
        React.createElement(
          'div',
          { className: 'auth-links' },
          mode === 'login' &&
            React.createElement(
              'button',
              { type: 'button', onClick: () => switchMode('signup') },
              'Criar uma conta'
            ),
          mode === 'login' &&
            React.createElement(
              'button',
              { type: 'button', onClick: () => switchMode('reset') },
              'Esqueci minha senha'
            ),
          mode !== 'login' &&
            React.createElement(
              'button',
              { type: 'button', onClick: () => switchMode('login') },
              'Voltar para entrar'
            )
        ),
        React.createElement(
          'div',
          { className: 'auth-note' },
          'Seus dados ficam separados por conta e protegidos no banco.'
        )
      )
    )
  );
}
function PasswordRecoveryScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!isStrongPassword(password))
        throw new Error(
          'A senha precisa ter 8+ caracteres, maiúscula, minúscula, número e símbolo.'
        );
      if (password !== confirmPassword) throw new Error('As senhas não coincidem.');
      const { error } = await auth.updateUser({ password });
      if (error) throw error;
      setMessage('Senha atualizada. Você já pode continuar usando o Synapse.');
      setTimeout(onDone, 900);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };
  return React.createElement(
    'main',
    { className: 'auth-screen' },
    React.createElement(
      'div',
      { className: 'auth-card auth-card-single' },
      React.createElement(AuthBrand, null),
      React.createElement('div', { className: 'auth-heading' }, 'Criar nova senha'),
      React.createElement(
        'p',
        { className: 'auth-copy' },
        'Escolha uma nova senha para recuperar o acesso à sua conta.'
      ),
      React.createElement(
        'form',
        { onSubmit: submit, className: 'auth-form' },
        React.createElement(
          'label',
          null,
          React.createElement('span', null, 'Nova senha'),
          React.createElement('input', {
            type: 'password',
            value: password,
            onChange: e => setPassword(e.target.value),
            required: true,
            minLength: 8,
            autoComplete: 'new-password'
          })
        ),
        React.createElement(PasswordRules, { password }),
        React.createElement(
          'label',
          null,
          React.createElement('span', null, 'Confirmar nova senha'),
          React.createElement('input', {
            type: 'password',
            value: confirmPassword,
            onChange: e => setConfirmPassword(e.target.value),
            required: true,
            minLength: 8,
            autoComplete: 'new-password'
          })
        ),
        error && React.createElement('div', { className: 'auth-alert error' }, error),
        message && React.createElement('div', { className: 'auth-alert success' }, message),
        React.createElement(
          'button',
          { type: 'submit', disabled: busy, className: 'auth-submit' },
          busy ? 'Aguarde...' : 'Atualizar senha'
        )
      )
    )
  );
}
