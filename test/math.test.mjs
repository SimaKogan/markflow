import test from 'node:test';
import assert from 'node:assert';
import { protectMath, restoreMath } from '../src/math.mjs';

const fake = (tex, display) => `<m${display ? ' d' : ''}>${tex}</m>`;
const run = (src) => {
  const { out, maths } = protectMath(src, fake);
  return { out, maths, html: restoreMath(out, maths) };
};

test('inline and display math are protected and restored', () => {
  const { maths, html } = run('a $x^2$ b\n\n$$\\int f$$');
  assert.strictEqual(maths.length, 2);
  assert.strictEqual(html, 'a <m>x^2</m> b\n\n<m d>\\int f</m>');
});

test('dollar amounts are not math', () => {
  const { maths } = run('It costs $5 and $10 today.');
  assert.strictEqual(maths.length, 0);
});

test('fenced code and inline code are left alone', () => {
  const src = 'text `$a$ and $b$` and\n```js\nconst s = "$x$"\n```\n$real$';
  const { out, maths } = run(src);
  assert.deepStrictEqual(maths, ['<m>real</m>']);
  assert.ok(out.includes('`$a$ and $b$`'));
  assert.ok(out.includes('const s = "$x$"'));
});

test('a failing renderer falls back to escaped text', () => {
  const { out, maths } = protectMath('$<img src=x onerror=alert(1)>$', () => { throw new Error('boom'); });
  const restored = restoreMath(out, maths);
  assert.ok(!restored.includes('<img'));
  assert.ok(restored.includes('&lt;img'));
});

test('user text cannot forge placeholders', () => {
  const { html } = run('0 $a$');
  assert.strictEqual(html, '0 <m>a</m>');
});
