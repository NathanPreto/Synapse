// A formatação da Syn no navegador: sem markdown visível e sem respostas prontas do app.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ctx = vm.createContext({ React: { createElement: () => null } });
vm.runInContext(
  read('src/assistant.js') + '\nthis.__f = { formatSynMessage, stripSynMarkdown };',
  ctx
);
const { formatSynMessage, stripSynMarkdown } = ctx.__f;

test('formatSynMessage remove **, #, crases e links markdown', () => {
  const blocks = formatSynMessage(
    '## Plano\n**Importante:** retome o contato.\n- ligue para `Ana`\n- veja [aqui](https://x.com)'
  );
  const flat = JSON.stringify(blocks);
  assert.doesNotMatch(flat, /\*\*|##|`|\]\(/);
  assert.equal(blocks[0].text, 'Plano');
  assert.equal(blocks[1].text, 'Importante: retome o contato.');
  assert.deepEqual(Array.from(blocks[2].items), ['ligue para Ana', 'veja aqui']);
});

test('stripSynMarkdown não altera texto comum, contas e números', () => {
  const text = 'Faça 3 * 4 = 12 ligações. Meta: R$ 1.500,00 (10%).';
  assert.equal(stripSynMarkdown(text), text);
});

test('o app não responde perguntas com textos prontos: tudo vai para a Syn', () => {
  const ws = read('src/workspace.js');
  assert.doesNotMatch(ws, /getSynLocalAnswer/);
  assert.doesNotMatch(ws, /Na área Clientes você pode cadastrar/);
});
