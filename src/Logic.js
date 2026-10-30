/**
 * Pure logic shared by the Apps Script server and the Node tests.
 * No Apps Script services are used here.
 *
 * Dates: a "date key" is a Vietnam-local calendar date as "YYYY-MM-DD".
 * Times: epoch milliseconds. Vietnam is UTC+7 all year (no DST).
 */

var VN_OFFSET_MS = 7 * 60 * 60 * 1000;
var DAY_MS = 24 * 60 * 60 * 1000;
var CUTOFF_HOUR = 11;
var FIRST_MONDAY = '2026-11-02';

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

/** Vietnam-local parts of an instant. dow: 0 = Sunday … 6 = Saturday. */
function vnParts(ms) {
  var d = new Date(ms + VN_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    dow: d.getUTCDay()
  };
}

function dateKeyOf(ms) {
  var p = vnParts(ms);
  return p.year + '-' + pad2_(p.month) + '-' + pad2_(p.day);
}

/** Instant of hour:00 Vietnam time on the given date key. */
function vnInstant(dateKey, hour) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) throw new Error('Bad date key: ' + dateKey);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], hour || 0) - VN_OFFSET_MS;
}

function addDays(dateKey, n) {
  return dateKeyOf(vnInstant(dateKey, 12) + n * DAY_MS);
}

function isDateKey(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKeyOf(vnInstant(s, 12)) === s;
}

/**
 * Parses a ?now= value ("YYYY-MM-DDTHH:mm" or "…:ss") as Vietnam local time.
 * Returns epoch ms, or null if the value is not valid.
 */
function parseVnLocal(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(s || '').trim());
  if (!m) return null;
  var ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - VN_OFFSET_MS;
  var p = vnParts(ms);
  if (p.year !== +m[1] || p.month !== +m[2] || p.day !== +m[3] || p.hour !== +m[4]) return null;
  return ms;
}

/** Formats an instant as "YYYY-MM-DDTHH:mm:ss" in Vietnam time (the ?now= format). */
function formatVnLocal(ms) {
  var d = new Date(ms + VN_OFFSET_MS);
  return dateKeyOf(ms) + 'T' + pad2_(d.getUTCHours()) + ':' + pad2_(d.getUTCMinutes()) + ':' + pad2_(d.getUTCSeconds());
}

/**
 * Monday of the week to show (AC1, AC2): the current week until Saturday 11:00,
 * then the next week. Never earlier than the first week in scope.
 */
function weekMonday(nowMs) {
  var p = vnParts(nowMs);
  var today = dateKeyOf(nowMs);
  var offset;
  if (p.dow === 0) offset = 1;                                   // Sunday → next Monday
  else if (p.dow === 6 && p.hour >= CUTOFF_HOUR) offset = 2;     // Saturday from 11:00 → next Monday
  else offset = 1 - p.dow;                                       // Mon–Sat before 11:00 → this Monday
  var monday = addDays(today, offset);
  return monday < FIRST_MONDAY ? FIRST_MONDAY : monday;
}

function weekDays(monday) {
  var days = [];
  for (var i = 0; i < 5; i++) days.push(addDays(monday, i));
  return days;
}

/** Voting window for a day (AC16): from the day at 11:00 to the next day at 11:00. */
function voteWindow(dateKey) {
  var opens = vnInstant(dateKey, CUTOFF_HOUR);
  return { opens: opens, closes: opens + DAY_MS };
}

/** 'upcoming' | 'open' | 'closed' */
function voteStatus(dateKey, nowMs) {
  var w = voteWindow(dateKey);
  if (nowMs < w.opens) return 'upcoming';
  if (nowMs < w.closes) return 'open';
  return 'closed';
}

/**
 * Card state (AC19): a day fades once its voting window has closed. Today is
 * highlighted; on Saturday before 11:00, Friday stays highlighted.
 */
function dayState(dateKey, nowMs) {
  var p = vnParts(nowMs);
  var today = dateKeyOf(nowMs);
  var highlighted = dateKey === today ||
    (p.dow === 6 && p.hour < CUTOFF_HOUR && dateKey === addDays(today, -1));
  return {
    highlighted: highlighted,
    faded: voteStatus(dateKey, nowMs) === 'closed',
    vote: voteStatus(dateKey, nowMs)
  };
}

