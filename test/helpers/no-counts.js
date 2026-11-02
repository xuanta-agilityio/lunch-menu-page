// Checks whether a response, as the browser would receive it, contains meal counts.
const assert = require('node:assert/strict');

const COUNT_FIELDS = ['counts', 'total', 'locations', 'nt604', 'tl18', 'home'];
const COUNT_VALUES = [90, 89, 108, 15, 213];
// Times are large numbers that could contain the same digits, but are not counts.
const NOT_COUNTS = new Set(['nowMs', 'nextRefreshMs']);

/** Every key and every number anywhere in a response. */
function scan(value, found = { keys: new Set(), numbers: new Set() }, key = '') {
  if (typeof value === 'number' && !NOT_COUNTS.has(key)) found.numbers.add(value);
  // A count sent as text, such as "90", is still a count.
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) found.numbers.add(Number(value));
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (!Array.isArray(value)) found.keys.add(k);
      scan(v, found, k);
    }
  }
  return found;
}

function assertNoCounts(response) {
  const { keys, numbers } = scan(response);
  COUNT_FIELDS.forEach((f) => assert.equal(keys.has(f), false, `field "${f}" was sent`));
  COUNT_VALUES.forEach((v) => assert.equal(numbers.has(v), false, `value ${v} was sent`));
}

function assertHasCounts(response) {
  const { keys, numbers } = scan(response);
  COUNT_FIELDS.forEach((f) => assert.equal(keys.has(f), true, `field "${f}" is missing`));
  [90, 108, 15, 213].forEach((v) => assert.equal(numbers.has(v), true, `value ${v} is missing`));
}

module.exports = { assertNoCounts, assertHasCounts };
