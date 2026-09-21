/*
 * Conta: consentimentos (LGPD), cofre de bem-estar e a "porta" que decide se o
 * espaço de trabalho pode abrir (consentimento dado? cofre destrancado?).
 */

// Mude esta versão quando os Termos/Privacidade mudarem de forma relevante:
// todos os usuários serão solicitados a consentir novamente.
const CONSENT_VERSION = '2026-09-22';

const profileCacheKey = userId => 'synapse-profile-' + userId;
function readProfileCache(userId) {
  try {
    return JSON.parse(localStorage.getItem(profileCacheKey(userId)) || 'null');
  } catch (_) {
    return null;
  }
}
function writeProfileCache(userId, profile) {
  try {
    localStorage.setItem(profileCacheKey(userId), JSON.stringify(profile));
  } catch (_) {}
}

function consentFromProfile(profile) {
  const p = profile || {};
  return {
    terms: !!p.consent_terms_at && p.consent_version === CONSENT_VERSION,
    sensitive: !!p.consent_sensitive_at && p.consent_version === CONSENT_VERSION,
    ai: !!p.consent_ai_at && p.consent_version === CONSENT_VERSION
  };
}

const vaultOfferedKey = userId => 'synapse-vault-offered-' + userId;

function CheckRow({ checked, onChange, disabled, children, id }) {
  return React.createElement(
    'label',
    { className: 'consent-row', htmlFor: id },
    React.createElement('input', {
      id,
      type: 'checkbox',
      checked,
      disabled,
      onChange: e => onChange(e.target.checked)
    }),
    React.createElement('span', null, children)
  );
}

function LegalLinks() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'a',
      { href: 'termos.html', target: '_blank', rel: 'noopener' },
      'Termos de Uso'
    ),
    ' e a ',
    React.createElement(
      'a',
      { href: 'privacidade.html', target: '_blank', rel: 'noopener' },
      'Política de Privacidade'
    )
  );
}

function ConsentScreen({ onSubmit, onLogout, busy, error }) {
  const [terms, setTerms] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [ai, setAi] = useState(false);
  return React.createElement(
    'main',
    { className: 'auth-screen' },
    React.createElement(
      'div',
      { className: 'auth-card auth-card-single consent-card' },
      React.createElement(AuthBrand, null),
      React.createElement(
        'div',
        { className: 'auth-heading' },
        'Sua privacidade em primeiro lugar'
      ),
      React.createElement(
        'p',
        { className: 'auth-copy' },
        'Antes de começar, confirme como o Synapse pode tratar seus dados. Você pode mudar essas escolhas quando quiser em Configurações.'
      ),
      React.createElement(
        'div',
        { className: 'consent-list' },
        React.createElement(
          CheckRow,
          { id: 'consent-terms', checked: terms, onChange: setTerms, disabled: busy },
          React.createElement('strong', null, 'Obrigatório. '),
          'Li e aceito os ',
          React.createElement(LegalLinks, null),
          '.'
        ),
        React.createElement(
          CheckRow,
          { id: 'consent-sensitive', checked: sensitive, onChange: setSensitive, disabled: busy },
          React.createElement('strong', null, 'Aba Mental (opcional). '),
          'Autorizo o tratamento dos meus dados de bem-estar (humor, check-ins e diário) para as funções da aba Mental. São dados pessoais sensíveis: ficam só na minha conta, posso protegê-los com um cofre criptografado, exportá-los ou apagá-los a qualquer momento.'
        ),
        React.createElement(
          CheckRow,
          { id: 'consent-ai', checked: ai, onChange: setAi, disabled: busy },
          React.createElement('strong', null, 'Assistente Syn (opcional). '),
          'Autorizo enviar minhas mensagens e um resumo dos meus clientes, lembretes e humor (números, sem os textos dos check-ins) ao Google Gemini para a Syn responder. Posso revogar quando quiser.'
        )
      ),
      React.createElement(
        'p',
        { className: 'consent-note' },
        'O Synapse não é terapia nem serviço de saúde e não substitui atendimento profissional. Em crise, ligue 188 (CVV, 24h) ou 192 (SAMU). Os dados dos seus clientes são de sua responsabilidade: registre apenas o necessário e tenha base legal para isso.'
      ),
      error && React.createElement('div', { className: 'auth-alert error' }, error),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'auth-submit consent-submit',
          disabled: busy || !terms,
          onClick: () => onSubmit({ sensitive, ai })
        },
        busy ? 'Salvando...' : 'Continuar'
      ),
      React.createElement(
        'div',
        { className: 'auth-links' },
        React.createElement('button', { type: 'button', onClick: onLogout }, 'Sair')
      )
    )
  );
}

