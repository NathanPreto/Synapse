import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { resolveCors } from '../_shared/cors.ts';

// Secrets: ALLOWED_ORIGINS (origens do app, separadas por vírgula).
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já são injetados pela plataforma.

Deno.serve(async (req: Request) => {
  const cors = resolveCors(req.headers.get('Origin'), Deno.env.get('ALLOWED_ORIGINS'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors.headers, 'Content-Type': 'application/json' }
    });

  if (!cors.configured) {
    return json(
      { code: 'CONFIG_MISSING', error: 'A exclusão de conta não está configurada no servidor.' },
      503
    );
  }
  if (!cors.allowed) return json({ code: 'FORBIDDEN_ORIGIN', error: 'Origem não permitida.' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const authHeader = req.headers.get('Authorization') || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return json({ code: 'UNAUTHORIZED', error: 'Sessão não encontrada.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(
      { code: 'CONFIG_MISSING', error: 'A exclusão de conta não está configurada no servidor.' },
      503
    );
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
    if (userError || !userData?.user?.id) {
      return json(
        { code: 'UNAUTHORIZED', error: 'Sua sessão expirou. Entre novamente e tente outra vez.' },
        401
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Contadores de uso da IA não têm chave estrangeira para auth.users: removê-los explicitamente.
    const { error: usageError } = await adminClient
      .from('ai_usage')
      .delete()
      .eq('subject', `u:${userData.user.id}`);
    if (usageError) {
      console.warn('ai_usage cleanup failed', String(usageError.message).slice(0, 200));
    }

    // As demais tabelas são removidas em cascata (ON DELETE CASCADE em auth.users).
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);
    if (deleteError) {
      console.error('Account deletion failed', {
        userId: userData.user.id,
        message: deleteError.message
      });
      return json({ code: 'DELETE_FAILED', error: 'Não foi possível excluir a conta agora.' }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    console.error(
      'Account deletion error',
      String((error as Error)?.message || error).slice(0, 300)
    );
    return json({ code: 'FUNCTION_ERROR', error: 'Não foi possível excluir a conta agora.' }, 500);
  }
});
