/**
 * Read-only access to the two source sheets (AC11).
 * This file must only read: `npm test` fails if a write method appears here.
 */

function readSourceTab_(spreadsheetId, tabName, cache) {
  var key = spreadsheetId + '|' + tabName;
  if (!(key in cache)) {
    var ss = cache[spreadsheetId] || (cache[spreadsheetId] = SpreadsheetApp.openById(spreadsheetId));
    var sheet = ss.getSheetByName(tabName);
    cache[key] = sheet ? sheet.getDataRange().getDisplayValues() : null;
  }
  return cache[key];
}

/** Menu for the month of dateKey, parsed; {} if the tab does not exist. */
function readMenuMonth_(dateKey, cache) {
  var values = readSourceTab_(CONFIG.MENU_SHEET_ID, menuTabName(dateKey), cache);
  return values ? parseMenu(values) : {};
}

/** Meal counts for the month of dateKey, parsed; {} if the tab does not exist. */
function readSignupMonth_(dateKey, cache) {
  var values = readSourceTab_(CONFIG.SIGNUP_SHEET_ID, signupTabName(dateKey), cache);
  return values ? parseSignup(values) : {};
}
