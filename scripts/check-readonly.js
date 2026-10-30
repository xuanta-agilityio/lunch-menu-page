// AC11 guard: the source sheets must never be written to.
// - Only SourceSheets.js may mention the source sheet IDs (besides Config.js).
// - SourceSheets.js may not call any write method.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src');
const files = fs.readdirSync(src).filter((f) => f.endsWith('.js'));
const errors = [];

const WRITE_CALL = /\.(set\w*|append\w*|insert\w*|delete\w*|clear\w*|copyTo|moveTo|sort|merge\w*|protect|hide\w*|show\w*|add\w*|remove\w*|create\w*|flush)\s*\(/;
const sourceFile = fs.readFileSync(path.join(src, 'SourceSheets.js'), 'utf8');
sourceFile.split('\n').forEach((line, i) => {
  const code = line.replace(/\/\/.*$/, '');
  if (WRITE_CALL.test(code)) errors.push(`SourceSheets.js:${i + 1} looks like a write: ${line.trim()}`);
});

for (const f of files) {
  if (f === 'Config.js' || f === 'SourceSheets.js') continue;
  const text = fs.readFileSync(path.join(src, f), 'utf8');
  if (/MENU_SHEET_ID|SIGNUP_SHEET_ID|1Dw9jGlMDs9iUY|1kuW7OIoI1i7xL77/.test(text)) {
    errors.push(`${f} refers to a source sheet; only SourceSheets.js may do that`);
  }
}

if (errors.length) {
  console.error('Read-only check failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('Read-only check passed: source sheets are only read in SourceSheets.js.');
