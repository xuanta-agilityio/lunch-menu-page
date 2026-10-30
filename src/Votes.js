/**
 * Like/dislike votes (AC16), stored in the separate "Lunch Menu Votes" sheet.
 * One row per (date, email, isTest); vote is 'like', 'dislike' or '' (withdrawn).
 * Matching and counting rules live in Logic.js (findVoteRow, planVote, tallyVotes).
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

/**
 * Reads all vote rows. The date cell may hold text or, if Sheets converted it,
 * a real date; both become "YYYY-MM-DD".
 */
function readVoteRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var range = sheet.getRange(2, 1, last - 1, VOTE_HEADERS.length);
  var values = range.getValues();
  var shown = range.getDisplayValues();
  var tz = sheet.getParent().getSpreadsheetTimeZone();
  var rows = [];
  values.forEach(function (r, i) {
    var dateCell = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : shown[i][0];
    var date = voteDateKey(dateCell);
    if (!date) return;
    rows.push({
      rowNumber: i + 2,
      date: date,
      email: String(r[1]).trim().toLowerCase(),
      vote: String(r[2]).trim(),
      isTest: String(r[3]).toUpperCase() === 'TRUE'
    });
  });
  return rows;
}

/** Applies a click and returns the new tally for that day. Caller checks the window. */
function applyVote_(dateKey, email, clicked, testMode) {
  var sheet = votesSheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rows = readVoteRows_(sheet);
    var plan = planVote(rows, dateKey, email, testMode, clicked);
    if (plan.action === 'update') {
      sheet.getRange(plan.rowNumber, 3, 1, 3).setValues([[plan.vote, testMode, new Date()]]);
      findVoteRow(rows, dateKey, email, testMode).vote = plan.vote;
    } else {
      // Not appendRow(): it ignores the text format and turns the date key into a date.
      var row = sheet.getLastRow() + 1;
      sheet.getRange(row, 1, 1, 2).setNumberFormat('@');
      sheet.getRange(row, 1, 1, VOTE_HEADERS.length).setValues([[dateKey, email, plan.vote, testMode, new Date()]]);
      rows.push({ rowNumber: row, date: dateKey, email: email, vote: plan.vote, isTest: testMode });
    }
    return tallyVotes(rows, [dateKey], email, testMode)[dateKey];
  } finally {
    lock.releaseLock();
  }
}
