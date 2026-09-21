# Synapse

CRM de vendas + apoio ao bem-estar do vendedor. PWA estático (React 18 via CDN, sem bundler), com Supabase (Auth, Postgres/RLS, Edge Functions) e assistente **Syn** (Google Gemini) atrás de uma Edge Function segura.

## Estrutura

| Caminho | Função |
| --- | --- |
| `index.html`, `styles.css`, `sw.js`, `manifest.json` | Entrada, estilos, service worker e manifest do PWA |
| `tailwind.css` | CSS compilado (`npm run build:css`); veja "Tailwind" |
| `src/*.js` | Componentes React (scripts clássicos; a ordem em `index.html` importa) |
| `src/safety.js` | Detecção de crise/sofrimento (cópia de `supabase/functions/_shared/safety.js`) |
| `src/vault.js` | Cofre de bem-estar (AES-GCM, PBKDF2) |
| `src/whatsapp.js` | Monta links `wa.me` a partir do contato do cliente |
| `services/persistence.js` | Cache local, fila offline, dead-letter e sincronização |
| `services/supabase.js`, `backend.js` | Acesso ao Supabase e contrato público usado pela UI |
| `synapse-runtime.js` | Log, sanitização, armazenamento local e planilhas |
| `supabase/migrations/` | Fonte da verdade do schema (`supabase.sql` é gerado) |
| `supabase/functions/` | `synapse-ai` e `delete-account` |
| `tests/` | Testes de comportamento (`node --test`) |

## Desenvolvimento

Requer Node 22.18 ou superior.

```bash
npm install
npm test                # testes (node:test)
npm run format:check    # prettier
npm run build:css       # gera tailwind.css (obrigatório antes do deploy)
npm run build:schema    # regenera supabase.sql a partir das migrations
```

Sirva a pasta com qualquer servidor estático (`npx serve .`). Ao adicionar um arquivo em `src/`, registre-o em `index.html` e em `sw.js` e incremente a versão (`?v=`/`CACHE_VERSION`).

### Tailwind

O CDN de runtime não é mais usado. O CSS é compilado com Tailwind 3.4.17 a partir de `tailwind.config.js` e `src/tailwind.input.css`. O `tailwind.css` versionado é um baseline mínimo para o app abrir sem build; a Vercel o sobrescreve com o build real (`vercel.json`) e o CI também roda o build.

## Deploy

### 1. Banco (antes do frontend)

```bash
supabase link --project-ref <ref>
supabase db push
```

As migrations adicionam consentimentos LGPD, cotas de uso da IA, restrições de valores, gatilhos de `updated_at` e resolução de conflito por registro (`client_updated_at`). Na primeira entrada após o deploy, todos os usuários precisam aceitar os consentimentos novamente.

### 2. Edge Functions

```bash
supabase secrets set GEMINI_API_KEY=... ALLOWED_ORIGINS=https://seu-dominio.vercel.app
supabase functions deploy synapse-ai
supabase functions deploy delete-account
```

Opcionais: `GEMINI_MODELS` (lista separada por vírgula, confirme os nomes na sua conta), `AI_PER_MINUTE` (6), `AI_PER_DAY` (80), `AI_GLOBAL_PER_DAY` (3000), `AI_MAX_OUTPUT_TOKENS` (450). `verify_jwt = true` está fixado em `supabase/config.toml`. Não use `*` em `ALLOWED_ORIGINS`.

### 3. Frontend (Vercel)

O `vercel.json` executa `npm run build:css`. `config.js` só recebe a URL e a **publishable key** do Supabase. Nunca coloque `service_role` ou `sb_secret` no frontend. Em Authentication > URL Configuration, cadastre a URL pública.

## Segurança e privacidade

- **Syn**: o prompt e o contexto (clientes, lembretes, humor numérico) são montados no servidor a partir do banco; o cliente só envia as mensagens. Há verificação de usuário, CORS restrito, cotas por minuto/dia e globais (falham fechadas) e exigência de consentimento.
- **Crise**: mensagens com risco de vida recebem resposta fixa com CVV 188 e SAMU 192 sem chamar o modelo; sofrimento leve segue ao modelo com instrução de acolhimento. Não substitui terapia.
- **Cofre**: opcional; criptografa check-ins e diário no dispositivo. A senha do cofre não é recuperável.
- **Sincronização**: o registro com `client_updated_at` mais novo vence; escritas obsoletas são ignoradas pelo gatilho. Erros permanentes (SQLSTATE 22/23/42501) vão para dead-letter em vez de travar a fila.
- **Textos legais** (`privacidade.html`, `termos.html`) são um ponto de partida e **precisam de revisão jurídica** antes do lançamento público, incluindo a identificação do controlador.

## Licença

Todos os direitos reservados (veja `LICENSE`).
