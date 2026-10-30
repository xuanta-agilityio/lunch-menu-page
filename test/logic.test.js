const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/Logic.js');

const at = (s) => L.parseVnLocal(s);

// Shape of the real menu tab 11/2026 (row 1 month picker, header on row 3).
const MENU = [
  ['Chọn Tháng', '02/11/2026'],
  [],
  ['TUẦN', 'THỨ', 'NGÀY', 'TÊN MÓN', 'MÓN CHÍNH', 'NGÀY NGHỈ LỄ', 'REFERENCE IMAGES', 'REFERENCE HOLIDAY'],
  ['1', '2', '02/11/2026', 'Cá chiên mắm xoài', 'TRUE', '', '#REF!'],
  ['', '', '', 'Đậu khuôn chiên xốt cà', 'FALSE'],
  ['', '', '', 'Bầu luộc', 'FALSE'],
  ['', '', '', 'Canh chua nấu đầu cá', 'FALSE'],
  ['', '4', '04/11/2026', 'Bún cá', 'TRUE', '', '#REF!'],
  ['3', '2', '16/11/2026', 'Bò xào cần', 'FALSE'],
  ['', '', '', 'Đậu khuôn nhồi thịt ', 'TRUE', '', '#REF!'],
  ['', '6', '20/11/2026', 'Ăn ngoài', 'FALSE', 'Ngày Nhà giáo Việt Nam'],
  ['6', '2', '30/11/2026', '', 'FALSE'],
  ['', '', '', '', 'FALSE']
];

// Shape of the real sign-up tab 2026-11: row 2 has day numbers from column F.
function signup(rows) {
  const days = Array.from({ length: 29 }, (_, i) => String(i + 2)); // day 1 is a Sunday: no column
  return [[], ['STT', 'Full Name', 'lastName', 'firstName', '', ...days, 'Ghi chú'], ...rows];
}
const row = (label, firstDayValue) => ['', '', '', '', label, firstDayValue, '90'];

