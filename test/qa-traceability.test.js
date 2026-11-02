// Keeps QA-MATRIX.md and the qa-*.test.js test names in step, so a case can't
// lose its test, or a test its case, without CI failing.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// The cases requested for automation. Add an ID here when its case gets a test.
const AUTOMATED_IDS = [
  'W01', 'W02', 'W03', 'W06',
  'H01', 'H02', 'H03', 'H04',
  'V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08', 'V09', 'V10', 'V13',
  'C01', 'C02', 'C05', 'C06', 'C07', 'C10',
  'M03', 'M04', 'M05',
  'R01', 'R02', 'R03', 'R04', 'R06', 'R07', 'R08', 'R09', 'R10'
];

const matrixIds = () => [...fs.readFileSync(path.join(ROOT, 'QA-MATRIX.md'), 'utf8')
  .matchAll(/^\| ([A-Z]\d\d) \|/gm)].map((m) => m[1]);

/** Case IDs from the test names reported by running the other qa-*.test.js files. */
function testedIds() {
  const files = fs.readdirSync(__dirname)
    .filter((f) => f.startsWith('qa-') && f.endsWith('.test.js') && f !== path.basename(__filename))
    .map((f) => path.join('test', f));
  // Without this, node --test tells the child to report in its internal format, not TAP.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const { stdout } = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: ROOT, encoding: 'utf8', env });
  return new Set([...stdout.matchAll(/^(?:not )?ok \d+ - ([A-Z]\d\d)\b/gm)].map((m) => m[1]));
}

test('every automated case ID is in QA-MATRIX.md', () => {
  const inMatrix = new Set(matrixIds());
  assert.ok(inMatrix.size > 0, 'no case IDs found in QA-MATRIX.md');
  assert.deepEqual(AUTOMATED_IDS.filter((id) => !inMatrix.has(id)), []);
});

test('every automated case ID has a test, and every test ID is a listed case', () => {
  const tested = testedIds();
  assert.deepEqual(AUTOMATED_IDS.filter((id) => !tested.has(id)), [], 'cases without a test');
  assert.deepEqual([...tested].filter((id) => !AUTOMATED_IDS.includes(id)), [], 'tests without a listed case');
});
