// Integridade do projeto: o que precisa estar coerente para o deploy funcionar.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const stripQuery = u => u.split('?')[0].replace(/^\.\//, '');

test('todo script do index.html existe e o Tailwind CDN não é usado', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
  assert.match(html, /href="tailwind\.css/);
  const local = [...html.matchAll(/<script src="([^":]+)"/g)].map(m => stripQuery(m[1]));
  assert.ok(local.length >= 15);
  for (const f of local) assert.ok(fs.existsSync(path.join(ROOT, f)), `faltando ${f}`);
});

test('Service Worker pré-cacheia somente arquivos existentes e a versão bate com o index', () => {
  const sw = read('sw.js');
  const files = [...sw.matchAll(/'(\.\/[^']+)'/g)].map(m => stripQuery(m[1]));
  for (const f of files)
    if (f !== '' && f !== './') assert.ok(fs.existsSync(path.join(ROOT, f)), `faltando ${f}`);
  const html = read('index.html');
  for (const m of html.matchAll(/<script src="(src\/[^"]+)"/g))
    assert.ok(sw.includes(m[1].replace(/^/, './')), `sw.js sem ${m[1]}`);
  const swV = sw.match(/synapse-shell-v(\d+)|v(\d+)'/);
  assert.ok(swV);
});

test('todos os arquivos src/*.js e serviços são JavaScript válido', () => {
  const files = [
    ...fs
      .readdirSync(path.join(ROOT, 'src'))
      .filter(f => f.endsWith('.js'))
      .map(f => `src/${f}`),
    'services/supabase.js',
    'services/persistence.js',
    'backend.js',
    'synapse-runtime.js',
    'sw.js'
  ];
  for (const f of files) assert.doesNotThrow(() => new vm.Script(read(f), { filename: f }), f);
});

test('safety.js do frontend é idêntico ao da Edge Function', () => {
  assert.equal(read('src/safety.js'), read('supabase/functions/_shared/safety.js'));
});

test('não há arquivos legados na raiz nem manifest duplicado', () => {
  for (const f of [
    'app.js',
    'sanitize.js',
    'logger.js',
    'storage.js',
    'spreadsheet.js',
    'manifest.webmanifest'
  ])
    assert.ok(!fs.existsSync(path.join(ROOT, f)), `${f} não deveria existir`);
  assert.doesNotMatch(read('README.md'), /core\/logger\.js/);
});

test('Política de Privacidade cobre LGPD, base legal, sensível, terceiros e exclusão', () => {
  const p = read('privacidade.html');
  for (const re of [
    /LGPD/,
    /Art|art\. 7º/,
    /consentimento/,
    /sens[ií]ve(l|is)/,
    /controlador/,
    /operador/,
    /transfer[êe]ncia internacional/,
    /188/,
    /ANPD/,
    /18 anos/,
    /Google Gemini|Gemini/
  ])
    assert.match(p, re);
  assert.doesNotMatch(p, /deverá oferecer/);
  const t = read('termos.html');
  assert.match(t, /188/);
  assert.match(t, /n[ãa]o s[ãa]o terapia/);
});

test('schema tem restrições de valor e gatilho de updated_at', () => {
  const sql = read('supabase.sql');
  assert.match(sql, /check \(stage in \(/i);
  assert.match(sql, /check \(mood between 1 and 5\)|mood.*between 1 and 5/is);
  assert.match(sql, /updated_at/);
  assert.match(sql, /client_updated_at/);
  assert.ok(fs.existsSync(path.join(ROOT, 'supabase/config.toml')));
  assert.match(
    read('supabase/config.toml'),
    /\[functions\.synapse-ai\][\s\S]*?verify_jwt\s*=\s*true/
  );
});

test('migrations e supabase.sql estão em sincronia com o gerador', () => {
  const dir = path.join(ROOT, 'supabase/migrations');
  const merged = fs
    .readdirSync(dir)
    .sort()
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');
  for (const line of merged.split('\n').filter(l => /^create (table|policy|function)/i.test(l)))
    assert.ok(read('supabase.sql').includes(line.trim()), `supabase.sql sem: ${line}`);
});

test('CI, licença e config de deploy existem', () => {
  for (const f of ['LICENSE', '.github/workflows/ci.yml', 'vercel.json', '.gitignore'])
    assert.ok(fs.existsSync(path.join(ROOT, f)), `faltando ${f}`);
});
