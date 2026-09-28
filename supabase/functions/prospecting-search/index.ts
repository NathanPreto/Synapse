import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS')?.split(',')[0]?.trim() || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
const noSession = { persistSession: false, autoRefreshToken: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });

function client(token: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { auth: noSession, global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

function clean(value: unknown, max = 1000) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function parseModelJson(text: string) {
  const raw = text.trim().replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').replace(/\s*\`\`\`$/i, '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Resposta de prospecção sem JSON válido');
  return JSON.parse(raw.slice(start, end + 1));
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ code: 'UNAUTHORIZED' }, 401);

    const db = client(token);
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData?.user?.id) return json({ code: 'UNAUTHORIZED' }, 401);

    const body = await req.json();
    const product = clean(body?.product || 'Soprador radial', 200);
    const region = clean(body?.region || 'Brasil', 200);
    const segments = Array.isArray(body?.segments)
      ? body.segments.map((v: unknown) => clean(v, 80)).filter((v: string) => ['Plásticos','Alimentos','Química','Papel e celulose','Tratamento de água'].includes(v)).slice(0, 5))
      : [];
    const keywords = Array.isArray(body?.keywords)
      ? body.keywords.map((v: unknown) => clean(v, 100)).filter(Boolean).slice(0, 12)
      : [];
    const limit = Math.max(1, Math.min(20, Number(body?.limit) || 10));

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!serviceKey || !geminiKey) return json({ code: 'CONFIG_MISSING' }, 500);

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, { auth: noSession });
    const quota = await admin.rpc('consume_ai_quota', {
      p_user: userData.user.id,
      p_per_minute: 2,
      p_per_day: 20,
      p_global_per_day: 500
    });
    if (quota.error) return json({ code: 'QUOTA_ERROR' }, 500);
    if (!quota.data?.allowed) return json({ code: 'RATE_LIMITED', reason: quota.data?.reason || 'quota' }, 429);

    const existing = await db.from('prospects').select('company_name,domain').eq('user_id', userData.user.id).limit(500);
    if (existing.error) return json({ code: 'DATABASE_ERROR' }, 500);

    const existingDomains = new Set((existing.data || []).map((p: any) => clean(p.domain, 500).toLowerCase()).filter(Boolean));
    const existingNames = new Set((existing.data || []).map((p: any) => clean(p.company_name, 200).toLowerCase()).filter(Boolean));

    const prompt = `Você é o pesquisador comercial do Synapse. Encontre até ${limit} empresas INDUSTRIAIS reais no Brasil que tenham potencial de utilizar "${product}".

Região: ${region}.
Segmentos prioritários: ${segments.join(', ') || 'qualquer um dos segmentos: Plásticos, Alimentos, Química, Papel e celulose, Tratamento de água'}.
Termos auxiliares: ${keywords.join(', ') || 'nenhum'}.

Procure empresas, não fornecedores de sopradores. Priorize fabricantes/indústrias que tenham processos em que sopradores radiais possam ser usados. Para cada empresa, procure o site oficial e evidências públicas do processo industrial. Não invente empresas, sites, e-mails, cargos ou fatos.

Retorne SOMENTE JSON neste formato:
{"prospects":[{"company_name":"","domain":"","website":"","industry":"","description":"","city":"","state":"","potential":"high|medium|low|unknown","potential_reason":"","evidence":[{"url":"","source_name":"","evidence":""}],"unknowns":[]}]}

Critérios:
- company_name é obrigatório.
- domain/website só se encontrados.
- potential deve refletir evidência encontrada, não certeza de compra.
- evidence deve conter URLs públicas que sustentem a indicação.
- unknowns registra o que não pôde ser confirmado.
- não inclua empresas da lista de existentes abaixo.
Empresas já cadastradas: ${Array.from(existingNames).slice(0, 100).join(' | ') || 'nenhuma'}.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('PROSPECTING_GEMINI_MODEL') || 'gemini-3.5-flash-lite',
        input: prompt,
        tools: [{ type: 'google_search' }]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Gemini prospecting error', response.status, detail.slice(0, 1000));
      return json({ code: 'SEARCH_PROVIDER_ERROR' }, 502);
    }

    const payload = await response.json();
    const outputs = Array.isArray(payload?.steps) ? payload.steps.filter((s: any) => s?.type === 'model_output') : [];
    const blocks = outputs.flatMap((s: any) => Array.isArray(s.content) ? s.content : []);
    const textBlock = blocks.find((b: any) => b?.type === 'text' && typeof b.text === 'string');
    if (!textBlock?.text) return json({ code: 'EMPTY_SEARCH_RESULT' }, 502);

    const parsed = parseModelJson(textBlock.text);
    const sourceAnnotations = blocks.flatMap((b: any) => Array.isArray(b.annotations) ? b.annotations : [])
      .filter((a: any) => a?.type === 'url_citation' && a.url)
      .map((a: any) => ({ url: clean(a.url, 1000), source_name: clean(a.title || a.url, 200) }));

    const prospects = (Array.isArray(parsed?.prospects) ? parsed.prospects : [])
      .slice(0, limit)
      .map((p: any) => ({
        company_name: clean(p.company_name, 200),
        domain: clean(p.domain, 500).toLowerCase(),
        website: clean(p.website, 1000),
        industry: clean(p.industry, 200),
        description: clean(p.description, 5000),
        city: clean(p.city, 120),
        state: clean(p.state, 120),
        country: 'Brasil',
        potential: ['high','medium','low','unknown'].includes(p.potential) ? p.potential : 'unknown',
        potential_reason: clean(p.potential_reason, 10000),
        analysis_status: 'analyzed',
        analysis: { provider: 'gemini_google_search', model: Deno.env.get('PROSPECTING_GEMINI_MODEL') || 'gemini-3.5-flash-lite' },
        evidence: Array.isArray(p.evidence) ? p.evidence.slice(0, 8).map((e: any) => ({ url: clean(e?.url, 1000), source_name: clean(e?.source_name, 200), evidence: clean(e?.evidence, 5000) })) : [],
        unknowns: Array.isArray(p.unknowns) ? p.unknowns.map((v: unknown) => clean(v, 500)).slice(0, 12) : []
      }))
      .filter((p: any) => p.company_name)
      .filter((p: any) => !existingNames.has(p.company_name.toLowerCase()) && (!p.domain || !existingDomains.has(p.domain)));

    const annotationSources = sourceAnnotations.filter((s: any, i: number, arr: any[]) => arr.findIndex(x => x.url === s.url) === i);
    return json({ prospects, sources: annotationSources });
  } catch (error) {
    console.error('Prospecting function error', error);
    return json({ code: 'FUNCTION_ERROR' }, 500);
  }
});
