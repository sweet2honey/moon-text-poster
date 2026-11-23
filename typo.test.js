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
globalThis.poster = { segment, keywordOf, breakLines, dayOfYear, yearDays, attribution, plan, NO_START, newCtx, setLineChars,
  dxDay, dxLunarLines, dxFallback };
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
  const measure = (u, px) => [...u].length * (px || 10);
  assert.deepStrictEqual(P.breakLines('甲乙丙丁戊己', 1000, measure), ['甲乙丙丁戊己']);
  P.setLineChars(3);
  assert.deepStrictEqual(P.breakLines('甲乙丙丁戊己', 1000, measure), ['甲乙丙', '丁戊己']);
  P.setLineChars(4);
  const r = P.newCtx(measure).fit('甲乙丙丁戊己庚辛', 400, 200, 10, 5000, 1.2, true);
  assert.ok(r.size <= 100, `size ${r.size} should shrink so 4 chars fit 400px`);
  assert.ok(r.lines.every((l) => [...l].length <= 4));
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

test('danxiangli maps the lunar payload to the three lines', () => {
  assert.deepStrictEqual(P.dxLunarLines({
    lunarMonthName: '十月', lunarDayName: '十五', zodiac: '马',
    yearInGanZhi: '丙午', monthInGanZhi: '己亥', dayInGanZhi: '辛丑', festival: ['春节']
  }), { date: '十月十五', ganzhi: '丙午马年 · 己亥月 · 辛丑日', term: '今日春节' });
  assert.strictEqual(P.dxLunarLines({
    lunarMonthName: '十月', lunarDayName: '十五', festival: []
  }).term, undefined);
  assert.strictEqual(P.dxLunarLines(null), null);
  assert.strictEqual(P.dxLunarLines({ lunarMonthName: '', lunarDayName: '' }), null);
});

test('danxiangli calendar fields follow the date', () => {
  const c = P.dxDay(new Date(2026, 9, 15));
  assert.strictEqual(c.month_en, 'OCTOBER');
  assert.strictEqual(c.week_en, 'THURSDAY');
  assert.strictEqual(c.week_zh, '星期四');
  assert.strictEqual(c.yday, 288);
  assert.strictEqual(c.total, 365);
  assert.strictEqual(P.dxDay(new Date(2028, 11, 31)).total, 366);
});

test('danxiangli picks the same fallback sentence for the same day', () => {
  const a = P.dxDay(new Date(2026, 9, 15));
  const b = P.dxDay(new Date(2026, 9, 15));
  assert.strictEqual(P.dxFallback(a).text, P.dxFallback(b).text);
  assert.ok(P.dxFallback(a).text.length > 0);
});

const DX_LUNAR = { date: '十月十五', ganzhi: '丙午马年 · 己亥月 · 辛丑日', term: '今日春节' };
const dxMeasure = (s, px) => [...s].reduce((w, ch) => w + (ch.codePointAt(0) > 127 ? px : px * 0.55), 0);

function dxCheck(W, H, q, lunar) {
  const res = P.plan('danxiangli', q, W, H, { date: new Date(2026, 9, 15), lunar });
  assert.strictEqual(res.style, 'danxiangli');
  assert.ok(res.ops.length > 10);
  let foot = 0;
  for (const op of res.ops) if (op.t === 'rect' && op.h <= 2 && op.y > foot) foot = op.y;
  for (const op of res.ops) {
    if (op.t === 'text') {
      const right = op.x + dxMeasure(op.s, op.size);
      assert.ok(op.x >= 0 && right <= W + op.size, `${W}x${H} overflow x: ${op.s}`);
      assert.ok(op.y >= 0 && op.y + op.size <= H + 1, `${W}x${H} overflow y: ${op.s}`);
      if (!op.s.startsWith('NO.')) {
        assert.ok(op.y + op.size <= foot, `${W}x${H} overlaps footer: ${op.s}`);
      }
    } else {
      assert.ok(op.x >= 0 && op.x + op.w <= W && op.y + op.h <= H, `${W}x${H} rect overflow`);
    }
  }
  return res.ops;
}

test('danxiangli fits portrait, landscape, and thumbnails with or without lunar', () => {
  const quotes = [
    { text: '我们每个人，都对所有人负有罪责，而我比所有人更有罪。', title: '卡拉马佐夫兄弟', author: '陀思妥耶夫斯基' },
    { text: '很长的一句划线，'.repeat(10), title: '', author: '' },
    { text: "To go wrong in one's own way is better than to go right in someone else's.", title: 'Crime', author: 'F. D.' }
  ];
  for (const [W, H] of [[600, 800], [800, 600], [176, 381]]) {
    for (const q of quotes) {
      for (const lunar of [null, DX_LUNAR]) dxCheck(W, H, q, lunar);
    }
  }
});

test('danxiangli uses the input text and falls back only when it is empty', () => {
  const ops = dxCheck(600, 800, { text: '自定义句子。', title: '书', author: '人' }, null);
  const texts = ops.filter((o) => o.t === 'text').map((o) => o.s);
  assert.ok(texts.includes('自定义句子。'));
  assert.ok(texts.includes('—— 《书》 人'));

  const empty = dxCheck(600, 800, { text: '', title: '', author: '' }, null);
  const joined = empty.filter((o) => o.t === 'text').map((o) => o.s).join('');
  const fb = P.dxFallback(P.dxDay(new Date(2026, 9, 15)));
  assert.ok(joined.includes(fb.text), `fallback sentence missing: ${fb.text}`);
  assert.ok(empty.every((o) => o.t !== 'text' || o.s !== DX_LUNAR.date), 'lunar must be absent when not loaded');
  assert.ok(empty.every((o) => o.t !== 'text' || !/MOON|月读/.test(o.s)), 'branding must be gone');
  const collage = P.plan('collage', { text: '没有书名。', title: '', author: '', keyword: '' }, 600, 800,
    { vpos: 'center', halign: 'center' });
  assert.ok(collage.ops.every((o) => o.t !== 'text' || !/MOON|月读/.test(o.s)), 'collage branding must be gone');
});
