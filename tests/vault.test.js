const test = require('node:test');
const assert = require('node:assert/strict');
const { createWindow, load } = require('./helpers/browser');

function newVault() {
  const win = load(createWindow(), 'src/vault.js');
  return win.SynapseVault;
}
const FAST = { iterations: 1000 };

test('criar → cifrar → decifrar preserva o conteúdo (incluindo acentos e emoji)', async () => {
  const v = newVault();
  v.configure('u1', null);
  await v.create('uma-senha-bem-longa', FAST);
  const payload = {
    identity: 'Eu não sou a ansiedade 💪',
    note: 'Mês fraco',
    mentalStages: { pensar: 'x' }
  };
  const enc = await v.encryptJSON(payload);
  assert.match(enc, /^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
  assert.ok(!enc.includes('ansiedade'));
  assert.deepEqual(await v.decryptJSON(enc), payload);
});

test('cada cifragem usa IV novo (mesmo texto → payloads diferentes)', async () => {
  const v = newVault();
  v.configure('u1', null);
  await v.create('uma-senha-bem-longa', FAST);
  assert.notEqual(await v.encryptJSON({ a: 1 }), await v.encryptJSON({ a: 1 }));
});

test('desbloquear: senha correta abre; errada é recusada; dados de outra chave não decifram', async () => {
  const a = newVault();
  a.configure('u1', null);
  const meta = await a.create('senha-correta-123', FAST);
  const secret = await a.encryptJSON({ n: 'segredo' });

  const b = newVault();
  b.configure('u1', meta);
  assert.equal(b.isEnabled(), true);
  assert.equal(b.isUnlocked(), false);
  assert.equal(await b.unlock('senha-errada-123'), false);
  assert.equal(b.isUnlocked(), false);
  await assert.rejects(() => b.decryptJSON(secret), /VAULT_LOCKED/);
  assert.equal(await b.unlock('senha-correta-123'), true);
  assert.deepEqual(await b.decryptJSON(secret), { n: 'segredo' });

  const c = newVault();
  c.configure('u2', null);
  await c.create('outra-senha-qualquer', FAST);
  await assert.rejects(() => c.decryptJSON(secret));
});

test('payload adulterado é rejeitado (AES-GCM autentica)', async () => {
  const v = newVault();
  v.configure('u1', null);
  await v.create('uma-senha-bem-longa', FAST);
  const enc = await v.encryptJSON({ x: 1 });
  const parts = enc.split('.');
  const bytes = Buffer.from(parts[2], 'base64');
  bytes[0] ^= 1;
  await assert.rejects(() => v.decryptJSON(`${parts[0]}.${parts[1]}.${bytes.toString('base64')}`));
});

test('cifrar com o cofre trancado falha em vez de gravar texto aberto', async () => {
  const v = newVault();
  v.configure('u1', { salt: 'AAAAAAAAAAAAAAAAAAAAAA==', verifier: 'v1.x.y', iterations: 1000 });
  await assert.rejects(() => v.encryptJSON({ a: 1 }), /VAULT_LOCKED/);
});

test('trocar de usuário descarta a chave em memória', async () => {
  const v = newVault();
  v.configure('u1', null);
  const meta = await v.create('uma-senha-bem-longa', FAST);
  assert.equal(v.isUnlocked(), true);
  v.configure('u2', meta);
  assert.equal(v.isUnlocked(), false);
});

test('validatePassphrase: exige tamanho e variedade mínimos', () => {
  const v = newVault();
  assert.ok(v.validatePassphrase('curta'));
  assert.ok(v.validatePassphrase('aaaaaaaaaaaa'));
  assert.ok(v.validatePassphrase('abababababab'));
  assert.equal(v.validatePassphrase('uma frase longa 2026'), '');
});

test('trocar a senha reembrulha a MESMA chave: dados antigos continuam legíveis, senha antiga deixa de valer', async () => {
  const a = newVault();
  a.configure('u1', null);
  await a.create('senha-antiga-123', FAST);
  const secret = await a.encryptJSON({ n: 'segredo' });
  await assert.rejects(
    () => a.changePassphrase('senha-errada-000', 'senha-nova-45678', FAST),
    /VAULT_WRONG_PASSPHRASE/
  );
  const meta2 = await a.changePassphrase('senha-antiga-123', 'senha-nova-45678', FAST);

  const b = newVault();
  b.configure('u1', meta2);
  assert.equal(await b.unlock('senha-antiga-123'), false);
  assert.equal(await b.unlock('senha-nova-45678'), true);
  assert.deepEqual(await b.decryptJSON(secret), { n: 'segredo' });
});

test('suspend: enquanto desativa, isEnabled é falso mas a chave segue lendo os dados cifrados', async () => {
  const v = newVault();
  v.configure('u1', null);
  await v.create('uma-senha-bem-longa', FAST);
  const secret = await v.encryptJSON({ a: 1 });
  v.suspend();
  assert.equal(v.isEnabled(), false);
  assert.equal(v.isConfigured(), true);
  assert.deepEqual(await v.decryptJSON(secret), { a: 1 });
  v.resume();
  assert.equal(v.isEnabled(), true);
});

test('recriar o cofre gera outra chave: dados do cofre antigo não decifram', async () => {
  const v = newVault();
  v.configure('u1', null);
  await v.create('uma-senha-bem-longa', FAST);
  const old = await v.encryptJSON({ a: 1 });
  await v.create('uma-senha-bem-longa', FAST);
  await assert.rejects(() => v.decryptJSON(old));
});

test('o cofre não guarda a senha nem a chave nos metadados', async () => {
  const v = newVault();
  v.configure('u1', null);
  const meta = await v.create('SenhaSuperSecreta-9', FAST);
  assert.deepEqual(Object.keys(meta).sort(), ['iterations', 'salt', 'verifier']);
  assert.ok(!JSON.stringify(meta).includes('SenhaSuperSecreta'));
});