test('week shown: Mon–Fri, switching on Saturday at 11:00 (AC1, AC2)', () => {
  assert.equal(L.weekMonday(at('2026-11-02T08:00')), '2026-11-02');
  assert.equal(L.weekMonday(at('2026-11-06T23:59')), '2026-11-02');
  assert.equal(L.weekMonday(at('2026-11-07T10:59:59')), '2026-11-02');
  assert.equal(L.weekMonday(at('2026-11-07T11:00')), '2026-11-09');
  assert.equal(L.weekMonday(at('2026-11-08T09:00')), '2026-11-09');
  assert.deepEqual(L.weekDays('2026-11-02'), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
});

test('nothing earlier than the week of 2 Nov 2026 is shown', () => {
  assert.equal(L.weekMonday(at('2026-10-30T09:00')), '2026-11-02');
  assert.equal(L.weekMonday(at('2026-10-27T12:00')), '2026-11-02');
});

test('week spanning two months uses each month\'s tabs (AC8)', () => {
  assert.equal(L.weekMonday(at('2026-11-28T11:00')), '2026-11-30');
  const days = L.weekDays('2026-11-30');
  assert.deepEqual(days.map(L.menuTabName), ['11/2026', '12/2026', '12/2026', '12/2026', '12/2026']);
  assert.deepEqual(days.map(L.signupTabName), ['2026-11', '2026-12', '2026-12', '2026-12', '2026-12']);
  assert.equal(L.menuTabName('2027-01-04'), '01/2027');
  assert.equal(L.signupTabName('2027-01-04'), '2027-01');
});

test('voting window: day 11:00 to next day 11:00 (AC16)', () => {
  assert.equal(L.voteStatus('2026-11-02', at('2026-11-02T10:59:59')), 'upcoming');
  assert.equal(L.voteStatus('2026-11-02', at('2026-11-02T11:00')), 'open');
  assert.equal(L.voteStatus('2026-11-02', at('2026-11-03T10:59:59')), 'open');
  assert.equal(L.voteStatus('2026-11-02', at('2026-11-03T11:00')), 'closed');
  assert.equal(L.voteStatus('2026-11-06', at('2026-11-07T10:59')), 'open');
  assert.equal(L.voteStatus('2026-11-06', at('2026-11-07T11:00')), 'closed');
});

test('highlight today, fade closed days (AC19)', () => {
  const before = at('2026-11-04T10:30');
  assert.equal(L.dayState('2026-11-04', before).highlighted, true);
  assert.equal(L.dayState('2026-11-03', before).faded, false);
  assert.equal(L.dayState('2026-11-02', before).faded, true);
  const after = at('2026-11-04T11:00');
  assert.equal(L.dayState('2026-11-03', after).faded, true);
  assert.equal(L.dayState('2026-11-04', after).highlighted, true);
  assert.equal(L.dayState('2026-11-04', after).faded, false);
  const sat = at('2026-11-07T10:00');
  assert.equal(L.dayState('2026-11-06', sat).highlighted, true);
  assert.equal(L.dayState('2026-11-06', sat).faded, false);
});

test('next refresh boundary is the next 11:00', () => {
  assert.equal(L.nextBoundary(at('2026-11-04T10:30')), at('2026-11-04T11:00'));
  assert.equal(L.nextBoundary(at('2026-11-04T11:00')), at('2026-11-05T11:00'));
});

test('?now= parsing is Vietnam local and strict', () => {
  assert.equal(at('2026-11-02T10:59'), Date.UTC(2026, 10, 2, 3, 59));
  assert.equal(L.formatVnLocal(at('2026-11-02T10:59:30')), '2026-11-02T10:59:30');
  assert.equal(at('2026-02-30T10:00'), null);
  assert.equal(at('02/11/2026 10:00'), null);
  assert.equal(at(''), null);
});

test('menu: all dishes in sheet order, main dish from MÓN CHÍNH (AC3, AC4)', () => {
  const m = L.parseMenu(MENU);
  assert.deepEqual(m['2026-11-02'].dishes.map((d) => d.name),
    ['Cá chiên mắm xoài', 'Đậu khuôn chiên xốt cà', 'Bầu luộc', 'Canh chua nấu đầu cá']);
  assert.deepEqual(m['2026-11-02'].dishes.filter((d) => d.main).map((d) => d.name), ['Cá chiên mắm xoài']);
  assert.deepEqual(m['2026-11-16'].dishes.filter((d) => d.main).map((d) => d.name), ['Đậu khuôn nhồi thịt']);
  assert.equal(m['2026-11-04'].dishes.length, 1);
});

test('menu: empty day and holiday (AC9, AC14)', () => {
  const m = L.parseMenu(MENU);
  assert.deepEqual(m['2026-11-30'].dishes, []);
  assert.equal(m['2026-11-02'].holiday, null);
  assert.deepEqual(m['2026-11-20'].holiday, { name: 'Ngày Nhà giáo Việt Nam' });
  assert.equal(m['2026-11-05'], undefined);
});

test('menu: header found by label even if it moves', () => {
  const moved = [[], ...MENU];
  assert.equal(L.parseMenu(moved)['2026-11-02'].dishes.length, 4);
  assert.deepEqual(L.parseMenu([['nothing']]), {});
});

test('sign-up: counts from the labelled rows (AC5)', () => {
  const s = L.parseSignup(signup([row('VP 604 NT', '90'), row('VP TL18', '108'), row('Mang về', '15')]));
  assert.deepEqual(s[2], { nt604: 90, tl18: 108, home: 15 });
  assert.equal(L.dailyTotal(s[2]), 213);
  assert.equal(s[1], undefined);
});

test('sign-up: rows found by label, not position; spaces and case ignored (AC6)', () => {
  const s = L.parseSignup(signup([
    ['', 'Someone', '', '', '3A', 'x'],
    row('TL18 ', 'x'),
    row('TL18', 'x'),
    row('  vp   604 nt ', '90'),
    row('VP TL18', '108'),
    row('MANG VỀ', '15')
  ]));
  assert.deepEqual(s[2], { nt604: 90, tl18: 108, home: 15 });
});

test('sign-up: missing label or empty cell stays blank (AC7, AC12)', () => {
  const s = L.parseSignup(signup([row('VP 604 NT', '90'), row('Mang về', '')]));
  assert.deepEqual(s[2], { nt604: 90, tl18: null, home: null });
  assert.equal(L.dailyTotal(s[2]), null);
  assert.deepEqual(L.parseSignup(signup([row('VP 604 NT', '#REF!')]))[2].nt604, null);
  assert.equal(L.parseSignup(signup([row('VP 604 NT', '0')]))[2].nt604, 0);
});

test('sign-up: decomposed Vietnamese label still matches', () => {
  const s = L.parseSignup(signup([row('Mang về'.normalize('NFD'), '15')]));
  assert.equal(s[2].home, 15);
});

test('vote toggling (AC16)', () => {
  assert.equal(L.nextVote('', 'like'), 'like');
  assert.equal(L.nextVote('like', 'like'), '');
  assert.equal(L.nextVote('like', 'dislike'), 'dislike');
  assert.equal(L.nextVote('dislike', 'dislike'), '');
});
