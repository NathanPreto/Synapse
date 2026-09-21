/* Modais: migração, revisão de Excel e configurações da conta. */

function MigrationModal({ onImport, onSkip }) {
  return React.createElement(
    'div',
    { className: 'modal-backdrop' },
    React.createElement(
      'div',
      { className: 'smart-modal' },
      React.createElement(
        'div',
        { className: 'modal-head' },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { className: 'text-lg', style: { fontWeight: 750 } },
            'Importar dados deste dispositivo'
          ),
          React.createElement(
            'div',
            { className: 'text-xs mt-1', style: { color: 'var(--muted)' } },
            'Encontramos dados da versão anterior do Synapse neste navegador.'
          )
        ),
        React.createElement(
          'button',
          { onClick: onSkip, className: 'icon-button' },
          React.createElement(X, { size: 18 })
        )
      ),
      React.createElement(
        'div',
        {
          className: 'p-4 rounded mt-4',
          style: { background: 'var(--surface2)', border: '1px solid var(--border)' }
        },
        React.createElement(
          'div',
          { className: 'text-sm', style: { lineHeight: 1.6 } },
          'Vamos enviar os clientes, lembretes, check-ins, histórico mental e modelos salvos para a sua conta. Os dados atuais da nuvem serão preservados quando não houver conflito de ID.'
        )
      ),
      React.createElement(
        'div',
        { className: 'flex gap-2 mt-5' },
        React.createElement(
          'button',
          {
            onClick: onImport,
            className: 'px-4 py-2.5 rounded text-sm',
            style: { background: 'var(--teal)', color: 'var(--on-accent)', fontWeight: 700 }
          },
          'Importar para minha conta'
        ),
        React.createElement(
          'button',
          {
            onClick: onSkip,
            className: 'px-4 py-2.5 rounded text-sm',
            style: {
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--muted)'
            }
          },
          'Agora não'
        )
      )
    )
  );
}
function ExcelReviewModal({ review, setReview, onImport }) {
  const [mappings, setMappings] = useState(review.mappings);
  const fields = Object.keys(review.fieldLabels);
  const mappedCount = fields.filter(f => mappings[f]).length;
  return React.createElement(
    'div',
    { className: 'modal-backdrop' },
    React.createElement(
      'div',
      { className: 'smart-modal' },
      React.createElement(
        'div',
        { className: 'flex items-start justify-between gap-4 mb-5' },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { className: 'text-lg font-semibold' },
            'Importação inteligente'
          ),
          React.createElement(
            'div',
            { className: 'text-xs mt-1', style: { color: 'var(--muted)' } },
            review.fileName,
            ' • ',
            mappedCount,
            ' de ',
            fields.length,
            ' campos reconhecidos'
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () => setReview(null),
            className: 'p-2 rounded',
            style: { color: 'var(--muted)' }
          },
          React.createElement(X, { size: 16 })
        )
      ),
      React.createElement(
        'div',
        { className: 'text-sm mb-4', style: { color: 'var(--muted)' } },
        'Revise o mapeamento antes de importar. O sistema tenta reconhecer nomes de colunas diferentes automaticamente.'
      ),
      !mappings.name &&
        React.createElement(
          'div',
          { className: 'auth-alert error mb-4' },
          'A coluna de Nome do cliente não foi reconhecida. Selecione manualmente uma coluna para continuar.'
        ),
      review.rows.length > 5000 &&
        React.createElement(
          'div',
          { className: 'auth-alert success mb-4' },
          `A planilha contém ${review.rows.length.toLocaleString('pt-BR')} linhas. O processamento será feito de forma controlada para evitar travamentos.`
        ),
      React.createElement(
        'div',
        { className: 'space-y-2' },
        fields.map(field =>
          React.createElement(
            'div',
            {
              key: field,
              className: 'grid grid-cols-[1fr_1.2fr] gap-3 items-center p-3 rounded',
              style: { background: 'var(--surface2)', border: '1px solid var(--border)' }
            },
            React.createElement(
              'div',
              null,
              React.createElement(
                'div',
                { className: 'text-sm font-medium' },
                review.fieldLabels[field]
              ),
              React.createElement(
                'div',
                {
                  className: 'text-[11px] mt-0.5',
                  style: { color: review.confidence[field] >= 75 ? 'var(--ember)' : 'var(--gold)' }
                },
                review.confidence[field] >= 75
                  ? 'Reconhecimento forte'
                  : review.confidence[field] > 0
                    ? 'Possível correspondência'
                    : 'Não encontrado'
              )
            ),
            React.createElement(
              'select',
              {
                value: mappings[field] || '',
                onChange: e => setMappings(prev => ({ ...prev, [field]: e.target.value })),
                className: 'w-full p-2 rounded text-sm',
                style: {
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)'
                }
              },
              React.createElement('option', { value: '' }, 'Não importar'),
              review.headers.map(h => React.createElement('option', { key: h, value: h }, h))
            )
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'flex justify-end gap-2 mt-5' },
        React.createElement(
          'button',
          {
            onClick: () => setReview(null),
            className: 'px-3 py-2 rounded text-sm',
            style: { color: 'var(--muted)', border: '1px solid var(--border)' }
          },
          'Cancelar'
        ),
        React.createElement(
          'button',
          {
            disabled: !mappings.name,
            onClick: () => onImport({ ...review, mappings }),
            className: 'px-4 py-2 rounded text-sm font-medium',
            style: {
              background: mappings.name ? 'var(--ember)' : 'var(--surface2)',
              color: mappings.name ? 'var(--on-accent)' : 'var(--muted)',
              border: '1px solid var(--border)'
            }
          },
          'Importar clientes'
        )
      )
    )
  );
}
function SettingsToggleRow({ title, description, enabled, busy, onEnable, onDisable, extra }) {
  return React.createElement(
    'div',
    { className: 'settings-row' },
    React.createElement(
      'div',
      { className: 'settings-row-text' },
      React.createElement('div', { className: 'settings-row-title' }, title),
      React.createElement('p', null, description),
      extra
    ),
    React.createElement(
      'div',
      { className: 'settings-row-side' },
      React.createElement(
        'span',
        { className: 'settings-badge ' + (enabled ? 'on' : 'off') },
        enabled ? 'Autorizado' : 'Não autorizado'
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'settings-btn',
          disabled: busy,
          onClick: enabled ? onDisable : onEnable
        },
        enabled ? 'Revogar' : 'Autorizar'
      )
    )
  );
}

