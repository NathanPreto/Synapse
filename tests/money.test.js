const test = require('node:test');
const assert = require('node:assert/strict');
const { createWindow, load } = require('./helpers/browser');

const M = load(createWindow(), 'src/money.js').SynapseMoney;
// toLocaleString usa espaço sem quebra (U+00A0) entre "R$" e o número.
const nbsp = s => s.replace(/ /g, ' ');

test('parse: formatos brasileiros e internacionais', () => {
  const cases = [
    ['1500', 1500],
    ['1.500', 1500],
    ['1.500,50', 1500.5],
    ['R$ 1.500,50', 1500.5],
    ['1500.5', 1500.5],
    ['1500,5', 1500.5],
    ['0,99', 0.99],
    ['12.345.678', 12345678],
    ['12.345.678,9', 12345678.9],
    ['1,234.56', 1.23],
    ['', 0],
    ['abc', 0],
    ['-50', 50],
    [null, 0],
    [undefined, 0]
  ];
  for (const [input, expected] of cases) assert.equal(M.parse(input), expected, String(input));
});

test('parse: números, limites e arredondamento', () => {
  assert.equal(M.parse(10.005 + 0.0001), 10.01);
  assert.equal(M.parse(-3), 0);
  assert.equal(M.parse(NaN), 0);
  assert.equal(M.parse(Infinity), 0);
  assert.equal(M.parse(1e15), M.MAX);
  assert.equal(M.parse('9'.repeat(30)), M.MAX);
});

test('format e toInput seguem o padrão brasileiro', () => {
  assert.equal(nbsp(M.format(1500.5)), 'R$ 1.500,50');
  assert.equal(nbsp(M.format(0)), 'R$ 0,00');
  assert.equal(M.toInput(1500.5), '1.500,50');
  assert.equal(M.toInput(0), '');
  assert.equal(M.parse(M.toInput(1234567.89)), 1234567.89);
});

test('sum soma sem erro de ponto flutuante', () => {
  assert.equal(M.sum([0.1, 0.2, '0,3']), 0.6);
  assert.equal(M.sum([]), 0);
});
