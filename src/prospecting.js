/* Prospecção: pesquisa, análise e preparação comercial. Não envia e-mails. */

const PROSPECT_SEGMENTS = [
  'Plásticos',
  'Alimentos',
  'Química',
  'Papel e celulose',
  'Tratamento de água'
];

function Prospecting({ userId }) {
  const [runs, setRuns] = React.useState([]);
  const [prospects, setProspects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [product, setProduct] = React.useState('Soprador radial');
  const [region, setRegion] = React.useState('');
  const [segments, setSegments] = React.useState(['Plásticos', 'Alimentos', 'Química', 'Papel e celulose', 'Tratamento de água']);
  const [keywords, setKeywords] = React.useState('transporte pneumático, exaustão, secagem industrial, movimentação de ar');
  const [limit, setLimit] = React.useState(20);

  const load = React.useCallback(async () => {
    if (!userId || typeof backendLoadProspecting !== 'function') return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await backendLoadProspecting(userId);
      setRuns(data?.runs || []);
      setProspects(data?.prospects || []);
    } catch (e) {
      window.SynapseLogger?.warn('Falha ao carregar prospecção.', e);
      setError('Não foi possível carregar sua prospecção agora.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    load();
  }, [load]);

  function toggleSegment(segment) {
    setSegments(prev => prev.includes(segment) ? prev.filter(v => v !== segment) : [...prev, segment]);
  }

  async function createSearch() {
    if (busy || typeof backendCreateProspectingRun !== 'function') return;
    setBusy(true);
    setError('');
    try {
      const run = await backendCreateProspectingRun(userId, {
        name: `Soprador radial · ${region || 'Brasil'}`,
        product: product.trim() || 'Soprador radial',
        region: region.trim(),
        segments,
        keywords: keywords.split(',').map(v => v.trim()).filter(Boolean).slice(0, 20),
        requestedLimit: Math.max(1, Math.min(100, Number(limit) || 20))
      });
      setRuns(prev => [run, ...prev]);
      setNotice('Pesquisa salva. A descoberta de empresas será executada na próxima etapa.');
    } catch (e) {
      window.SynapseLogger?.warn('Falha ao criar pesquisa de prospecção.', e);
      setError('Não foi possível salvar esta pesquisa. Verifique sua conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const active = prospects.filter(p => p.status !== 'discarded');
  const qualified = prospects.filter(p => p.status === 'qualified');
  const recentRuns = runs.slice(0, 5);

  return React.createElement(
    'div',
    { className: 'prospecting-ui' },
    React.createElement(
      'div',
      { className: 'prospecting-hero' },
      React.createElement(
        'div',
        null,
        React.createElement('div', { className: 'workspace-eyebrow' }, 'PROSPECÇÃO'),
        React.createElement('h2', null, 'Encontre empresas com potencial comercial.'),
        React.createElement('p', null, 'O Synapse pesquisa, organiza e analisa. Você decide quem merece entrar no CRM e como abordar.')
      ),
      React.createElement(
        'div',
        { className: 'prospecting-note' },
        React.createElement('b', null, 'Sem disparo automático'),
        React.createElement('span', null, 'O Synapse não envia e-mails. Ele prepara os dados e a mensagem para você revisar.')
      )
    ),
    error && React.createElement('div', { className: 'prospecting-feedback error', role: 'alert' }, error),
    notice && React.createElement('div', { className: 'prospecting-feedback success', role: 'status' }, notice),
    React.createElement(
      'div',
      { className: 'prospecting-grid' },
      React.createElement(
        'section',
        { className: 'prospecting-card' },
        React.createElement('div', { className: 'prospecting-card-title' }, 'Nova pesquisa'),
        React.createElement(
          'label',
          null,
          'Produto / solução',
          React.createElement('input', { value: product, onChange: e => setProduct(e.target.value), placeholder: 'Ex.: Soprador radial' })
        ),
        React.createElement(
          'label',
          null,
          'Região',
          React.createElement('input', { value: region, onChange: e => setRegion(e.target.value), placeholder: 'Ex.: São Paulo, SP ou Brasil' })
        ),
        React.createElement(
          'div',
          { className: 'prospecting-field' },
          React.createElement('span', { className: 'prospecting-label' }, 'Segmentos'),
          React.createElement(
            'div',
            { className: 'prospecting-chips' },
            PROSPECT_SEGMENTS.map(segment =>
              React.createElement(
                'button',
                {
                  key: segment,
                  type: 'button',
                  className: 'prospecting-chip' + (segments.includes(segment) ? ' active' : ''),
                  onClick: () => toggleSegment(segment),
                  'aria-pressed': segments.includes(segment)
                },
                segment
              )
            )
          )
        ),
        React.createElement(
          'label',
          null,
          'Termos de busca',
          React.createElement('textarea', { value: keywords, onChange: e => setKeywords(e.target.value), rows: 3, placeholder: 'Separe os termos por vírgula' })
        ),
        React.createElement(
          'label',
          null,
          'Quantidade desejada',
          React.createElement('input', { type: 'number', min: 1, max: 100, value: limit, onChange: e => setLimit(e.target.value) })
        ),
        React.createElement(
          'button',
          { className: 'prospecting-primary', disabled: busy, onClick: createSearch },
          busy ? 'Salvando pesquisa…' : React.createElement(Search, { size: 16 }), busy ? null : ' Criar pesquisa'
        )
      ),
      React.createElement(
        'section',
        { className: 'prospecting-card' },
        React.createElement(
          'div',
          { className: 'prospecting-card-head' },
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'prospecting-card-title' }, 'Resultados'),
            React.createElement('div', { className: 'prospecting-muted' }, `${active.length} empresas · ${qualified.length} qualificadas`)
          ),
          React.createElement('button', { className: 'prospecting-secondary', onClick: load, disabled: loading }, 'Atualizar')
        ),
        loading
          ? React.createElement('div', { className: 'prospecting-empty' }, 'Carregando prospecção…')
          : active.length
            ? React.createElement(
                'div',
                { className: 'prospecting-results' },
                active.map(p =>
                  React.createElement(
                    'article',
                    { key: p.id, className: 'prospect-card' },
                    React.createElement(
                      'div',
                      { className: 'prospect-card-top' },
                      React.createElement(
                        'div',
                        null,
                        React.createElement('h3', null, p.companyName),
                        React.createElement('span', null, [p.industry, p.city, p.state].filter(Boolean).join(' · ') || 'Empresa ainda não enriquecida')
                      ),
                      React.createElement('span', { className: 'prospect-potential ' + p.potential }, p.potential === 'unknown' ? 'Ainda não analisado' : p.potential)
                    ),
                    p.potentialReason && React.createElement('p', null, p.potentialReason),
                    React.createElement(
                      'div',
                      { className: 'prospect-actions' },
                      p.website && React.createElement('a', { href: p.website, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir site'),
                      React.createElement('button', { onClick: () => navigator.clipboard?.writeText(p.website || p.companyName) }, 'Copiar dados')
                    )
                  )
                )
              )
            : React.createElement(
                'div',
                { className: 'prospecting-empty' },
                React.createElement('strong', null, 'Nenhuma empresa encontrada ainda.'),
                React.createElement('span', null, 'Crie sua primeira pesquisa. A conexão com fontes de empresas e contatos entra na próxima etapa.')
              )
      )
    ),
    React.createElement(
      'section',
      { className: 'prospecting-history' },
      React.createElement('div', { className: 'prospecting-card-title' }, 'Pesquisas recentes'),
      recentRuns.length
        ? React.createElement(
            'div',
            { className: 'prospecting-history-list' },
            recentRuns.map(run =>
              React.createElement(
                'div',
                { key: run.id, className: 'prospecting-history-row' },
                React.createElement('div', null, React.createElement('b', null, run.name), React.createElement('span', null, [run.region, run.product].filter(Boolean).join(' · '))),
                React.createElement('span', null, run.status === 'completed' ? 'Concluída' : run.status === 'draft' ? 'Rascunho' : run.status)
              )
            )
          )
        : React.createElement('div', { className: 'prospecting-muted' }, 'Nenhuma pesquisa realizada ainda.')
    )
  );
}