/** Formulário de criação de senha do cofre (usado na oferta inicial e em Configurações). */
function VaultPassphraseForm({ onSubmit, onCancel, busy, submitLabel, cancelLabel, withRemember }) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const submit = async e => {
    e.preventDefault();
    const problem = SynapseVault.validatePassphrase(pass);
    if (problem) return setError(problem);
    if (pass !== confirm) return setError('As senhas não conferem.');
    setError('');
    try {
      await onSubmit(pass, remember);
    } catch (err) {
      setError(String(err?.message || 'Não foi possível ativar o cofre agora.'));
    }
  };
  return React.createElement(
    'form',
    { onSubmit: submit, className: 'auth-form' },
    React.createElement(
      'label',
      null,
      React.createElement('span', null, 'Senha do cofre'),
      React.createElement('input', {
        type: 'password',
        value: pass,
        onChange: e => setPass(e.target.value),
        autoComplete: 'new-password',
        placeholder: 'Uma frase longa e fácil de lembrar',
        required: true
      })
    ),
    React.createElement(
      'label',
      null,
      React.createElement('span', null, 'Confirmar senha do cofre'),
      React.createElement('input', {
        type: 'password',
        value: confirm,
        onChange: e => setConfirm(e.target.value),
        autoComplete: 'new-password',
        required: true
      })
    ),
    withRemember &&
      React.createElement(
        CheckRow,
        { id: 'vault-remember-new', checked: remember, onChange: setRemember, disabled: busy },
        'Manter desbloqueado neste dispositivo'
      ),
    React.createElement(
      'div',
      { className: 'auth-alert vault-warning' },
      'Atenção: esta senha não pode ser recuperada por nós. Se você a esquecer, seus check-ins e diário cifrados não poderão ser lidos (você poderá apagá-los e recomeçar).'
    ),
    error && React.createElement('div', { className: 'auth-alert error' }, error),
    React.createElement(
      'button',
      { type: 'submit', disabled: busy, className: 'auth-submit' },
      busy ? 'Aguarde...' : submitLabel || 'Ativar cofre'
    ),
    onCancel &&
      React.createElement(
        'div',
        { className: 'auth-links' },
        React.createElement(
          'button',
          { type: 'button', onClick: onCancel, disabled: busy },
          cancelLabel || 'Agora não'
        )
      )
  );
}

function VaultOfferScreen({ onEnable, onSkip, busy }) {
  return React.createElement(
    'main',
    { className: 'auth-screen' },
    React.createElement(
      'div',
      { className: 'auth-card auth-card-single consent-card' },
      React.createElement(AuthBrand, null),
      React.createElement('div', { className: 'auth-heading' }, 'Proteja seus check-ins'),
      React.createElement(
        'p',
        { className: 'auth-copy' },
        'Com o cofre, seus check-ins e diário são criptografados no seu dispositivo antes de irem para a nuvem. Só quem tem a senha do cofre consegue lê-los, nem mesmo o Synapse. É opcional e pode ser ativado depois em Configurações.'
      ),
      React.createElement(VaultPassphraseForm, {
        onSubmit: onEnable,
        onCancel: onSkip,
        busy,
        withRemember: true
      })
    )
  );
}

function VaultUnlockScreen({ onUnlock, onReset, onLogout }) {
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const unlock = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const ok = await onUnlock(pass, remember);
      if (!ok) setError('Senha incorreta. Tente novamente.');
    } catch (err) {
      setError(String(err?.message || 'Não foi possível desbloquear agora.'));
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    setError('');
    try {
      await onReset();
    } catch (err) {
      setError(String(err?.message || 'Não foi possível redefinir o cofre agora.'));
      setBusy(false);
    }
  };
  return React.createElement(
    'main',
    { className: 'auth-screen' },
    React.createElement(
      'div',
      { className: 'auth-card auth-card-single consent-card' },
      React.createElement(AuthBrand, null),
      React.createElement('div', { className: 'auth-heading' }, 'Cofre de bem-estar'),
      !resetting
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'p',
              { className: 'auth-copy' },
              'Digite a senha do cofre para abrir seus check-ins e diário.'
            ),
            React.createElement(
              'form',
              { onSubmit: unlock, className: 'auth-form' },
              React.createElement(
                'label',
                null,
                React.createElement('span', null, 'Senha do cofre'),
                React.createElement('input', {
                  type: 'password',
                  value: pass,
                  onChange: e => setPass(e.target.value),
                  autoComplete: 'current-password',
                  autoFocus: true,
                  required: true
                })
              ),
              React.createElement(
                CheckRow,
                { id: 'vault-remember', checked: remember, onChange: setRemember, disabled: busy },
                'Manter desbloqueado neste dispositivo'
              ),
              error && React.createElement('div', { className: 'auth-alert error' }, error),
              React.createElement(
                'button',
                { type: 'submit', disabled: busy || !pass, className: 'auth-submit' },
                busy ? 'Desbloqueando...' : 'Desbloquear'
              )
            ),
            React.createElement(
              'div',
              { className: 'auth-links' },
              React.createElement(
                'button',
                { type: 'button', onClick: () => setResetting(true) },
                'Esqueci a senha do cofre'
              ),
              React.createElement('button', { type: 'button', onClick: onLogout }, 'Sair')
            )
          )
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'p',
              { className: 'auth-copy' },
              'Sem a senha não é possível ler os registros cifrados. Você pode redefinir o cofre: isso APAGA todos os seus check-ins e o diário de desidentificação (clientes e lembretes não são afetados) e permite recomeçar. Não dá para desfazer.'
            ),
            React.createElement(
              'div',
              { className: 'auth-form' },
              React.createElement(
                'label',
                null,
                React.createElement('span', null, 'Digite APAGAR para confirmar'),
                React.createElement('input', {
                  value: confirmation,
                  onChange: e => setConfirmation(e.target.value),
                  autoComplete: 'off'
                })
              ),
              error && React.createElement('div', { className: 'auth-alert error' }, error),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'auth-submit vault-danger',
                  disabled: busy || confirmation.trim().toUpperCase() !== 'APAGAR',
                  onClick: reset
                },
                busy ? 'Apagando...' : 'Apagar registros e redefinir cofre'
              )
            ),
            React.createElement(
              'div',
              { className: 'auth-links' },
              React.createElement(
                'button',
                { type: 'button', onClick: () => setResetting(false), disabled: busy },
                'Voltar'
              )
            )
          )
    )
  );
}

