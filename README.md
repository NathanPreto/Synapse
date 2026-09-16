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
