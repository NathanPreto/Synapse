/* Constantes, ícones e utilitários compartilhados (carregado antes de todos os componentes). */
const { useState, useEffect, useMemo } = React;
/* ---------- armazenamento multiplataforma e tolerante a bloqueios ---------- */
const { persistentStorage, storage } = window.SynapseStorage;
const {
  auth,
  loadSynapseData,
  askAI: backendAskAI,
  deleteAccount: backendDeleteAccount,
  deleteWellbeingData: backendDeleteWellbeing
} = window.SynapseBackend || {};
const persistence = window.SynapsePersistence || {};
const { sanitizeInput, sanitizeRecord } = window.SynapseSecurity;
const LOST_TAGS = [
  'Preço',
  'Timing',
  'Escolheu Concorrente',
  'Sumiu / Sem Resposta',
  'Fora do Perfil',
  'Sem Orçamento',
  'Sem Necessidade',
  'Outro'
];
const ICONS = {
  LayoutDashboard:
    '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  Flame:
    '<path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>',
  Users:
    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  Bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  Plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  X: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  Check: '<polyline points="20 6 9 17 4 12"/>',
  Trash2:
    '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/>',
  Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  Phone:
    '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>',
  ChevronDown: '<polyline points="6 9 12 15 18 9"/>',
  Sparkles:
    '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  Download:
    '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  Upload:
    '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  Wind: '<path d="M9.59 4.59A2 2 0 1111 8H2"/><path d="M12.59 19.41A2 2 0 1014 16H2"/><path d="M17.73 7.73A2.5 2.5 0 1119.5 12H2"/>',
  Copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  Edit3: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  Pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V7a1 1 0 011-1 2 2 0 000-4H8a2 2 0 000 4 1 1 0 011 1v3.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/>',
  ListChecks:
    '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
  MessageCircle: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  Pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  Tag: '<path d="M20.59 13.41L11 3.83A2 2 0 009.58 3.24L3 3v6.58a2 2 0 00.59 1.41l9.58 9.59a2 2 0 002.83 0l4.59-4.59a2 2 0 000-2.83z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'
};
function Icon({ path, size = 16, strokeWidth = 2, style, className }) {
  return React.createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: style,
    className: className,
    dangerouslySetInnerHTML: { __html: path }
  });
}
const LayoutDashboard = p => React.createElement(Icon, { path: ICONS.LayoutDashboard, ...p });
const Flame = p => React.createElement(Icon, { path: ICONS.Flame, ...p });
const Users = p => React.createElement(Icon, { path: ICONS.Users, ...p });
const Bell = p => React.createElement(Icon, { path: ICONS.Bell, ...p });
const Plus = p => React.createElement(Icon, { path: ICONS.Plus, ...p });
const X = p => React.createElement(Icon, { path: ICONS.X, ...p });
const Check = p => React.createElement(Icon, { path: ICONS.Check, ...p });
const Trash2 = p => React.createElement(Icon, { path: ICONS.Trash2, ...p });
const Clock = p => React.createElement(Icon, { path: ICONS.Clock, ...p });
const Phone = p => React.createElement(Icon, { path: ICONS.Phone, ...p });
const ChevronDown = p => React.createElement(Icon, { path: ICONS.ChevronDown, ...p });
const Sparkles = p => React.createElement(Icon, { path: ICONS.Sparkles, ...p });
const Download = p => React.createElement(Icon, { path: ICONS.Download, ...p });
const Upload = p => React.createElement(Icon, { path: ICONS.Upload, ...p });
const Wind = p => React.createElement(Icon, { path: ICONS.Wind, ...p });
const CopyIcon = p => React.createElement(Icon, { path: ICONS.Copy, ...p });
const Edit3 = p => React.createElement(Icon, { path: ICONS.Edit3, ...p });
const Pin = p => React.createElement(Icon, { path: ICONS.Pin, ...p });
const ListChecks = p => React.createElement(Icon, { path: ICONS.ListChecks, ...p });
const Tag = p => React.createElement(Icon, { path: ICONS.Tag, ...p });
const Pencil = p => React.createElement(Icon, { path: ICONS.Pencil, ...p });
const MessageCircle = p => React.createElement(Icon, { path: ICONS.MessageCircle, ...p });
/* ---------- dados e helpers ---------- */
const STAGES = [
  { key: 'novo', label: 'Novo lead', color: 'var(--stage-novo)' },
  { key: 'contato', label: 'Contato feito', color: 'var(--stage-contato)' },
  { key: 'proposta', label: 'Proposta enviada', color: 'var(--stage-proposta)' },
  { key: 'fechado', label: 'Fechado', color: 'var(--stage-fechado)' },
  { key: 'perdido', label: 'Perdido', color: 'var(--stage-perdido)' }
];
const TEMPS = [
  { key: 'quente', label: 'Quente', color: 'var(--temp-quente)' },
  { key: 'morno', label: 'Morno', color: 'var(--temp-morno)' },
  { key: 'frio', label: 'Frio', color: 'var(--temp-frio)' }
];
// Datas do app são sempre no fuso do dispositivo (antes usava UTC e virava o "dia" às 21h em Brasília).
const localDateStr = d =>
  d.getFullYear() +
  '-' +
  String(d.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(d.getDate()).padStart(2, '0');
const todayStr = () => localDateStr(new Date());
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
// ID de registro: UUID aleatório (ids são globais na tabela; o formato antigo podia colidir).
const uid = () =>
  globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
const fmtDate = d => {
  if (!d) return 'Não informado';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};
const MOODS = [
  { v: 1, label: 'Travado', color: 'var(--mood-travado)' },
  { v: 2, label: 'Pesado', color: 'var(--mood-pesado)' },
  { v: 3, label: 'Neutro', color: 'var(--mood-neutro)' },
  { v: 4, label: 'Firme', color: 'var(--mood-firme)' },
  { v: 5, label: 'Focado', color: 'var(--mood-focado)' }
];

/* ---------- normalização de dados importados (backup/planilha) ---------- */
const validDate = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const safeId = v => String(v == null || v === '' ? uid() : v).slice(0, 64);

function normalizeClient(c) {
  if (!c || typeof c !== 'object') return null;
  const name = sanitizeInput(c.name, 200).trim();
  if (!name) return null;
  return {
    id: safeId(c.id),
    name,
    contact: sanitizeInput(c.contact, 500),
    stage: STAGES.some(s => s.key === c.stage) ? c.stage : 'novo',
    temp: TEMPS.some(t => t.key === c.temp) ? c.temp : 'morno',
    lastContact: validDate(c.lastContact),
    createdAt: validDate(c.createdAt),
    notes: sanitizeInput(c.notes),
    lostReason: sanitizeInput(c.lostReason),
    lostTags: Array.isArray(c.lostTags) ? c.lostTags.map(t => sanitizeInput(t, 100)) : [],
    value: SynapseMoney.parse(c.value),
    closedAt: validDate(c.closedAt) || null
  };
}
function normalizeReminder(r) {
  if (!r || typeof r !== 'object') return null;
  const text = sanitizeInput(r.text, 1000).trim();
  if (!text) return null;
  return {
    id: safeId(r.id),
    text,
    due: validDate(r.due),
    clientId: r.clientId ? safeId(r.clientId) : null,
    done: !!r.done
  };
}
function normalizeCheckin(c) {
  if (!c || typeof c !== 'object' || !validDate(c.date)) return null;
  const mood = Math.round(Number(c.mood));
  const stages = {};
  if (c.mentalStages && typeof c.mentalStages === 'object')
    for (const k of Object.keys(c.mentalStages).slice(0, 12))
      stages[sanitizeInput(k, 40)] = sanitizeInput(c.mentalStages[k]);
  return {
    id: safeId(c.id),
    date: validDate(c.date),
    mood: mood >= 1 && mood <= 5 ? mood : 3,
    identity: sanitizeInput(c.identity),
    note: sanitizeInput(c.note),
    reframe: sanitizeInput(c.reframe),
    mentalStages: stages
  };
}
