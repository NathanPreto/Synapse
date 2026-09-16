const { useState, useEffect, useMemo } = React;
/* ---------- armazenamento multiplataforma e tolerante a bloqueios ---------- */
function getSafeStorage(type) {
 try {
   const s = window[type];
   if (!s) return null;
   const probe = '__mental_vendas_probe__';
   s.setItem(probe, '1');
   s.removeItem(probe);
   return s;
 } catch (e) {
   return null;
 }
}
const persistentStorage = getSafeStorage('localStorage');
const sessionStorageSafe = getSafeStorage('sessionStorage');
const memoryStorage = Object.create(null);
const storage = {
 async get(key) {
   try {
     const v = persistentStorage ? persistentStorage.getItem(key) : memoryStorage[key];
     if (v === null || v === undefined) return null;
     return { key, value: v };
   } catch (e) {
     return memoryStorage[key] === undefined ? null : { key, value: memoryStorage[key] };
   }
 },
 async set(key, value) {
   memoryStorage[key] = value;
   try { if (persistentStorage) persistentStorage.setItem(key, value); } catch (e) {}
   return { key, value };
 },
};
function safeSessionGet(key) { try { return sessionStorageSafe ? sessionStorageSafe.getItem(key) : null; } catch (e) { return null; } }
function safeSessionSet(key, value) { try { if (sessionStorageSafe) sessionStorageSafe.setItem(key, value); } catch (e) {} }
/* ---------- ícones (SVG próprios, sem dependência externa) ---------- */
const ICONS = {
 LayoutDashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
 Flame: '<path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>',
 Users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
 Bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
 Plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
 X: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
 Check: '<polyline points="20 6 9 17 4 12"/>',
 Trash2: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/>',
 Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 Phone: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>',
 ChevronDown: '<polyline points="6 9 12 15 18 9"/>',
 Sparkles: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
 Download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
 Upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
 Wind: '<path d="M9.59 4.59A2 2 0 1111 8H2"/><path d="M12.59 19.41A2 2 0 1014 16H2"/><path d="M17.73 7.73A2.5 2.5 0 1119.5 12H2"/>',
 Copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
 Edit3: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>',
 Pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V7a1 1 0 011-1 2 2 0 000-4H8a2 2 0 000 4 1 1 0 011 1v3.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/>',
 ListChecks: '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
 Tag: '<path d="M20.59 13.41L11 3.83A2 2 0 009.58 3.24L3 3v6.58a2 2 0 00.59 1.41l9.58 9.59a2 2 0 002.83 0l4.59-4.59a2 2 0 000-2.83z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
};
function Icon({ path, size = 16, strokeWidth = 2, style, className }) {
 return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", style: style, className: className, dangerouslySetInnerHTML: { __html: path } }));
}
const LayoutDashboard = (p) => React.createElement(Icon, { path: ICONS.LayoutDashboard, ...p });
const Flame = (p) => React.createElement(Icon, { path: ICONS.Flame, ...p });
const Users = (p) => React.createElement(Icon, { path: ICONS.Users, ...p });
const Bell = (p) => React.createElement(Icon, { path: ICONS.Bell, ...p });
const Plus = (p) => React.createElement(Icon, { path: ICONS.Plus, ...p });
const X = (p) => React.createElement(Icon, { path: ICONS.X, ...p });
const Check = (p) => React.createElement(Icon, { path: ICONS.Check, ...p });
const Trash2 = (p) => React.createElement(Icon, { path: ICONS.Trash2, ...p });
const Clock = (p) => React.createElement(Icon, { path: ICONS.Clock, ...p });
const Phone = (p) => React.createElement(Icon, { path: ICONS.Phone, ...p });
const ChevronDown = (p) => React.createElement(Icon, { path: ICONS.ChevronDown, ...p });
const Sparkles = (p) => React.createElement(Icon, { path: ICONS.Sparkles, ...p });
const Download = (p) => React.createElement(Icon, { path: ICONS.Download, ...p });
const Upload = (p) => React.createElement(Icon, { path: ICONS.Upload, ...p });
const Wind = (p) => React.createElement(Icon, { path: ICONS.Wind, ...p });
const CopyIcon = (p) => React.createElement(Icon, { path: ICONS.Copy, ...p });
const Edit3 = (p) => React.createElement(Icon, { path: ICONS.Edit3, ...p });
const Pin = (p) => React.createElement(Icon, { path: ICONS.Pin, ...p });
const ListChecks = (p) => React.createElement(Icon, { path: ICONS.ListChecks, ...p });
const Tag = (p) => React.createElement(Icon, { path: ICONS.Tag, ...p });
/* ---------- dados e helpers ---------- */
const STAGES = [
 { key: 'novo', label: 'Novo lead', color: 'var(--stage-novo)' },
 { key: 'contato', label: 'Contato feito', color: 'var(--stage-contato)' },
 { key: 'proposta', label: 'Proposta enviada', color: 'var(--stage-proposta)' },
 { key: 'fechado', label: 'Fechado', color: 'var(--stage-fechado)' },
 { key: 'perdido', label: 'Perdido', color: 'var(--stage-perdido)' },
];
const TEMPS = [
 { key: 'quente', label: 'Quente', color: 'var(--temp-quente)' },
 { key: 'morno', label: 'Morno', color: 'var(--temp-morno)' },
 { key: 'frio', label: 'Frio', color: 'var(--temp-frio)' },
];
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmtDate = (d) => {
 if (!d)
 return 'Não informado';
 const dt = new Date(d + 'T00:00:00');
 return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};
const MOODS = [
 { v: 1, label: 'Travado', color: 'var(--mood-travado)' },
 { v: 2, label: 'Pesado', color: 'var(--mood-pesado)' },
 { v: 3, label: 'Neutro', color: 'var(--mood-neutro)' },
 { v: 4, label: 'Firme', color: 'var(--mood-firme)' },
 { v: 5, label: 'Focado', color: 'var(--mood-focado)' },
];

/* ---------- Supabase / autenticação ---------- */
const SYNAPSE_SUPABASE_URL = window.SYNAPSE_CONFIG?.supabaseUrl || '';
const SYNAPSE_SUPABASE_KEY = window.SYNAPSE_CONFIG?.supabaseKey || '';
const supabaseClient = (window.supabase && SYNAPSE_SUPABASE_URL && SYNAPSE_SUPABASE_KEY)
  ? window.supabase.createClient(SYNAPSE_SUPABASE_URL, SYNAPSE_SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

function AuthScreen() {
 const [mode, setMode] = useState('login');
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 const [error, setError] = useState('');
 const submit = async (e) => {
  e.preventDefault(); setBusy(true); setMessage(''); setError('');
  try {
   if (!supabaseClient) throw new Error('A conexão com o Supabase não foi configurada.');
   if (mode === 'signup') {
    if (password.length < 6) throw new Error('Use uma senha com pelo menos 6 caracteres.');
    const { data, error } = await supabaseClient.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
    if (error) throw error;
    if (!data.session) setMessage('Conta criada. Verifique seu e-mail para confirmar o cadastro e depois entre no Synapse.');
    else setMessage('Conta criada.');
   } else if (mode === 'reset') {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    if (error) throw error;
    setMessage('Enviamos as instruções de recuperação para seu e-mail.');
   } else {
    const { error } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
   }
  } catch (err) {
   setError(err?.message || 'Não foi possível concluir a operação.');
  } finally { setBusy(false); }
 };
 const title = mode === 'signup' ? 'Criar sua conta' : mode === 'reset' ? 'Recuperar acesso' : 'Entrar no Synapse';
 return React.createElement('div',{className:'auth-screen'},
  React.createElement('div',{className:'auth-card'},
   React.createElement('div',{className:'auth-brand'},React.createElement('div',{className:'auth-logo'},'S'),React.createElement('div',null,React.createElement('div',{className:'auth-title'},'Synapse'),React.createElement('div',{className:'auth-subtitle'},'Gestão comercial e mentalidade'))),
   React.createElement('div',{className:'auth-heading'},title),
   mode !== 'reset' && React.createElement('p',{className:'auth-copy'},mode==='signup'?'Crie sua conta para guardar seus clientes, lembretes e histórico na nuvem.':'Acesse seu espaço para continuar de onde parou.'),
   React.createElement('form',{onSubmit:submit,className:'auth-form'},
    mode==='signup' && React.createElement('label',null,React.createElement('span',null,'Nome'),React.createElement('input',{value:name,onChange:e=>setName(e.target.value),placeholder:'Seu nome',required:true,autoComplete:'name'})),
    React.createElement('label',null,React.createElement('span',null,'E-mail'),React.createElement('input',{type:'email',value:email,onChange:e=>setEmail(e.target.value),placeholder:'voce@email.com',required:true,autoComplete:'email'})),
    mode!=='reset' && React.createElement('label',null,React.createElement('span',null,'Senha'),React.createElement('input',{type:'password',value:password,onChange:e=>setPassword(e.target.value),placeholder:'••••••••',required:true,minLength:6,autoComplete:mode==='signup'?'new-password':'current-password'})),
    error && React.createElement('div',{className:'auth-alert error'},error),
    message && React.createElement('div',{className:'auth-alert success'},message),
    React.createElement('button',{type:'submit',disabled:busy,className:'auth-submit'},busy?'Aguarde...':mode==='signup'?'Criar conta':mode==='reset'?'Enviar recuperação':'Entrar')
   ),
   React.createElement('div',{className:'auth-links'},
    mode==='login' && React.createElement('button',{onClick:()=>{setMode('signup');setError('');setMessage('');}},'Criar uma conta'),
    mode==='login' && React.createElement('button',{onClick:()=>{setMode('reset');setError('');setMessage('');}},'Esqueci minha senha'),
    mode!=='login' && React.createElement('button',{onClick:()=>{setMode('login');setError('');setMessage('');}},'Voltar para entrar')
   ),
   React.createElement('div',{className:'auth-note'},'Seus dados comerciais ficam separados por conta e protegidos no banco.')
  )
 );
}

function App() {
 const [session, setSession] = useState(null);
 const [authLoading, setAuthLoading] = useState(true);
 useEffect(() => {
  let active = true;
  if (!supabaseClient) { setAuthLoading(false); return () => {}; }
  supabaseClient.auth.getSession().then(({data}) => { if(active){ setSession(data.session); setAuthLoading(false); } });
  const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => { if(active) setSession(nextSession); });
  return () => { active=false; listener?.subscription?.unsubscribe(); };
 }, []);
 if (authLoading) return React.createElement(AuthLoading, null);
 if (!supabaseClient) return React.createElement(AuthScreen, null);
 if (!session) return React.createElement(AuthScreen, null);
 return React.createElement(SynapseWorkspace,{user:session.user,onLogout:()=>supabaseClient.auth.signOut()});
}
function AuthLoading(){ return React.createElement('div',{className:'auth-screen'},React.createElement('div',{className:'auth-card auth-loading'},React.createElement('div',{className:'auth-logo'},'S'),React.createElement('div',{className:'auth-title'},'Synapse'),React.createElement('div',{className:'auth-copy'},'Carregando seu espaço...'))); }

async function syncUserRows(table, userId, rows) {
 if (!supabaseClient || !userId) return;
 const safeRows = Array.isArray(rows) ? rows : [];
 const ids = safeRows.map(r => String(r.id));
 const { data: existing, error: readError } = await supabaseClient.from(table).select('id').eq('user_id', userId);
 if (readError) throw readError;
 const stale = (existing || []).map(r=>String(r.id)).filter(id=>!ids.includes(id));
 if (stale.length) { const { error } = await supabaseClient.from(table).delete().eq('user_id', userId).in('id', stale); if(error) throw error; }
 if (!safeRows.length) return;
 const payload = safeRows.map(r => ({...r, id:String(r.id), user_id:userId}));
 const { error } = await supabaseClient.from(table).upsert(payload, { onConflict:'id' });
 if (error) throw error;
}

async function syncSettings(userId, settings) {
 if (!supabaseClient || !userId) return;
 const { error } = await supabaseClient.from('app_settings').upsert({ user_id:userId, id:userId, desidentification_entries:settings.entries||[], pinned_phrase:settings.pinned||null, templates:settings.templates||[], theme:settings.theme||'dark' }, { onConflict:'user_id' });
 if(error) throw error;
}

