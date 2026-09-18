import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const MODEL = "gemini-3.8-flash";
const MAX_MESSAGES = 20;
const MAX_TEXT_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 5000;
const TOTAL_TIMEOUT_MS = 10500;
const ATTEMPT_TIMEOUT_MS = 3000;
const RETRY_DELAYS_MS = [500, 1000];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) throw new Error("Histórico de conversa inválido.");
  return value.map((item) => {
    const role = item?.role;
    const text = typeof item?.text === "string" ? item.text.trim() : "";
    if (!["user", "model"].includes(role) || !text || text.length > MAX_TEXT_LENGTH) throw new Error("Mensagem inválida.");
    return { role, parts: [{ text }] };
  });
}

function shouldRetry(status: number, message = "") {
  if ([408, 500, 502, 503, 504].includes(status)) return true;
  if (status !== 429) return false;
  const lower = message.toLowerCase();
  return lower.includes("rate") || lower.includes("per minute") || lower.includes("per second") || lower.includes("too many");
}

function retryDelayMs(attempt: number) {
  const base = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 1000;
  return base + Math.floor(Math.random() * 150);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ code: "CONFIG_MISSING", error: "A Syn não está configurada no servidor." }, 503);

  try {
    const body = await req.json();
    const context = typeof body?.context === "string" ? body.context.trim().slice(0, MAX_CONTEXT_LENGTH) : "";
    const contents = normalizeMessages(body?.messages);
    const startedAt = Date.now();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const remaining = TOTAL_TIMEOUT_MS - (Date.now() - startedAt);
      if (remaining <= 0) {
        return json({ code: "UPSTREAM_TIMEOUT", error: "A Syn demorou mais do que o esperado para responder." }, 504);
      }

      const controller = new AbortController();
      const attemptTimeout = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining));

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: context }] },
            contents,
            generationConfig: {
              maxOutputTokens: 300,
              thinkingConfig: { thinkingLevel: "low" }
            }
          }),
          signal: controller.signal
        });

        const data = await response.json().catch(() => null);

        if (response.ok) {
          const answer = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
          if (!answer) return json({ code: "UPSTREAM_EMPTY", error: "A Syn não retornou uma resposta." }, 502);
          return json({ answer: answer.slice(0, 20000) });
        }

        const upstreamMessage = String(data?.error?.message || "");
        if (shouldRetry(response.status, upstreamMessage) && attempt < 2) {
          const delay = Math.min(retryDelayMs(attempt), Math.max(0, TOTAL_TIMEOUT_MS - (Date.now() - startedAt)));
          if (delay > 0) await sleep(delay);
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          return json({ code: "UPSTREAM_AUTH", error: "A configuração da Syn não pôde ser validada." }, 502);
        }
        if (response.status === 429) {
          return json({ code: "UPSTREAM_QUOTA", error: "A Syn atingiu um limite de uso." }, 429);
        }
        if ([408, 500, 502, 503, 504].includes(response.status)) {
          return json({ code: "UPSTREAM_UNAVAILABLE", error: "A Syn está temporariamente indisponível." }, 503);
        }
        return json({ code: "UPSTREAM_ERROR", error: "Não foi possível concluir a resposta da Syn." }, 502);
      } catch (error) {
        if (error?.name === "AbortError") {
          if (attempt < 2 && Date.now() - startedAt < TOTAL_TIMEOUT_MS) {
            const delay = Math.min(retryDelayMs(attempt), Math.max(0, TOTAL_TIMEOUT_MS - (Date.now() - startedAt)));
            if (delay > 0) await sleep(delay);
            continue;
          }
          return json({ code: "UPSTREAM_TIMEOUT", error: "A Syn demorou mais do que o esperado para responder." }, 504);
        }
        return json({ code: "UPSTREAM_UNAVAILABLE", error: "A Syn está temporariamente indisponível." }, 503);
      } finally {
        clearTimeout(attemptTimeout);
      }
    }

    return json({ code: "UPSTREAM_UNAVAILABLE", error: "A Syn está temporariamente indisponível." }, 503);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ code: "INVALID_REQUEST", error: "A solicitação enviada à Syn é inválida." }, 400);
    return json({ code: "FUNCTION_ERROR", error: "Não foi possível concluir a solicitação da Syn." }, 500);
  }
});