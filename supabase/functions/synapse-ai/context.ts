// Monta, no servidor, o resumo do dia do vendedor que a Syn recebe como contexto.
// Os dados vêm do banco (via RLS, com o token do próprio usuário) — nunca do cliente HTTP —
// e passam por limpeza para que texto digitado pelo usuário não vire "instrução" para o modelo.
// Dados de bem-estar: apenas o humor numérico (1 a 5); nenhum texto de check-in ou diário é enviado.

export interface ClientRow {
  name?: string | null;
  stage?: string | null;
  temp?: string | null;
  last_contact?: string | null;
  created_at_date?: string | null;
  lost_tags?: unknown;
}
export interface ReminderRow {
  text?: string | null;
  due?: string | null;
  done?: boolean | null;
}
export interface CheckinRow {
  date?: string | null;
  mood?: number | null;
}
export interface Snapshot {
  clients: ClientRow[];
  reminders: ReminderRow[];
  checkins: CheckinRow[];
}

export const MOOD_LABELS: Record<number, string> = {
  1: 'Travado',
  2: 'Pesado',
  3: 'Neutro',
  4: 'Firme',
  5: 'Focado'
};

const STAGE_LABELS: Record<string, string> = {
  novo: 'Novo lead',
  contato: 'Contato feito',
  proposta: 'Proposta enviada',
  fechado: 'Fechado',
  perdido: 'Perdido'
};
const TEMP_WEIGHT: Record<string, number> = { quente: 3, morno: 2, frio: 1 };

export function cleanText(value: unknown, max = 80): string {
  return (
    String(value ?? '')
      // deno-lint-ignore no-control-regex
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/[<>`{}\[\]|\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)
  );
}

function isoDay(value: unknown): string | null {
  const s = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

export function brDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "Hoje" no fuso de Brasília (o servidor roda em UTC). */
export function todayInSaoPaulo(now: number): string {
  return new Date(now - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function buildContext(snapshot: Snapshot, today: string): string {
  const clients = snapshot.clients ?? [];
  const reminders = snapshot.reminders ?? [];
  const checkins = snapshot.checkins ?? [];
  const lines: string[] = [];

  // Pipeline
  const counts: Record<string, number> = {};
  for (const c of clients) counts[c.stage ?? 'novo'] = (counts[c.stage ?? 'novo'] ?? 0) + 1;
  const pipeline = Object.keys(STAGE_LABELS)
    .map(k => `${STAGE_LABELS[k]}: ${counts[k] ?? 0}`)
    .join('; ');
  lines.push(`Pipeline (${clients.length} clientes): ${pipeline}.`);

  const active = clients.filter(c => c.stage !== 'fechado' && c.stage !== 'perdido');
  const hot = active.filter(c => c.temp === 'quente').length;
  lines.push(`Clientes ativos: ${active.length}, sendo ${hot} quente(s).`);

  const closed = counts['fechado'] ?? 0;
  const lost = counts['perdido'] ?? 0;
  if (closed + lost > 0) {
    lines.push(`Fechados: ${closed}; perdidos: ${lost}.`);
    const tagCount: Record<string, number> = {};
    for (const c of clients) {
      if (c.stage !== 'perdido' || !Array.isArray(c.lost_tags)) continue;
      for (const t of c.lost_tags) {
        const k = cleanText(t, 40);
        if (k) tagCount[k] = (tagCount[k] ?? 0) + 1;
      }
    }
    const topLost = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (topLost.length)
      lines.push(
        `Principais motivos de perda: ${topLost.map(([k, n]) => `${k} (${n})`).join(', ')}.`
      );
  }

  // Follow-ups parados (mesma regra do app: 3+ dias sem contato em clientes ativos)
  const stale = active
    .map(c => {
      const last = isoDay(c.last_contact) ?? isoDay(c.created_at_date);
      return { c, idle: last ? daysBetween(last, today) : 0 };
    })
    .filter(x => x.idle >= 3)
    .sort(
      (a, b) =>
        b.idle - a.idle || (TEMP_WEIGHT[b.c.temp ?? ''] ?? 0) - (TEMP_WEIGHT[a.c.temp ?? ''] ?? 0)
    );
  lines.push(`Follow-ups parados (3+ dias sem contato): ${stale.length}.`);
  for (const { c, idle } of stale.slice(0, 6)) {
    lines.push(
      `- ${cleanText(c.name, 60)} — ${STAGE_LABELS[c.stage ?? ''] ?? cleanText(c.stage, 20)}, ${cleanText(c.temp, 10) || 'sem temperatura'}, ${idle} dias sem contato`
    );
  }

  // Lembretes
  const pending = reminders.filter(r => !r.done);
  const overdue = pending.filter(r => isoDay(r.due) && isoDay(r.due)! < today);
  const dueToday = pending.filter(r => isoDay(r.due) === today);
  lines.push(
    `Lembretes pendentes: ${pending.length} (${overdue.length} atrasado(s), ${dueToday.length} para hoje).`
  );
  for (const r of [...overdue, ...dueToday].slice(0, 6)) {
    const d = isoDay(r.due);
    lines.push(
      `- ${cleanText(r.text, 100)}${d ? ` (${d === today ? 'hoje' : 'venceu em ' + brDate(d)})` : ''}`
    );
  }

  // Bem-estar: só humor numérico
  const moods = checkins
    .map(c => ({ date: isoDay(c.date), mood: Number(c.mood) }))
    .filter((c): c is { date: string; mood: number } => !!c.date && c.mood >= 1 && c.mood <= 5)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const last7 = moods.slice(0, 7);
  if (last7.length) {
    const avg = last7.reduce((s, m) => s + m.mood, 0) / last7.length;
    lines.push(
      `Humor recente (1 a 5, mais novo primeiro): ${last7.map(m => `${brDate(m.date)}=${m.mood}`).join(', ')}; média ${avg.toFixed(1)}.`
    );
    const recent = last7.slice(0, 3);
    const before = last7.slice(3, 6);
    if (recent.length >= 2 && before.length >= 2) {
      const a = recent.reduce((s, m) => s + m.mood, 0) / recent.length;
      const b = before.reduce((s, m) => s + m.mood, 0) / before.length;
      lines.push(
        `Tendência do humor: ${a - b >= 0.5 ? 'melhorando' : b - a >= 0.5 ? 'piorando' : 'estável'}.`
      );
    }
  } else {
    lines.push('Humor recente: sem check-ins registrados.');
  }
  const hasToday = moods.some(m => m.date === today);
  lines.push(`Check-in de hoje: ${hasToday ? 'feito' : 'ainda não feito'}.`);

  return lines.join('\n').slice(0, 4500);
}