function AccountLoadError({ message, onRetry, onLogout }) {
  return React.createElement(
    'main',
    { className: 'auth-screen' },
    React.createElement(
      'div',
      { className: 'auth-card auth-card-single' },
      React.createElement(AuthBrand, null),
      React.createElement('div', { className: 'auth-heading' }, 'Não foi possível abrir sua conta'),
      React.createElement('p', { className: 'auth-copy' }, message),
      React.createElement(
        'button',
        { type: 'button', className: 'auth-submit', onClick: onRetry },
        'Tentar novamente'
      ),
      React.createElement(
        'div',
        { className: 'auth-links' },
        React.createElement('button', { type: 'button', onClick: onLogout }, 'Sair')
      )
    )
  );
}

function AccountGate({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | error | consent | vault-offer | unlock | ready
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [offline, setOffline] = useState(false);

  const vaultMetaOf = p => ({
    salt: p?.vault_salt,
    verifier: p?.vault_verifier,
    iterations: p?.vault_iterations
  });

  // Decide qual é a próxima tela a partir do perfil atual.
  async function route(p, { afterConsent = false } = {}) {
    if (!consentFromProfile(p).terms) return setStatus('consent');
    if (SynapseVault.isEnabled() && !SynapseVault.isUnlocked()) {
      if (!(await SynapseVault.restoreFromDevice())) return setStatus('unlock');
    }
    if (afterConsent && !SynapseVault.isConfigured() && SynapseVault.supported()) {
      let offered = false;
      try {
        offered = !!localStorage.getItem(vaultOfferedKey(user.id));
      } catch (_) {}
      if (!offered) return setStatus('vault-offer');
    }
    setStatus('ready');
  }

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');
    (async () => {
      let p = null;
      try {
        p = await window.SynapseBackend.loadProfile(user.id);
        writeProfileCache(user.id, p);
        setOffline(false);
      } catch (e) {
        window.SynapseLogger?.warn('Falha ao carregar o perfil.', e);
        p = readProfileCache(user.id);
        if (!p) {
          if (active) {
            setError('Verifique sua conexão e tente novamente. Seus dados não foram alterados.');
            setStatus('error');
          }
          return;
        }
        setOffline(true);
      }
      if (!active) return;
      SynapseVault.configure(user.id, vaultMetaOf(p));
      setProfile(p);
      await route(p);
    })();
    return () => {
      active = false;
    };
  }, [user.id, nonce]);

  async function updateProfile(patch) {
    await window.SynapseBackend.saveProfile(user.id, patch);
    const next = { ...(profile || { id: user.id }), ...patch };
    setProfile(next);
    writeProfileCache(user.id, next);
    return next;
  }

  const consentPatch = ({ sensitive, ai }, current) => {
    const now = new Date().toISOString();
    const c = consentFromProfile(current);
    return {
      consent_version: CONSENT_VERSION,
      consent_terms_at: now,
      consent_sensitive_at:
        sensitive === undefined
          ? c.sensitive
            ? current.consent_sensitive_at
            : null
          : sensitive
            ? now
            : null,
      consent_ai_at: ai === undefined ? (c.ai ? current.consent_ai_at : null) : ai ? now : null
    };
  };

  async function submitConsent({ sensitive, ai }) {
    setBusy(true);
    setError('');
    try {
      const next = await updateProfile(consentPatch({ sensitive, ai }, profile || {}));
      await route(next, { afterConsent: true });
    } catch (e) {
      window.SynapseLogger?.warn('Falha ao salvar consentimentos.', e);
      setError(
        'Não foi possível salvar suas escolhas agora. Verifique a conexão e tente novamente.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function setConsent(change) {
    await updateProfile(consentPatch(change, profile || {}));
  }

  async function enableVaultFromOffer(passphrase, remember) {
    setBusy(true);
    try {
      const meta = await SynapseVault.create(passphrase);
      try {
        await updateProfile({
          vault_salt: meta.salt,
          vault_verifier: meta.verifier,
          vault_iterations: meta.iterations
        });
      } catch (e) {
        SynapseVault.configure(user.id, null);
        throw new Error(
          'Não foi possível ativar o cofre agora. Verifique a conexão e tente novamente.'
        );
      }
      if (remember) await SynapseVault.rememberOnDevice();
      try {
        localStorage.setItem(vaultOfferedKey(user.id), '1');
      } catch (_) {}
      setStatus('ready');
    } finally {
      setBusy(false);
    }
  }

  function skipVaultOffer() {
    try {
      localStorage.setItem(vaultOfferedKey(user.id), '1');
    } catch (_) {}
    setStatus('ready');
  }

  async function unlockVault(passphrase, remember) {
    const ok = await SynapseVault.unlock(passphrase);
    if (!ok) return false;
    if (remember) await SynapseVault.rememberOnDevice();
    setStatus('ready');
    return true;
  }

  async function resetVault() {
    await window.SynapseBackend.deleteWellbeingData(user.id);
    await window.SynapsePersistence.dropWellbeingPending(user.id);
    await updateProfile({ vault_salt: null, vault_verifier: null, vault_iterations: null });
    SynapseVault.configure(user.id, null);
    await SynapseVault.forgetDevice(user.id);
    setStatus('ready');
  }

  function relock() {
    SynapseVault.lock();
    SynapseVault.forgetDevice(user.id);
    setNonce(n => n + 1);
  }

  function logout() {
    SynapseVault.lock();
    SynapseVault.forgetDevice(user.id);
    return onLogout();
  }

  if (status === 'loading') return React.createElement(AuthLoading, null);
  if (status === 'error')
    return React.createElement(AccountLoadError, {
      message: error,
      onRetry: () => setNonce(n => n + 1),
      onLogout: logout
    });
  if (status === 'consent')
    return React.createElement(ConsentScreen, {
      onSubmit: submitConsent,
      onLogout: logout,
      busy,
      error
    });
  if (status === 'vault-offer')
    return React.createElement(VaultOfferScreen, {
      onEnable: enableVaultFromOffer,
      onSkip: skipVaultOffer,
      busy
    });
  if (status === 'unlock')
    return React.createElement(VaultUnlockScreen, {
      onUnlock: unlockVault,
      onReset: resetVault,
      onLogout: logout
    });

  const account = {
    profile,
    consent: consentFromProfile(profile),
    offline,
    updateProfile,
    setConsent,
    relock
  };
  return React.createElement(SynapseWorkspace, { user, onLogout: logout, account });
}

/** Aba Mental sem autorização de dados de bem-estar: explica e permite autorizar. */
function MentalConsentCard({ onAuthorize }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const authorize = async () => {
    setBusy(true);
    setError('');
    try {
      await onAuthorize();
    } catch (_) {
      setError('Não foi possível salvar sua escolha agora. Tente novamente.');
      setBusy(false);
    }
  };
  return React.createElement(
    'div',
    { className: 'pop' },
    React.createElement(
      'div',
      { className: 'cloud-load-card mental-consent-card' },
      React.createElement('div', { className: 'cloud-load-icon' }, '♡'),
      React.createElement('h2', null, 'Aba Mental desativada'),
      React.createElement(
        'p',
        null,
        'Para usar check-ins, humor e diário, é preciso autorizar o tratamento dos seus dados de bem-estar (dados pessoais sensíveis). Eles ficam só na sua conta, podem ser protegidos por um cofre criptografado e você pode apagá-los quando quiser.'
      ),
      React.createElement(
        'p',
        { className: 'wellbeing-disclaimer' },
        window.SynapseSafety?.NOT_THERAPY_NOTICE || ''
      ),
      error && React.createElement('div', { className: 'auth-alert error' }, error),
      React.createElement(
        'button',
        { type: 'button', className: 'cloud-load-retry', onClick: authorize, disabled: busy },
        busy ? 'Salvando...' : 'Autorizar e ativar a aba Mental'
      )
    )
  );
}