function VaultSettings({ vault, account }) {
  const [mode, setMode] = useState(null); // null | 'enable' | 'change'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [current, setCurrent] = useState('');
  const enabled = SynapseVault.isConfigured();
  const run = async task => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      return true;
    } catch (e) {
      setError(String(e?.message || 'Não foi possível concluir agora.'));
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (!SynapseVault.supported())
    return React.createElement(
      'p',
      null,
      'Este navegador não oferece criptografia segura; o cofre não está disponível.'
    );
  if (mode === 'enable')
    return React.createElement(VaultPassphraseForm, {
      busy,
      withRemember: true,
      submitLabel: 'Ativar cofre',
      cancelLabel: 'Cancelar',
      onCancel: () => setMode(null),
      onSubmit: async (pass, remember) => {
        await vault.enable(pass, remember);
        setMode(null);
        setNotice('Cofre ativado. Seus check-ins e diário agora são cifrados.');
      }
    });
  if (mode === 'change')
    return React.createElement(
      'div',
      null,
      React.createElement(
        'label',
        { className: 'settings-field' },
        React.createElement('span', null, 'Senha atual do cofre'),
        React.createElement('input', {
          type: 'password',
          value: current,
          onChange: e => setCurrent(e.target.value),
          autoComplete: 'current-password'
        })
      ),
      React.createElement(VaultPassphraseForm, {
        busy,
        withRemember: true,
        submitLabel: 'Trocar senha',
        cancelLabel: 'Cancelar',
        onCancel: () => {
          setMode(null);
          setCurrent('');
        },
        onSubmit: async (pass, remember) => {
          await vault.change(current, pass, remember);
          setMode(null);
          setCurrent('');
          setNotice('Senha do cofre trocada. Seus registros não precisaram ser refeitos.');
        }
      })
    );
  return React.createElement(
    'div',
    null,
    React.createElement(
      'p',
      null,
      enabled
        ? 'Cofre ativo: check-ins e diário são cifrados no seu dispositivo antes de irem para a nuvem. Sem a senha ninguém, nem o Synapse, consegue lê-los.'
        : 'Cofre inativo: check-ins e diário ficam protegidos pelo acesso à sua conta, mas legíveis no banco. Ative o cofre para cifrá-los de ponta a ponta.'
    ),
    notice && React.createElement('div', { className: 'auth-alert success' }, notice),
    error && React.createElement('div', { className: 'auth-alert error' }, error),
    React.createElement(
      'div',
      { className: 'account-settings-actions settings-actions' },
      !enabled &&
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'settings-btn',
            disabled: busy,
            onClick: () => setMode('enable')
          },
          'Ativar cofre'
        ),
      enabled &&
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'settings-btn',
            disabled: busy,
            onClick: () => setMode('change')
          },
          'Trocar senha'
        ),
      enabled &&
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'settings-btn',
            disabled: busy,
            onClick: () => vault.lock()
          },
          'Bloquear agora'
        ),
      enabled &&
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'settings-btn danger',
            disabled: busy,
            onClick: () => {
              if (
                !confirm(
                  'Desativar o cofre? Seus check-ins e diário voltarão a ficar legíveis no banco de dados.'
                )
              )
                return;
              run(async () => {
                await vault.disable();
                setNotice('Cofre desativado.');
              });
            }
          },
          'Desativar cofre'
        )
    )
  );
}

