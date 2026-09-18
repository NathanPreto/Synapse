const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const results = [];
function test(name, fn) {
  try { fn(); results.push(['PASS', name]); }
  catch (error) { results.push(['FAIL', name, error]); }
}
async function testAsync(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (error) { results.push(['FAIL', name, error]); }
}

test('JavaScript principal continua sintaticamente válido', () => {
  for (const file of ['app.js','synapse-runtime.js','backend.js','services/supabase.js','services/persistence.js','sw.js']) {
    new vm.Script(read(file), { filename:file });
  }
});

test('Service Worker não referencia arquivos legados inexistentes', () => {
  const sw = read('sw.js');
  const urls = [...sw.matchAll(/['"]\.\/([^'"]+)['"]/g)].map(m => m[1].split('?')[0]);
  for (const file of urls) assert.ok(fs.existsSync(path.join(ROOT, file)), `asset ausente no precache: ${file}`);
  for (const legacy of ['core/logger.js','core/sanitize.js','services/storage.js','services/spreadsheet.js']) {
    assert.equal(sw.includes(legacy), false, `referência legada: ${legacy}`);
  }
});

test('Versão do Service Worker está sincronizada com index e manifest', () => {
  const sw = read('sw.js'), index = read('index.html'), manifest = read('manifest.json');
  assert.match(sw, /CACHE_VERSION = ['"]v12['"]/);
  assert.match(index, /sw\.js\?v=12/);
  assert.match(index, /manifest\.json\?v=12/);
  assert.match(manifest, /start_url": "\/\?v=12"/);
});

test('Chamadas tratadas não usam logger de erro global no frontend/persistência', () => {
  assert.equal(read('app.js').includes('SynapseLogger?.error'), false);
  assert.equal(read('services/persistence.js').includes('SynapseLogger?.error'), false);
});

test('Gemini não é mais chamado nem armazenado no navegador', () => {
  const app = read('app.js');
  const backend = read('backend.js');
  const supabase = read('services/supabase.js');
  assert.equal(app.includes('generativelanguage.googleapis.com'), false);
  assert.equal(app.includes('synapse-gemini-key'), false);
  assert.equal(app.includes('x-goog-api-key'), false);
  assert.match(backend, /askAI/);
  assert.match(supabase, /functions\.invoke\(['"]synapse-ai['"]/);
  assert.match(supabase, /getSession\(\)/);
  assert.match(supabase, /Authorization: `Bearer \$\{accessToken\}`/);
});
test('Chat de IA tem histórico, envio e estado de digitação', () => {
  const app = read('app.js');
  const styles = read('styles.css');
  assert.match(app, /aiMessages/);
  assert.match(app, /onKeyDown/);
  assert.match(app, /ai-chat-composer/);
  assert.match(app, /Nova conversa/);
  assert.match(app, /'Syn'/);
  assert.equal(app.includes("'LURI'"), false);
  assert.match(styles, /\.ai-chat-modal/);
});

function makeRuntimeContext() {
  const events = [];
  const listeners = {};
  const window = {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    dispatchEvent(event) { events.push(event); },
    SynapseLogger: undefined,
  };
  const context = {
    window,
    console: { error(){}, warn(){} },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    document: { createElement(){ return { textContent:'', value:'' }; } },
    JSON, String, Date, Object, Set, Map, Promise, Math,
  };
  vm.runInNewContext(read('synapse-runtime.js'), context, { filename:'synapse-runtime.js' });
  return { window, events };
}

test('Warning operacional não dispara banner de erro global', () => {
  const { window, events } = makeRuntimeContext();
  window.SynapseLogger.warn('falha de sincronização', new Error('Failed to fetch'));
  assert.equal(events.some(e => e.type === 'synapse:error'), false);
});

test('Erro real continua disparando diagnóstico global', () => {
  const { window, events } = makeRuntimeContext();
  window.SynapseLogger.error('Erro inesperado em tempo de execução.', new Error('Failed to fetch'));
  const event = events.find(e => e.type === 'synapse:error');
  assert.ok(event);
  assert.match(event.detail.message, /conexão com o servidor falhou/i);
});

function makePersistenceContext(online) {
  const values = new Map();
  const calls = [];
  const storage = {
    async get(key) { return values.has(key) ? { key, value: values.get(key) } : null; },
    async set(key, value) { values.set(key, value); }
  };
  const backend = {
    async syncUserRows(table, userId, rows) { calls.push(['upsert', table, rows]); if (!online) throw new Error('Failed to fetch'); },
    async deleteCloudRow(table, userId, id) { calls.push(['delete', table, id]); if (!online) throw new Error('Failed to fetch'); },
    async syncSettings(userId, settings) { calls.push(['settings', userId, settings]); if (!online) throw new Error('Failed to fetch'); },
    async loadSynapseData() { return { clients:[], reminders:[], checkins:[], entries:[], pinned:null, templates:[], theme:null, hasCloudData:false }; }
  };
  const context = {
    window: { SynapseStorage:{storage}, SynapseBackend:backend, SynapseLogger:{warn(){}} },
    localStorage: { getItem(k){return values.get(k)||null;}, setItem(k,v){values.set(k,v);} },
    JSON, String, Date, Math, Map, Set, Promise, Error,
  };
  vm.runInNewContext(read('services/persistence.js'), context, { filename:'services/persistence.js' });
  return { p:context.window.SynapsePersistence, calls };
}

(async () => {
  await testAsync('Fila offline sobrevive e esvazia após recuperação', async () => {
    const offline = makePersistenceContext(false);
    await offline.p.queueUpsert('user-1','clients',{id:'c1',name:'Cliente'});
    assert.equal((await offline.p.getPending('user-1')).length, 1);

    const online = makePersistenceContext(true);
    await online.p.queueUpsert('user-1','clients',{id:'c1',name:'Cliente'});
    await online.p.flush('user-1');
    assert.equal((await online.p.getPending('user-1')).length, 0);
    assert.equal(online.calls.length, 1);
  });

  await testAsync('Atualizações rápidas do mesmo registro são consolidadas', async () => {
    const offline = makePersistenceContext(false);
    await offline.p.queueUpsert('u','clients',{id:'1',name:'A'});
    await offline.p.queueUpsert('u','clients',{id:'1',name:'B'});
    const q = await offline.p.getPending('u');
    assert.equal(q.length, 1);
    assert.equal(q[0].row.name, 'B');
  });

  await testAsync('Exclusão substitui upsert pendente do mesmo registro', async () => {
    const offline = makePersistenceContext(false);
    await offline.p.queueUpsert('u','clients',{id:'1',name:'A'});
    await offline.p.queueDelete('u','clients','1');
    const q = await offline.p.getPending('u');
    assert.equal(q.length, 1);
    assert.equal(q[0].type, 'delete');
  });

  await testAsync('Alteração pendente vence dado antigo da nuvem no render', async () => {
    const online = makePersistenceContext(true);
    const resolved = online.p.applyPending(
      { clients:[{id:'1',name:'antigo'}], reminders:[], checkins:[], entries:[], templates:[], pinned:null, theme:'dark' },
      [{type:'upsert',table:'clients',id:'1',row:{id:'1',user_id:'u',name:'novo'}}]
    );
    assert.equal(resolved.clients.length, 1);
    assert.equal(resolved.clients[0].name, 'novo');
  });

  await testAsync('Configurações pendentes substituem configurações antigas', async () => {
    const online = makePersistenceContext(true);
    const resolved = online.p.applyPending(
      { clients:[], reminders:[], checkins:[], entries:['old'], templates:[], pinned:null, theme:'dark' },
      [{type:'settings',table:'app_settings',id:'u',settings:{entries:['new'],pinned:'p',templates:['t'],theme:'light'}}]
    );
    assert.deepEqual(resolved.entries,['new']);
    assert.equal(resolved.pinned,'p');
    assert.deepEqual(resolved.templates,['t']);
    assert.equal(resolved.theme,'light');
  });

  const failed = results.filter(r => r[0] === 'FAIL');
  for (const r of results) console.log(`[${r[0]}] ${r[1]}${r[2] ? ` — ${r[2].message}` : ''}`);
  console.log(`\
Resumo: ${results.length - failed.length}/${results.length} testes passaram.`);
  if (failed.length) process.exitCode = 1;
})();

test('Edge Function trata CORS e preflight', () => {
  const fn = read('supabase/functions/synapse-ai/index.ts');
  assert.match(fn, /Access-Control-Allow-Origin/);
  assert.match(fn, /req\.method === "OPTIONS"/);
  assert.match(fn, /GEMINI_API_KEY/);
  assert.match(fn, /TOTAL_TIMEOUT_MS = 10500/);
  assert.match(fn, /ATTEMPT_TIMEOUT_MS = 3000/);
  assert.match(fn, /RETRY_DELAYS_MS = \[500, 1000\]/);
  assert.match(fn, /thinkingLevel: "low"/);
  assert.match(fn, /maxOutputTokens: 300/);
  assert.match(fn, /system_instruction/);
  assert.match(fn, /generationConfig: \{ maxOutputTokens: 300, thinkingConfig/);
});

test('Falha da IA não é mascarada no frontend', () => {
  const app = read('app.js');
  assert.match(app, /Sua sessão expirou/);
  assert.match(app, /A Syn ainda não está configurada no servidor/);
  assert.match(app, /A Syn demorou mais do que o esperado/);
});



test('Syn mantém mensagens de indisponibilidade sem expor o provedor', () => {
  const app = read('app.js');
  const supabase = read('services/supabase.js');
  assert.equal(app.includes('Gemini'), false);
  assert.equal(app.includes('gemini'), false);
  assert.equal(supabase.includes('Gemini'), false);
  assert.equal(supabase.includes('gemini'), false);
  assert.equal(supabase.includes('error.message ||'), false);
});

test('Retry da Syn usa apenas falhas transitórias', () => {
  const fn = read('supabase/functions/synapse-ai/index.ts');
  assert.match(fn, /shouldRetry\(status: number, message = ""\)/);
  assert.match(fn, /\[408, 500, 502, 503, 504\]/);
  assert.match(fn, /status !== 429/);
  assert.match(fn, /rate/);
  assert.match(fn, /attempt < 2/);
  assert.match(fn, /retryDelayMs\(attempt\)/);
});

test('Prompt da Syn é curto e orientado a dúvidas básicas', () => {
  const app = read('app.js');
  assert.match(app, /assistente virtual do Synapse/);
  assert.match(app, /Responda em português do Brasil, de forma curta, clara, prática e amigável/);
  assert.match(app, /Não revele detalhes técnicos da implementação/);
  assert.match(app, /nextMessages\.slice\(-12\)/);
});


test('Syn responde dúvidas básicas localmente sem depender do provedor', () => {
  const app = read('app.js');
  assert.match(app, /function getSynLocalAnswer\(question\)/);
  assert.match(app, /Eu sou a Syn/);
  assert.match(app, /Na área Clientes/);
  assert.match(app, /O Synapse é seu espaço/);
  assert.match(app, /const localAnswer = getSynLocalAnswer\(question\)/);
});

test('Syn usa fallback de modelos estáveis para falhas transitórias', () => {
  const fn = read('supabase/functions/synapse-ai/index.ts');
  assert.match(fn, /MODELS = \["gemini-3\.6-flash", "gemini-3\.8-flash"\]/);
  assert.match(fn, /for \(const model of MODELS\)/);
  assert.match(fn, /attempt < 2/);
  assert.match(fn, /console\.warn\("Syn upstream response"/);
});


test('Mensagens da Syn são formatadas sem interpretar HTML ou SVG', () => {
  const app = read('app.js');
  assert.match(app, /function formatSynMessage\(text\)/);
  assert.match(app, /formatSynMessage\(answer\)/);
  assert.match(app, /ai-message-list/);
  assert.equal(app.includes("dangerouslySetInnerHTML"), false);
});

test('Renderizador da Syn transforma listas em elementos seguros', () => {
  const app = read('app.js');
  assert.match(app, /clean\.match/);
  assert.match(app, /React\.createElement\('ol'/);
  assert.match(app, /React\.createElement\('li'/);
});


test('Renderização da Syn possui fallback seguro contra mensagens malformadas', () => {
  const app = read('app.js');
  assert.match(app, /function renderSynMessage\(message\)/);
  assert.match(app, /Array\.isArray\(message\?\.blocks\)/);
  assert.match(app, /catch \(_\)/);
  assert.match(app, /renderSynMessage\(message\)/);
});


test('Formatador da Syn fica disponível para o componente global do chat', () => {
  const app = read('app.js');
  const helper = app.indexOf('function formatSynMessage(text)');
  const chat = app.indexOf('function AIAssistant(');
  assert.ok(helper >= 0 && helper < chat);
  assert.ok(app.indexOf('function renderSynMessage(message)') >= 0);
  assert.ok(app.indexOf('renderSynMessage(message)') > chat);
});
