// CORS restrito por lista de origens (variável ALLOWED_ORIGINS, separada por vírgulas).
// Nunca usa "*". Sem ALLOWED_ORIGINS configurada, a função responde CONFIG_MISSING.

export interface CorsResult {
  configured: boolean;
  allowed: boolean;
  headers: Record<string, string>;
}

const BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '600',
  Vary: 'Origin'
};

export function parseAllowedOrigins(raw: string | undefined | null): string[] {
  return String(raw ?? '')
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function resolveCors(
  origin: string | null,
  allowedRaw: string | undefined | null
): CorsResult {
  const list = parseAllowedOrigins(allowedRaw);
  if (list.length === 0) return { configured: false, allowed: false, headers: { ...BASE_HEADERS } };
  // Chamadas sem cabeçalho Origin (não vindas de um navegador) não usam CORS.
  if (!origin) return { configured: true, allowed: true, headers: { ...BASE_HEADERS } };
  const clean = origin.replace(/\/+$/, '');
  if (list.includes(clean)) {
    return {
      configured: true,
      allowed: true,
      headers: { ...BASE_HEADERS, 'Access-Control-Allow-Origin': clean }
    };
  }
  return { configured: true, allowed: false, headers: { ...BASE_HEADERS } };
}
