import '../_shared/safety.js';
import { resolveCors } from '../_shared/cors.ts';
import { buildContext, todayInSaoPaulo } from './context.ts';
import type { Snapshot } from './context.ts';
import { buildSystemPrompt } from './prompt.ts';
import type { Risk } from './prompt.ts';

// deno-lint-ignore no-explicit-any
const Safety = (globalThis as any).SynapseSafety as {
  detectRisk(text: string): 'crisis' | 'distress' | null;
  CRISIS_RESPONSE: string;
  DISTRESS_NOTE: string;
};

export interface Limits {
  perMinute: number;
  perDay: number;
  globalPerDay: number;
}
export interface Deps {
  env(name: string): string | undefined;
  fetch: typeof fetch;
  now(): number;
  getUser(token: string): Promise<{ id: string } | null>;
  getProfile(token: string, userId: string): Promise<{ consent_ai_at?: string | null } | null>;
  loadSnapshot(token: string, userId: string): Promise<Snapshot>;
  consumeQuota(userId: string, limits: Limits): Promise<{ allowed: boolean; reason?: string }>;
}

const DEFAULT_MODELS = [
  { id: 'gemini-3.5-flash-lite', thinkingLevel: 'minimal' },
  { id: 'gemini-3.1-flash-lite', thinkingLevel: 'minimal' },
  { id: 'gemini-2.5-flash-lite', thinkingLevel: 'minimal' },
  { id: 'gemini-3.8-flash', thinkingLevel: 'low' }
];
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 12;
const MAX_TEXT_LENGTH = 2000;
const MAX_TOTAL_LENGTH = 12000;
const TOTAL_TIMEOUT_MS = 14000;
const ATTEMPT_TIMEOUT_MS = 4500;

function intEnv(deps: Deps, name: string, fallback: number): number {
  const n = Number.parseInt(deps.env(name) ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function models(deps: Deps) {
  // GEMINI_MODELS="modelo-a,modelo-b" permite trocar a ordem sem redeploy do código.
  const raw = deps.env('GEMINI_MODELS');
  if (!raw) return DEFAULT_MODELS;
  const ids = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return ids.length ? ids.map(id => ({ id, thinkingLevel: 'minimal' })) : DEFAULT_MODELS;
}

export type Message = { role: 'user' | 'model'; text: string };

export function normalizeMessages(value: unknown): Message[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    throw new Error('Histórico de conversa inválido.');
  }
  let total = 0;
  const out: Message[] = value.map(item => {
    const role = item?.role;
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!['user', 'model'].includes(role) || !text || text.length > MAX_TEXT_LENGTH) {
      throw new Error('Mensagem inválida.');
    }
    total += text.length;
    return { role, text };
  });
  if (total > MAX_TOTAL_LENGTH) throw new Error('Conversa longa demais.');
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user')
    throw new Error('A última mensagem deve ser do usuário.');
  return out;
}