function AccountSettingsModal({
  user,
  busy,
  account,
  vault,
  onDeleteWellbeing,
  onClose,
  onDelete
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [privacyError, setPrivacyError] = useState('');
  const consent = account?.consent || { sensitive: false, ai: false };
  const submit = async () => {
    if (confirmation.trim().toUpperCase() !== 'EXCLUIR') return;
    setError('');
    try {
      await onDelete();
    } catch (e) {
      setError(String(e?.message || 'Não foi possível excluir a conta agora.'));
    }
  };
  const runPrivacy = async (task, okMessage) => {
    setPrivacyBusy(true);
    setPrivacyError('');
    setPrivacyMessage('');
    try {
      await task();
      if (okMessage) setPrivacyMessage(okMessage);
    } catch (e) {
      setPrivacyError(String(e?.message || 'Não foi possível concluir agora. Tente novamente.'));
    } finally {
      setPrivacyBusy(false);
    }
  };
  return React.createElement(
    'div',
    {
      className: 'modal-backdrop',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'settings-title'
    },
    React.createElement(
      'div',
      { className: 'smart-modal settings-modal' },
      React.createElement(
        'div',
        { className: 'settings-header' },
        React.createElement(
          'div',
          null,
          React.createElement('div', { className: 'workspace-eyebrow' }, 'Conta'),
          React.createElement('h2', { id: 'settings-title' }, 'Configurações')
        ),
        React.createElement(
          'button',
          { onClick: onClose, className: 'modal-close', 'aria-label': 'Fechar' },
          '×'
        )
      ),
      React.createElement(
        'div',
        { className: 'settings-section' },
        React.createElement('div', { className: 'settings-label' }, 'Conta'),
        React.createElement('div', { className: 'settings-value' }, user?.email || 'Conta pessoal'),
        React.createElement(
          'p',
          null,
          'Gerencie o acesso e a exclusão dos seus dados pelo Synapse.'
        )
      ),
      account &&
        React.createElement(
          'div',
          { className: 'settings-section' },
          React.createElement(
            'div',
            { className: 'settings-label' },
            'Privacidade e consentimentos'
          ),
          React.createElement(SettingsToggleRow, {
            title: 'Assistente Syn (IA)',
            description:
              'Envia suas mensagens e um resumo de clientes, lembretes e humor ao Google Gemini para gerar respostas.',
            enabled: consent.ai,
            busy: privacyBusy,
            onEnable: () => runPrivacy(() => account.setConsent({ ai: true })),
            onDisable: () =>
              runPrivacy(() => account.setConsent({ ai: false }), 'Uso da IA revogado.')
          }),
          React.createElement(SettingsToggleRow, {
            title: 'Dados de bem-estar (aba Mental)',
            description:
              'Check-ins, humor e diário. Ao revogar, a aba Mental é desativada; seus registros continuam salvos até você apagá-los.',
            enabled: consent.sensitive,
            busy: privacyBusy,
            onEnable: () => runPrivacy(() => account.setConsent({ sensitive: true })),
            onDisable: () =>
              runPrivacy(() => account.setConsent({ sensitive: false }), 'Aba Mental desativada.'),
            extra: React.createElement(
              'button',
              {
                type: 'button',
                className: 'settings-link danger',
                disabled: privacyBusy,
                onClick: () => {
                  if (
                    !confirm(
                      'Apagar TODOS os seus check-ins e o diário de desidentificação? Esta ação não pode ser desfeita.'
                    )
                  )
                    return;
                  runPrivacy(onDeleteWellbeing, 'Registros de bem-estar apagados.');
                }
              },
              'Apagar meus registros de bem-estar'
            )
          }),
          privacyMessage &&
            React.createElement('div', { className: 'auth-alert success' }, privacyMessage),
          privacyError &&
            React.createElement('div', { className: 'auth-alert error' }, privacyError),
          React.createElement(
            'p',
            { className: 'settings-legal' },
            React.createElement(
              'a',
              { href: 'privacidade.html', target: '_blank', rel: 'noopener' },
              'Política de Privacidade'
            ),
            ' · ',
            React.createElement(
              'a',
              { href: 'termos.html', target: '_blank', rel: 'noopener' },
              'Termos de Uso'
            )
          )
        ),
      account &&
        vault &&
        React.createElement(
          'div',
          { className: 'settings-section' },
          React.createElement('div', { className: 'settings-label' }, 'Cofre de bem-estar'),
          React.createElement(VaultSettings, { vault, account })
        ),
      React.createElement(
        'div',
        { className: 'settings-section settings-danger-zone' },
        React.createElement('div', { className: 'settings-label' }, 'Excluir conta'),
        !confirming
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'p',
                null,
                'A exclusão remove sua conta e os dados associados ao Synapse. Esta ação não pode ser desfeita.'
              ),
              React.createElement(
                'button',
                { onClick: () => setConfirming(true), className: 'account-delete-button' },
                'Excluir minha conta'
              )
            )
          : React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'p',
                null,
                'Para confirmar, digite EXCLUIR. Recomendamos baixar seu backup antes de continuar.'
              ),
              React.createElement('input', {
                value: confirmation,
                onChange: e => setConfirmation(e.target.value),
                placeholder: 'EXCLUIR',
                autoFocus: true,
                disabled: busy,
                autoComplete: 'off',
                'aria-label': 'Digite EXCLUIR para confirmar'
              }),
              error && React.createElement('div', { className: 'auth-alert error' }, error),
              React.createElement(
                'div',
                { className: 'settings-actions' },
                React.createElement(
                  'button',
                  {
                    onClick: () => {
                      setConfirming(false);
                      setConfirmation('');
                      setError('');
                    },
                    disabled: busy,
                    className: 'account-cancel-button'
                  },
                  'Cancelar'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: submit,
                    disabled: busy || confirmation.trim().toUpperCase() !== 'EXCLUIR',
                    className: 'account-delete-button'
                  },
                  busy ? 'Excluindo...' : 'Confirmar exclusão'
                )
              )
            )
      )
    )
  );
}