/** Next 11:00 Vietnam time strictly after now; the page refreshes itself then. */
function nextBoundary(nowMs) {
  var t = vnInstant(dateKeyOf(nowMs), CUTOFF_HOUR);
  return t > nowMs ? t : t + DAY_MS;
}

/** Tab names for a date key: menu "MM/YYYY", sign-up "YYYY-MM". */
function menuTabName(dateKey) {
  return dateKey.slice(5, 7) + '/' + dateKey.slice(0, 4);
}

function signupTabName(dateKey) {
  return dateKey.slice(0, 7);
}

/** Label normalisation: Unicode NFC, trimmed, inner spaces collapsed, lower case. */
function normalizeLabel(s) {
  var t = String(s == null ? '' : s);
  if (t.normalize) t = t.normalize('NFC');
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}

function isTrue_(s) {
  return normalizeLabel(s) === 'true';
}

/** "dd/mm/yyyy" → date key, or null. */
function parseSheetDate(s) {
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  var key = m[3] + '-' + pad2_(+m[2]) + '-' + pad2_(+m[1]);
  return isDateKey(key) ? key : null;
}

/**
 * Parses a menu tab (display values) into
 * { 'YYYY-MM-DD': { dishes: [{ name, main }], holiday: null | { name } } }.
 * The header row is found by its labels; a day's date is on its first row only.
 */
function parseMenu(values) {
  var COLS = { date: 'ngày', dish: 'tên món', main: 'món chính', holiday: 'ngày nghỉ lễ' };
  var header = -1, col = {};
  for (var r = 0; r < values.length && header < 0; r++) {
    var labels = values[r].map(normalizeLabel);
    if (labels.indexOf(COLS.date) >= 0 && labels.indexOf(COLS.dish) >= 0) {
      header = r;
      Object.keys(COLS).forEach(function (k) { col[k] = labels.indexOf(COLS[k]); });
    }
  }
  var out = {};
  if (header < 0) return out;

  var current = null;
  for (var i = header + 1; i < values.length; i++) {
    var row = values[i];
    var cell = function (k) { return col[k] >= 0 && row[col[k]] != null ? String(row[col[k]]) : ''; };
    var dateCell = cell('date').trim();
    if (dateCell) {
      current = parseSheetDate(dateCell);
      if (current && !out[current]) out[current] = { dishes: [], holiday: null };
    }
    if (!current) continue;

    var day = out[current];
    var hol = cell('holiday').replace(/\s+/g, ' ').trim();
    if (hol && normalizeLabel(hol) !== 'false' && !day.holiday) {
      day.holiday = { name: isTrue_(hol) ? '' : hol };
    }
    var name = cell('dish').replace(/\s+/g, ' ').trim();
    if (name) day.dishes.push({ name: name, main: false, _ticked: isTrue_(cell('main')) });
  }

  // The first ticked dish is the main dish (AC4).
  Object.keys(out).forEach(function (k) {
    var found = false;
    out[k].dishes.forEach(function (d) {
      d.main = d._ticked && !found;
      if (d.main) found = true;
      delete d._ticked;
    });
  });
  return out;
}

var LOCATIONS = [
  { id: 'nt604', label: 'VP 604 NT', name: '604 Núi Thành' },
  { id: 'tl18', label: 'VP TL18', name: 'Trung Lương 18' },
  { id: 'home', label: 'Mang về', name: 'Mang về' }
];

/**
 * Parses a sign-up tab (display values) into
 * { dayNumber: { nt604: n|null, tl18: n|null, home: n|null } }.
 * Day numbers are in row 2; total rows are found by their label in column E (AC5–AC7).
 */
function parseSignup(values) {
  var HEADER_ROW = 1, LABEL_COL = 4;
  var dayCols = {};
  (values[HEADER_ROW] || []).forEach(function (v, c) {
    if (c <= LABEL_COL) return;
    var s = String(v == null ? '' : v).trim();
    if (/^\d{1,2}$/.test(s) && +s >= 1 && +s <= 31 && dayCols[+s] == null) dayCols[+s] = c;
  });

  var rows = {};
  LOCATIONS.forEach(function (loc) {
    var want = normalizeLabel(loc.label);
    for (var r = HEADER_ROW + 1; r < values.length; r++) {
      if (normalizeLabel((values[r] || [])[LABEL_COL]) === want) { rows[loc.id] = values[r]; break; }
    }
  });

  var out = {};
  Object.keys(dayCols).forEach(function (day) {
    var counts = {};
    LOCATIONS.forEach(function (loc) {
      var row = rows[loc.id];
      counts[loc.id] = row ? parseCount_(row[dayCols[day]]) : null;
    });
    out[day] = counts;
  });
  return out;
}

