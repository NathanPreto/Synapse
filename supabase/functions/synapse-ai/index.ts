import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL = "gemini-3.8-flash";
const MAX_MESSAGES = 20;
const MAX_TEXT_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 5000;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) throw new Error("Histórico de conversa inválido.");
  return value.map((item) => {
    const role = item?.role;
    const text = typeof item?.text === "string" ? item.text.trim() : "";
    if (!["user", "model"].includes(role) || !text || text.length > MAX_TEXT_LENGTH) throw new Error("Mensagem inválida.");
    return { role, parts: [{ text }] };
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "A IA não está configurada no servidor." }, 503);
  try {
    const body = await req.json();
    const context = typeof body?.context === "string" ? body.context.trim().slice(0, MAX_CONTEXT_LENGTH) : "";
    const contents = normalizeMessages(body?.messages);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ system_instruction: { parts: [{ text: context }] }, contents, generationConfig: { maxOutputTokens: 700 } }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.error?.message || "O provedor de IA recusou a solicitação.";
        return json({ error: message }, response.status >= 400 && response.status < 500 ? 400 : 502);
      }
      const answer = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
      if (!answer) return json({ error: "A IA não retornou uma resposta." }, 502);
      return json({ answer: answer.slice(0, 20000) });
    } finally { clearTimeout(timeout); }
  } catch (error) {
    if (error?.name === "AbortError") return json({ error: "A consulta à IA demorou demais. Tente novamente." }, 504);
    if (error instanceof SyntaxError) return json({ error: "A solicitação enviada à IA é inválida." }, 400);
    return json({ error: error?.message || "Não foi possível consultar a IA." }, 400);
  }
});