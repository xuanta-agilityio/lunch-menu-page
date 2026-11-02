// QA-MATRIX.md Group 4 (roles). Each check also runs as admin, so these tests
// can't pass just because the data is missing.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, ADMIN, USER, USER_B } = require('./helpers/app.js');
const { renderPage } = require('./helpers/page.js');
const { assertNoCounts, assertHasCounts } = require('./helpers/no-counts.js');

const MON_2_NOV = '2026-11-02T11:00';

test('R04 (server): a normal user gets the menu, votes and like/dislike counts, no meal counts or total', () => {
  const app = createApp().as(USER_B, MON_2_NOV);
  app.vote('2026-11-02', 'like');
  const week = app.as(USER).getWeek();

  assert.equal(week.isAdmin, false);
  assert.equal(week.days.length, 5);
  assert.equal(week.days[0].dishes[0].name, 'Cá chiên mắm xoài');
  assert.deepEqual(week.days[0].votes, { like: 1, dislike: 0, mine: '' }, "another user's like is visible");
  week.days.forEach((d) => {
    assert.equal('counts' in d, false, d.date);
    assert.equal('total' in d, false, d.date);
  });
  assert.equal('locations' in week, false);
});

test('R04 (page): a normal user sees the menu and vote counts, and no counts table', () => {
  const app = createApp().as(USER_B, MON_2_NOV);
  app.vote('2026-11-02', 'like');
  const page = renderPage(app.as(USER).getWeek());

  assert.equal(page.card('November 2nd').all('dishes')[0].children[0].textContent, 'Cá chiên mắm xoài');
  assert.deepEqual(page.voteCounts('November 2nd'), { like: 1, dislike: 0 });
  assert.equal(page.elements.counts.hidden, true);
  assert.deepEqual(page.countsTable(), []);
});

test('R04 (admin control): the admin gets the counts table on the same data', () => {
  const page = renderPage(createApp().as(ADMIN, MON_2_NOV).getWeek());
  assert.equal(page.elements.counts.hidden, false);
  assert.ok(page.countsTable().length > 0);
});

test('R06 (server): getWeek for a normal user sends no meal counts or total', () => {
  const app = createApp().as(USER, MON_2_NOV);
  assertNoCounts(app.getWeek());
});

test('R06 (server): the data embedded in the page source for a normal user has no meal counts or total', () => {
  const { data } = createApp().as(USER, MON_2_NOV).doGet();
  assert.equal(data.error, undefined);
  assert.equal(data.days.length, 5);
  assertNoCounts(data);
});

test('R06 (server): the rendered page source differs between normal user and admin only in the embedded data', () => {
  const app = createApp();
  const user = app.as(USER, MON_2_NOV).doGet();
  const admin = app.as(ADMIN).doGet();
  assert.equal(user.htmlWithoutData, admin.htmlWithoutData);
  assert.doesNotMatch(user.html, /<\?/, 'every template tag was rendered');
  assert.notEqual(user.html, admin.html, 'the admin page does carry more data');
});

test('R06 (scan check): the count scan catches counts under unknown field names, as numbers or text', () => {
  assert.throws(() => assertNoCounts({ meals: { a: 90 } }), /value 90/);
  assert.throws(() => assertNoCounts({ meals: { a: '108' } }), /value 108/);
  assert.throws(() => assertNoCounts({ total: null }), /field "total"/);
  assert.doesNotThrow(() => assertNoCounts({ nowMs: 90, votes: { like: 1 }, date: '2026-11-02' }));
});

test('R06 (server): the sign-up sheet is not even opened for a normal user', () => {
  const app = createApp().as(USER, MON_2_NOV);
  app.getWeek();
  app.doGet();
  assert.equal(app.openedSignupSheet(), false);
});

test('R06 (server): a normal user cannot get counts with ?now=', () => {
  const app = createApp().as(USER, MON_2_NOV);
  const week = app.getWeek('2026-11-16T12:00');
  assert.equal(week.testMode, false);
  assert.equal(week.monday, '2026-11-02');
  assertNoCounts(week);
  assertNoCounts(app.doGet({ now: '2026-11-16T12:00' }).data);
});

test('R06 (admin control): the same calls as admin do contain the counts', () => {
  const app = createApp().as(ADMIN, MON_2_NOV);
  assertHasCounts(app.getWeek());
  assertHasCounts(app.doGet().data);
  assert.equal(app.openedSignupSheet(), true);
});
