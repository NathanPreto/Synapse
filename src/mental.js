/* Aba Mental: autorreconhecimento emocional e diário de desidentificação. */

function Mental({
  checkins,
  todayCheckin,
  saveCheckin,
  deleteCheckin,
  justSaved,
  desidentificationEntries,
  setDesidentificationEntries,
  pinnedPhrase,
  setPinnedPhrase
}) {
  const stages = [
    {
      key: 'pensar',
      number: 1,
      title: 'Pensar',
      question: 'O que está acontecendo dentro de você agora?',
      placeholder: 'Exemplo: Estou me sentindo ansioso',
      color: 'var(--ember)'
    },
    {
      key: 'nomear',
      number: 2,
      title: 'Nomear',
      question: 'Quais sentimentos aparecem quando você olha para isso?',
      placeholder: 'Exemplo: ansiedade e mente cheia',
      color: 'var(--gold)'
    },
    {
      key: 'perceber',
      number: 3,
      title: 'Perceber',
      question: 'O que está por trás desse sentimento?',
      placeholder: 'Exemplo: Estou frustrado pois o mês está fraco',
      color: 'var(--teal)'
    },
    {
      key: 'questionar',
      number: 4,
      title: 'Questionar',
      question: 'Esse sentimento representa um fato ou uma interpretação?',
      placeholder: 'Exemplo: Mas por que estou sentindo ansiedade com algo normal?',
      color: 'var(--blue)'
    },
    {
      key: 'desidentificar',
      number: 5,
      title: 'Desidentificar',
      question: 'O que você consegue separar de quem você é?',
      placeholder: 'Exemplo: Eu não sou isso. Meu mês passado foi ótimo.',
      color: 'var(--violet)'
    },
    {
      key: 'distancia',
      number: 6,
      title: 'Criar distância',
      question: 'Que frase ajuda você a observar o sentimento sem se confundir com ele?',
      placeholder: 'Exemplo: Eu não sou essa ansiedade',
      color: 'var(--rose)'
    }
  ];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    pensar: '',
    nomear: '',
    perceber: '',
    questionar: '',
    desidentificar: '',
    distancia: ''
  });
  const [mood, setMood] = useState(3);
  const [identity, setIdentity] = useState('');
  const [note, setNote] = useState('');
  const [reframe, setReframe] = useState('');
  const [saved, setSaved] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const current = stages[step];
  const text = answers[current.key] || '';
  const allStagesFilled = stages.every(s => String(answers[s.key] || '').trim().length > 0);
  const updateAnswer = value => {
    setAnswers(prev => ({ ...prev, [current.key]: value }));
    if (validationMessage) setValidationMessage('');
  };
  const sentimentWords = [
    'ansioso',
    'ansiedade',
    'medo',
    'frustrado',
    'frustração',
    'cansado',
    'cansaço',
    'irritado',
    'irritação',
    'preocupado',
    'preocupação',
    'inseguro',
    'insegurança',
    'sobrecarregado',
    'pressão',
    'culpa',
    'triste',
    'tristeza',
    'raiva',
    'confuso',
    'confusão',
    'calmo',
    'calma',
    'confiante',
    'confiança',
    'animado',
    'animada',
    'aliviado',
    'alívio',
    'satisfeito',
    'satisfação'
  ];
  const detected = [
    ...new Set(
      stages
        .flatMap(
          s =>
            String(answers[s.key] || '')
              .toLowerCase()
              .match(/[a-záàâãéêíóôõúç]+/g) || []
        )
        .filter(w => sentimentWords.includes(w))
    )
  ];
  const history = [...checkins].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const persist = () => {
    if (!allStagesFilled) {
      setValidationMessage('Preencha as 6 etapas do autorreconhecimento antes de salvar.');
      const firstEmpty = stages.findIndex(s => !String(answers[s.key] || '').trim());
      if (firstEmpty >= 0) setStep(firstEmpty);
      return;
    }
    saveCheckin(mood, identity, note, reframe, answers);
    setSaved(true);
    setValidationMessage(
      'Autorreconhecimento salvo. Os campos foram limpos para um novo registro.'
    );
    setAnswers({
      pensar: '',
      nomear: '',
      perceber: '',
      questionar: '',
      desidentificar: '',
      distancia: ''
    });
    setStep(0);
    setTimeout(() => {
      setSaved(false);
      setValidationMessage('');
    }, 2200);
  };
  return React.createElement(
    'div',
    { className: 'pop' },
    React.createElement(
      'p',
      { className: 'wellbeing-disclaimer' },
      window.SynapseSafety?.NOT_THERAPY_NOTICE || ''
    ),
    React.createElement(
      Section,
      { title: 'Autorreconhecimento emocional' },
      React.createElement(
        'div',
        {
          className: 'p-4 rounded space-y-4',
          style: { background: 'var(--surface)', border: '1px solid var(--border)' }
        },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between gap-3' },
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              { className: 'text-xs', style: { color: 'var(--muted)' } },
              'Percorra as seis etapas para reconhecer o sentimento e criar distância dele.'
            ),
            React.createElement(
              'div',
              { className: 'text-sm mt-1', style: { color: 'var(--text)', fontWeight: 600 } },
              current.number + ' de ' + stages.length + '  ' + current.title
            )
          ),
          React.createElement(
            'div',
            { className: 'text-xs', style: { color: current.color } },
            Math.round(((step + 1) / stages.length) * 100) + '%'
          )
        ),
        React.createElement(
          'div',
          { className: 'w-full h-1.5 rounded', style: { background: 'var(--surface2)' } },
          React.createElement('div', {
            className: 'h-1.5 rounded',
            style: { width: ((step + 1) / stages.length) * 100 + '%', background: current.color }
          })
        ),
        React.createElement(
          'div',
          { className: 'grid grid-cols-3 md:grid-cols-6 gap-1.5' },
          stages.map((s, i) =>
            React.createElement(
              'button',
              {
                key: s.key,
                onClick: () => setStep(i),
                className: 'p-2 rounded text-xs',
                style: {
                  background: i === step ? s.color : 'var(--surface2)',
                  color: i === step ? 'var(--on-accent)' : 'var(--muted)',
                  border: '1px solid var(--border)'
                }
              },
              s.number + '. ' + s.title
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'pt-2' },
          React.createElement(
            'div',
            { className: 'text-xs mb-2', style: { color: 'var(--muted)' } },
            current.question
          ),
          React.createElement('textarea', {
            value: text,
            onChange: e => updateAnswer(e.target.value),
            rows: 4,
            className: 'w-full p-3 rounded text-sm',
            placeholder: current.placeholder
          }),
          React.createElement(
            'div',
            { className: 'flex justify-between items-center mt-2' },
            React.createElement(
              'button',
              {
                onClick: () => setStep(v => Math.max(0, v - 1)),
                disabled: step === 0,
                className: 'px-3 py-2 rounded text-xs',
                style: {
                  background: 'var(--surface2)',
                  color: step === 0 ? 'var(--muted2)' : 'var(--text)',
                  border: '1px solid var(--border)',
                  opacity: step === 0 ? 0.5 : 1
                }
              },
              'Anterior'
            ),
            step < stages.length - 1
              ? React.createElement(
                  'button',
                  {
                    onClick: () => setStep(v => Math.min(stages.length - 1, v + 1)),
                    className: 'px-3 py-2 rounded text-xs',
                    style: { background: current.color, color: 'var(--on-accent)', fontWeight: 600 }
                  },
                  'Próxima etapa'
                )
              : React.createElement(
                  'button',
                  {
                    onClick: persist,
                    disabled: !allStagesFilled,
                    className: 'px-3 py-2 rounded text-xs',
                    style: {
                      background: allStagesFilled ? 'var(--ember)' : 'var(--surface2)',
                      color: allStagesFilled ? 'var(--on-accent)' : 'var(--muted)',
                      border: '1px solid ' + (allStagesFilled ? 'transparent' : 'var(--border)'),
                      fontWeight: 600,
                      cursor: allStagesFilled ? 'pointer' : 'not-allowed',
                      opacity: allStagesFilled ? 1 : 0.65
                    }
                  },
                  saved || justSaved ? 'Registro salvo' : 'Salvar reconhecimento'
                )
          )
        )
      ),
      validationMessage &&
        React.createElement(
          'div',
          {
            className: 'text-xs mt-2 p-2.5 rounded',
            style: {
              color: allStagesFilled ? 'var(--ember)' : 'var(--gold)',
              background: allStagesFilled
                ? 'var(--primary-soft, var(--surface2))'
                : 'var(--surface2)',
              border: '1px solid var(--border)'
            }
          },
          validationMessage
        ),
      detected.length > 0 &&
        React.createElement(
          'div',
          {
            className: 'p-3 rounded',
            style: { background: 'var(--surface2)', border: '1px solid var(--border)' }
          },
          React.createElement(
            'div',
            { className: 'text-xs', style: { color: 'var(--muted)' } },
            'Sentimentos identificados automaticamente'
          ),
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-1.5 mt-2' },
            detected.map(w =>
              React.createElement(
                'span',
                {
                  key: w,
                  className: 'px-2 py-1 rounded text-xs',
                  style: { background: current.color, color: 'var(--on-accent)' }
                },
                w
              )
            )
          )
        )
    ),
    React.createElement(
      Section,
      { title: 'Contexto do check-in' },
      React.createElement(
        'div',
        {
          className: 'p-4 rounded space-y-4',
          style: { background: 'var(--surface)', border: '1px solid var(--border)' }
        },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { className: 'text-xs mb-2', style: { color: 'var(--muted)' } },
            'Como está seu estado ao encarar a prospecção hoje?'
          ),
          React.createElement(
            'div',
            { className: 'mood-selector' },
            MOODS.map(m =>
              React.createElement(
                'button',
                {
                  key: m.v,
                  onClick: () => setMood(m.v),
                  className: 'py-2 rounded text-xs',
                  style: {
                    background: mood === m.v ? m.color : 'var(--surface2)',
                    color: mood === m.v ? 'var(--on-accent)' : 'var(--muted)',
                    border: '1px solid var(--border)'
                  }
                },
                m.label
              )
            )
          )
        ),
        React.createElement('input', {
          value: identity,
          onChange: e => setIdentity(e.target.value),
          placeholder: 'Identidade que você escolhe praticar hoje',
          className: 'w-full p-2.5 rounded text-sm'
        }),
        React.createElement('textarea', {
          value: reframe,
          onChange: e => setReframe(e.target.value),
          rows: 2,
          className: 'w-full p-2.5 rounded text-sm',
          placeholder: 'Uma ação concreta que prova essa identidade'
        }),
        React.createElement('textarea', {
          value: note,
          onChange: e => setNote(e.target.value),
          rows: 2,
          className: 'w-full p-2.5 rounded text-sm',
          placeholder: 'Nota livre, opcional'
        }),
        React.createElement(
          'button',
          {
            onClick: persist,
            disabled: !allStagesFilled,
            className: 'px-4 py-2 rounded text-sm',
            style: {
              background: allStagesFilled ? 'var(--ember)' : 'var(--surface2)',
              color: allStagesFilled ? 'var(--on-accent)' : 'var(--muted)',
              border: '1px solid ' + (allStagesFilled ? 'transparent' : 'var(--border)'),
              fontWeight: 600,
              cursor: allStagesFilled ? 'pointer' : 'not-allowed',
              opacity: allStagesFilled ? 1 : 0.65
            }
          },
          saved || justSaved
            ? 'Registrado'
            : todayCheckin
              ? 'Atualizar check-in'
              : 'Registrar check-in'
        )
      )
    ),
    React.createElement(DesidentificationDiary, {
      entries: desidentificationEntries,
      setEntries: setDesidentificationEntries,
      pinnedPhrase,
      setPinnedPhrase
    }),
    React.createElement(
      Section,
      { title: 'Histórico' },
      history.length === 0
        ? React.createElement(
            'div',
            { className: 'text-sm', style: { color: 'var(--muted)' } },
            'Nenhum check-in ainda.'
          )
        : React.createElement(
            'div',
            { className: 'space-y-2' },
            history.map(c => {
              const m = MOODS.find(x => x.v === c.mood);
              const feelings = c.mentalStages
                ? [
                    ...new Set(
                      Object.values(c.mentalStages)
                        .flatMap(
                          v =>
                            String(v || '')
                              .toLowerCase()
                              .match(/[a-záàâãéêíóôõúç]+/g) || []
                        )
                        .filter(w => sentimentWords.includes(w))
                    )
                  ]
                : [];
              return React.createElement(
                'div',
                {
                  key: c.id,
                  className: 'p-3 rounded text-sm',
                  style: { background: 'var(--surface)', border: '1px solid var(--border)' }
                },
                React.createElement(
                  'div',
                  { className: 'flex items-center gap-3 min-w-0' },
                  React.createElement(
                    'div',
                    { className: 'w-16 shrink-0', style: { color: 'var(--muted)' } },
                    fmtDate(c.date)
                  ),
                  React.createElement('div', {
                    className: 'w-2 h-2 rounded-full shrink-0',
                    style: { background: m === null || m === void 0 ? void 0 : m.color }
                  }),
                  React.createElement(
                    'div',
                    { className: 'min-w-0 flex-1' },
                    c.locked
                      ? '🔒 Registro protegido (senha do cofre diferente)'
                      : c.identity || 'Check-in emocional'
                  ),
                  React.createElement(
                    'button',
                    {
                      onClick: () => deleteCheckin(c.id),
                      className: 'shrink-0 px-2.5 py-1.5 rounded text-xs',
                      title: 'Excluir do histórico',
                      style: {
                        color: 'var(--rose)',
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)'
                      }
                    },
                    React.createElement(Trash2, { size: 13 }),
                    ' Excluir'
                  )
                ),
                feelings.length > 0 &&
                  React.createElement(
                    'div',
                    { className: 'text-xs mt-2', style: { color: 'var(--muted)' } },
                    'Sentimentos reconhecidos: ' + feelings.join(', ')
                  ),
                c.note &&
                  React.createElement(
                    'div',
                    { className: 'text-xs mt-1', style: { color: 'var(--muted)' } },
                    c.note
                  )
              );
            })
          )
    )
  );
}
function DesidentificationDiary({ entries, setEntries, pinnedPhrase, setPinnedPhrase }) {
  const [thought, setThought] = useState('');
  const [fact, setFact] = useState('');
  const [distance, setDistance] = useState('');
  const [winner, setWinner] = useState('');
  const canSuggest = thought.trim().length > 0;
  const suggest = () => {
    if (!canSuggest) return;
    const safeFact = sanitizeInput(fact.trim());
    const base = safeFact
      ? `Eu posso reconhecer que "${safeFact}" é um fato, sem transformar isso em quem eu sou.`
      : `Esse pensamento é algo que estou tendo agora, não uma definição de quem eu sou.`;
    setWinner(sanitizeInput(base));
  };
  const save = () => {
    if (!thought.trim() || !winner.trim()) return;
    setEntries(prev => [
      {
        id: uid(),
        date: todayStr(),
        thought: sanitizeInput(thought.trim()),
        fact: sanitizeInput(fact.trim()),
        distance: sanitizeInput(distance.trim()),
        winner: sanitizeInput(winner.trim())
      },
      ...prev
    ]);
    setThought('');
    setFact('');
    setDistance('');
    setWinner('');
  };
  const history = entries.slice(0, 6).map(e =>
    React.createElement(
      'div',
      { key: e.id, className: 'diary-history-item' },
      React.createElement(
        'div',
        { className: 'flex items-center justify-between gap-3' },
        React.createElement(
          'span',
          { className: 'text-xs', style: { color: 'var(--muted2)' } },
          fmtDate(e.date)
        ),
        React.createElement(
          'button',
          {
            onClick: () =>
              setPinnedPhrase(
                pinnedPhrase?.text === e.winner ? null : { text: e.winner, date: e.date }
              ),
            className: 'text-xs flex items-center gap-1',
            style: { color: 'var(--teal)' }
          },
          React.createElement(Pin, { size: 12 }),
          pinnedPhrase?.text === e.winner ? 'Fixada' : 'Fixar'
        )
      ),
      React.createElement(
        'div',
        { className: 'text-sm mt-2', style: { color: 'var(--muted)' } },
        e.thought
      ),
      React.createElement(
        'div',
        { className: 'text-sm mt-2', style: { fontWeight: 650 } },
        e.winner
      )
    )
  );
  return React.createElement(
    Section,
    {
      title: 'Desidentificação prática',
      right: React.createElement(
        'span',
        { className: 'text-xs', style: { color: 'var(--muted)' } },
        'Pensamento não é identidade'
      )
    },
    React.createElement(
      'div',
      { className: 'diary-layout' },
      React.createElement(
        'div',
        { className: 'diary-form' },
        React.createElement(
          'div',
          { className: 'diary-intro' },
          React.createElement(
            'div',
            { className: 'text-sm', style: { fontWeight: 650 } },
            'Um pensamento difícil pode ser observado sem virar uma sentença sobre você.'
          ),
          React.createElement(
            'div',
            { className: 'text-xs mt-1', style: { color: 'var(--muted)' } },
            'Faça o exercício em poucos minutos e leve apenas o que for útil para o seu próximo passo.'
          )
        ),
        React.createElement(
          'label',
          { className: 'field-label' },
          '1. O que sua mente está dizendo?'
        ),
        React.createElement('textarea', {
          value: thought,
          onChange: e => setThought(e.target.value),
          rows: 3,
          placeholder: 'Ex.: Acho que não vou bater a meta este mês.',
          className: 'w-full p-3 rounded text-sm'
        }),
        React.createElement(
          'label',
          { className: 'field-label' },
          '2. O que é fato, sem julgamento?'
        ),
        React.createElement('textarea', {
          value: fact,
          onChange: e => setFact(e.target.value),
          rows: 2,
          placeholder: 'Ex.: Até agora, estou abaixo do ritmo que planejei.',
          className: 'w-full p-3 rounded text-sm'
        }),
        React.createElement(
          'label',
          { className: 'field-label' },
          '3. Como você pode observar isso de fora?'
        ),
        React.createElement('textarea', {
          value: distance,
          onChange: e => setDistance(e.target.value),
          rows: 2,
          placeholder:
            'Ex.: Estou percebendo medo e cobrança, mas isso não define minha capacidade.',
          className: 'w-full p-3 rounded text-sm'
        }),
        React.createElement(
          'div',
          { className: 'diary-winner' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2' },
            React.createElement(
              'label',
              { className: 'field-label', style: { margin: 0 } },
              '4. Sua frase de desidentificação'
            ),
            React.createElement(
              'button',
              {
                onClick: suggest,
                disabled: !canSuggest,
                className: 'text-xs px-2.5 py-1.5 rounded',
                style: {
                  background: 'var(--surface2)',
                  color: canSuggest ? 'var(--teal)' : 'var(--muted)',
                  border: '1px solid var(--border)'
                }
              },
              'Sugerir frase'
            )
          ),
          React.createElement('textarea', {
            value: winner,
            onChange: e => setWinner(e.target.value),
            rows: 3,
            placeholder: 'Ex.: Eu estou passando por um mês desafiador. Eu não sou esse resultado.',
            className: 'w-full p-3 rounded text-sm mt-2'
          })
        ),
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center justify-between gap-3 mt-3' },
          React.createElement(
            'button',
            {
              onClick: save,
              disabled: !thought.trim() || !winner.trim(),
              className: 'px-4 py-2.5 rounded text-sm',
              style: {
                background: thought.trim() && winner.trim() ? 'var(--teal)' : 'var(--surface2)',
                color: thought.trim() && winner.trim() ? 'var(--on-accent)' : 'var(--muted)',
                fontWeight: 700
              }
            },
            'Salvar no diário'
          ),
          pinnedPhrase &&
            React.createElement(
              'button',
              {
                onClick: () => setPinnedPhrase(null),
                className: 'text-xs',
                style: { color: 'var(--muted)' }
              },
              'Desafixar do Painel'
            )
        )
      ),
      React.createElement(
        'div',
        { className: 'diary-history' },
        React.createElement(
          'div',
          { className: 'text-xs', style: { color: 'var(--muted)' } },
          'Registros recentes'
        ),
        history.length
          ? history
          : React.createElement(
              'div',
              { className: 'empty-soft mt-2' },
              'Seu primeiro registro aparecerá aqui.'
            )
      )
    )
  );
}
