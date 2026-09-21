import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createHandler } from './handler.ts';
import type { Deps } from './handler.ts';

// Secrets necessários (supabase secrets set ...):
//   GEMINI_API_KEY   chave do Gemini
//   ALLOWED_ORIGINS  origens do app, separadas por vírgula (ex.: https://synapse.vercel.app)
// Opcionais: GEMINI_MODELS, AI_PER_MINUTE (6), AI_PER_DAY (80), AI_GLOBAL_PER_DAY (3000), AI_MAX_OUTPUT_TOKENS (450)
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já são injetados pela plataforma.

const noSession = { persistSession: false, autoRefreshToken: false };
const supabaseUrl = () => Deno.env.get('SUPABASE_URL') ?? '';

function userClient(token: string) {
  return createClient(supabaseUrl(), Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

const deps: Deps = {
  env: name => Deno.env.get(name),
  fetch: (...args) => fetch(...args),
  now: () => Date.now(),

  async getUser(token) {
    const { data, error } = await userClient(token).auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return { id: data.user.id };
  },

  async getProfile(token, userId) {
    const { data, error } = await userClient(token)
      .from('profiles')
      .select('consent_ai_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async loadSnapshot(token, userId) {
    const db = userClient(token);
    const [clients, reminders, checkins] = await Promise.all([
      db
        .from('clients')
        .select('name,stage,temp,last_contact,created_at_date,lost_tags')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500),
      db
        .from('reminders')
        .select('text,due,done')
        .eq('user_id', userId)
        .eq('done', false)
        .order('due', { ascending: true })
        .limit(200),
      db
        .from('checkins')
        .select('date,mood')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(14)
    ]);
    for (const r of [clients, reminders, checkins]) if (r.error) throw r.error;
    return {
      clients: clients.data ?? [],
      reminders: reminders.data ?? [],
      checkins: checkins.data ?? []
    };
  },

  async consumeQuota(userId, limits) {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente');
    const admin = createClient(supabaseUrl(), serviceKey, { auth: noSession });
    const { data, error } = await admin.rpc('consume_ai_quota', {
      p_user: userId,
      p_per_minute: limits.perMinute,
      p_per_day: limits.perDay,
      p_global_per_day: limits.globalPerDay
    });
    if (error) throw error;
    return { allowed: data?.allowed === true, reason: data?.reason };
  }
};

Deno.serve(createHandler(deps));
