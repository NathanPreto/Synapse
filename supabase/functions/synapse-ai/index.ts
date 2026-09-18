import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// A Syn é uma assistente básica: priorizamos baixa latência e baixo consumo.
const MODELS = [
  { id: "gemini-3.5-flash-lite", thinkingLevel: "minimal" },
  { id: "gemini-3.8-flash", thinkingLevel: "low" }
];
const MAX_MESSAGES = 20;
const MAX_TEXT_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 5000;
const TOTAL_TIMEOUT_MS = 9000;
const ATTEMPT_TIMEOUT_MS = 5000;

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

function isRetryableStatus(status: number) {
  return [408, 429, 500, 502, 503, 504].includes(status);
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

    let sawQuota = false;
    let sawTimeout = false;
    for (const model of MODELS) {
      const remaining = TOTAL_TIMEOUT_MS - (Date.now() - startedAt);
      if (remaining <= 0) break;

      const controller = new AbortController();
      const attemptTimeout = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining));

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: context }] },
            contents,
            generationConfig: {
              maxOutputTokens: 220,
              thinkingConfig: { thinkingLevel: model.thinkingLevel }
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
        const upstreamStatus = String(data?.error?.status || "").toUpperCase();
        console.warn("Syn upstream response", {
          model: model.id,
          status: response.status,
          upstreamStatus,
          message: upstreamMessage.slice(0, 300)
        });

        if (response.status === 401 || response.status === 403) {
          return json({ code: "UPSTREAM_AUTH", error: "A configuração da Syn não pôde ser validada." }, 502);
        }

        if (response.status === 429) {
          sawQuota = true;
          continue;
        }

        if (isRetryableStatus(response.status)) {
          if (response.status === 408 || response.status === 504) sawTimeout = true;
          continue;
        }

        return json({ code: "UPSTREAM_ERROR", error: "Não foi possível concluir a resposta da Syn." }, 502);
      } catch (error) {
        if (error?.name === "AbortError") {
          sawTimeout = true;
          continue;
        }

        console.warn("Syn upstream fetch failed", {
          model: model.id,
          error: String(error?.message || error).slice(0, 300)
        });
      } finally {
        clearTimeout(attemptTimeout);
      }
    }

    if (sawQuota) return json({ code: "UPSTREAM_QUOTA", error: "A Syn atingiu um limite de uso." }, 429);
    if (sawTimeout) return json({ code: "UPSTREAM_TIMEOUT", error: "A Syn demorou mais do que o esperado para responder." }, 504);
    return json({ code: "UPSTREAM_UNAVAILABLE", error: "A Syn está temporariamente indisponível." }, 503);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ code: "INVALID_REQUEST", error: "A solicitação enviada à Syn é inválida." }, 400);
    return json({ code: "FUNCTION_ERROR", error: "Não foi possível concluir a solicitação da Syn." }, 500);
  }
});