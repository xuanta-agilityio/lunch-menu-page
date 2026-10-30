// Runs the real src/Votes.js against an in-memory fake of the votes sheet that,
// like Google Sheets, turns the text "2026-11-02" into a date on appendRow
// (and optionally on setValues). Covers QA bugs #13 and #14.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('../src/Logic.js');

const ADMIN = 'xuan.tathanh@asnet.com.vn';
const USER = 'nguyen.van.a@asnet.com.vn';
const DAY = '2026-11-02';

// A date-only cell as Sheets returns it: midnight in the sheet's time zone.
const asDate = (key) => new Date(L.vnInstant(key, 0));
const looksLikeDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function fakeSheet(rows, { convertOnSetValues = false } = {}) {
  const cells = rows.map((r) => r.slice());
  const formats = {}; // "row,col" -> '@'
  const toCell = (v, row, col, convert) =>
    convert && looksLikeDate(v) && (formats[row + ',' + col] !== '@' || convertOnSetValues === 'always')
      ? asDate(v) : v;
  const display = (v) => (v instanceof Date ? L.dateKeyOf(v.getTime()) : v === true ? 'TRUE' : v === false ? 'FALSE' : String(v ?? ''));
  const range = (row, col, nr, nc) => ({
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (cells[row - 1 + i] || [])[col - 1 + j] ?? '')),
    getDisplayValues() { return this.getValues().map((r) => r.map(display)); },
    setValues(vals) {
      vals.forEach((r, i) => r.forEach((v, j) => {
        const R = row + i, C = col + j;
        (cells[R - 1] ||= [])[C - 1] = toCell(v, R, C, convertOnSetValues);
      }));
      return this;
    },
    setNumberFormat(f) { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) formats[(row + i) + ',' + (col + j)] = f; return this; },
    setFontWeight() { return this; }
  });
  const sheet = {
    cells,
    getLastRow: () => cells.length,
    getRange: (row, col, nr = 1, nc = 1) => range(row, col, nr, nc),
    // Sheets ignores the text format here and converts the date (the original bug).
    appendRow: (vals) => { cells.push(vals.map((v) => (looksLikeDate(v) ? asDate(v) : v))); },
    getParent: () => ({ getSpreadsheetTimeZone: () => 'Asia/Ho_Chi_Minh' })
  };
  return sheet;
}

function load(sheet) {
  const ctx = {
    CONFIG: { VOTES_SHEET_PROPERTY: 'VOTES_SHEET_ID', VOTES_SHEET_TITLE: 'Lunch Menu Votes' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'votes-id', setProperty() {} }) },
    SpreadsheetApp: { openById: () => ({ getSheets: () => [sheet] }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { formatDate: (d, tz, fmt) => { assert.equal(fmt, 'yyyy-MM-dd'); return L.dateKeyOf(d.getTime()); } }
  };
  vm.createContext(ctx);
  for (const f of ['Logic.js', 'Votes.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

const HEADER = ['date', 'email', 'vote', 'isTest', 'updatedAt'];
// The 8 rows QA left in the real sheet: dates stored as dates, admin test votes.
const QA_ROWS = ['like', 'like', 'like', 'like', 'like', 'like', 'dislike', 'like']
  .map((v) => [asDate(DAY), ADMIN, v, true, new Date()]);

const tally = (ctx, email, testMode) =>
  ctx.tallyVotes(ctx.readVoteRows_(ctx.votesSheet_()), [DAY], email, testMode)[DAY];
const plain = (o) => JSON.parse(JSON.stringify(o));

for (const convertOnSetValues of [false, 'always']) {
  const label = convertOnSetValues ? ' (even if setValues converts dates)' : '';

  test('#13: clicking like again removes the vote; one row per user per day' + label, () => {
    const sheet = fakeSheet([HEADER], { convertOnSetValues });
    const ctx = load(sheet);
    assert.deepEqual(plain(ctx.applyVote_(DAY, USER, 'like', false)), { like: 1, dislike: 0, mine: 'like' });
    assert.deepEqual(plain(ctx.applyVote_(DAY, USER, 'like', false)), { like: 0, dislike: 0, mine: '' });
    assert.deepEqual(plain(ctx.applyVote_(DAY, USER, 'like', false)), { like: 1, dislike: 0, mine: 'like' });
    assert.deepEqual(plain(ctx.applyVote_(DAY, USER, 'dislike', false)), { like: 0, dislike: 1, mine: 'dislike' });
    assert.equal(sheet.cells.length, 2, 'only one data row for this user and day');
  });

  test('#14: counts and own vote survive a reload' + label, () => {
    const sheet = fakeSheet([HEADER], { convertOnSetValues });
    let ctx = load(sheet);
    ctx.applyVote_(DAY, USER, 'like', false);
    ctx.applyVote_(DAY, ADMIN, 'dislike', false);
    ctx = load(sheet); // a fresh server call, as after reloading the page
    assert.deepEqual(plain(tally(ctx, USER, false)), { like: 1, dislike: 1, mine: 'like' });
    assert.deepEqual(plain(tally(ctx, ADMIN, false)), { like: 1, dislike: 1, mine: 'dislike' });
  });
}

test('#14: QA\'s existing rows (dates stored as dates) are read; the last row per user wins', () => {
  const ctx = load(fakeSheet([HEADER, ...QA_ROWS]));
  assert.deepEqual(plain(tally(ctx, ADMIN, true)), { like: 1, dislike: 0, mine: 'like' });
});

test('#14: test votes count only in ?now= test mode', () => {
  const sheet = fakeSheet([HEADER, ...QA_ROWS]);
  const ctx = load(sheet);
  ctx.applyVote_(DAY, USER, 'dislike', false);
  assert.deepEqual(plain(tally(ctx, USER, false)), { like: 0, dislike: 1, mine: 'dislike' });
  assert.deepEqual(plain(tally(ctx, ADMIN, false)), { like: 0, dislike: 1, mine: '' });
  assert.deepEqual(plain(tally(ctx, ADMIN, true)), { like: 1, dislike: 1, mine: 'like' });
});

test('#13: clicking again on QA\'s duplicated rows updates the latest row, adds none, deletes none', () => {
  const sheet = fakeSheet([HEADER, ...QA_ROWS]);
  const ctx = load(sheet);
  assert.deepEqual(plain(ctx.applyVote_(DAY, ADMIN, 'like', true)), { like: 0, dislike: 0, mine: '' });
  assert.equal(sheet.cells.length, 9);
  assert.equal(sheet.cells[8][2], '');
  assert.deepEqual(sheet.cells.slice(1, 8).map((r) => r[2]), ['like', 'like', 'like', 'like', 'like', 'like', 'dislike']);
  assert.deepEqual(plain(ctx.applyVote_(DAY, ADMIN, 'dislike', true)), { like: 0, dislike: 1, mine: 'dislike' });
  assert.equal(sheet.cells.length, 9);
});

test('new rows are written as text, not with appendRow', () => {
  const sheet = fakeSheet([HEADER]);
  sheet.appendRow = () => assert.fail('appendRow converts the date key; it must not be used');
  load(sheet).applyVote_(DAY, USER, 'like', false);
  assert.equal(sheet.cells[1][0], DAY);
});
