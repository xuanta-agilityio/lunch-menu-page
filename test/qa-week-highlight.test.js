// QA-MATRIX.md Group 1 (week display and switch) and Group 6 (highlight and fade).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, ADMIN, USER } = require('./helpers/app.js');
const { renderPage } = require('./helpers/page.js');

const dates = (week) => week.days.map((d) => d.date);
const NOV_2_TO_6 = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
const NOV_9_TO_13 = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
const DAY_LABELS = ['November 2nd', 'November 3rd', 'November 4th', 'November 5th', 'November 6th'];

const weekAt = (time, email = USER) => createApp().as(email, time).getWeek();

/** { date: 'today' | 'faded' | 'normal' } from the server's day state. */
function serverStates(week) {
  return Object.fromEntries(week.days.map((d) => [d.date.slice(8),
    d.state.highlighted ? 'today' : d.state.faded ? 'faded' : 'normal']));
}

/** The same, read from the classes on the rendered cards. */
function pageStates(week) {
  const page = renderPage(week);
  return Object.fromEntries(DAY_LABELS.map((label) => {
    const card = page.card(label);
    const state = card.hasClass('today') ? 'today' : card.hasClass('faded') ? 'faded' : 'normal';
    return [label.replace(/\D/g, '').padStart(2, '0'), state];
  }));
}

test('W01 (server): Mon 2 Nov 09:00 shows 2-6 Nov only, numbered 2-6, no weekend', () => {
  const week = weekAt('2026-11-02T09:00');
  assert.deepEqual(dates(week), NOV_2_TO_6);
  assert.deepEqual(week.days.map((d) => d.weekdayNumber), [2, 3, 4, 5, 6]);
  assert.deepEqual(week.days.map((d) => d.weekday), ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
});

test('W01 (page): five cards with numbers 2-6 and their dates', () => {
  const page = renderPage(weekAt('2026-11-02T09:00'));
  assert.equal(page.cards().length, 5);
  assert.deepEqual(page.cards().map((c) => c.all('weekday-number')[0].textContent), ['2', '3', '4', '5', '6']);
  assert.deepEqual(page.cards().map((c) => c.all('date')[0].textContent), [
    'Monday, November 2nd', 'Tuesday, November 3rd', 'Wednesday, November 4th',
    'Thursday, November 5th', 'Friday, November 6th'
  ]);
  assert.equal(page.elements.range.textContent, '02.11 - 06.11');
  const text = page.elements.week.textContent;
  assert.doesNotMatch(text, /Saturday|Sunday/);
});

test('W02: Sat 7 Nov 10:59 still shows 2-6 Nov', () => {
  assert.deepEqual(dates(weekAt('2026-11-07T10:59')), NOV_2_TO_6);
});

test('W03: Sat 7 Nov 11:00 shows 9-13 Nov', () => {
  assert.deepEqual(dates(weekAt('2026-11-07T11:00')), NOV_9_TO_13);
});

test('W06 (server): Sat 28 Nov 11:00 without December tabs shows 30 Nov and empty 1-4 Dec with blank counts', () => {
  const week = weekAt('2026-11-28T11:00', ADMIN);
  assert.deepEqual(dates(week), ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04']);
  assert.deepEqual(week.days[0].counts, { nt604: 90, tl18: 108, home: 15 });
  week.days.slice(1).forEach((d) => {
    assert.deepEqual(d.dishes, [], d.date);
    assert.deepEqual(d.counts, { nt604: null, tl18: null, home: null }, d.date);
    assert.equal(d.total, null, d.date);
  });
});

test('W06 (page): 1-4 Dec show "Menu is coming..." and blank counts', () => {
  const page = renderPage(weekAt('2026-11-28T11:00', ADMIN));
  ['December 1st', 'December 2nd', 'December 3rd', 'December 4th'].forEach((label) => {
    assert.equal(page.card(label).all('notice')[0].textContent, 'Menu is coming...', label);
  });
  assert.ok(page.card('November 30th'), '30 Nov is shown');
  const table = page.countsTable();
  assert.deepEqual(table.slice(1), [
    ['604 Núi Thành', '90', '', '', '', ''],
    ['Trung Lương 18', '108', '', '', '', ''],
    ['Mang về', '15', '', '', '', ''],
    ['Total', '213', '', '', '', '']
  ]);
});

const HIGHLIGHT_CASES = [
  ['H01', 'Wed 4 Nov 10:59', '2026-11-04T10:59', '4 Nov highlighted, 3 Nov normal, 2 Nov faded',
    { '02': 'faded', '03': 'normal', '04': 'today', '05': 'normal', '06': 'normal' }],
  ['H02', 'Wed 4 Nov 11:00', '2026-11-04T11:00', '4 Nov highlighted, 2-3 Nov faded',
    { '02': 'faded', '03': 'faded', '04': 'today', '05': 'normal', '06': 'normal' }],
  ['H03', 'Mon 2 Nov 09:00', '2026-11-02T09:00', '2 Nov highlighted, nothing faded',
    { '02': 'today', '03': 'normal', '04': 'normal', '05': 'normal', '06': 'normal' }],
  ['H04', 'Sat 7 Nov 10:30', '2026-11-07T10:30', '6 Nov highlighted, 2-5 Nov faded',
    { '02': 'faded', '03': 'faded', '04': 'faded', '05': 'faded', '06': 'today' }]
];

for (const [id, when, time, expected, states] of HIGHLIGHT_CASES) {
  test(`${id} (server): ${when}: ${expected}`, () => {
    assert.deepEqual(serverStates(weekAt(time)), states);
  });
  test(`${id} (page): ${when}: ${expected}`, () => {
    assert.deepEqual(pageStates(weekAt(time)), states);
  });
}

test('H04 (server): Friday is not faded while it can still be voted on', () => {
  const friday = createApp().as(USER, '2026-11-07T10:30').day('2026-11-06');
  assert.equal(friday.state.faded, false);
  assert.equal(friday.state.vote, 'open');
});
