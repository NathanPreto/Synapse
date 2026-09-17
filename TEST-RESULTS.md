# Synapse — validação da correção de inicialização

Data: 2026-09-17

## Correções aplicadas

- Consolidado `core/logger.js`, `core/sanitize.js`, `services/storage.js`, `services/supabase.js` e `services/spreadsheet.js` em `synapse-runtime.js`.
- `index.html` agora depende apenas de `config.js`, `synapse-runtime.js` e `app.js` locais.
- Corrigido o carregamento do Tailwind Play CDN para o endpoint suportado (`https://cdn.tailwindcss.com`).
- `styles.css`, `config.js`, `supabase.sql`, `app.js` e assets visuais foram preservados.

## Testes executados

- `node --check app.js` — OK
- `node --check synapse-runtime.js` — OK
- `node --check config.js` — OK
- Smoke test dos módulos internos — OK
- Smoke test de bootstrap de `app.js` com dependências de navegador simuladas — OK
- Verificação de todos os scripts locais referenciados pelo `index.html` — OK
- Verificação de que `index.html` não depende mais de `core/` ou `services/` — OK

## Observação

Os CDNs externos não puderam ser baixados no ambiente de execução desta validação por ausência de resolução DNS externa. Portanto, a validação cobre integralmente a inicialização local, ordem dos scripts, sintaxe e dependências internas, mas não substitui um teste visual real no navegador com acesso à internet.
