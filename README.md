# Synapse

CRM de vendas + mentalidade comercial, agora com autenticação e persistência em nuvem.

## Estrutura

- `index.html` - entrada da aplicação
- `styles.css` - sistema visual e responsividade
- `app.js` - aplicação React, autenticação, CRM, mentalidade e sincronização
- `config.js` - URL e publishable key públicas do Supabase
- `supabase.sql` - tabelas, RLS, permissões e trigger de perfil

## Stack

- React 18 via CDN
- Tailwind CDN
- SheetJS CDN
- Supabase JS v2 via CDN
- Supabase Auth + PostgreSQL + Row Level Security
- Vercel para hospedagem

## Configuração do Supabase

1. Crie um projeto Free no Supabase.
2. Abra **SQL Editor > New query**.
3. Cole o conteúdo de `supabase.sql` e execute.
4. Em **Authentication > URL Configuration**, configure a URL pública da Vercel como Site URL e Redirect URL depois do primeiro deploy.
5. Confirme que a confirmação de e-mail está como você deseja para os testes.

## Configuração do frontend

Edite `config.js` apenas com a URL do projeto e a **Publishable key** do Supabase.

Nunca coloque uma `sb_secret_...` ou `service_role` no frontend.

## Vercel

O projeto é estático. Substitua os arquivos no GitHub e deixe a Vercel fazer o novo deploy pelo repositório conectado.

## Migração

Na primeira entrada de uma conta nova, o Synapse procura dados da versão local anterior neste navegador. Se encontrar clientes, lembretes, check-ins ou modelos, oferece a importação para a conta.

## Dados por usuário

O frontend envia o token da sessão do usuário para o Supabase. As tabelas têm RLS e cada política limita acesso ao `auth.uid()` correspondente ao `user_id`.

## IA

A integração direta com Gemini continua separada nesta versão e não foi redesenhada. A próxima etapa recomendada é mover a chamada para uma função de servidor/Edge Function antes de usar a IA em produção pública.

## Refatoração técnica — 2026-09

A refatoração preserva `styles.css` e `config.js` byte a byte. O objetivo foi melhorar organização, robustez e observabilidade sem redesenhar a interface.

### Organização

- `core/logger.js` — logging centralizado, captura de `error` e `unhandledrejection` e eventos de feedback.
- `core/sanitize.js` — `sanitizeInput` e sanitização de registros externos antes de entrarem no estado da aplicação.
- `services/storage.js` — armazenamento local/session com fallback seguro.
- `services/supabase.js` — autenticação de dados, leitura, upsert e exclusão por usuário.
- `services/spreadsheet.js` — leitura de arquivos, limite de 15 MB, validações e processamento da planilha.
- `app.js` — componentes React, estado e regras de negócio da interface.

### Segurança e dados

- O frontend continua usando somente a configuração pública do Supabase existente em `config.js`.
- Nenhuma chave `service_role` ou `sb_secret` foi adicionada.
- A sincronização continua respeitando o isolamento por `user_id` e RLS.
- Sincronizações automáticas são upsert-only; exclusões acontecem apenas por ações explícitas do usuário.
- Entradas provenientes de backups e planilhas passam por sanitização antes de serem colocadas no estado.

### Importação de planilhas

- Arquivos maiores que 15 MB são rejeitados com mensagem orientativa.
- Arquivos corrompidos, vazios ou sem cabeçalho são tratados sem quebrar a aplicação.
- O mapeamento de colunas continua compatível com os aliases existentes.
- O usuário é avisado quando a coluna de nome não foi reconhecida.
- O processamento pesado em memória usa `DocumentFragment` para preparar amostras sem inserir nós individualmente no DOM.

### Dependências externas

- React e ReactDOM: 18.3.1, com SRI SHA-512.
- SheetJS: 0.20.3, com SRI SHA-384.
- Tailwind Play CDN: 3.4.17, versão fixada. O Play CDN é um runtime gerado pelo próprio CDN e não oferece as condições necessárias para SRI/CORS; por isso não foi inventado um hash que poderia bloquear a aplicação.
- Supabase JS: 2.116.0, versão fixada via UMD CDN.

### Observabilidade

Falhas globais de JavaScript e Promises não tratadas são capturadas por `core/logger.js`. Operações assíncronas relevantes em carregamento, sincronização, importação e exclusão em nuvem emitem estado de processamento para a interface.
