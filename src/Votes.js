/**
 * Like/dislike votes (AC16), stored in the separate "Lunch Menu Votes" sheet.
 * One row per (date, email, isTest); vote is 'like', 'dislike' or '' (withdrawn).
 */

var VOTE_HEADERS = ['date', 'email', 'vote', 'isTest', 'updatedAt'];

function votesSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(CONFIG.VOTES_SHEET_PROPERTY);
  if (id) return SpreadsheetApp.openById(id).getSheets()[0];

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    id = props.getProperty(CONFIG.VOTES_SHEET_PROPERTY);
    if (id) return SpreadsheetApp.openById(id).getSheets()[0];
    var ss = SpreadsheetApp.create(CONFIG.VOTES_SHEET_TITLE);
    var sheet = ss.getSheets()[0];
    sheet.setName('votes');
    sheet.getRange('A:B').setNumberFormat('@'); // keep date keys as text
    sheet.getRange(1, 1, 1, VOTE_HEADERS.length).setValues([VOTE_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    props.setProperty(CONFIG.VOTES_SHEET_PROPERTY, ss.getId());
    return sheet;
  } finally {
    lock.releaseLock();
  }
}

function readVoteRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, VOTE_HEADERS.length).getValues().map(function (r, i) {
    return {
      rowNumber: i + 2,
      date: String(r[0]),
      email: String(r[1]).toLowerCase(),
      vote: String(r[2]),
      isTest: String(r[3]).toUpperCase() === 'TRUE'
    };
  });
}

/**
 * { dateKey: { like, dislike, mine } } for the given days. Test votes are only
 * counted while the admin is in test mode; "mine" comes from the matching kind.
 */
function tallyVotes_(rows, days, email, testMode) {
  var out = {};
  days.forEach(function (d) { out[d] = { like: 0, dislike: 0, mine: '' }; });
  rows.forEach(function (r) {
    var t = out[r.date];
    if (!t) return;
    if (r.isTest && !testMode) return;
    if (r.vote === 'like') t.like++;
    if (r.vote === 'dislike') t.dislike++;
    if (r.email === email && r.isTest === testMode) t.mine = r.vote;
  });
  return out;
}

/** Applies a click and returns the new tally for that day. Caller checks the window. */
function applyVote_(dateKey, email, clicked, testMode) {
  var sheet = votesSheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rows = readVoteRows_(sheet);
    var existing = null;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.date === dateKey && r.email === email && r.isTest === testMode) { existing = r; break; }
    }
    var next = nextVote(existing ? existing.vote : '', clicked);
    if (existing) {
      sheet.getRange(existing.rowNumber, 3, 1, 3).setValues([[next, testMode, new Date()]]);
      existing.vote = next;
    } else {
      sheet.appendRow([dateKey, email, next, testMode, new Date()]);
      rows.push({ date: dateKey, email: email, vote: next, isTest: testMode });
    }
    return tallyVotes_(rows, [dateKey], email, testMode)[dateKey];
  } finally {
    lock.releaseLock();
  }
}