function parseCount_(v) {
  var s = String(v == null ? '' : v).trim();
  return /^\d+$/.test(s) ? +s : null;
}

/** Daily total (AC12): blank if any location is blank. */
function dailyTotal(counts) {
  if (!counts) return null;
  var sum = 0;
  for (var i = 0; i < LOCATIONS.length; i++) {
    var n = counts[LOCATIONS[i].id];
    if (n == null) return null;
    sum += n;
  }
  return sum;
}

/** Toggle rule (AC16): clicking your current vote removes it; otherwise it replaces it. */
function nextVote(current, clicked) {
  return current === clicked ? '' : clicked;
}

/**
 * Normalises a votes-sheet date cell to a date key. Sheets may turn the text
 * "2026-11-02" into a real date, so the caller passes that cell's display
 * value (or a "YYYY-MM-DD" string it formatted from a Date). "dd/mm/yyyy" is
 * accepted too.
 */
function voteDateKey(cell) {
  var s = String(cell == null ? '' : cell).trim();
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    var key = m[1] + '-' + pad2_(+m[2]) + '-' + pad2_(+m[3]);
    return isDateKey(key) ? key : null;
  }
  return parseSheetDate(s);
}

/**
 * The row that holds a user's vote for a day: the last matching row, so older
 * duplicate rows (from before this rule) are ignored rather than counted.
 */
function findVoteRow(rows, dateKey, email, isTest) {
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (r.date === dateKey && r.email === email && r.isTest === isTest) return r;
  }
  return null;
}

/**
 * What a click does to the votes sheet (AC16): update the user's existing row
 * for that day, or append one if there is none. Never more than one row.
 */
function planVote(rows, dateKey, email, isTest, clicked) {
  var existing = findVoteRow(rows, dateKey, email, isTest);
  var vote = nextVote(existing ? existing.vote : '', clicked);
  return existing
    ? { action: 'update', rowNumber: existing.rowNumber, vote: vote }
    : { action: 'append', vote: vote };
}

/**
 * { dateKey: { like, dislike, mine } } for the given days. One vote per
 * (date, email, isTest): the last row wins. Test votes are only counted in
 * test mode; "mine" comes from the user's row of the current kind.
 */
function tallyVotes(rows, days, email, testMode) {
  var out = {}, latest = {};
  days.forEach(function (d) { out[d] = { like: 0, dislike: 0, mine: '' }; });
  rows.forEach(function (r) {
    if (out[r.date]) latest[r.date + '|' + r.email + '|' + r.isTest] = r;
  });
  Object.keys(latest).forEach(function (k) {
    var r = latest[k], t = out[r.date];
    if (r.isTest && !testMode) return;
    if (r.vote === 'like') t.like++;
    if (r.vote === 'dislike') t.dislike++;
    if (r.email === email && r.isTest === testMode) t.mine = r.vote;
  });
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    vnParts: vnParts, dateKeyOf: dateKeyOf, vnInstant: vnInstant, addDays: addDays, isDateKey: isDateKey,
    parseVnLocal: parseVnLocal, formatVnLocal: formatVnLocal, weekMonday: weekMonday, weekDays: weekDays,
    voteWindow: voteWindow, voteStatus: voteStatus, dayState: dayState, nextBoundary: nextBoundary,
    menuTabName: menuTabName, signupTabName: signupTabName, normalizeLabel: normalizeLabel,
    parseSheetDate: parseSheetDate, parseMenu: parseMenu, parseSignup: parseSignup, dailyTotal: dailyTotal,
    nextVote: nextVote, voteDateKey: voteDateKey, findVoteRow: findVoteRow, planVote: planVote,
    tallyVotes: tallyVotes, LOCATIONS: LOCATIONS
  };
}
