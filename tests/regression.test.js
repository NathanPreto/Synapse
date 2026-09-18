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
  assert.match(index, /sw\.js\?v=11/);
  assert.match(index, /manifest\.json\?v=11/);
  assert.match(manifest, /start_url": "\/\?v=11"/);
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
});
test('Chat de IA tem histórico, envio e estado de digitação', () => {
  const app = read('app.js');
  const styles = read('styles.css');
  assert.match(app, /aiMessages/);
  assert.match(app, /onKeyDown/);
  assert.match(app, /ai-chat-composer/);
  assert.match(app, /Nova conversa/);
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
  console.log(`\\nResumo: ${results.length - failed.length}/${results.length} testes passaram.`);
  if (failed.length) process.exitCode = 1;
})();
