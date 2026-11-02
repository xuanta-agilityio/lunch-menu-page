// QA-MATRIX.md Group 3 (meal counts, as admin) and Group 2 (menu and images).
// Cases that change sheet data change a copy of the fixture, as the matrix does.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, imageFileName, ADMIN } = require('./helpers/app.js');
const { renderPage } = require('./helpers/page.js');
const { signupNovember, signupDayColumn, signupRow } = require('./helpers/fixtures.js');

const MON_2_NOV = '2026-11-02T11:00';
const HEADER = ['Location', 'Mon 02.11', 'Tue 03.11', 'Wed 04.11', 'Thu 05.11', 'Fri 06.11'];

/** Admin's view at Mon 2 Nov, with the sign-up tab changed by `edit`. */
function adminApp(edit = () => {}) {
  const rows = signupNovember();
  edit(rows);
  return createApp({ signup: { '2026-11': rows } }).as(ADMIN, MON_2_NOV);
}

const rowOf = (table, name) => table.find((r) => r[0] === name);

test('C01 (server): 2 Nov counts are 90 / 108 / 15 from the labelled rows', () => {
  assert.deepEqual(adminApp().day('2026-11-02').counts, { nt604: 90, tl18: 108, home: 15 });
});

test('C01 (page): 604 Núi Thành 90, Trung Lương 18 108, Mang về 15; lunch only, no breakfast column', () => {
  const table = renderPage(adminApp().getWeek()).countsTable();
  assert.deepEqual(table[0], HEADER);
  assert.equal(rowOf(table, '604 Núi Thành')[1], '90');
  assert.equal(rowOf(table, 'Trung Lương 18')[1], '108');
  assert.equal(rowOf(table, 'Mang về')[1], '15');
  assert.deepEqual(table.map((r) => r[0]), ['Location', '604 Núi Thành', 'Trung Lương 18', 'Mang về', 'Total']);
  table.forEach((r) => assert.equal(r.length, 6, 'one column per day, nothing extra'));
  assert.doesNotMatch(table.flat().join(' '), /breakfast/i);
});

test('C02 (server): 2 Nov total is 213', () => {
  assert.equal(adminApp().day('2026-11-02').total, 213);
});

test('C02 (page): 2 Nov total shows 213', () => {
  assert.equal(rowOf(renderPage(adminApp().getWeek()).countsTable(), 'Total')[1], '213');
});

const renameTl18 = (rows) => { signupRow(rows, 'VP TL18')[4] = 'VP TL18 old'; };

test('C05 (server): "VP TL18" renamed leaves Trung Lương 18 and the total blank, others shown', () => {
  const day = adminApp(renameTl18).day('2026-11-02');
  assert.deepEqual(day.counts, { nt604: 90, tl18: null, home: 15 });
  assert.equal(day.total, null);
});

test('C05 (page): Trung Lương 18 and Total cells are blank, others shown', () => {
  const table = renderPage(adminApp(renameTl18).getWeek()).countsTable();
  assert.equal(rowOf(table, 'Trung Lương 18')[1], '');
  assert.equal(rowOf(table, 'Total')[1], '');
  assert.equal(rowOf(table, '604 Núi Thành')[1], '90');
  assert.equal(rowOf(table, 'Mang về')[1], '15');
});

const clearHomeOn3Nov = (rows) => { signupRow(rows, 'Mang về')[signupDayColumn(3)] = ''; };

test('C06 (server): Mang về cleared for 3 Nov leaves it and the total blank that day only', () => {
  const app = adminApp(clearHomeOn3Nov);
  const tue = app.day('2026-11-03');
  assert.deepEqual(tue.counts, { nt604: 90, tl18: 108, home: null });
  assert.equal(tue.total, null);
  const mon = app.day('2026-11-02');
  assert.equal(mon.counts.home, 15);
  assert.equal(mon.total, 213);
});

test('C06 (page): 3 Nov Mang về and Total cells are blank, other days unaffected', () => {
  const table = renderPage(adminApp(clearHomeOn3Nov).getWeek()).countsTable();
  assert.equal(rowOf(table, 'Mang về')[2], '');
  assert.equal(rowOf(table, 'Total')[2], '');
  assert.equal(rowOf(table, 'Mang về')[1], '15');
  assert.equal(rowOf(table, 'Total')[1], '213');
});

const zeroNt604On2Nov = (rows) => { signupRow(rows, 'VP 604 NT')[signupDayColumn(2)] = '0'; };

test('C07 (server): a count of 0 stays 0 and is included in the total', () => {
  const day = adminApp(zeroNt604On2Nov).day('2026-11-02');
  assert.equal(day.counts.nt604, 0);
  assert.equal(day.total, 123);
});

test('C07 (page): a count of 0 shows 0, not blank', () => {
  const table = renderPage(adminApp(zeroNt604On2Nov).getWeek()).countsTable();
  assert.equal(rowOf(table, '604 Núi Thành')[1], '0');
  assert.equal(rowOf(table, 'Total')[1], '123');
});

for (const label of ['VP TL18 ', 'vp tl18']) {
  test(`C10: label "${label}" is still recognised and counts are shown`, () => {
    const day = adminApp((rows) => { signupRow(rows, 'VP TL18')[4] = label; }).day('2026-11-02');
    assert.equal(day.counts.tl18, 108);
    assert.equal(day.total, 213);
  });
}

test('M03: 16 Nov main dish and image are "Đậu khuôn nhồi thịt", not "Bò xào cần"', () => {
  const day = createApp().as(ADMIN, '2026-11-16T12:00').day('2026-11-16');
  assert.deepEqual(day.dishes.filter((d) => d.main).map((d) => d.name), ['Đậu khuôn nhồi thịt']);
  assert.equal(day.dishes[0].name, 'Bò xào cần');
  assert.equal(day.dishes[0].main, false);
  assert.equal(day.image.name, 'Đậu khuôn nhồi thịt');
  assert.equal(imageFileName(day), '16-11_Dau-khuon-nhoi-thit.jpg');
});

test('M04: 11 Nov has one main dish, "Cá kho thơm"', () => {
  const day = createApp().as(ADMIN, '2026-11-09T12:00').day('2026-11-11');
  assert.deepEqual(day.dishes.filter((d) => d.main).map((d) => d.name), ['Cá kho thơm']);
  assert.equal(day.dishes.length, 4);
});

test('M05 (server): 30 Nov has no dish, and counts are still there for admin', () => {
  const day = createApp().as(ADMIN, '2026-11-28T11:00').day('2026-11-30');
  assert.deepEqual(day.dishes, []);
  assert.equal(day.image, null);
  assert.deepEqual(day.counts, { nt604: 90, tl18: 108, home: 15 });
  assert.equal(day.total, 213);
});

test('M05 (page): 30 Nov shows "Menu is coming..." and its counts', () => {
  const page = renderPage(createApp().as(ADMIN, '2026-11-28T11:00').getWeek());
  assert.equal(page.card('November 30th').all('notice')[0].textContent, 'Menu is coming...');
  assert.equal(page.card('November 30th').all('dishes').length, 0);
  assert.equal(rowOf(page.countsTable(), '604 Núi Thành')[1], '90');
  assert.equal(rowOf(page.countsTable(), 'Total')[1], '213');
});
