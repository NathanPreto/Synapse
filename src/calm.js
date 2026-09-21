/* Modo Calma (respiração guiada). */

function CalmMode({ onClose }) {
  const TOTAL = 60,
    INHALE = 4,
    HOLD = 2,
    EXHALE = 4,
    CYCLE = INHALE + HOLD + EXHALE;
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running || elapsed >= TOTAL) return;
    let raf = 0,
      started = performance.now() - elapsed * 1000;
    const tick = now => {
      const next = Math.min(TOTAL, (now - started) / 1000);
      setElapsed(next);
      if (next < TOTAL) raf = requestAnimationFrame(tick);
      else setRunning(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  const remaining = Math.max(0, Math.ceil(TOTAL - elapsed));
  const cycleElapsed = elapsed % CYCLE;
  const phase =
    elapsed >= TOTAL
      ? {
          key: 'done',
          label: 'Concluído',
          hint: 'Sessenta segundos completos.',
          scale: 1,
          transition: 0.4
        }
      : cycleElapsed < INHALE
        ? {
            key: 'inhale',
            label: 'Inspire',
            hint: 'Pelo nariz, devagar',
            scale: 0.55 + 0.45 * (cycleElapsed / INHALE),
            transition: 0.18
          }
        : cycleElapsed < INHALE + HOLD
          ? { key: 'hold', label: 'Segure', hint: 'Só por um instante', scale: 1, transition: 0.18 }
          : {
              key: 'exhale',
              label: 'Expire',
              hint: 'Solte o ar devagar',
              scale: 1 - 0.45 * ((cycleElapsed - INHALE - HOLD) / EXHALE),
              transition: 0.18
            };
  const progress = (elapsed / TOTAL) * 100;
  const reset = () => {
    setElapsed(0);
    setRunning(true);
  };
  return React.createElement(
    'div',
    { className: 'modal-backdrop' },
    React.createElement(
      'div',
      { className: 'smart-modal calm-modal' },
      React.createElement(
        'div',
        { className: 'modal-head' },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { className: 'text-lg', style: { fontWeight: 750 } },
            'Modo Calma'
          ),
          React.createElement(
            'div',
            { className: 'text-xs mt-1', style: { color: 'var(--muted)' } },
            'Siga o movimento do círculo durante 60 segundos.'
          )
        ),
        React.createElement(
          'button',
          { onClick: onClose, className: 'icon-button', 'aria-label': 'Fechar' },
          React.createElement(X, { size: 18 })
        )
      ),
      React.createElement(
        'div',
        { className: 'calm-stage' },
        React.createElement(
          'div',
          { className: 'calm-breath-wrap' },
          React.createElement(
            'div',
            { className: 'calm-breath-orbit' },
            React.createElement(
              'div',
              {
                className: 'calm-breath-circle',
                style: {
                  transform: `scale(${phase.scale})`,
                  transition: `transform ${phase.transition}s linear`
                }
              },
              React.createElement('div', { className: 'calm-breath-label' }, phase.label),
              React.createElement('div', { className: 'calm-breath-hint' }, phase.hint)
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'calm-time' },
          String(remaining).padStart(2, '0') + 's'
        ),
        React.createElement(
          'div',
          { className: 'calm-progress' },
          React.createElement('div', { style: { width: progress + '%' } })
        ),
        React.createElement(
          'div',
          { className: 'calm-breath-guide' },
          React.createElement('span', { className: 'calm-guide-dot' }, ''),
          phase.key === 'done'
            ? 'Você terminou. Volte ao seu ritmo.'
            : phase.key === 'hold'
              ? 'Segure suavemente.'
              : phase.key === 'inhale'
                ? 'Deixe o círculo crescer.'
                : 'Deixe o círculo diminuir.'
        )
      ),
      React.createElement(
        'div',
        { className: 'calm-anchor' },
        React.createElement(
          'div',
          { className: 'text-xs', style: { color: 'var(--teal)', fontWeight: 700 } },
          'ÂNCORA'
        ),
        React.createElement(
          'div',
          { className: 'text-sm mt-1', style: { fontWeight: 600 } },
          'Você não é o seu resultado.'
        ),
        React.createElement(
          'div',
          { className: 'text-xs mt-1', style: { color: 'var(--muted)', lineHeight: 1.5 } },
          'Pause por um minuto, respire e escolha apenas o próximo passo.'
        )
      ),
      React.createElement(
        'div',
        { className: 'flex flex-wrap gap-2 mt-4' },
        elapsed >= TOTAL &&
          React.createElement(
            'button',
            {
              onClick: reset,
              className: 'px-4 py-2.5 rounded text-sm',
              style: { background: 'var(--teal)', color: 'var(--on-accent)', fontWeight: 700 }
            },
            'Recomeçar'
          ),
        elapsed < TOTAL &&
          React.createElement(
            'button',
            {
              onClick: () => setRunning(v => !v),
              className: 'px-4 py-2.5 rounded text-sm',
              style: {
                background: running ? 'var(--surface2)' : 'var(--teal)',
                color: running ? 'var(--muted)' : 'var(--on-accent)',
                border: running ? '1px solid var(--border)' : '1px solid var(--teal)',
                fontWeight: 700
              }
            },
            running ? 'Pausar' : 'Continuar'
          ),
        React.createElement(
          'button',
          {
            onClick: reset,
            className: 'px-4 py-2.5 rounded text-sm',
            style: {
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border)'
            }
          },
          'Reiniciar'
        ),
        React.createElement(
          'button',
          {
            onClick: onClose,
            className: 'px-4 py-2.5 rounded text-sm',
            style: { background: 'transparent', color: 'var(--muted)' }
          },
          'Voltar'
        )
      )
    )
  );
}
