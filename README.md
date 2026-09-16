# Synapse

CRM de vendas + mentalidade comercial, com autenticação e persistência por usuário usando Supabase.

## Estrutura

- `index.html` — entrada do app e bibliotecas CDN.
- `styles.css` — sistema visual e responsividade.
- `app.js` — interface, autenticação, CRM e sincronização com Supabase.
- `config.js` — URL do projeto e publishable key do Supabase.
- `supabase.sql` — schema, RLS, trigger de perfil/configuração e permissões.

## Deploy

1. Mantenha os arquivos no repositório conectado à Vercel.
2. No Supabase, execute `supabase.sql` no SQL Editor.
3. Em Authentication > Providers > Email, habilite cadastro por e-mail. Para testes, a confirmação de e-mail pode ficar desligada.
4. Em Authentication > URL Configuration, use a URL pública do Synapse na Vercel como Site URL e como Redirect URL permitida.

## Segurança

O navegador usa somente a publishable key do Supabase. O isolamento dos dados é feito pelas políticas de Row Level Security (RLS), usando `auth.uid() = user_id`. Nunca coloque uma secret key/service_role no frontend.

## Dados legados

Se o navegador ainda tiver dados da versão local, o Synapse oferece uma importação única para a conta autenticada. Depois de uma importação concluída, os dados legados locais são removidos.

## IA

A integração direta com Gemini continua sendo opcional e baseada na chave informada pelo usuário durante a sessão. A migração da IA para uma função de backend/Edge Function deve ser feita antes de tratar a aplicação como produção pública.
