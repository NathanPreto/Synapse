import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}
const noSession = { persistSession: false, autoRefreshToken: false };
const json = (body: unknown, status = 200, req?: Request) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders(req || new Request('https://localhost')), 'Content-Type': 'application/json' }
});

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405, req);

  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ code: 'UNAUTHORIZED' }, 401, req);

    const db = client(token);
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData?.user?.id) return json({ code: 'UNAUTHORIZED' }, 401, req);

    const body = await req.json();
    const product = clean(body?.product || 'Soprador radial', 200);
    const region = clean(body?.region || 'Brasil', 200);
    const segments = Array.isArray(body?.segments)
      ? body.segments.map((v: unknown) => clean(v, 80)).filter((v: string) => ['Plásticos','Alimentos','Química','Papel e celulose','Tratamento de água'].includes(v)).slice(0, 5)
      : [];
    const keywords = Array.isArray(body?.keywords)
      ? body.keywords.map((v: unknown) => clean(v, 100)).filter(Boolean).slice(0, 12)
      : [];
    const limit = Math.max(1, Math.min(20, Number(body?.limit) || 10));

    const serviceKey = Deno.env.get(['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_'));
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!serviceKey || !geminiKey) return json({ code: 'CONFIG_MISSING' }, 500, req);

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, { auth: noSession });
    const quota = await admin.rpc('consume_ai_quota', {
      p_user: userData.user.id,
      p_per_minute: 1,
      p_per_day: 20,
      p_global_per_day: 100
    });
    if (quota.error) return json({ code: 'QUOTA_ERROR' }, 500, req);
    if (!quota.data?.allowed) return json({ code: 'RATE_LIMITED', reason: quota.data?.reason || 'quota' }, 429, req);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dailyCount = await db
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userData.user.id)
      .gte('created_at', startOfDay.toISOString());
    if (dailyCount.error) return json({ code: 'DATABASE_ERROR' }, 500, req);

    const dailyUsed = Number(dailyCount.count || 0);
    const dailyRemaining = Math.max(0, 10 - dailyUsed);
    if (!dailyRemaining) {
      return json({
        code: 'DAILY_PROSPECT_LIMIT',
        daily_limit: 10,
        daily_used: dailyUsed,
        daily_remaining: 0
      }, 429, req);
    }

    const existing = await db.from('prospects').select('company_name,domain').eq('user_id', userData.user.id).limit(500);
    if (existing.error) return json({ code: 'DATABASE_ERROR' }, 500, req);

    const existingDomains = new Set((existing.data || []).map((p: any) => clean(p.domain, 500).toLowerCase()).filter(Boolean));
    const existingNames = new Set((existing.data || []).map((p: any) => clean(p.company_name, 200).toLowerCase()).filter(Boolean));

    const prompt = `Você é o pesquisador comercial do Synapse. Encontre até ${Math.min(limit, dailyRemaining)} empresas INDUSTRIAIS reais no Brasil que tenham potencial de utilizar "${product}".

Região: ${region}.
Segmentos prioritários: ${segments.join(', ') || 'qualquer um dos segmentos: Plásticos, Alimentos, Química, Papel e celulose, Tratamento de água'}.
Termos auxiliares: ${keywords.join(', ') || 'nenhum'}.

Use a Pesquisa Google integrada do Gemini para localizar empresas e páginas públicas atuais. Procure empresas, não fornecedores de sopradores. Priorize fabricantes/indústrias que tenham processos em que sopradores radiais possam ser usados. Não invente empresas, sites, e-mails, cargos ou fatos. Para cada empresa, identifique o site oficial e evidências públicas que sustentem a indicação.

Retorne SOMENTE JSON neste formato:
{\"prospects\":[{\"company_name\":\"\",\"domain\":\"\",\"website\":\"\",\"industry\":\"\",\"description\":\"\",\"city\":\"\",\"state\":\"\",\"potential\":\"high|medium|low|unknown\",\"potential_reason\":\"\",\"evidence\":[{\"url\":\"\",\"source_name\":\"\",\"evidence\":\"\"}],\"contacts\":[{\"name\":\"\",\"email\":\"\",\"phone\":\"\",\"job_title\":\"\",\"department\":\"\",\"email_status\":\"public|not_found\",\"email_confidence\":\"high|medium|low|unknown\",\"source\":\"\",\"source_url\":\"\",\"is_primary\":true}],\"suggested_subject\":\"\",\"suggested_body\":\"\",\"unknowns\":[]}]}

Critérios:
- company_name é obrigatório.
- domain/website só se encontrados.
- potential deve refletir evidência encontrada, não certeza de compra.
- evidence deve conter URLs públicas que sustentem a indicação.
- unknowns registra o que não pôde ser confirmado.
- para contatos, use somente e-mails comerciais publicamente publicados; não invente e-mails. Priorize geral/comercial/vendas ou cargos de compras/engenharia quando publicamente identificados.
- gere suggested_subject e suggested_body em português, curtos, específicos para a empresa e baseados nas evidências; não diga que já é cliente.
- não inclua empresas da lista de existentes abaixo.
Empresas já cadastradas: ${Array.from(existingNames).slice(0, 100).join(' | ') || 'nenhuma'}.
`;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        input: prompt,
        tools: [{ type: 'google_search' }],
        store: false,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: {
  type: 'object',
  properties: {
    prospects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company_name: { type: 'string' },
          domain: { type: 'string' },
          website: { type: 'string' },
          industry: { type: 'string' },
          description: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          potential: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
          potential_reason: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: { url: { type: 'string' }, source_name: { type: 'string' }, evidence: { type: 'string' } },
              required: ['url', 'source_name', 'evidence']
            }
          },
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' },
                job_title: { type: 'string' }, department: { type: 'string' },
                email_status: { type: 'string', enum: ['public', 'not_found', 'unknown'] },
                email_confidence: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
                source: { type: 'string' }, source_url: { type: 'string' }, is_primary: { type: 'boolean' }
              },
              required: ['name', 'email', 'phone', 'job_title', 'department', 'email_status', 'email_confidence', 'source', 'source_url', 'is_primary']
            }
          },
          suggested_subject: { type: 'string' },
          suggested_body: { type: 'string' },
          unknowns: { type: 'array', items: { type: 'string' } }
        },
        required: ['company_name', 'domain', 'website', 'industry', 'description', 'city', 'state', 'potential', 'potential_reason', 'evidence', 'contacts', 'suggested_subject', 'suggested_body', 'unknowns']
      }
    }
  },
  required: ['prospects']
}
        }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Gemini prospecting error', response.status, detail.slice(0, 1000));
      if (response.status === 429) return json({ code: 'SEARCH_QUOTA_EXCEEDED' }, 429, req);
      return json({ code: 'SEARCH_PROVIDER_ERROR' }, 502, req);
    }

    const payload = await response.json();
    if (payload?.status && payload.status !== 'completed') {
      console.error('Gemini prospecting incomplete', payload.status, payload?.error || '');
      return json({ code: 'SEARCH_INCOMPLETE', provider_status: clean(payload.status, 50) }, 502, req);
    }

    const outputs = Array.isArray(payload?.steps)
      ? payload.steps.filter((s: any) => s?.type === 'model_output')
      : [];
    const blocks = outputs.flatMap((s: any) => Array.isArray(s.content) ? s.content : []);
    const textBlock = blocks.find((b: any) => b?.type === 'text' && typeof b.text === 'string');
    const outputText = textBlock?.text || (typeof payload?.output_text === 'string' ? payload.output_text : '');
    if (!outputText) {
      console.error('Gemini prospecting returned no model output', JSON.stringify(payload).slice(0, 3000));
      return json({ code: 'EMPTY_SEARCH_RESULT' }, 502, req);
    }

    const parsed = parseModelJson(outputText);
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
        analysis: { provider: 'gemini_google_search_free_tier', model: 'gemini-2.5-flash-lite' },
        contacts: Array.isArray(p.contacts) ? p.contacts.slice(0, 5).map((e: any) => ({ name: clean(e?.name, 200), email: clean(e?.email, 300), phone: clean(e?.phone, 100), job_title: clean(e?.job_title, 200), department: clean(e?.department, 120), email_status: ['public','not_found'].includes(e?.email_status) ? e.email_status : 'unknown', email_confidence: ['high','medium','low','unknown'].includes(e?.email_confidence) ? e.email_confidence : 'unknown', source: clean(e?.source, 200), source_url: clean(e?.source_url, 1000), is_primary: !!e?.is_primary })) : [], suggested_subject: clean(p.suggested_subject, 300), suggested_body: clean(p.suggested_body, 5000), evidence: Array.isArray(p.evidence) ? p.evidence.slice(0, 8).map((e: any) => ({ url: clean(e?.url, 1000), source_name: clean(e?.source_name, 200), evidence: clean(e?.evidence, 5000) })) : [],
        unknowns: Array.isArray(p.unknowns) ? p.unknowns.map((v: unknown) => clean(v, 500)).slice(0, 12) : []
      }))
      .filter((p: any) => p.company_name)
      .filter((p: any) => !existingNames.has(p.company_name.toLowerCase()) && (!p.domain || !existingDomains.has(p.domain)));

    const annotationSources = sourceAnnotations.filter((s: any, i: number, arr: any[]) => arr.findIndex(x => x.url === s.url) === i);
    return json({
      prospects,
      sources: annotationSources,
      daily_limit: 10,
      daily_used: dailyUsed + prospects.length,
      daily_remaining: Math.max(0, 10 - dailyUsed - prospects.length)
    }, 200, req);
  } catch (error) {
    console.error('Prospecting function error', error);
    return json({ code: 'FUNCTION_ERROR', detail: clean(error instanceof Error ? error.message : error, 500) }, 500, req);
  }
});
