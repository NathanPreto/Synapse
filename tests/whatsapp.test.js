const test = require('node:test');
const assert = require('node:assert/strict');
const { createWindow, load } = require('./helpers/browser');

const win = load(createWindow(), 'src/whatsapp.js');
const W = win.SynapseWhatsApp;

test('parsePhone: formatos brasileiros comuns viram número internacional', () => {
  const cases = [
    ['(11) 91234-5678', '5511912345678'],
    ['11 91234 5678', '5511912345678'],
    ['11912345678', '5511912345678'],
    ['+55 11 91234-5678', '5511912345678'],
    ['5511912345678', '5511912345678'],
    ['011 91234-5678', '5511912345678'],
    ['(21) 3456-7890', '552134567890'],
    ['Maria - 31 99876-5432 (comercial)', '5531998765432'],
    ['0055 11 91234-5678', '5511912345678']
  ];
  for (const [input, expected] of cases) assert.equal(W.parsePhone(input), expected, input);
});

test('parsePhone: números internacionais explícitos são preservados', () => {
  assert.equal(W.parsePhone('+1 (415) 555-2671'), '14155552671');
  assert.equal(W.parsePhone('+351 912 345 678'), '351912345678');
});

test('parsePhone: sem telefone utilizável retorna null (e-mail, sem DDD, vazio, lixo)', () => {
  for (const input of [
    '',
    null,
    undefined,
    'maria@empresa.com',
    '91234-5678',
    '99999',
    'sem contato',
    '123456789012345678'
  ]) {
    assert.equal(W.parsePhone(input), null, String(input));
  }
});

test('parsePhone: DDD inválido não gera link', () => {
  assert.equal(W.parsePhone('(05) 91234-5678'), null);
});

test('buildLink: monta wa.me com a mensagem codificada', () => {
  const url = W.buildLink('(11) 91234-5678', 'Oi, Ana! Tudo bem? #1');
  assert.equal(
    url,
    'https://wa.me/5511912345678?text=' + encodeURIComponent('Oi, Ana! Tudo bem? #1')
  );
  assert.equal(W.buildLink('(11) 91234-5678'), 'https://wa.me/5511912345678');
  assert.equal(W.buildLink('email@x.com', 'oi'), null);
});

test('fillTemplate/firstName: usa o primeiro nome', () => {
  assert.equal(W.firstName('  Ana Paula Souza '), 'Ana');
  assert.equal(
    W.fillTemplate('Oi {nome}, posso ajudar? {NOME}', 'Ana Paula'),
    'Oi Ana, posso ajudar? Ana'
  );
});