export function createHandler(deps: Deps) {
  return async (req: Request): Promise<Response> => {
    const cors = resolveCors(req.headers.get('Origin'), deps.env('ALLOWED_ORIGINS'));
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors.headers, 'Content-Type': 'application/json' }
      });

    if (!cors.configured) {
      return json(
        { code: 'CONFIG_MISSING', error: 'A Syn não está configurada no servidor.' },
        503
      );
    }
    if (!cors.allowed)
      return json({ code: 'FORBIDDEN_ORIGIN', error: 'Origem não permitida.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
    if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

    // 1) Autenticação (sempre, antes de qualquer outro trabalho)
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ code: 'UNAUTHORIZED', error: 'Sessão não encontrada.' }, 401);
    let user: { id: string } | null = null;
    try {
      user = await deps.getUser(token);
    } catch (error) {
      console.warn(
        'Syn auth check failed',
        String((error as Error)?.message || error).slice(0, 200)
      );
    }
    if (!user?.id)
      return json({ code: 'UNAUTHORIZED', error: 'Sua sessão expirou. Entre novamente.' }, 401);

    // 2) Entrada validada (o cliente envia só as mensagens; o prompt é do servidor)
    let messages: Message[];
    try {
      const raw = await req.text();
      if (raw.length > MAX_BODY_BYTES)
        return json({ code: 'INVALID_REQUEST', error: 'Solicitação grande demais.' }, 413);
      const body = JSON.parse(raw);
      messages = normalizeMessages(body?.messages);
    } catch {
      return json(
        { code: 'INVALID_REQUEST', error: 'A solicitação enviada à Syn é inválida.' },
        400
      );
    }

    // 3) Segurança emocional: risco imediato recebe resposta fixa, sem chamar o modelo
    //    e sem consumir cota (pedido de ajuda nunca é limitado).
    const userTexts = messages.filter(m => m.role === 'user').map(m => m.text);
    const latestRisk = Safety.detectRisk(userTexts[userTexts.length - 1]);
    if (latestRisk === 'crisis') {
      return json({ answer: Safety.CRISIS_RESPONSE, safety: 'crisis' });
    }
    const earlierCrisis = userTexts
      .slice(0, -1)
      .slice(-5)
      .some(t => Safety.detectRisk(t) === 'crisis');
    const risk: Risk = earlierCrisis
      ? 'crisis_followup'
      : latestRisk === 'distress'
        ? 'distress'
        : null;

    // 4) Consentimento explícito para enviar dados ao provedor de IA
    let profile: { consent_ai_at?: string | null } | null = null;
    try {
      profile = await deps.getProfile(token, user.id);
    } catch (error) {
      console.warn(
        'Syn profile check failed',
        String((error as Error)?.message || error).slice(0, 200)
      );
    }
    if (!profile?.consent_ai_at) {
      return json(
        {
          code: 'CONSENT_REQUIRED',
          error: 'É preciso autorizar o uso da IA para conversar com a Syn.'
        },
        403
      );
    }

    const apiKey = deps.env('GEMINI_API_KEY');
    if (!apiKey)
      return json(
        { code: 'CONFIG_MISSING', error: 'A Syn não está configurada no servidor.' },
        503
      );

    // 5) Limite de uso por usuário (minuto/dia) e global. Falha fechada.
    try {
      const quota = await deps.consumeQuota(user.id, {
        perMinute: intEnv(deps, 'AI_PER_MINUTE', 6),
        perDay: intEnv(deps, 'AI_PER_DAY', 80),
        globalPerDay: intEnv(deps, 'AI_GLOBAL_PER_DAY', 3000)
      });
      if (!quota.allowed) {
        return json(
          {
            code: 'RATE_LIMITED',
            reason: quota.reason,
            error: 'Você atingiu o limite de uso da Syn. Tente novamente mais tarde.'
          },
          429
        );
      }
    } catch (error) {
      console.error(
        'Syn quota check failed',
        String((error as Error)?.message || error).slice(0, 200)
      );
      return json(
        { code: 'QUOTA_UNAVAILABLE', error: 'A Syn está temporariamente indisponível.' },
        503
      );
    }

    // 6) Contexto real do vendedor, lido no servidor com o token dele (RLS)
    let contextText = '';
    try {
      const snapshot = await deps.loadSnapshot(token, user.id);
      contextText = buildContext(snapshot, todayInSaoPaulo(deps.now()));
    } catch (error) {
      console.warn(
        'Syn context load failed',
        String((error as Error)?.message || error).slice(0, 200)
      );
    }
    const systemPrompt = buildSystemPrompt(contextText, risk);
    const contents = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));

    // 7) Chamada ao modelo com fallback
    const startedAt = deps.now();
    let sawQuota = false;
    let sawTimeout = false;
    for (const model of models(deps)) {
      const remaining = TOTAL_TIMEOUT_MS - (deps.now() - startedAt);
      if (remaining <= 0) break;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining));
      try {
        const response = await deps.fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: {
                maxOutputTokens: intEnv(deps, 'AI_MAX_OUTPUT_TOKENS', 450),
                thinkingConfig: { thinkingLevel: model.thinkingLevel }
              }
            }),
            signal: controller.signal
          }
        );
        const data = await response.json().catch(() => null);

        if (response.ok) {
          const candidate = data?.candidates?.[0];
          let answer = String(
            candidate?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? ''
          ).trim();
          if (!answer) {
            if (candidate?.finishReason === 'SAFETY' || data?.promptFeedback?.blockReason) {
              return json({
                answer:
                  'Não consegui responder a isso. Posso ajudar com clientes, lembretes ou com a sua rotina comercial.'
              });
            }
            return json({ code: 'UPSTREAM_EMPTY', error: 'A Syn não retornou uma resposta.' }, 502);
          }
          answer = answer.slice(0, 6000);
          if ((risk === 'distress' || risk === 'crisis_followup') && !answer.includes('188')) {
            answer += Safety.DISTRESS_NOTE;
          }
          return json({
            answer,
            ...(risk ? { safety: risk === 'distress' ? 'distress' : 'crisis' } : {})
          });
        }

        console.warn('Syn upstream response', { model: model.id, status: response.status });
        if (response.status === 401 || response.status === 403) {
          return json(
            { code: 'UPSTREAM_AUTH', error: 'A configuração da Syn não pôde ser validada.' },
            502
          );
        }
        if (response.status === 429) {
          sawQuota = true;
          continue;
        }
        if ([408, 500, 502, 503, 504].includes(response.status)) {
          if (response.status === 408 || response.status === 504) sawTimeout = true;
          continue;
        }
        return json(
          { code: 'UPSTREAM_ERROR', error: 'Não foi possível concluir a resposta da Syn.' },
          502
        );
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          sawTimeout = true;
          continue;
        }
        console.warn('Syn upstream fetch failed', {
          model: model.id,
          error: String((error as Error)?.message || error).slice(0, 200)
        });
      } finally {
        clearTimeout(timer);
      }
    }
    if (sawQuota)
      return json({ code: 'UPSTREAM_QUOTA', error: 'A Syn atingiu um limite de uso.' }, 429);
    if (sawTimeout)
      return json(
        { code: 'UPSTREAM_TIMEOUT', error: 'A Syn demorou mais do que o esperado para responder.' },
        504
      );
    return json(
      { code: 'UPSTREAM_UNAVAILABLE', error: 'A Syn está temporariamente indisponível.' },
      503
    );
  };
}
