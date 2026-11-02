// In-memory votes sheet that treats date text the way Google Sheets does:
// - appendRow turns "2026-11-02" into a date, ignoring the cell's text format.
// - setValues does the same unless the cell is formatted as text ('@').
// `alwaysConvert` makes setValues convert even in a text cell, for tests that
// must hold whichever way Sheets behaves.
const L = require('../../src/Logic.js');

const looksLikeDateKey = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function display(v) {
  if (v && typeof v.getTime === 'function') return L.dateKeyOf(v.getTime());
  if (v === true) return 'TRUE';
  if (v === false) return 'FALSE';
  return String(v ?? '');
}

/**
 * @param rows initial rows, header included
 * @param asDate turns a date key into a date cell, in the realm the code under test expects
 * @param onAccess called with 'read' or 'write' on each sheet access
 */
function fakeVotesSheet(rows, { asDate, alwaysConvert = false, onAccess = () => {} }) {
  const cells = rows.map((r) => r.slice());
  const formats = {}; // "row,col" -> number format

  const range = (row, col, numRows, numCols) => {
    const read = () => Array.from({ length: numRows }, (_, i) =>
      Array.from({ length: numCols }, (_, j) => (cells[row - 1 + i] || [])[col - 1 + j] ?? ''));
    return {
      getValues() { onAccess('read'); return read(); },
      getDisplayValues() { onAccess('read'); return read().map((r) => r.map(display)); },
      setValues(values) {
        onAccess('write');
        values.forEach((r, i) => r.forEach((v, j) => {
          const R = row + i, C = col + j;
          const keepText = formats[R + ',' + C] === '@' && !alwaysConvert;
          (cells[R - 1] ||= [])[C - 1] = looksLikeDateKey(v) && !keepText ? asDate(v) : v;
        }));
        return this;
      },
      setNumberFormat(format) {
        onAccess('write');
        for (let i = 0; i < numRows; i++) {
          for (let j = 0; j < numCols; j++) formats[(row + i) + ',' + (col + j)] = format;
        }
        return this;
      },
      setFontWeight() { return this; }
    };
  };

  return {
    cells,
    getLastRow() { onAccess('read'); return cells.length; },
    getRange: (row, col, numRows = 1, numCols = 1) => range(row, col, numRows, numCols),
    appendRow(values) {
      onAccess('write');
      cells.push(values.map((v) => (looksLikeDateKey(v) ? asDate(v) : v)));
    },
    getParent: () => ({ getSpreadsheetTimeZone: () => 'Asia/Ho_Chi_Minh' })
  };
}

module.exports = { fakeVotesSheet };
