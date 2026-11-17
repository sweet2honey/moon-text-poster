// node --test typo.test.js
'use strict';
process.env.TZ = 'Europe/Berlin'; // dayOfYear must not drift across DST

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

global.window = {};
require('./typo_words.js');
global.WORDS_TEXT = window.WORDS_TEXT;

// Stub canvas: 1em per CJK char, 0.55em per ASCII char.
global.document = {
  createElement() {
    return {
      getContext() {
        return {
          font: '',
          measureText(s) {
            const m = /(\d+(?:\.\d+)?)px/.exec(this.font);
            const px = m ? +m[1] : 10;
            let em = 0;
            for (const ch of s) em += ch.codePointAt(0) > 127 ? 1 : 0.55;
            return { width: em * px };
          }
        };
      }
    };
  }
};

const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const code = html.slice(html.indexOf('(function () {'), html.indexOf('// ===== 界面 ====='));
eval(code + `
globalThis.poster = { segment, keywordOf, breakLines, dayOfYear, yearDays, attribution, plan, NO_START, newCtx, setLineChars };
})()`);
const P = globalThis.poster;

const QUOTE = '我们每个人，都对所有人负有罪责。人一旦习惯了痛苦，痛苦也就成了他的家。';

test('stop words are filtered from keyword ranking', () => {
  assert.strictEqual(P.keywordOf(QUOTE), '痛苦');
  assert.notStrictEqual(P.keywordOf('他们能够发现一切值得珍惜的东西。'), '东西');
});

test('segment follows the word list', () => {
  assert.deepStrictEqual(P.segment(QUOTE).slice(0, 6), ['我们', '每', '个人', '，', '都', '对']);
});

test('breakLines never starts a line with closing punctuation', () => {
  const lines = P.breakLines(QUOTE, 7, (u) => [...u].length);
  assert.ok(lines.length > 1);
  for (const line of lines) assert.ok(!P.NO_START[[...line][0]], `line starts with ${[...line][0]}`);
});

test('a newline in the input forces a line break', () => {
  const measure = (u) => [...u].length * 10;
  assert.deepStrictEqual(P.breakLines('甲乙\n丙丁', 1000, measure), ['甲乙', '丙丁']);
  assert.deepStrictEqual(P.newCtx(measure).wrap('甲乙\n丙丁', 1000, 10, false), ['甲乙', '丙丁']);
});

test('the line character cap limits characters per line', () => {
  const measure = (u) => [...u].length * 10;
  assert.deepStrictEqual(P.breakLines('甲乙丙丁戊己', 1000, measure), ['甲乙丙丁戊己']);
  P.setLineChars(3);
  assert.deepStrictEqual(P.breakLines('甲乙丙丁戊己', 1000, measure), ['甲乙丙', '丁戊己']);
  P.setLineChars(2);
  assert.deepStrictEqual(P.breakLines('甲，乙', 1000, measure), ['甲，', '乙']);
  P.setLineChars(0);
});

test('dayOfYear is stable across daylight saving time', () => {
  assert.strictEqual(P.dayOfYear(new Date(2026, 3, 1)), 91);
  assert.strictEqual(P.dayOfYear(new Date(2026, 6, 1)), 182);
  assert.strictEqual(P.yearDays(2026), 365);
  assert.strictEqual(P.yearDays(2028), 366);
});

test('attribution does not double the title brackets', () => {
  assert.strictEqual(P.attribution({ title: '月读', author: '' }), '—— 《月读》');
  assert.strictEqual(P.attribution({ title: '《月读》', author: '' }), '—— 《月读》');
});
test('draw advances by the run text width', () => {
  const c = P.newCtx((s, px) => [...s].length * px, '痛苦', 1.5);
  const ops = [];
  c.draw(ops, '人一旦习惯了痛苦', 100, 0, 40, 1.2, 0, true);
  assert.strictEqual(ops[0].s, '人一旦习惯了');
  assert.strictEqual(ops[1].s, '痛苦');
  assert.strictEqual(ops[1].x, 100 + ops[0].s.length * 40);
});

test('plan flags text that runs past the canvas', () => {
  const opts = { vpos: 'center', halign: 'center' };
  const short = P.plan('horizontal', { text: QUOTE, title: '', author: '' }, 1320, 2868, opts);
  assert.strictEqual(short.overflow, false);
  const long = P.plan('horizontal', { text: QUOTE.repeat(14), title: '', author: '' }, 1320, 2868, opts);
  assert.strictEqual(long.overflow, true);
});