async function loadSynapseData(userId) {
 const [clients, reminders, checkins, settings] = await Promise.all([
  supabaseClient.from('clients').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
  supabaseClient.from('reminders').select('*').eq('user_id',userId).order('due',{ascending:true}),
  supabaseClient.from('checkins').select('*').eq('user_id',userId).order('date',{ascending:false}),
  supabaseClient.from('app_settings').select('*').eq('user_id',userId).maybeSingle()
 ]);
 for (const result of [clients,reminders,checkins,settings]) if(result.error) throw result.error;
 return {
  clients:(clients.data||[]).map(r=>({id:r.id,name:r.name,contact:r.contact||'',stage:r.stage||'novo',temp:r.temp||'morno',lastContact:r.last_contact||'',createdAt:r.created_at_date||'',notes:r.notes||'',lostReason:r.lost_reason||'',lostTags:r.lost_tags||[],closedAt:r.closed_at||null})),
  reminders:(reminders.data||[]).map(r=>({id:r.id,text:r.text,due:r.due||'',clientId:r.client_id||null,done:!!r.done})),
  checkins:(checkins.data||[]).map(r=>({id:r.id,date:r.date,mood:r.mood,identity:r.identity||'',note:r.note||'',reframe:r.reframe||'',mentalStages:r.mental_stages||{}})),
  entries:settings.data?.desidentification_entries||[], pinned:settings.data?.pinned_phrase||null, templates:settings.data?.templates||[], theme:settings.data?.theme||null,
  hasCloudData:!!(clients.data?.length||reminders.data?.length||checkins.data?.length||settings.data?.desidentification_entries?.length||settings.data?.templates?.length||settings.data?.pinned_phrase)
 };
}
function SynapseWorkspace({ user, onLogout }) {
 const [loaded, setLoaded] = useState(false);
 const [tab, setTab] = useState('painel');
 const [checkins, setCheckins] = useState([]);
 const [clients, setClients] = useState([]);
 const [reminders, setReminders] = useState([]);
 const [desidentificationEntries, setDesidentificationEntries] = useState([]);
 const [pinnedPhrase, setPinnedPhrase] = useState(null);
 const [templates, setTemplates] = useState([]);
 const [calmOpen, setCalmOpen] = useState(false);
 const [justSaved, setJustSaved] = useState(false);
 const [theme, setTheme] = useState(() => { try { return persistentStorage?.getItem('mental-vendas-theme') || 'dark'; } catch (e) { return 'dark'; } });
 const [excelReview, setExcelReview] = useState(null);
 const [aiOpen, setAiOpen] = useState(false);
 const [aiKey, setAiKey] = useState(() => safeSessionGet('synapse-gemini-key') || '');
 const [aiQuestion, setAiQuestion] = useState('');
 const [aiAnswer, setAiAnswer] = useState('');
 const [aiBusy, setAiBusy] = useState(false);
 useEffect(() => { try { if (persistentStorage) persistentStorage.setItem('mental-vendas-theme', theme); } catch (e) {} }, [theme]);
 const toggleTheme = () => setTheme(v => v === 'dark' ? 'light' : 'dark');
 useEffect(() => {
  let active = true;
  (async () => {
   try {
    const cloud = await loadSynapseData(user.id);
    if (!active) return;
    if (cloud.hasCloudData) {
     setClients(cloud.clients); setReminders(cloud.reminders); setCheckins(cloud.checkins);
     setDesidentificationEntries(cloud.entries); setPinnedPhrase(cloud.pinned); setTemplates(cloud.templates);
     if (cloud.theme) setTheme(cloud.theme);
    } else {
     const [c1,c2,c3,c4,c5] = await Promise.all([
      storage.get('mindset-checkins').catch(()=>null), storage.get('mindset-clients').catch(()=>null), storage.get('mindset-reminders').catch(()=>null), storage.get('mental-vendas-desidentificacao').catch(()=>null), storage.get('mental-vendas-templates').catch(()=>null)
     ]);
     const localClients=c2?JSON.parse(c2.value):[]; const localReminders=c3?JSON.parse(c3.value):[]; const localCheckins=c1?JSON.parse(c1.value):[];
     const localMental=c4?JSON.parse(c4.value):{}; const localTemplates=c5?JSON.parse(c5.value):[];
     if(localClients.length||localReminders.length||localCheckins.length||localTemplates.length||localMental.entries?.length||localMental.pinned){
      setLocalMigrationData({clients:localClients,reminders:localReminders,checkins:localCheckins,entries:localMental.entries||[],pinned:localMental.pinned||null,templates:localTemplates});
      setMigrationRequested(true);
     }
    }
   } catch(e) { console.error('Falha ao carregar Synapse:',e); alert('Não foi possível carregar seus dados da nuvem. Verifique sua conexão e tente novamente.'); }
   if(active) setLoaded(true);
  })();
  return ()=>{active=false;};
 }, [user.id]);
 useEffect(() => { if(loaded) storage.set('mindset-checkins',JSON.stringify(checkins)).catch(()=>{}); },[checkins,loaded]);
 useEffect(() => { if(loaded) storage.set('mindset-clients',JSON.stringify(clients)).catch(()=>{}); },[clients,loaded]);
 useEffect(() => { if(loaded) storage.set('mindset-reminders',JSON.stringify(reminders)).catch(()=>{}); },[reminders,loaded]);
 useEffect(() => { if(loaded) storage.set('mental-vendas-desidentificacao',JSON.stringify({entries:desidentificationEntries,pinned:pinnedPhrase})).catch(()=>{}); },[desidentificationEntries,pinnedPhrase,loaded]);
 useEffect(() => { if(loaded) storage.set('mental-vendas-templates',JSON.stringify(templates)).catch(()=>{}); },[templates,loaded]);
 const [migrationRequested, setMigrationRequested] = useState(false);
 const [localMigrationData, setLocalMigrationData] = useState(null);
 const [syncError, setSyncError] = useState('');
 const SYNC_DEBOUNCE_MS = 700;
 useEffect(()=>{ if(!loaded)return; const t=setTimeout(()=>{ syncUserRows('clients',user.id,clients.map(c=>({id:c.id,name:c.name,contact:c.contact||'',stage:c.stage||'novo',temp:c.temp||'morno',last_contact:c.lastContact||null,created_at_date:c.createdAt||todayStr(),notes:c.notes||'',lost_reason:c.lostReason||'',lost_tags:c.lostTags||[],closed_at:c.closedAt||null}))).catch(e=>{console.error(e);setSyncError('Não foi possível sincronizar clientes.');}); },SYNC_DEBOUNCE_MS); return ()=>clearTimeout(t); },[clients,loaded,user.id]);
 useEffect(()=>{ if(!loaded)return; const t=setTimeout(()=>{ syncUserRows('reminders',user.id,reminders.map(r=>({id:r.id,text:r.text,due:r.due||null,client_id:r.clientId||null,done:!!r.done}))).catch(e=>{console.error(e);setSyncError('Não foi possível sincronizar lembretes.');}); },SYNC_DEBOUNCE_MS); return ()=>clearTimeout(t); },[reminders,loaded,user.id]);
 useEffect(()=>{ if(!loaded)return; const t=setTimeout(()=>{ syncUserRows('checkins',user.id,checkins.map(c=>({id:c.id,date:c.date,mood:c.mood,identity:c.identity||'',note:c.note||'',reframe:c.reframe||'',mental_stages:c.mentalStages||{}}))).catch(e=>{console.error(e);setSyncError('Não foi possível sincronizar check-ins.');}); },SYNC_DEBOUNCE_MS); return ()=>clearTimeout(t); },[checkins,loaded,user.id]);
 useEffect(()=>{ if(!loaded)return; const t=setTimeout(()=>{ syncSettings(user.id,{entries:desidentificationEntries,pinned:pinnedPhrase,templates,theme}).catch(e=>{console.error(e);setSyncError('Não foi possível sincronizar configurações.');}); },SYNC_DEBOUNCE_MS); return ()=>clearTimeout(t); },[desidentificationEntries,pinnedPhrase,templates,theme,loaded,user.id]);
 useEffect(()=>{ if(!syncError)return; const t=setTimeout(()=>setSyncError(''),5000); return()=>clearTimeout(t); },[syncError]);
 async function migrateLocalData(){
  const data = localMigrationData;
  if(!data) { setMigrationRequested(false); return; }
  try {
   setClients(data.clients); setReminders(data.reminders); setCheckins(data.checkins); setDesidentificationEntries(data.entries); setPinnedPhrase(data.pinned); setTemplates(data.templates);
   await Promise.all([
    syncUserRows('clients',user.id,data.clients.map(c=>({id:c.id,name:c.name,contact:c.contact||'',stage:c.stage||'novo',temp:c.temp||'morno',last_contact:c.lastContact||null,created_at_date:c.createdAt||todayStr(),notes:c.notes||'',lost_reason:c.lostReason||'',lost_tags:c.lostTags||[],closed_at:c.closedAt||null}))),
    syncUserRows('reminders',user.id,data.reminders.map(r=>({id:r.id,text:r.text,due:r.due||null,client_id:r.clientId||null,done:!!r.done}))),
    syncUserRows('checkins',user.id,data.checkins.map(c=>({id:c.id,date:c.date,mood:c.mood,identity:c.identity||'',note:c.note||'',reframe:c.reframe||'',mental_stages:c.mentalStages||{}}))),
    syncSettings(user.id,{entries:data.entries,pinned:data.pinned,templates:data.templates,theme})
   ]);
   setLocalMigrationData(null); setMigrationRequested(false); alert('Dados locais importados para sua conta Synapse.');
  } catch(e){console.error(e);alert('Não foi possível concluir a importação. Verifique sua conexão e tente novamente.');}
 }
 const streak = useMemo(() => {
 const dates = new Set(checkins.map(c => c.date));
 let n = 0, cur = new Date();
 if (!dates.has(todayStr()))
 cur.setDate(cur.getDate() - 1);
 while (dates.has(cur.toISOString().slice(0, 10))) {
 n++;
 cur.setDate(cur.getDate() - 1);
 }
 return n;
 }, [checkins]);
 const todayCheckin = checkins.find(c => c.date === todayStr());
 const followUps = useMemo(() => {
 return clients
 .filter(c => c.stage !== 'fechado' && c.stage !== 'perdido')
 .map(c => ({ ...c, idle: daysBetween(c.lastContact || c.createdAt, todayStr()) }))
 .filter(c => c.idle >= 3)
 .sort((a, b) => b.idle - a.idle);
 }, [clients]);
 const pendingReminders = useMemo(() => reminders.filter(r => !r.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')), [reminders]);
 const dailyFocus = useMemo(() => {
  const today = todayStr();
  const reminderItems = reminders.filter(r => !r.done && r.due === today).map(r => ({ type:'reminder', id:r.id, text:r.text, due:r.due, priority:3, clientId:r.clientId || null }));
  const overdue = reminders.filter(r => !r.done && r.due && r.due < today).map(r => ({ type:'reminder', id:r.id, text:r.text, due:r.due, priority:4, clientId:r.clientId || null }));
  const followItems = followUps.map(c => ({ type:'client', id:c.id, text:`Dar um oi acolhedor para ${c.name}`, due:today, priority:c.idle >= 7 ? 5 : c.idle >= 5 ? 4 : 2, clientId:c.id, idle:c.idle }));
  return [...overdue, ...reminderItems, ...followItems].sort((a,b)=>b.priority-a.priority || (b.idle||0)-(a.idle||0)).slice(0,6);
 }, [reminders, followUps]);
 const lossReasons = useMemo(() => { const counts={}; clients.forEach(c => (c.lostTags||[]).forEach(t => { counts[t]=(counts[t]||0)+1; })); return Object.entries(counts).sort((a,b)=>b[1]-a[1]); }, [clients]);
 const correlation = useMemo(() => {
 const checkinDates = new Set(checkins.map(c => c.date));
 let closedWith = 0, closedWithout = 0, daysWith = checkinDates.size;
 const closed = clients.filter(c => c.closedAt);
 closed.forEach(c => { checkinDates.has(c.closedAt) ? closedWith++ : closedWithout++; });
 return { closedWith, closedWithout, daysWith, totalClosed: closed.length };
 }, [checkins, clients]);
 function deleteCheckin(id) {
  if (!id) return;
  if (!confirm('Excluir este autorreconhecimento do histórico? Esta ação não pode ser desfeita.')) return;
  setCheckins(prev => prev.filter(c => c.id !== id));
 }
 function saveCheckin(mood, identity, note, reframe, mentalStages) {
 setCheckins(prev => {
 const existing = prev.find(c => c.date === todayStr());
 const others = prev.filter(c => c.date !== todayStr());
 return [...others, { ...(existing || {}), id: (existing && existing.id) || uid(), date: todayStr(), mood, identity, note, reframe, mentalStages: mentalStages || (existing && existing.mentalStages) || {} }];
 });
 setJustSaved(true);
 setTimeout(() => setJustSaved(false), 1800);
 }
 function addClient(name, contact) {
 setClients(prev => [...prev, {
 id: uid(), name, contact, stage: 'novo', temp: 'morno',
 lastContact: todayStr(), createdAt: todayStr(), notes: '', lostReason: '', lostTags: [], closedAt: null,
 }]);
 }
 function updateClient(id, patch) {
 setClients(prev => prev.map(c => {
 if (c.id !== id)
 return c;
 const next = { ...c, ...patch };
 if (patch.stage === 'fechado' && !c.closedAt)
 next.closedAt = todayStr();
 if (patch.stage && patch.stage !== 'fechado')
 next.closedAt = null;
 return next;
 }));
 }
 function removeClient(id) {
 const client = clients.find(c => c.id === id);
 const label = client ? `"${client.name}"` : 'este cliente';
 if (!confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return;
 setClients(prev => prev.filter(c => c.id !== id));
 }
 function addReminder(text, due, clientId) {
 setReminders(prev => [...prev, { id: uid(), text, due, clientId: clientId || null, done: false }]);
 }
 function toggleReminder(id) { setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r)); }
 function updateReminder(id, patch) { setReminders(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r)); }
 function removeReminder(id) { setReminders(prev => prev.filter(r => r.id !== id)); }
 function exportBackup() {
 const payload = { checkins, clients, reminders, desidentificationEntries, pinnedPhrase, templates, exportedAt: new Date().toISOString() };
 const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `synapse-backup-${todayStr()}.json`;
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(url);
 }
 function importBackup(file) {
 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const data = JSON.parse(e.target.result);
 if (!confirm('Importar este backup vai substituir todos os dados atuais. Continuar?'))
 return;
 setCheckins(Array.isArray(data.checkins) ? data.checkins : []);
 setClients(Array.isArray(data.clients) ? data.clients : []);
 setReminders(Array.isArray(data.reminders) ? data.reminders : []);
 setDesidentificationEntries(Array.isArray(data.desidentificationEntries) ? data.desidentificationEntries : []);
 setPinnedPhrase(data.pinnedPhrase || null);
 setTemplates(Array.isArray(data.templates) ? data.templates : []);
 }
 catch (err) {
 alert('Arquivo inválido. Verifique se é um backup exportado por este app.');
 }
 };
 reader.readAsText(file);
 }
 function importExcel(file) {
 if (!window.XLSX) {
  alert('A biblioteca para leitura de Excel não foi carregada. Verifique sua conexão com a internet e tente novamente.');
  return;
 }
 const reader = new FileReader();
 reader.onload = (e) => {
  try {
   const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
   const firstSheet = workbook.SheetNames[0];
   if (!firstSheet) throw new Error('Nenhuma planilha encontrada.');
   const sheet = workbook.Sheets[firstSheet];
   const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
   if (!rows.length) { alert('A planilha está vazia. Use a primeira linha para os nomes das colunas.'); return; }
   const headers = Object.keys(rows[0]);
   const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
   const aliases = {
    name: ['nome','cliente','nome cliente','nome do cliente','empresa','empresa cliente','lead','razao social','razao','fantasia','nome fantasia','cliente nome','customer','customer name','company','company name'],
    contact: ['contato','contact','telefone','tel','fone','celular','mobile','whatsapp','whats app','email','e mail','e-mail','telefone email','telefone e mail','contato telefone','contato email'],
    stage: ['etapa','estagio','status','fase','pipeline','etapa do funil','etapa funil','situacao','situação','estado do lead','stage'],
    temp: ['temperatura','temp','classificacao','classificação','prioridade','potencial','interesse','temperatura lead','lead temperature'],
    lastContact: ['ultimo contato','ultima interacao','ultimo contato em','ultima interacao em','data ultimo contato','data do ultimo contato','ultimo contato data','last contact','last contact date'],
    createdAt: ['data cadastro','data de cadastro','criado em','data criacao','data criação','data entrada','data lead','cadastro','created at','created date'],
    notes: ['observacoes','notas','nota','comentarios','comentário','comentarios gerais','observacao','obs','descricao','descrição','notes'],
    lostReason: ['motivo perda','motivo da perda','motivo','razao perda','razão perda','motivo perdido','motivo do perdido','lost reason']
   };
   const fieldLabels = { name:'Nome do cliente', contact:'Contato', stage:'Etapa', temp:'Temperatura', lastContact:'Último contato', createdAt:'Data de cadastro', notes:'Observações', lostReason:'Motivo da perda' };
   const fields = Object.keys(fieldLabels);
   const scoreHeader = (header, aliasesForField) => {
    const h = normalize(header);
    let best = 0;
    aliasesForField.forEach(a => {
     const x = normalize(a);
     if (h === x) best = Math.max(best, 100);
     else if (h.includes(x) || x.includes(h)) best = Math.max(best, 72);
     const ht = new Set(h.split(' ')); const xt = new Set(x.split(' '));
     const common = [...ht].filter(t => t.length > 2 && xt.has(t)).length;
     if (common) best = Math.max(best, 40 + common * 15);
    });
    return best;
   };
   const autoMap = {};
   const confidence = {};
   fields.forEach(field => {
    let bestHeader = '';
    let bestScore = 0;
    headers.forEach(h => { const sc = scoreHeader(h, aliases[field]); if (sc > bestScore) { bestScore = sc; bestHeader = h; } });
    autoMap[field] = bestHeader;
    confidence[field] = bestScore;
   });
   const used = new Set();
   fields.forEach(field => { if (autoMap[field] && confidence[field] >= 75) used.add(autoMap[field]); });
   fields.forEach(field => { if (autoMap[field] && confidence[field] >= 75) return; if (autoMap[field] && used.has(autoMap[field])) autoMap[field] = ''; else if (autoMap[field]) used.add(autoMap[field]); });
   setExcelReview({ rows, headers, mappings: autoMap, confidence, fieldLabels, fileName: file.name });
  } catch (err) {
   console.error(err);
   alert('Não foi possível ler a planilha. Use um arquivo .xlsx, .xls ou .csv válido e mantenha a primeira linha como cabeçalho.');
  }
 };
 reader.readAsArrayBuffer(file);
 }
 function completeExcelImport(review) {
  if (!review) return;
  const { rows, mappings } = review;
  const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const valueOf = (row, field) => mappings[field] ? row[mappings[field]] : '';
  const dateToISO = (value) => {
   if (value === null || value === undefined || value === '') return '';
   if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0,10);
   if (typeof value === 'number' && window.XLSX) { const d = XLSX.SSF.parse_date_code(value); if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; }
   const text = String(value).trim();
   if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0,10);
   const br = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
   if (br) return `${br[3]}-${String(br[2]).padStart(2,'0')}-${String(br[1]).padStart(2,'0')}`;
   const parsed = new Date(text); return isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0,10);
  };
  const mapStage = (value) => { const v=normalize(value); if(['novo','novo lead','lead novo','new','entrada','novo cadastro'].includes(v))return'novo'; if(['contato','contato feito','contatado','contact','em contato'].includes(v))return'contato'; if(['proposta','proposta enviada','proposal','orcamento','orçamento'].includes(v))return'proposta'; if(['fechado','fechada','ganho','ganha','closed','won','venda'].includes(v))return'fechado'; if(['perdido','perdida','sem interesse','lost','cancelado','cancelada'].includes(v))return'perdido'; return'novo'; };
  const mapTemp = (value) => { const v=normalize(value); if(['quente','hot','alta','alto','high'].includes(v))return'quente'; if(['frio','cold','baixa','baixo','low'].includes(v))return'frio'; return'morno'; };
  const imported = rows.map(row => {
   const name = String(valueOf(row,'name') || '').trim(); if (!name) return null;
   const contact = String(valueOf(row,'contact') || '').trim();
   const stage = mapStage(valueOf(row,'stage')); const temp = mapTemp(valueOf(row,'temp'));
   const lastContact = dateToISO(valueOf(row,'lastContact')) || todayStr(); const createdAt = dateToISO(valueOf(row,'createdAt')) || todayStr();
   return { id:uid(), name, contact, stage, temp, lastContact, createdAt, notes:String(valueOf(row,'notes')||'').trim(), lostReason:String(valueOf(row,'lostReason')||'').trim(), closedAt:stage==='fechado'?(lastContact||todayStr()):null };
  }).filter(Boolean);
  if (!imported.length) { alert('Nenhum cliente válido foi encontrado. Mapeie uma coluna para Nome do cliente e tente novamente.'); return; }
  const existing=[...clients]; let added=0,updated=0;
  imported.forEach(incoming=>{ const keyName=normalize(incoming.name), keyContact=normalize(incoming.contact); const index=existing.findIndex(c=>normalize(c.name)===keyName && (!keyContact || normalize(c.contact)===keyContact)); if(index>=0){existing[index]={...existing[index],...incoming,id:existing[index].id};updated++;}else{existing.push(incoming);added++;} });
  if (!confirm(`Foram encontrados ${imported.length} clientes.\n\nNovos: ${added}\nAtualizados: ${updated}\n\nOs clientes serão adicionados ou atualizados sem apagar os atuais. Continuar?`)) return;
  setClients(existing); setExcelReview(null); setTab('clientes'); alert(`Importação concluída.\n\nNovos clientes: ${added}\nClientes atualizados: ${updated}`);
 }
 async function askAI() {
  const key=aiKey.trim(); if(!key){setAiAnswer('Cole sua chave do Gemini para ativar a IA. Ela fica somente nesta sessão do navegador.');return;}
  safeSessionSet('synapse-gemini-key', key); if(!aiQuestion.trim()) return;
  setAiBusy(true); setAiAnswer('Pensando...');
  try {
   const context = `Você é o assistente do Synapse. Responda em português do Brasil, de forma prática e curta. Ajude com vendas, CRM, follow-up, mentalidade comercial e dúvidas sobre importação de Excel. Dados atuais: ${clients.length} clientes, ${followUps.length} follow-ups parados, ${pendingReminders.length} lembretes pendentes, ${checkins.length} registros mentais.`;
   const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', { method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key}, body:JSON.stringify({system_instruction:{parts:[{text:context}]},contents:[{parts:[{text:aiQuestion.trim()}]}],generationConfig:{temperature:0.4,maxOutputTokens:500}}) });
   const data=await response.json(); if(!response.ok) throw new Error(data?.error?.message || 'Não foi possível consultar a IA.');
   const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || 'A IA não retornou uma resposta.'; setAiAnswer(text);
  } catch(err) { console.error(err); setAiAnswer(`Não consegui consultar a IA agora. ${err.message || 'Verifique sua chave e a conexão.'}`); }
  finally { setAiBusy(false); }
 }
 if (!loaded) {
  return React.createElement(Shell, { theme },
   React.createElement('div', { className: 'p-10 text-center', style: { color: 'var(--muted)' } }, 'Carregando...')
  );
 }
 return React.createElement(Shell, { theme },
  syncError && React.createElement('div',{className:'sync-banner error'},syncError),
  React.createElement('div',{className:'synapse-layout'},
  React.createElement(TopBar, { streak, tab, setTab, exportBackup, importBackup, importExcel, theme, toggleTheme, user, onLogout }),
  React.createElement('main',{className:'synapse-main'},
  React.createElement(WorkspaceHeader,{tab,setTab,theme,toggleTheme}),
  React.createElement('button', { onClick: () => setAiOpen(true), className: 'ai-fab', title: 'Assistente de IA' }, React.createElement(Sparkles, { size: 17 }), ' IA'),
  React.createElement('div', { className: 'workspace-content px-4 sm:px-6 lg:px-8 py-6 w-full max-w-none' },
   tab === 'painel' && React.createElement(Painel, { streak, todayCheckin, clients, followUps, pendingReminders, correlation, lossReasons, dailyFocus, pinnedPhrase, goTo: setTab, onCalm: () => setCalmOpen(true) }),
   tab === 'mental' && React.createElement(Mental, { checkins, todayCheckin, saveCheckin, deleteCheckin, justSaved, desidentificationEntries, setDesidentificationEntries, pinnedPhrase, setPinnedPhrase }),
   tab === 'clientes' && React.createElement(Clientes, { clients, addClient, updateClient, removeClient, importExcel, templates, setTemplates }),
   tab === 'lembretes' && React.createElement(Lembretes, { followUps, reminders, addReminder, toggleReminder, updateReminder, removeReminder, markContacted: (id) => updateClient(id, { lastContact: todayStr() }), clients }),
   tab === 'foco' && React.createElement(FocoDoDia, { items: dailyFocus, reminders, toggleReminder, goTo: setTab, clients }),
  )),
  ),
  migrationRequested && React.createElement(MigrationModal,{onImport:migrateLocalData,onSkip:()=>setMigrationRequested(false)}),
  excelReview && React.createElement(ExcelReviewModal, { review: excelReview, setReview: setExcelReview, onImport: completeExcelImport }),
  calmOpen && React.createElement(CalmMode, { onClose: () => setCalmOpen(false) }),
  aiOpen && React.createElement(AIAssistant, { keyValue: aiKey, setKeyValue: setAiKey, question: aiQuestion, setQuestion: setAiQuestion, answer: aiAnswer, busy: aiBusy, onAsk: askAI, onClose: () => setAiOpen(false) })
 );
}
function Shell({ children, theme }) {
 const dark = theme === 'dark';
 const vars = dark ? {
 '--bg':'#0A0A0A','--surface':'#121212','--surface2':'#1A1A1A','--border':'#303238',
 '--text':'#F5F7FA','--muted':'#B4BAC4','--muted2':'#7E8794','--ember':'#39E6B0','--teal':'#39E6B0','--rose':'#FF6B6B','--gold':'#FBBF24','--on-accent':'#06140F',
 '--stage-novo':'#8B95A3','--stage-contato':'#60A5FA','--stage-proposta':'#39E6B0','--stage-fechado':'#FBBF24','--stage-perdido':'#FF6B6B',
 '--temp-quente':'#FF6B6B','--temp-morno':'#FBBF24','--temp-frio':'#60A5FA',
 '--mood-travado':'#FF6B6B','--mood-pesado':'#FB923C','--mood-neutro':'#FBBF24','--mood-firme':'#86EFAC','--mood-focado':'#39E6B0',
 '--blue':'#60A5FA','--violet':'#A78BFA'
 } : {
 '--bg':'#F8F9FA','--surface':'#FFFFFF','--surface2':'#F1F3F5','--border':'#DDE2E6',
 '--text':'#111827','--muted':'#374151','--muted2':'#6B7280','--ember':'#00875A','--teal':'#00875A','--rose':'#B42318','--gold':'#8A5A00','--on-accent':'#FFFFFF',
 '--stage-novo':'#6B7280','--stage-contato':'#155EEF','--stage-proposta':'#00875A','--stage-fechado':'#8A5A00','--stage-perdido':'#B42318',
 '--temp-quente':'#B42318','--temp-morno':'#8A5A00','--temp-frio':'#155EEF',
 '--mood-travado':'#B42318','--mood-pesado':'#C2410C','--mood-neutro':'#8A5A00','--mood-firme':'#287A4B','--mood-focado':'#006B47',
 '--blue':'#155EEF','--violet':'#6D28D9'
 };
 return (React.createElement("div", { style: {
 ...vars, background:'var(--bg)', color:'var(--text)', minHeight:'100vh',
 fontFamily:"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
 }, className:"w-full flex flex-col" },
 React.createElement("style", null, `
 .serif { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; letter-spacing:-.02em; }
 @keyframes pulseIn { 0% { opacity:0; transform:translateY(6px) scale(.995); } 100% { opacity:1; transform:translateY(0) scale(1); } }
 @keyframes softLift { from { opacity:.78; transform:translateY(2px); } to { opacity:1; transform:translateY(0); } }
 .pop { animation:pulseIn .28s ease-out; }
 .pop > .mb-8, .pop > .p-4.rounded { animation:softLift .28s ease-out; }
 input, textarea, select { font-family:inherit; background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:12px; transition:border-color .18s ease, box-shadow .18s ease, background .18s ease; }
 input:hover, textarea:hover, select:hover { border-color:color-mix(in srgb, var(--ember) 35%, var(--border)); }
 input:focus, textarea:focus, select:focus { outline:none; border-color:var(--ember); box-shadow:0 0 0 3px color-mix(in srgb, var(--ember) 16%, transparent); }
 ::placeholder { color:var(--muted2); opacity:1; }
 button { font:inherit; transition:transform .16s ease, box-shadow .16s ease, background-color .16s ease, border-color .16s ease, color .16s ease, opacity .16s ease; }
 button:not(:disabled):hover { transform:translateY(-1px); }
 button:not(:disabled):active { transform:translateY(0) scale(.98); }
 button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline:2px solid var(--ember); outline-offset:2px; }
 .rounded { border-radius:14px !important; }
 .rounded-full { border-radius:999px !important; }
 .shadow, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow:none !important; }
 .max-w-3xl { max-width:1120px !important; }
 .pop > .mb-8 { margin-bottom:0 !important; }
 .pop > .mb-8 > .flex.items-center.justify-between { margin-bottom:14px !important; }
 .pop > .mb-8 > .flex.items-center.justify-between h2 { font-family:Inter, sans-serif !important; font-size:15px !important; font-weight:700 !important; letter-spacing:-.01em; }
 .pop > .mb-8 > div:not(.flex) { background:var(--surface); border:1px solid var(--border); border-radius:20px !important; padding:20px !important; }
 @media (min-width: 768px) {
   .pop { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:18px; align-items:start; }
   .pop > .mb-8:nth-child(1) { grid-column:span 7; }
   .pop > .mb-8:nth-child(2) { grid-column:span 5; }
   .pop > .mb-8:nth-child(3) { grid-column:span 7; }
   .pop > .mb-8:nth-child(4) { grid-column:span 5; }
 }
 @media (max-width: 767px) {
   .pop { display:grid; grid-template-columns:1fr; gap:16px; }
   .pop > .mb-8 { margin-bottom:0 !important; }
 }
 /* Bento surfaces for the existing interface without changing its behavior */
 .pop > .p-4.rounded { border-radius:20px !important; }
 .pop > .p-4.rounded[style*="var(--surface)"] { box-shadow:0 1px 0 rgba(255,255,255,.02); }

 /* ---------- Refinamento visual: Bento UI + microinterações ---------- */
 :root { color-scheme: dark; }
 * { -webkit-tap-highlight-color: transparent; }
 body { background:var(--bg); }
 .pop > .mb-8 > div:not(.flex),
 .pop > .p-4.rounded,
 .pop .space-y-2 > div,
 .pop .space-y-1\.5 > div {
   position:relative;
   overflow:hidden;
   border-color:color-mix(in srgb, var(--border) 88%, var(--ember) 12%) !important;
   box-shadow:0 1px 0 rgba(255,255,255,.025), 0 10px 28px rgba(0,0,0,.06);
   transition:transform .2s ease, border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
 }
 .pop > .mb-8 > div:not(.flex):hover,
 .pop > .p-4.rounded:hover,
 .pop .space-y-2 > div:hover,
 .pop .space-y-1\.5 > div:hover {
   transform:translateY(-2px);
   border-color:color-mix(in srgb, var(--ember) 34%, var(--border)) !important;
   box-shadow:0 10px 30px rgba(0,0,0,.10);
 }
 .pop button { min-height:38px; }
 .pop button:not(:disabled):hover {
   box-shadow:0 5px 14px color-mix(in srgb, var(--ember) 14%, transparent);
 }
 .pop button:not(:disabled):active { transform:translateY(0) scale(.97); }
 .pop textarea, .pop input, .pop select {
   transition:border-color .2s ease, box-shadow .2s ease, background-color .2s ease, transform .2s ease;
 }
 .pop textarea:hover, .pop input:hover, .pop select:hover {
   transform:translateY(-1px);
 }

 /* Pipeline: evita excesso de scroll e mantém cada etapa legível */
 .pop .overflow-x-auto {
   scrollbar-width:thin;
   scrollbar-color:var(--border) transparent;
   scroll-snap-type:x proximity;
   overscroll-behavior-inline:contain;
 }
 .pop .overflow-x-auto > div { scroll-snap-align:start; }
 @media (min-width:900px) {
   .pop .overflow-x-auto {
     display:grid;
     grid-template-columns:repeat(5,minmax(0,1fr));
     overflow:visible;
     gap:12px;
   }
   .pop .overflow-x-auto > div { width:auto !important; min-width:0; }
 }
 @media (max-width:899px) {
   .pop .overflow-x-auto {
     display:grid;
     grid-template-columns:repeat(2,minmax(0,1fr));
     overflow:visible;
     gap:12px;
   }
   .pop .overflow-x-auto > div { width:auto !important; min-width:0; }
 }
 @media (max-width:560px) {
   .pop .overflow-x-auto { grid-template-columns:1fr; }
   .pop .overflow-x-auto > div { width:100% !important; }
 }

 /* Status e temperatura: área de toque confortável */
 .pop .flex.gap-1\.5.flex-wrap button,
 .pop .flex.gap-1\.5 button {
   min-height:36px;
   padding-left:11px !important;
   padding-right:11px !important;
   border:1px solid color-mix(in srgb, var(--border) 90%, var(--text) 10%);
 }

 /* Correlação: leitura instantânea */
 .correlation-card {
   display:grid;
   gap:12px;
   grid-template-columns:repeat(2,minmax(0,1fr));
 }
 .loss-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
 @media (min-width:768px) {
   .pop > .mb-8:nth-child(5) { grid-column:span 6; }
   .pop > .mb-8:nth-child(6) { grid-column:span 6; }
 }
 @media (max-width:767px) {
   .correlation-card { grid-template-columns:1fr; }
   .loss-grid { grid-template-columns:1fr; }
 }
 .correlation-card > div {
   padding:14px;
   border:1px solid var(--border);
   border-radius:16px;
   background:var(--surface2);
 }

 /* Feedback de salvamento */
 @keyframes successPop {
   0% { opacity:.5; transform:scale(.97); }
   55% { opacity:1; transform:scale(1.03); }
   100% { opacity:1; transform:scale(1); }
 }
 .pop button:focus-visible { box-shadow:0 0 0 4px color-mix(in srgb, var(--ember) 18%, transparent); }


 /* ---------- Clientes: aproveitamento total da tela + pills sem corte ---------- */
 .clientes-ui { width:100%; min-width:0; }
 .clientes-ui > .mb-8 { min-width:0; width:100%; }
 .clientes-ui .mb-8 > div:not(.flex) { width:100%; max-width:none; }
 .clientes-pipeline {
   width:100%;
   display:grid;
   grid-template-columns:repeat(5,minmax(0,1fr));
   gap:16px;
   align-items:start;
   overflow:visible;
 }
 .cliente-stage {
   min-width:0;
   width:100%;
   box-sizing:border-box;
 }
 .cliente-stage > .flex {
   min-height:30px;
   padding:7px 10px;
   border-radius:10px;
   background:color-mix(in srgb, var(--surface2) 72%, transparent);
   border:1px solid var(--border);
   font-weight:700;
   line-height:1.2;
 }
 .cliente-stage > .space-y-2 {
   display:flex;
   flex-direction:column;
   gap:12px;
   margin-top:10px;
 }
 .cliente-stage > .space-y-2 > div {
   min-width:0;
   width:100%;
   box-sizing:border-box;
 }
 .clientes-ui .cliente-stage .p-2\.5.rounded {
   padding:16px !important;
   border-radius:16px !important;
 }
 .clientes-ui .cliente-stage .p-2\.5.rounded > .flex.items-center.justify-between {
   gap:12px;
   min-width:0;
 }
 .clientes-ui .cliente-stage .p-2\.5.rounded > .flex.items-center.justify-between > div:first-child {
   min-width:0;
   flex:1;
 }
 .clientes-ui .cliente-stage .p-2\.5.rounded > .flex.items-center.justify-between > div:first-child > div:first-child {
   overflow-wrap:anywhere;
   word-break:break-word;
   line-height:1.35;
 }
 .cliente-stage-actions,
 .cliente-temp-actions {
   width:100%;
   min-width:0;
   display:grid !important;
   grid-template-columns:repeat(2,minmax(0,1fr));
   gap:8px !important;
 }
 .cliente-temp-actions { grid-template-columns:repeat(3,minmax(0,1fr)); }
 .cliente-pill,
 .cliente-temp-pill {
   min-width:0 !important;
   width:100%;
   box-sizing:border-box;
   white-space:normal !important;
   overflow:hidden;
   text-overflow:ellipsis;
   line-height:1.2;
   min-height:38px !important;
   padding:8px 7px !important;
   display:flex;
   align-items:center;
   justify-content:center;
   text-align:center;
   border:1px solid var(--border) !important;
   transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background-color .18s ease, color .18s ease !important;
 }
 /* Hover perceptível no light mode, sem depender apenas de mudança sutil de cor */
 .clientes-ui .cliente-pill:hover,
 .clientes-ui .cliente-temp-pill:hover {
   transform:translateY(-2px) !important;
   border-color:var(--ember) !important;
   box-shadow:0 5px 14px color-mix(in srgb, var(--ember) 22%, transparent) !important;
   filter:saturate(1.08) brightness(1.02);
 }
 .clientes-ui .cliente-pill:active,
 .clientes-ui .cliente-temp-pill:active {
   transform:translateY(0) scale(.97) !important;
 }
 /* Pills inativas ficam claramente interativas no tema claro */
 .clientes-ui .cliente-pill, .clientes-ui .cliente-temp-pill { cursor:pointer; }
 .clientes-ui .cliente-stage > .space-y-2 > div:hover {
   transform:translateY(-3px);
   border-color:color-mix(in srgb, var(--ember) 45%, var(--border)) !important;
   box-shadow:0 12px 28px color-mix(in srgb, var(--text) 10%, transparent) !important;
 }
 .clientes-ui .cliente-stage > .space-y-2 > div { transition:transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
 @media (max-width:1199px) {
   .clientes-pipeline { grid-template-columns:repeat(3,minmax(0,1fr)); }
 }
 @media (max-width:800px) {
   .clientes-pipeline { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
 }
 @media (max-width:560px) {
   .clientes-pipeline { grid-template-columns:1fr; }
   .cliente-stage-actions { grid-template-columns:repeat(2,minmax(0,1fr)); }
   .cliente-temp-actions { grid-template-columns:repeat(3,minmax(0,1fr)); }
 }



 /* ---------- Clientes: página inteira, colunas equilibradas ---------- */
 .clientes-ui {
   display:block;
   width:100%;
   max-width:none !important;
   padding:0 !important;
 }
 .clientes-ui > .mb-8 { width:100%; margin-bottom:22px !important; }
 .clientes-ui > .mb-8:first-child > div:last-child {
   width:100%;
   max-width:none !important;
 }
 .clientes-ui .clientes-pipeline {
   width:100%;
   grid-template-columns:repeat(5,minmax(0,1fr));
   gap:18px;
   align-items:stretch;
 }
 .clientes-ui .cliente-stage {
   display:flex;
   flex-direction:column;
   min-height:100%;
 }
 .clientes-ui .cliente-stage > .space-y-2 {
   flex:1;
 }
 .clientes-ui .cliente-stage > .flex {
   width:100%;
   box-sizing:border-box;
 }
 .clientes-ui .cliente-stage > .space-y-2:empty::after {
   content:'Nenhum cliente';
   display:block;
   min-height:72px;
   padding:18px;
   border:1px dashed var(--border);
   border-radius:16px;
   color:var(--muted2);
   text-align:center;
   font-size:12px;
   background:color-mix(in srgb, var(--surface) 70%, transparent);
 }
 .clientes-ui .cliente-stage > .space-y-2 > div {
   width:100%;
 }
 .clientes-ui .cliente-pill,
 .clientes-ui .cliente-temp-pill {
   white-space:nowrap !important;
   overflow:visible !important;
   text-overflow:clip !important;
   font-size:12px !important;
 }
 @media (min-width:1400px) {
   .clientes-ui .clientes-pipeline { gap:22px; }
   .clientes-ui .cliente-stage > .space-y-2 { gap:14px; }
 }
 @media (max-width:1199px) {
   .clientes-ui .clientes-pipeline { grid-template-columns:repeat(3,minmax(0,1fr)); }
 }
 @media (max-width:800px) {
   .clientes-ui .clientes-pipeline { grid-template-columns:repeat(2,minmax(0,1fr)); }
 }
 @media (max-width:560px) {
   .clientes-ui .clientes-pipeline { grid-template-columns:1fr; }
 }

 /* ---------- Layout em tela cheia: aproveita toda a área disponível ---------- */
 .max-w-3xl { max-width: none !important; width: 100% !important; }
 .pop { width: 100%; box-sizing: border-box; }
 .pop > .mb-8 { min-width: 0; }
 .pop > .mb-8 > div:not(.flex),
 .pop > .p-4.rounded { width: 100%; box-sizing: border-box; }
 .pop > .mb-8:nth-child(1),
 .pop > .mb-8:nth-child(2),
 .pop > .mb-8:nth-child(3),
 .pop > .mb-8:nth-child(4) { min-width: 0; }
 @media (min-width: 768px) {
   .pop { grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; }
   .pop > .mb-8:nth-child(1) { grid-column: span 8; }
   .pop > .mb-8:nth-child(2) { grid-column: span 4; }
   .pop > .mb-8:nth-child(3) { grid-column: span 8; }
   .pop > .mb-8:nth-child(4) { grid-column: span 4; }
 }
 @media (min-width: 1280px) {
   .pop { gap: 24px; }
   .pop > .mb-8:nth-child(1) { grid-column: span 8; }
   .pop > .mb-8:nth-child(2) { grid-column: span 4; }
   .pop > .mb-8:nth-child(3) { grid-column: span 8; }
   .pop > .mb-8:nth-child(4) { grid-column: span 4; }
 }
 /* Kanban ocupa toda a largura disponível */
 .pop .overflow-x-auto { width: 100%; box-sizing: border-box; }
 @media (min-width: 900px) {
   .pop .overflow-x-auto { grid-template-columns: repeat(5, minmax(0, 1fr)); }
 }
 /* Campos e blocos de conteúdo usam melhor o espaço horizontal */
 .pop textarea.w-full, .pop input.w-full, .pop select.w-full { width: 100%; }
 @media (min-width: 768px) {
   .pop .correlation-card { grid-template-columns: repeat(4, minmax(0, 1fr)); }
 }
 @media (max-width: 767px) {
   .pop { padding-bottom: 24px; }
 }
 @media (prefers-reduced-motion:reduce) {
   *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; scroll-behavior:auto !important; }
 }
 `), children));
}
function MigrationModal({onImport,onSkip}){return React.createElement('div',{className:'modal-backdrop'},React.createElement('div',{className:'smart-modal'},React.createElement('div',{className:'modal-head'},React.createElement('div',null,React.createElement('div',{className:'text-lg',style:{fontWeight:750}},'Importar dados deste dispositivo'),React.createElement('div',{className:'text-xs mt-1',style:{color:'var(--muted)'}},'Encontramos dados da versão anterior do Synapse neste navegador.')),React.createElement('button',{onClick:onSkip,className:'icon-button'},React.createElement(X,{size:18}))),React.createElement('div',{className:'p-4 rounded mt-4',style:{background:'var(--surface2)',border:'1px solid var(--border)'}},React.createElement('div',{className:'text-sm',style:{lineHeight:1.6}},'Vamos enviar os clientes, lembretes, check-ins, histórico mental e modelos salvos para a sua conta. Os dados atuais da nuvem serão preservados quando não houver conflito de ID.')),React.createElement('div',{className:'flex gap-2 mt-5'},React.createElement('button',{onClick:onImport,className:'px-4 py-2.5 rounded text-sm',style:{background:'var(--teal)',color:'var(--on-accent)',fontWeight:700}},'Importar para minha conta'),React.createElement('button',{onClick:onSkip,className:'px-4 py-2.5 rounded text-sm',style:{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)'}},'Agora não'))));}

function ExcelReviewModal({ review, setReview, onImport }) {
 const [mappings,setMappings]=useState(review.mappings);
 const fields=Object.keys(review.fieldLabels);
 const mappedCount=fields.filter(f=>mappings[f]).length;
 return React.createElement('div',{className:'modal-backdrop'},
  React.createElement('div',{className:'smart-modal'},
   React.createElement('div',{className:'flex items-start justify-between gap-4 mb-5'},
    React.createElement('div',null,
     React.createElement('div',{className:'text-lg font-semibold'},'Importação inteligente'),
     React.createElement('div',{className:'text-xs mt-1',style:{color:'var(--muted)'}},review.fileName,' • ',mappedCount,' de ',fields.length,' campos reconhecidos')
    ),
    React.createElement('button',{onClick:()=>setReview(null),className:'p-2 rounded',style:{color:'var(--muted)'}},React.createElement(X,{size:16}))
   ),
   React.createElement('div',{className:'text-sm mb-4',style:{color:'var(--muted)'}},'Revise o mapeamento antes de importar. O sistema tenta reconhecer nomes de colunas diferentes automaticamente.'),
   React.createElement('div',{className:'space-y-2'},
    fields.map(field=>React.createElement('div',{key:field,className:'grid grid-cols-[1fr_1.2fr] gap-3 items-center p-3 rounded',style:{background:'var(--surface2)',border:'1px solid var(--border)'}},
     React.createElement('div',null,
      React.createElement('div',{className:'text-sm font-medium'},review.fieldLabels[field]),
      React.createElement('div',{className:'text-[11px] mt-0.5',style:{color:review.confidence[field]>=75?'var(--ember)':'var(--gold)'}},review.confidence[field]>=75?'Reconhecimento forte':review.confidence[field]>0?'Possível correspondência':'Não encontrado')
     ),
     React.createElement('select',{value:mappings[field]||'',onChange:e=>setMappings(prev=>({...prev,[field]:e.target.value})),className:'w-full p-2 rounded text-sm',style:{background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)'}},
      React.createElement('option',{value:''},'Não importar'),
      review.headers.map(h=>React.createElement('option',{key:h,value:h},h))
     )
    ))
   ),
   React.createElement('div',{className:'flex justify-end gap-2 mt-5'},
    React.createElement('button',{onClick:()=>setReview(null),className:'px-3 py-2 rounded text-sm',style:{color:'var(--muted)',border:'1px solid var(--border)'}},'Cancelar'),
    React.createElement('button',{disabled:!mappings.name,onClick:()=>onImport({...review,mappings}),className:'px-4 py-2 rounded text-sm font-medium',style:{background:mappings.name?'var(--ember)':'var(--surface2)',color:mappings.name?'var(--on-accent)':'var(--muted)',border:'1px solid var(--border)'}},'Importar clientes')
   )
  )
 );
}
function AIAssistant({keyValue,setKeyValue,question,setQuestion,answer,busy,onAsk,onClose}) {
 return React.createElement('div',{className:'modal-backdrop'},
  React.createElement('div',{className:'smart-modal ai-modal'},
   React.createElement('div',{className:'flex items-start justify-between gap-4'},
    React.createElement('div',null,
     React.createElement('div',{className:'flex items-center gap-2 text-lg font-semibold'},React.createElement(Sparkles,{size:18}),' Assistente Synapse'),
     React.createElement('div',{className:'text-xs mt-1',style:{color:'var(--muted)'}},'IA opcional com Gemini')
    ),
    React.createElement('button',{onClick:onClose,className:'p-2 rounded',style:{color:'var(--muted)'}},React.createElement(X,{size:16}))
   ),
   React.createElement('div',{className:'mt-4 p-3 rounded text-xs',style:{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)'}},'A chave fica somente nesta sessão do navegador. Para uso público ou compartilhado, o ideal é colocar a chave em um backend seguro.'),
   React.createElement('input',{type:'password',value:keyValue,onChange:e=>setKeyValue(e.target.value),placeholder:'Cole sua chave Gemini aqui',className:'w-full p-3 rounded mt-3 text-sm',style:{background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)'}}),
   React.createElement('textarea',{value:question,onChange:e=>setQuestion(e.target.value),placeholder:'Ex.: Como devo abordar um lead que parou de responder?',rows:4,className:'w-full p-3 rounded mt-3 text-sm',style:{background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)',resize:'vertical'}}),
   React.createElement('button',{onClick:onAsk,disabled:busy||!question.trim(),className:'w-full p-3 rounded mt-3 text-sm font-semibold',style:{background:busy?'var(--surface2)':'var(--ember)',color:busy?'var(--muted)':'var(--on-accent)'}},busy?'Consultando...':'Perguntar à IA'),
   answer && React.createElement('div',{className:'mt-4 p-4 rounded text-sm whitespace-pre-wrap',style:{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text)',lineHeight:1.6}},answer)
  )
 );
}
function WorkspaceHeader({tab,setTab,theme,toggleTheme}) {
 const labels={painel:'Seu dia, em movimento.',mental:'Clareza para seguir em frente.',clientes:'Clientes e oportunidades.',lembretes:'Nada importante passa despercebido.',foco:'Foco no que move o dia.'};
 const now=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
 return React.createElement('header',{className:'workspace-header'},React.createElement('div',null,React.createElement('div',{className:'workspace-eyebrow'},now),React.createElement('h1',null,labels[tab]||labels.painel)),React.createElement('div',{className:'workspace-actions'},React.createElement('button',{onClick:toggleTheme,className:'header-icon',title:theme==='dark'?'Ativar tema claro':'Ativar tema escuro'},theme==='dark'?'☀':'◐'),React.createElement('button',{onClick:()=>setTab('clientes'),className:'header-primary'},'+ Novo cliente')));
}
function TopBar({ streak, tab, setTab, exportBackup, importBackup, importExcel, theme, toggleTheme, user, onLogout }) {
 const fileInputRef = React.useRef(null);
 const excelInputRef = React.useRef(null);
 const items = [
 { key: 'painel', label: 'Painel', IconC: LayoutDashboard },
 { key: 'mental', label: 'Mental', IconC: Sparkles },
 { key: 'clientes', label: 'Clientes', IconC: Users },
 { key: 'lembretes', label: 'Lembretes', IconC: Bell },
  { key: 'foco', label: 'Foco do Dia', IconC: ListChecks },
 ];
 const backupButtons = React.createElement('div',{className:'flex items-center gap-1 pl-2',style:{borderLeft:'1px solid var(--border)'}},
  React.createElement('button',{onClick:exportBackup,title:'Baixar backup (.json)',className:'p-1.5 rounded',style:{color:'var(--muted)'}},React.createElement(Download,{size:15})),
  React.createElement('button',{onClick:()=>fileInputRef.current?.click(),title:'Importar backup (.json)',className:'p-1.5 rounded',style:{color:'var(--muted)'}},React.createElement(Upload,{size:15})),
  React.createElement('button',{onClick:()=>excelInputRef.current?.click(),title:'Importar clientes do Excel',className:'p-1.5 rounded',style:{color:'var(--teal)'}},React.createElement(Users,{size:15})),
  React.createElement('input',{ref:fileInputRef,type:'file',accept:'application/json',className:'hidden',onChange:e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.target.value='';}}),
  React.createElement('input',{ref:excelInputRef,type:'file',accept:'.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv',className:'hidden',onChange:e=>{const f=e.target.files?.[0];if(f)importExcel(f);e.target.value='';}})
 );
 return React.createElement('aside',{className:'synapse-sidebar'},
  React.createElement('div',{className:'sidebar-brand'},React.createElement('div',{className:'brand-mark'},'S'),React.createElement('div',null,React.createElement('b',null,'Synapse'),React.createElement('small',null,'espaço comercial'))),
  React.createElement('nav',{className:'sidebar-nav'},items.map(({key,label,IconC})=>React.createElement('button',{key,onClick:()=>setTab(key),className:tab===key?'active':'',title:label},React.createElement(IconC,{size:17}),React.createElement('span',null,label)))),
  React.createElement('div',{className:'sidebar-bottom'},React.createElement('div',{className:'sidebar-tools'},React.createElement('div',{className:'flex items-center gap-1.5 text-sm',style:{color:streak>0?'var(--ember)':'var(--muted)'}},React.createElement(Flame,{size:16,strokeWidth:2}),React.createElement('span',null,streak,' ',streak===1?'dia':'dias')),backupButtons),React.createElement('div',{className:'account-name'},React.createElement('span',{className:'account-avatar'},(user?.email||'S').slice(0,1).toUpperCase()),React.createElement('div',null,React.createElement('small',null,'Conta pessoal'),React.createElement('b',null,user?.email||'Synapse')),React.createElement('button',{onClick:onLogout,className:'top-logout'},'Sair')))
 );
}
function Section({ title, right, children }) {
 return (React.createElement("div", { className: "mb-8" },
 React.createElement("div", { className: "flex items-center justify-between mb-3" },
 React.createElement("h2", { className: "serif text-base", style: { color: 'var(--text)' } }, title),
 right),
 children));
}
function FocusSection({ dailyFocus, goTo }) { const rows=dailyFocus.slice(0,3).map(item=>React.createElement('div',{key:item.type+'-'+item.id,className:'focus-item flex items-center gap-3 p-3 rounded text-sm',style:{background:'var(--surface)',border:'1px solid var(--border)'}},React.createElement('div',{className:'focus-dot',style:{background:item.type==='client'?'var(--teal)':'var(--blue)'}}),React.createElement('div',{className:'flex-1 min-w-0'},item.text),React.createElement('div',{className:'text-xs',style:{color:'var(--muted)'}},item.type==='client'?item.idle+'d':'hoje'))); return React.createElement(Section,{title:'Foco do Dia',right:React.createElement('button',{onClick:()=>goTo('foco'),className:'text-xs',style:{color:'var(--teal)'}},'ver tudo →')},rows.length?React.createElement('div',{className:'space-y-2'},rows):React.createElement('div',{className:'text-sm',style:{color:'var(--muted)'}},'Nada precisa ser priorizado agora.')); }
function LossSection({ lossReasons }) { const rows=lossReasons.slice(0,5).map(([reason,n])=>React.createElement('div',{key:reason,className:'p-3 rounded text-sm',style:{background:'var(--surface)',border:'1px solid var(--border)'}},reason+' ',React.createElement('b',{style:{color:'var(--muted)'}},n))); return lossReasons.length?React.createElement(Section,{title:'Motivos de perda'},React.createElement('div',{className:'loss-grid'},rows)):null; }
function PainelHoje({ todayCheckin, pinnedPhrase, onCalm, goTo }) { const children=[]; if(pinnedPhrase) children.push(React.createElement('div',{key:'pin',className:'pinned-phrase mb-3',style:{background:'var(--surface2)',border:'1px solid var(--border)'}},React.createElement('div',{className:'text-xs',style:{color:'var(--teal)'}},'Frase de hoje'),React.createElement('div',{className:'text-sm mt-1',style:{fontWeight:600}},pinnedPhrase.text))); if(todayCheckin) children.push(React.createElement('div',{key:'check',className:'text-sm',style:{color:'var(--muted)'}},'Mentalidade de hoje',React.createElement('div',{className:'mt-1',style:{color:'var(--text)',fontSize:15}},todayCheckin.identity||''))); else children.push(React.createElement('button',{key:'go',onClick:()=>goTo('mental'),className:'w-full p-4 rounded text-left',style:{background:'var(--surface)',border:'1px dashed var(--border)',color:'var(--teal)'}},'Ainda não fez o check-in de hoje. Que tal começar por aqui?')); return React.createElement(Section,{title:'Hoje',right:React.createElement('button',{onClick:onCalm,className:'calm-button px-3 py-2 rounded text-xs flex items-center gap-1.5',style:{background:'var(--surface2)',color:'var(--teal)',border:'1px solid var(--border)'}},React.createElement(Wind,{size:15}),' Modo Calma')},React.createElement('div',{className:'p-4 rounded',style:{background:'var(--surface)',border:'1px solid var(--border)'}},children)); }
function PainelAcoes({ followUps, pendingReminders, goTo }) { const rows=[]; followUps.slice(0,3).forEach(c=>rows.push(React.createElement('div',{key:'c'+c.id,className:'flex items-center justify-between p-3 rounded text-sm',style:{background:'var(--surface)',border:'1px solid var(--border)'}},React.createElement('span',null,React.createElement('b',null,c.name),' está há ',c.idle,' dias sem contato. Que tal dar um oi acolhedor hoje?'),React.createElement('button',{onClick:()=>goTo('lembretes'),style:{color:'var(--teal)'}},'ver →')))); pendingReminders.filter(r=>r.due&&r.due<todayStr()).slice(0,3).forEach(r=>rows.push(React.createElement('div',{key:'r'+r.id,className:'flex items-center justify-between p-3 rounded text-sm',style:{background:'var(--surface)',border:'1px solid var(--border)'}},React.createElement('span',{style:{color:'var(--muted)'}},r.text),React.createElement('button',{onClick:()=>goTo('lembretes'),style:{color:'var(--teal)'}},'ver →')))); return React.createElement(Section,{title:'Ações sugeridas'},rows.length?React.createElement('div',{className:'space-y-2'},rows):React.createElement('div',{className:'text-sm',style:{color:'var(--muted)'}},'Nada parado no momento. O pipeline está em dia. Siga no seu ritmo.')); }
function PainelPipeline({ clients }) { const counts=STAGES.map(s=>({...s,n:clients.filter(c=>c.stage===s.key).length})); const maxN=Math.max(1,...counts.map(s=>s.n)); const rows=counts.map(s=>React.createElement('div',{key:s.key,className:'flex items-center gap-3 text-sm'},React.createElement('div',{className:'w-28 shrink-0',style:{color:'var(--muted)'}},s.label),React.createElement('div',{className:'flex-1 h-2 rounded',style:{background:'var(--surface2)'}},React.createElement('div',{className:'h-2 rounded',style:{width:(s.n/maxN)*100+'%',background:s.color}})),React.createElement('div',{className:'w-5 text-right'},s.n))); return React.createElement(Section,{title:'Pipeline'},React.createElement('div',{className:'space-y-2'},rows)); }
function Painel({ todayCheckin, clients, followUps, pendingReminders, correlation, lossReasons, dailyFocus, pinnedPhrase, goTo, onCalm }) {
 const sections=[React.createElement(PainelHoje,{key:'hoje',todayCheckin,pinnedPhrase,onCalm,goTo}),React.createElement(PainelAcoes,{key:'acoes',followUps,pendingReminders,goTo}),React.createElement(FocusSection,{key:'foco',dailyFocus,goTo}),React.createElement(PainelPipeline,{key:'pipeline',clients}),React.createElement(LossSection,{key:'loss',lossReasons})];
 if(correlation.totalClosed>0){ const corrBody=React.createElement('div',{className:'correlation-card p-4 rounded text-sm',style:{background:'var(--surface)',border:'1px solid var(--border)'}},[React.createElement('div',{key:'a'},'Fechamentos em dias com check-in: ',React.createElement('b',{style:{color:'var(--gold)'}},correlation.closedWith)),React.createElement('div',{key:'b'},'Fechamentos em dias sem check-in: ',React.createElement('b',{style:{color:'var(--muted)'}},correlation.closedWithout))]); sections.push(React.createElement(Section,{key:'corr',title:'Mentalidade × resultado'},corrBody)); }
 return React.createElement('div',{className:'pop'},sections);
}
function Mental({ checkins, todayCheckin, saveCheckin, deleteCheckin, justSaved, desidentificationEntries, setDesidentificationEntries, pinnedPhrase, setPinnedPhrase }) {
 const stages = [
  { key: 'pensar', number: 1, title: 'Pensar', question: 'O que está acontecendo dentro de você agora?', placeholder: 'Exemplo: Estou me sentindo ansioso', color: 'var(--ember)' },
  { key: 'nomear', number: 2, title: 'Nomear', question: 'Quais sentimentos aparecem quando você olha para isso?', placeholder: 'Exemplo: ansiedade e mente cheia', color: 'var(--gold)' },
  { key: 'perceber', number: 3, title: 'Perceber', question: 'O que está por trás desse sentimento?', placeholder: 'Exemplo: Estou frustrado pois o mês está fraco', color: 'var(--teal)' },
  { key: 'questionar', number: 4, title: 'Questionar', question: 'Esse sentimento representa um fato ou uma interpretação?', placeholder: 'Exemplo: Mas por que estou sentindo ansiedade com algo normal?', color: 'var(--blue)' },
  { key: 'desidentificar', number: 5, title: 'Desidentificar', question: 'O que você consegue separar de quem você é?', placeholder: 'Exemplo: Eu não sou isso. Meu mês passado foi ótimo.', color: 'var(--violet)' },
  { key: 'distancia', number: 6, title: 'Criar distância', question: 'Que frase ajuda você a observar o sentimento sem se confundir com ele?', placeholder: 'Exemplo: Eu não sou essa ansiedade', color: 'var(--rose)' }
 ];
 const [step, setStep] = useState(0);
 const [answers, setAnswers] = useState({
  pensar: '', nomear: '', perceber: '', questionar: '', desidentificar: '', distancia: ''
 });
 const [mood, setMood] = useState(3);
 const [identity, setIdentity] = useState('');
 const [note, setNote] = useState('');
 const [reframe, setReframe] = useState('');
 const [saved, setSaved] = useState(false);
 const [validationMessage, setValidationMessage] = useState('');
 const current = stages[step];
 const text = answers[current.key] || '';
 const allStagesFilled = stages.every(s => String(answers[s.key] || '').trim().length > 0);
 const updateAnswer = value => {
  setAnswers(prev => ({ ...prev, [current.key]: value }));
  if (validationMessage) setValidationMessage('');
 };
 const sentimentWords = ['ansioso', 'ansiedade', 'medo', 'frustrado', 'frustração', 'cansado', 'cansaço', 'irritado', 'irritação', 'preocupado', 'preocupação', 'inseguro', 'insegurança', 'sobrecarregado', 'pressão', 'culpa', 'triste', 'tristeza', 'raiva', 'confuso', 'confusão', 'calmo', 'calma', 'confiante', 'confiança', 'animado', 'animada', 'aliviado', 'alívio', 'satisfeito', 'satisfação'];
 const detected = [...new Set(stages.flatMap(s => String(answers[s.key] || '').toLowerCase().match(/[a-záàâãéêíóôõúç]+/g) || []).filter(w => sentimentWords.includes(w)))];
 const history = [...checkins].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
 const persist = () => {
  if (!allStagesFilled) {
   setValidationMessage('Preencha as 6 etapas do autorreconhecimento antes de salvar.');
   const firstEmpty = stages.findIndex(s => !String(answers[s.key] || '').trim());
   if (firstEmpty >= 0) setStep(firstEmpty);
   return;
  }
  saveCheckin(mood, identity, note, reframe, answers);
  setSaved(true);
  setValidationMessage('Autorreconhecimento salvo. Os campos foram limpos para um novo registro.');
  setAnswers({ pensar: '', nomear: '', perceber: '', questionar: '', desidentificar: '', distancia: '' });
  setStep(0);
  setTimeout(() => { setSaved(false); setValidationMessage(''); }, 2200);
 };
 return (React.createElement('div', { className: 'pop' },
  React.createElement(Section, { title: 'Autorreconhecimento emocional' },
   React.createElement('div', { className: 'p-4 rounded space-y-4', style: { background: 'var(--surface)', border: '1px solid var(--border)' } },
    React.createElement('div', { className: 'flex items-center justify-between gap-3' },
     React.createElement('div', null,
      React.createElement('div', { className: 'text-xs', style: { color: 'var(--muted)' } }, 'Percorra as seis etapas para reconhecer o sentimento e criar distância dele.'),
      React.createElement('div', { className: 'text-sm mt-1', style: { color: 'var(--text)', fontWeight: 600 } }, current.number + ' de ' + stages.length + '  ' + current.title)),
     React.createElement('div', { className: 'text-xs', style: { color: current.color } }, Math.round(((step + 1) / stages.length) * 100) + '%')),
    React.createElement('div', { className: 'w-full h-1.5 rounded', style: { background: 'var(--surface2)' } },
     React.createElement('div', { className: 'h-1.5 rounded', style: { width: ((step + 1) / stages.length) * 100 + '%', background: current.color } })),
    React.createElement('div', { className: 'grid grid-cols-3 md:grid-cols-6 gap-1.5' }, stages.map((s, i) => React.createElement('button', { key: s.key, onClick: () => setStep(i), className: 'p-2 rounded text-xs', style: { background: i === step ? s.color : 'var(--surface2)', color: i === step ? 'var(--on-accent)' : 'var(--muted)', border: '1px solid var(--border)' } }, s.number + '. ' + s.title))),
    React.createElement('div', { className: 'pt-2' },
     React.createElement('div', { className: 'text-xs mb-2', style: { color: 'var(--muted)' } }, current.question),
     React.createElement('textarea', { value: text, onChange: e => updateAnswer(e.target.value), rows: 4, className: 'w-full p-3 rounded text-sm', placeholder: current.placeholder, autoFocus: true }),
     React.createElement('div', { className: 'flex justify-between items-center mt-2' },
      React.createElement('button', { onClick: () => setStep(v => Math.max(0, v - 1)), disabled: step === 0, className: 'px-3 py-2 rounded text-xs', style: { background: 'var(--surface2)', color: step === 0 ? 'var(--muted2)' : 'var(--text)', border: '1px solid var(--border)', opacity: step === 0 ? 0.5 : 1 } }, 'Anterior'),
      step < stages.length - 1 ? React.createElement('button', { onClick: () => setStep(v => Math.min(stages.length - 1, v + 1)), className: 'px-3 py-2 rounded text-xs', style: { background: current.color, color: 'var(--on-accent)', fontWeight: 600 } }, 'Próxima etapa') : React.createElement('button', { onClick: persist, disabled: !allStagesFilled, className: 'px-3 py-2 rounded text-xs', style: { background: allStagesFilled ? 'var(--ember)' : 'var(--surface2)', color: allStagesFilled ? 'var(--on-accent)' : 'var(--muted)', border: '1px solid ' + (allStagesFilled ? 'transparent' : 'var(--border)'), fontWeight: 600, cursor: allStagesFilled ? 'pointer' : 'not-allowed', opacity: allStagesFilled ? 1 : .65 } }, saved || justSaved ? 'Registro salvo' : 'Salvar reconhecimento')))),
    validationMessage && React.createElement('div', { className: 'text-xs mt-2 p-2.5 rounded', style: { color: allStagesFilled ? 'var(--ember)' : 'var(--gold)', background: allStagesFilled ? 'var(--primary-soft, var(--surface2))' : 'var(--surface2)', border: '1px solid var(--border)' } }, validationMessage),
    detected.length > 0 && React.createElement('div', { className: 'p-3 rounded', style: { background: 'var(--surface2)', border: '1px solid var(--border)' } },
     React.createElement('div', { className: 'text-xs', style: { color: 'var(--muted)' } }, 'Sentimentos identificados automaticamente'),
     React.createElement('div', { className: 'flex flex-wrap gap-1.5 mt-2' }, detected.map(w => React.createElement('span', { key: w, className: 'px-2 py-1 rounded text-xs', style: { background: current.color, color: 'var(--on-accent)' } }, w))))),
  React.createElement(Section, { title: 'Contexto do check-in' },
   React.createElement('div', { className: 'p-4 rounded space-y-4', style: { background: 'var(--surface)', border: '1px solid var(--border)' } },
    React.createElement('div', null,
     React.createElement('div', { className: 'text-xs mb-2', style: { color: 'var(--muted)' } }, 'Como está seu estado ao encarar a prospecção hoje?'),
     React.createElement('div', { className: 'flex gap-2' }, MOODS.map(m => React.createElement('button', { key: m.v, onClick: () => setMood(m.v), className: 'flex-1 py-2 rounded text-xs', style: { background: mood === m.v ? m.color : 'var(--surface2)', color: mood === m.v ? 'var(--on-accent)' : 'var(--muted)', border: '1px solid var(--border)' } }, m.label)))),
    React.createElement('input', { value: identity, onChange: e => setIdentity(e.target.value), placeholder: 'Identidade que você escolhe praticar hoje', className: 'w-full p-2.5 rounded text-sm' }),
    React.createElement('textarea', { value: reframe, onChange: e => setReframe(e.target.value), rows: 2, className: 'w-full p-2.5 rounded text-sm', placeholder: 'Uma ação concreta que prova essa identidade' }),
    React.createElement('textarea', { value: note, onChange: e => setNote(e.target.value), rows: 2, className: 'w-full p-2.5 rounded text-sm', placeholder: 'Nota livre, opcional' }),
    React.createElement('button', { onClick: persist, disabled: !allStagesFilled, className: 'px-4 py-2 rounded text-sm', style: { background: allStagesFilled ? 'var(--ember)' : 'var(--surface2)', color: allStagesFilled ? 'var(--on-accent)' : 'var(--muted)', border: '1px solid ' + (allStagesFilled ? 'transparent' : 'var(--border)'), fontWeight: 600, cursor: allStagesFilled ? 'pointer' : 'not-allowed', opacity: allStagesFilled ? 1 : .65 } }, saved || justSaved ? 'Registrado' : todayCheckin ? 'Atualizar check-in' : 'Registrar check-in'))),
  React.createElement(DesidentificationDiary, { entries: desidentificationEntries, setEntries: setDesidentificationEntries, pinnedPhrase, setPinnedPhrase }),
  React.createElement(Section, { title: 'Histórico' }, history.length === 0 ? React.createElement('div', { className: 'text-sm', style: { color: 'var(--muted)' } }, 'Nenhum check-in ainda.') : React.createElement('div', { className: 'space-y-2' }, history.map(c => {
   const m = MOODS.find(x => x.v === c.mood);
   const feelings = c.mentalStages ? [...new Set(Object.values(c.mentalStages).flatMap(v => String(v || '').toLowerCase().match(/[a-záàâãéêíóôõúç]+/g) || []).filter(w => sentimentWords.includes(w)))] : [];
   return React.createElement('div', { key: c.id, className: 'p-3 rounded text-sm', style: { background: 'var(--surface)', border: '1px solid var(--border)' } },
    React.createElement('div', { className: 'flex items-center gap-3 min-w-0' }, React.createElement('div', { className: 'w-16 shrink-0', style: { color: 'var(--muted)' } }, fmtDate(c.date)), React.createElement('div', { className: 'w-2 h-2 rounded-full shrink-0', style: { background: m === null || m === void 0 ? void 0 : m.color } }), React.createElement('div', { className: 'min-w-0 flex-1' }, c.identity || 'Check-in emocional'), React.createElement('button', { onClick: () => deleteCheckin(c.id), className: 'shrink-0 px-2.5 py-1.5 rounded text-xs', title: 'Excluir do histórico', style: { color: 'var(--rose)', background: 'var(--surface2)', border: '1px solid var(--border)' } }, React.createElement(Trash2, { size: 13 }), ' Excluir')),
    feelings.length > 0 && React.createElement('div', { className: 'text-xs mt-2', style: { color: 'var(--muted)' } }, 'Sentimentos reconhecidos: ' + feelings.join(', ')),
    c.note && React.createElement('div', { className: 'text-xs mt-1', style: { color: 'var(--muted)' } }, c.note));
  })))
 ));
}

function DesidentificationDiary({ entries, setEntries, pinnedPhrase, setPinnedPhrase }) {
 const [thought,setThought]=useState(''); const [fact,setFact]=useState(''); const [distance,setDistance]=useState(''); const [winner,setWinner]=useState('');
 const canSuggest=thought.trim().length>0;
 const suggest=()=>{ if(!canSuggest)return; const base=fact.trim()?`Eu posso reconhecer que "${fact.trim()}" é um fato, sem transformar isso em quem eu sou.`:`Esse pensamento é algo que estou tendo agora, não uma definição de quem eu sou.`; setWinner(base); };
 const save=()=>{if(!thought.trim()||!winner.trim())return;setEntries(prev=>[{id:uid(),date:todayStr(),thought:thought.trim(),fact:fact.trim(),distance:distance.trim(),winner:winner.trim()},...prev]);setThought('');setFact('');setDistance('');setWinner('');};
 const history=entries.slice(0,6).map(e=>React.createElement('div',{key:e.id,className:'diary-history-item'},React.createElement('div',{className:'flex items-center justify-between gap-3'},React.createElement('span',{className:'text-xs',style:{color:'var(--muted2)'}},fmtDate(e.date)),React.createElement('button',{onClick:()=>setPinnedPhrase(pinnedPhrase?.text===e.winner?null:{text:e.winner,date:e.date}),className:'text-xs flex items-center gap-1',style:{color:'var(--teal)'}},React.createElement(Pin,{size:12}),pinnedPhrase?.text===e.winner?'Fixada':'Fixar')),React.createElement('div',{className:'text-sm mt-2',style:{color:'var(--muted)'}},e.thought),React.createElement('div',{className:'text-sm mt-2',style:{fontWeight:650}},e.winner)));
 return React.createElement(Section,{title:'Desidentificação prática',right:React.createElement('span',{className:'text-xs',style:{color:'var(--muted)'}},'Pensamento não é identidade')},
  React.createElement('div',{className:'diary-layout'},
   React.createElement('div',{className:'diary-form'},
    React.createElement('div',{className:'diary-intro'},React.createElement('div',{className:'text-sm',style:{fontWeight:650}},'Um pensamento difícil pode ser observado sem virar uma sentença sobre você.'),React.createElement('div',{className:'text-xs mt-1',style:{color:'var(--muted)'}},'Faça o exercício em poucos minutos e leve apenas o que for útil para o seu próximo passo.')),
    React.createElement('label',{className:'field-label'},'1. O que sua mente está dizendo?'),React.createElement('textarea',{value:thought,onChange:e=>setThought(e.target.value),rows:3,placeholder:'Ex.: Acho que não vou bater a meta este mês.',className:'w-full p-3 rounded text-sm'}),
    React.createElement('label',{className:'field-label'},'2. O que é fato, sem julgamento?'),React.createElement('textarea',{value:fact,onChange:e=>setFact(e.target.value),rows:2,placeholder:'Ex.: Até agora, estou abaixo do ritmo que planejei.',className:'w-full p-3 rounded text-sm'}),
    React.createElement('label',{className:'field-label'},'3. Como você pode observar isso de fora?'),React.createElement('textarea',{value:distance,onChange:e=>setDistance(e.target.value),rows:2,placeholder:'Ex.: Estou percebendo medo e cobrança, mas isso não define minha capacidade.',className:'w-full p-3 rounded text-sm'}),
    React.createElement('div',{className:'diary-winner'},React.createElement('div',{className:'flex items-center justify-between gap-2'},React.createElement('label',{className:'field-label',style:{margin:0}},'4. Sua frase de desidentificação'),React.createElement('button',{onClick:suggest,disabled:!canSuggest,className:'text-xs px-2.5 py-1.5 rounded',style:{background:'var(--surface2)',color:canSuggest?'var(--teal)':'var(--muted)',border:'1px solid var(--border)'}},'Sugerir frase')),React.createElement('textarea',{value:winner,onChange:e=>setWinner(e.target.value),rows:3,placeholder:'Ex.: Eu estou passando por um mês desafiador. Eu não sou esse resultado.',className:'w-full p-3 rounded text-sm mt-2'})),
    React.createElement('div',{className:'flex flex-wrap items-center justify-between gap-3 mt-3'},React.createElement('button',{onClick:save,disabled:!thought.trim()||!winner.trim(),className:'px-4 py-2.5 rounded text-sm',style:{background:thought.trim()&&winner.trim()?'var(--teal)':'var(--surface2)',color:thought.trim()&&winner.trim()?'var(--on-accent)':'var(--muted)',fontWeight:700}},'Salvar no diário'),pinnedPhrase&&React.createElement('button',{onClick:()=>setPinnedPhrase(null),className:'text-xs',style:{color:'var(--muted)'}},'Desafixar do Painel'))),
   React.createElement('div',{className:'diary-history'},React.createElement('div',{className:'text-xs',style:{color:'var(--muted)'}},'Registros recentes'),history.length?history:React.createElement('div',{className:'empty-soft mt-2'},'Seu primeiro registro aparecerá aqui.'))
  )
 );
}
function Clientes({ clients, addClient, updateClient, removeClient, importExcel, templates, setTemplates }) {
 const [showAdd, setShowAdd] = useState(false);
 const excelInputRef = React.useRef(null);
 const [name, setName] = useState('');
 const [contact, setContact] = useState('');
 const [expanded, setExpanded] = useState(null);
 const [showTemplates, setShowTemplates] = useState(false);
 return (React.createElement("div", { className: "pop clientes-ui" },
 React.createElement(Section, { title: "Clientes", right: React.createElement("div", { className: "flex items-center gap-3" },
 React.createElement("button", { onClick: () => { var _a; return (_a = excelInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }, className: "flex items-center gap-1 text-sm", style: { color: 'var(--teal)' } },
 React.createElement(Upload, { size: 15 }),
 " importar Excel"),
 React.createElement("button", { onClick: () => setShowAdd(v => !v), className: "flex items-center gap-1 text-sm", style: { color: 'var(--teal)' } },
 React.createElement(Plus, { size: 15 }),
 " novo"),
 React.createElement("button", { onClick: () => setShowTemplates(true), className: "flex items-center gap-1 text-sm", style: { color: 'var(--teal)' } }, React.createElement(CopyIcon, { size: 15 }), " modelos"),
 React.createElement("input", { ref: excelInputRef, type: "file", accept: ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv", className: "hidden", onChange: (e) => { var _a; const f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]; if (f) importExcel(f); e.target.value = ''; } })) },
 showTemplates && React.createElement(TemplatesModal, { templates, setTemplates, onClose: () => setShowTemplates(false) }),
 showAdd && (React.createElement("div", { className: "p-3 rounded mb-3 flex flex-col md:flex-row gap-2", style: { background: 'var(--surface)', border: '1px solid var(--border)' } },
 React.createElement("input", { value: name, onChange: e => setName(e.target.value), placeholder: "Nome", className: "flex-1 p-2 rounded text-sm" }),
 React.createElement("input", { value: contact, onChange: e => setContact(e.target.value), placeholder: "Contato (telefone/e-mail)", className: "flex-1 p-2 rounded text-sm" }),
 React.createElement("button", { onClick: () => { if (!name.trim())
 return; addClient(name.trim(), contact.trim()); setName(''); setContact(''); setShowAdd(false); }, className: "px-3 py-2 rounded text-sm", style: { background: 'var(--teal)', color: 'var(--on-accent)', fontWeight: 500 } }, "Adicionar"))),
 React.createElement("div", { className: "clientes-pipeline" }, STAGES.map(stage => (React.createElement("div", { key: stage.key, className: "cliente-stage" },
 React.createElement("div", { className: "flex items-center gap-1.5 text-xs mb-2", style: { color: stage.color } },
 React.createElement("div", { className: "w-1.5 h-1.5 rounded-full", style: { background: stage.color } }),
 stage.label,
 " \u00B7 ",
 clients.filter(c => c.stage === stage.key).length),
 React.createElement("div", { className: "space-y-2" }, clients.filter(c => c.stage === stage.key).map(c => (React.createElement(ClientCard, { key: c.id, client: c, expanded: expanded === c.id, onToggle: () => setExpanded(expanded === c.id ? null : c.id), updateClient: updateClient, removeClient: removeClient, templates })))))))))));
}
function ClientCard({ client, expanded, onToggle, updateClient, removeClient, templates = [] }) {
 const temp = TEMPS.find(t => t.key === client.temp);
 const idle = daysBetween(client.lastContact || client.createdAt, todayStr());
 const header = React.createElement("div", { className: "flex items-center justify-between cursor-pointer", onClick: onToggle },
  React.createElement("div", null,
   React.createElement("div", null, client.name),
   React.createElement("div", { className: "text-xs flex items-center gap-1.5 mt-0.5", style: { color: 'var(--muted)' } },
    React.createElement("span", { style: { color: temp === null || temp === void 0 ? void 0 : temp.color } }, temp === null || temp === void 0 ? void 0 : temp.label),
    " \u00B7 ",
    idle,
    "d sem contato")),
  React.createElement(ChevronDown, { size: 14, style: { color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'none' } }));
 const expandedContent = !expanded ? null : React.createElement("div", { className: "mt-3 space-y-2 pt-3", style: { borderTop: '1px solid var(--border)' } },
  client.contact && React.createElement("div", { className: "text-xs flex items-center gap-1", style: { color: 'var(--muted)' } },
   React.createElement(Phone, { size: 11 }),
   client.contact),
  React.createElement('button', { onClick: () => { const t = [...templates, ...DEFAULT_TEMPLATES].find(x => x.category === client.temp) || DEFAULT_TEMPLATES[0]; copyText(t.text.replace(/\{nome\}/g, client.name)); }, className: 'text-xs flex items-center gap-1', style: { color: 'var(--teal)' } }, React.createElement(CopyIcon, { size: 12 }), ' Copiar mensagem sugerida'),
  React.createElement("div", { className: "cliente-stage-actions flex gap-1.5 flex-wrap" }, STAGES.map(s => React.createElement("button", { key: s.key, onClick: () => updateClient(client.id, { stage: s.key }), className: "cliente-pill px-2 py-1 rounded text-xs", style: { background: client.stage === s.key ? s.color : 'var(--surface2)', color: client.stage === s.key ? 'var(--on-accent)' : 'var(--muted)' } }, s.label))),
  React.createElement("div", { className: "cliente-temp-actions flex gap-1.5" }, TEMPS.map(t => React.createElement("button", { key: t.key, onClick: () => updateClient(client.id, { temp: t.key }), className: "cliente-temp-pill px-2 py-1 rounded text-xs", style: { background: client.temp === t.key ? t.color : 'var(--surface2)', color: client.temp === t.key ? 'var(--on-accent)' : 'var(--muted)' } }, t.label))),
  client.stage === 'perdido' && React.createElement(LostReasonTags, { client, updateClient }),
  React.createElement("textarea", { value: client.notes || '', onChange: e => updateClient(client.id, { notes: e.target.value }), placeholder: "Notas", rows: 2, className: "w-full p-2 rounded text-xs" }),
  React.createElement("div", { className: "flex items-center gap-2 flex-wrap", style: { color: 'var(--muted)' } },
   React.createElement(Clock, { size: 12 }),
   React.createElement("span", { className: "text-xs" }, "Último contato"),
   React.createElement("input", { type: "date", value: client.lastContact || '', onChange: e => updateClient(client.id, { lastContact: e.target.value }), className: "p-1.5 rounded text-xs", style: { flex: '0 0 auto' } }),
   React.createElement("button", { onClick: () => updateClient(client.id, { lastContact: todayStr() }), className: "text-xs", style: { color: 'var(--teal)' } }, "hoje")),
  React.createElement("div", { className: "flex items-center justify-end pt-1" },
   React.createElement("button", { onClick: () => removeClient(client.id), className: "text-xs flex items-center gap-1", style: { color: 'var(--rose)' } },
    React.createElement(Trash2, { size: 13 }),
    " excluir cliente")));
 return React.createElement("div", { className: "p-2.5 rounded text-sm", style: { background: 'var(--surface)', border: '1px solid var(--border)' } }, header, expandedContent);
}

const LOST_TAGS = ['Preço','Timing','Escolheu Concorrente','Sumiu / Sem Resposta','Fora do Perfil','Sem Orçamento','Sem Necessidade','Outro'];
const TEMPLATE_CATEGORIES = [
 { key:'frio', label:'Frio' }, { key:'morno', label:'Morno' }, { key:'quente', label:'Quente' }, { key:'fechamento', label:'Fechamento' }
];
const DEFAULT_TEMPLATES = [
 {id:'default-frio',title:'Primeiro oi',category:'frio',text:'Oi, {nome}! Passando para me apresentar e entender se faz sentido conversarmos sobre isso. Se preferir, posso te mandar um resumo por aqui.'},
 {id:'default-morno',title:'Retomada leve',category:'morno',text:'Oi, {nome}! Tudo bem? Lembrei da nossa conversa e queria saber como está o momento por aí. Se fizer sentido, posso te ajudar a dar o próximo passo.'},
 {id:'default-quente',title:'Próximo passo',category:'quente',text:'Oi, {nome}! Percebi que estamos perto de avançar. Quer alinharmos o próximo passo e deixar tudo simples para você?'},
 {id:'default-fechamento',title:'Fechamento acolhedor',category:'fechamento',text:'{nome}, obrigado pela confiança. Se estiver tudo certo por aí, posso organizar os próximos passos para deixarmos a contratação bem tranquila.'}
];
function LostReasonTags({ client, updateClient }) {
 const tags=Array.isArray(client.lostTags)?client.lostTags:[]; const toggle=tag=>updateClient(client.id,{lostTags:tags.includes(tag)?tags.filter(t=>t!==tag):[...tags,tag]});
 return React.createElement('div',{className:'lost-reason-box'},React.createElement('div',{className:'flex items-center gap-2'},React.createElement(Tag,{size:13,style:{color:'var(--muted)'}}),React.createElement('div',{className:'text-xs',style:{fontWeight:650}},'Por que este lead foi perdido?'),React.createElement('span',{className:'text-xs',style:{color:'var(--muted2)'}},'opcional')),React.createElement('div',{className:'lost-tags'},LOST_TAGS.map(tag=>React.createElement('button',{key:tag,onClick:()=>toggle(tag),className:'lost-tag',style:{background:tags.includes(tag)?'color-mix(in srgb, var(--teal) 12%, var(--surface2))':'var(--surface2)',color:tags.includes(tag)?'var(--teal)':'var(--muted)',borderColor:tags.includes(tag)?'color-mix(in srgb, var(--teal) 45%, var(--border))':'var(--border)'}},tags.includes(tag)?'✓ ':'',tag))),React.createElement('input',{value:client.lostReason||'',onChange:e=>updateClient(client.id,{lostReason:e.target.value}),placeholder:'Observação opcional',className:'w-full p-2.5 rounded text-xs'}));
}
function TemplatesModal({ templates, setTemplates, onClose }) {
 const [category,setCategory]=useState('frio'); const [title,setTitle]=useState(''); const [text,setText]=useState(''); const [editing,setEditing]=useState(null); const [filter,setFilter]=useState('todos');
 const all=[...DEFAULT_TEMPLATES,...templates]; const visible=all.filter(t=>filter==='todos'||t.category===filter);
 const reset=()=>{setTitle('');setText('');setEditing(null);};
 const save=()=>{if(!title.trim()||!text.trim())return;const item={id:editing||uid(),title:title.trim(),category,text:text.trim()};setTemplates(prev=>editing?prev.map(x=>x.id===editing?item:x):[...prev,item]);reset();};
 const beginEdit=t=>{setEditing(t.id);setTitle(t.title);setText(t.text);setCategory(t.category);};
 return React.createElement('div',{className:'modal-backdrop'},React.createElement('div',{className:'smart-modal templates-modal'},
  React.createElement('div',{className:'modal-head'},React.createElement('div',null,React.createElement('div',{className:'text-lg',style:{fontWeight:750}},'Modelos de mensagens'),React.createElement('div',{className:'text-xs mt-1',style:{color:'var(--muted)'}},'Mensagens prontas para reduzir a fadiga de decidir o que escrever.')),React.createElement('button',{onClick:onClose,className:'icon-button'},React.createElement(X,{size:18}))),
  React.createElement('div',{className:'template-tabs'},React.createElement('button',{onClick:()=>setFilter('todos'),className:filter==='todos'?'active':''},'Todos'),TEMPLATE_CATEGORIES.map(c=>React.createElement('button',{key:c.key,onClick:()=>setFilter(c.key),className:filter===c.key?'active':''},c.label))),
  React.createElement('div',{className:'template-editor'},React.createElement('div',{className:'text-sm',style:{fontWeight:700}},editing?'Editar modelo':'Novo modelo'),React.createElement('div',{className:'template-editor-grid'},React.createElement('select',{value:category,onChange:e=>setCategory(e.target.value),className:'p-3 rounded text-sm'},TEMPLATE_CATEGORIES.map(c=>React.createElement('option',{key:c.key,value:c.key},c.label))),React.createElement('input',{value:title,onChange:e=>setTitle(e.target.value),placeholder:'Nome do modelo',className:'p-3 rounded text-sm'})),React.createElement('textarea',{value:text,onChange:e=>setText(e.target.value),rows:4,placeholder:'Escreva a mensagem. Use {nome} para personalizar.',className:'w-full p-3 rounded text-sm mt-2'}),React.createElement('div',{className:'flex gap-2 mt-2'},React.createElement('button',{onClick:save,disabled:!title.trim()||!text.trim(),className:'px-3 py-2 rounded text-sm',style:{background:title.trim()&&text.trim()?'var(--teal)':'var(--surface2)',color:title.trim()&&text.trim()?'var(--on-accent)':'var(--muted)',fontWeight:700}},editing?'Salvar alterações':'Adicionar modelo'),editing&&React.createElement('button',{onClick:reset,className:'px-3 py-2 rounded text-sm',style:{background:'var(--surface2)',color:'var(--muted)'}},'Cancelar'))),
  React.createElement('div',{className:'template-list'},visible.map(t=>React.createElement('div',{key:t.id,className:'template-card'},React.createElement('div',{className:'flex items-center justify-between gap-2'},React.createElement('span',{className:'template-category'},TEMPLATE_CATEGORIES.find(c=>c.key===t.category)?.label||t.category),!t.id.startsWith('default-')&&React.createElement('span',{className:'text-xs',style:{color:'var(--muted2)'}},'Meu modelo')),React.createElement('div',{className:'text-sm mt-2',style:{fontWeight:700}},t.title),React.createElement('div',{className:'text-sm mt-1',style:{color:'var(--muted)',whiteSpace:'pre-wrap',lineHeight:1.5}},t.text),React.createElement('div',{className:'flex flex-wrap gap-2 mt-3'},React.createElement('button',{onClick:()=>copyText(t.text),className:'mini-action primary'},React.createElement(CopyIcon,{size:13}),' Copiar'),!t.id.startsWith('default-')&&React.createElement('button',{onClick:()=>beginEdit(t),className:'mini-action'},React.createElement(Edit3,{size:13}),' Editar'),!t.id.startsWith('default-')&&React.createElement('button',{onClick:()=>{if(confirm('Excluir este modelo?'))setTemplates(prev=>prev.filter(x=>x.id!==t.id));},className:'mini-action danger'},'Excluir')))))));
}
function copyText(text) { try { if(navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text); } catch(e) {} const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove(); }
function FocoDoDia({ items, toggleReminder, goTo }) {
 const rows=items.map((item,i)=>{
  const action=item.type==='client'
   ?React.createElement('button',{onClick:()=>goTo('clientes'),className:'mini-action primary'},'Abrir clientes')
   :React.createElement('button',{onClick:()=>toggleReminder(item.id),className:'mini-action primary'},React.createElement(Check,{size:13}),' Marcar como feito');
  const detail=item.type==='client'?'Cliente aguardando um próximo contato há '+item.idle+' dias':item.due&&item.due<todayStr()?'Lembrete que ficou para trás':'Lembrete previsto para hoje';
  return React.createElement('div',{key:item.type+'-'+item.id,className:'focus-card'},React.createElement('div',{className:'focus-rank'},String(i+1).padStart(2,'0')),React.createElement('div',{className:'flex-1 min-w-0'},React.createElement('div',{className:'text-sm',style:{fontWeight:700}},item.text),React.createElement('div',{className:'text-xs mt-1',style:{color:'var(--muted)'}},detail),React.createElement('div',{className:'flex gap-2 mt-3'},action)));
 });
 return React.createElement('div',{className:'pop'},React.createElement(Section,{title:'Próximos Passos do Dia',right:React.createElement('span',{className:'text-xs',style:{color:'var(--muted)'}},items.length?items.length+' prioridades':'sem prioridades')},rows.length?React.createElement('div',{className:'focus-list'},rows):React.createElement('div',{className:'empty-soft'},'Nada precisa disputar sua atenção agora. Quando surgir algo, ele aparecerá aqui por prioridade.')));
}
function CalmMode({ onClose }) {
 const TOTAL=60, INHALE=4, HOLD=2, EXHALE=4, CYCLE=INHALE+HOLD+EXHALE;
 const [elapsed,setElapsed]=useState(0); const [running,setRunning]=useState(true);
 useEffect(()=>{
  if(!running || elapsed>=TOTAL) return;
  let raf=0, started=performance.now()-elapsed*1000;
  const tick=now=>{
   const next=Math.min(TOTAL,(now-started)/1000);
   setElapsed(next);
   if(next<TOTAL) raf=requestAnimationFrame(tick); else setRunning(false);
  };
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[running]);
 const remaining=Math.max(0,Math.ceil(TOTAL-elapsed));
 const cycleElapsed=elapsed%CYCLE;
 const phase=elapsed>=TOTAL
  ? {key:'done',label:'Concluído',hint:'Sessenta segundos completos.',scale:1,transition:0.4}
  : cycleElapsed<INHALE
  ? {key:'inhale',label:'Inspire',hint:'Pelo nariz, devagar',scale:.55+.45*(cycleElapsed/INHALE),transition:.18}
  : cycleElapsed<INHALE+HOLD
  ? {key:'hold',label:'Segure',hint:'Só por um instante',scale:1,transition:.18}
  : {key:'exhale',label:'Expire',hint:'Solte o ar devagar',scale:1-.45*((cycleElapsed-INHALE-HOLD)/EXHALE),transition:.18};
 const progress=(elapsed/TOTAL)*100;
 const reset=()=>{setElapsed(0);setRunning(true)};
 return React.createElement('div',{className:'modal-backdrop'},React.createElement('div',{className:'smart-modal calm-modal'},
  React.createElement('div',{className:'modal-head'},React.createElement('div',null,React.createElement('div',{className:'text-lg',style:{fontWeight:750}},'Modo Calma'),React.createElement('div',{className:'text-xs mt-1',style:{color:'var(--muted)'}},'Siga o movimento do círculo durante 60 segundos.')),React.createElement('button',{onClick:onClose,className:'icon-button','aria-label':'Fechar'},React.createElement(X,{size:18}))),
  React.createElement('div',{className:'calm-stage'},
   React.createElement('div',{className:'calm-breath-wrap'},
    React.createElement('div',{className:'calm-breath-orbit'},
     React.createElement('div',{className:'calm-breath-circle',style:{transform:`scale(${phase.scale})`,transition:`transform ${phase.transition}s linear`}},
      React.createElement('div',{className:'calm-breath-label'},phase.label),
      React.createElement('div',{className:'calm-breath-hint'},phase.hint)
     )
    )
   ),
   React.createElement('div',{className:'calm-time'},String(remaining).padStart(2,'0')+'s'),
   React.createElement('div',{className:'calm-progress'},React.createElement('div',{style:{width:progress+'%'}})),
   React.createElement('div',{className:'calm-breath-guide'},React.createElement('span',{className:'calm-guide-dot'},''),phase.key==='done'?'Você terminou. Volte ao seu ritmo.':phase.key==='hold'?'Segure suavemente.':phase.key==='inhale'?'Deixe o círculo crescer.':'Deixe o círculo diminuir.'),
  ),
  React.createElement('div',{className:'calm-anchor'},React.createElement('div',{className:'text-xs',style:{color:'var(--teal)',fontWeight:700}},'ÂNCORA'),React.createElement('div',{className:'text-sm mt-1',style:{fontWeight:600}},'Você não é o seu resultado.'),React.createElement('div',{className:'text-xs mt-1',style:{color:'var(--muted)',lineHeight:1.5}},'Pause por um minuto, respire e escolha apenas o próximo passo.')),
  React.createElement('div',{className:'flex flex-wrap gap-2 mt-4'},
   elapsed>=TOTAL&&React.createElement('button',{onClick:reset,className:'px-4 py-2.5 rounded text-sm',style:{background:'var(--teal)',color:'var(--on-accent)',fontWeight:700}},'Recomeçar'),
   elapsed<TOTAL&&React.createElement('button',{onClick:()=>setRunning(v=>!v),className:'px-4 py-2.5 rounded text-sm',style:{background:running?'var(--surface2)':'var(--teal)',color:running?'var(--muted)':'var(--on-accent)',border:running?'1px solid var(--border)':'1px solid var(--teal)',fontWeight:700}},running?'Pausar':'Continuar'),
   React.createElement('button',{onClick:reset,className:'px-4 py-2.5 rounded text-sm',style:{background:'transparent',color:'var(--muted)',border:'1px solid var(--border)'}},'Reiniciar'),
   React.createElement('button',{onClick:onClose,className:'px-4 py-2.5 rounded text-sm',style:{background:'transparent',color:'var(--muted)'}},'Voltar')
  )
 ));
}
function Lembretes({ followUps, reminders, addReminder, toggleReminder, updateReminder, removeReminder, markContacted }) {
 const [text, setText] = useState('');
 const [due, setDue] = useState(todayStr());
 const [editingId, setEditingId] = useState(null);
 const [editText, setEditText] = useState('');
 const [editDue, setEditDue] = useState('');
 const pending = reminders.filter(r => !r.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
 const done = reminders.filter(r => r.done);
 const beginEdit = (r) => { setEditingId(r.id); setEditText(r.text); setEditDue(r.due || ''); };
 const cancelEdit = () => { setEditingId(null); setEditText(''); setEditDue(''); };
 const saveEdit = (id) => {
 if (!editText.trim()) return;
 updateReminder(id, { text: editText.trim(), due: editDue });
 cancelEdit();
 };
 return (React.createElement("div", { className: "pop" },
 followUps.length > 0 && (React.createElement(Section, { title: "Sugeridos pelo sistema" },
 React.createElement("div", { className: "space-y-2" }, followUps.map(c => (React.createElement("div", { key: c.id, className: "flex items-center justify-between p-3 rounded text-sm", style: { background: 'var(--surface)', border: '1px solid var(--border)' } },
 React.createElement("span", null,
 React.createElement("b", null, c.name),
 " ",
 c.idle,
 " dias sem contato. Que tal dar um oi acolhedor hoje?"),
 React.createElement("button", { onClick: () => markContacted(c.id), className: "text-xs px-2 py-1 rounded", style: { background: 'var(--teal)', color: 'var(--on-accent)' } }, "Registrar contato"))))))),
 React.createElement(Section, { title: "Meus lembretes" },
 React.createElement("div", { className: "p-3 rounded mb-3 flex flex-col md:flex-row gap-2", style: { background: 'var(--surface)', border: '1px solid var(--border)' } },
 React.createElement("input", { value: text, onChange: e => setText(e.target.value), placeholder: "O que fazer", className: "flex-1 p-2 rounded text-sm" }),
 React.createElement("input", { type: "date", value: due, onChange: e => setDue(e.target.value), className: "p-2 rounded text-sm" }),
 React.createElement("button", { onClick: () => { if (!text.trim())
 return; addReminder(text.trim(), due); setText(''); }, className: "px-3 py-2 rounded text-sm", style: { background: 'var(--ember)', color: 'var(--on-accent)', fontWeight: 500 } }, "Adicionar")),
 React.createElement("div", { className: "space-y-2" },
 pending.length === 0 && React.createElement("div", { className: "text-sm", style: { color: 'var(--muted)' } }, "Nada pendente."),
 pending.map(r => {
 const overdue = r.due && r.due < todayStr();
 if (editingId === r.id) {
 return (React.createElement("div", { key: r.id, className: "flex flex-col md:flex-row items-stretch md:items-center gap-2 p-3 rounded text-sm", style: { background: 'var(--surface)', border: '1px solid var(--teal)' } },
 React.createElement("input", { value: editText, onChange: e => setEditText(e.target.value), className: "flex-1 p-2 rounded text-sm", placeholder: "O que fazer" }),
 React.createElement("input", { type: "date", value: editDue, onChange: e => setEditDue(e.target.value), className: "p-2 rounded text-sm" }),
 React.createElement("div", { className: "flex gap-2" },
 React.createElement("button", { onClick: () => saveEdit(r.id), className: "px-2 py-1 rounded text-xs", style: { background: 'var(--teal)', color: 'var(--on-accent)', fontWeight: 600 } }, "Salvar"),
 React.createElement("button", { onClick: cancelEdit, className: "px-2 py-1 rounded text-xs", style: { color: 'var(--muted)' } }, "Cancelar"))));
 }
 return (React.createElement("div", { key: r.id, className: "flex items-center gap-3 p-3 rounded text-sm", style: { background: 'var(--surface)', border: '1px solid var(--border)' } },
 React.createElement("button", { onClick: () => toggleReminder(r.id), title: "Marcar como feito", className: "w-4 h-4 rounded-full shrink-0", style: { border: '1.5px solid var(--muted)' } }),
 React.createElement("div", { className: "flex-1" }, r.text),
 React.createElement("div", { className: "text-xs", style: { color: overdue ? 'var(--gold)' : 'var(--muted)' } }, fmtDate(r.due)),
 React.createElement("button", { onClick: () => beginEdit(r), title: "Editar lembrete", style: { color: 'var(--muted)' } },
 React.createElement(Edit3, { size: 13 })),
 React.createElement("button", { onClick: () => removeReminder(r.id), title: "Excluir lembrete", style: { color: 'var(--muted)' } },
 React.createElement(X, { size: 14 }))));
 })),
 done.length > 0 && (React.createElement("div", { className: "mt-4 space-y-1.5" }, done.map(r => (React.createElement("div", { key: r.id, className: "flex items-center gap-3 p-2 rounded text-xs", style: { color: 'var(--muted)' } },
 React.createElement("button", { onClick: () => toggleReminder(r.id), title: "Desmarcar como feito", style: { color: 'var(--teal)', display: 'flex', alignItems: 'center' } },
 React.createElement(Check, { size: 12 })),
 React.createElement("div", { className: "flex-1 line-through" }, r.text),
 React.createElement("button", { onClick: () => removeReminder(r.id), title: "Excluir lembrete" },
 React.createElement(X, { size: 12 }))))))))));
}
window.addEventListener('error', (event) => {
 try {
   const root = document.getElementById('root');
   if (root && !root.hasChildNodes()) {
     root.innerHTML = '<div style=\"min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0A0A0A;color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-align:center\"><div><strong style=\"font-size:18px\">Synapse</strong><p style=\"color:#B4BAC4;max-width:420px;line-height:1.5\">O sistema encontrou um erro ao iniciar. Recarregue a página. Se o problema continuar, abra o arquivo pelo Safari ou por um endereço HTTPS.</p></div></div>';
   }
 } catch (e) {}
});
if (window.React && window.ReactDOM && document.getElementById('root')) {
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
} else {
  document.getElementById('root').innerHTML = '<div style=\"padding:24px;color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif\">Não foi possível carregar o aplicativo. Verifique sua conexão e recarregue.</div>';
}
