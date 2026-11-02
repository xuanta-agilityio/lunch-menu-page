// QA-MATRIX.md Group 5 (voting). The day is Mon 2 Nov unless a case says otherwise.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, USER } = require('./helpers/app.js');
const { renderPage } = require('./helpers/page.js');

const MON = '2026-11-02';
const WED = '2026-11-04';
const FRI = '2026-11-06';

const NOT_OPEN = /not open/i;
const votesOn = (app, date) => app.day(date).votes;

/** Normal user, voting window open. */
const openApp = () => createApp().as(USER, '2026-11-02T11:00');

test('V01 (server): Mon 2 Nov 10:59 refuses a vote for 2 Nov', () => {
  const app = createApp().as(USER, '2026-11-02T10:59');
  assert.throws(() => app.vote(MON, 'like'), NOT_OPEN);
  assert.deepEqual(votesOn(app, MON), { like: 0, dislike: 0, mine: '' });
  assert.equal(app.voteRows().length, 0);
});

test('V01 (page): Mon 2 Nov 10:59 has the 2 Nov vote icons disabled', () => {
  const app = createApp().as(USER, '2026-11-02T10:59');
  const page = renderPage(app.getWeek());
  assert.equal(page.likeButton('November 2nd').disabled, true);
  assert.equal(page.dislikeButton('November 2nd').disabled, true);
  page.likeButton('November 2nd').click();
  assert.equal(page.queue.length, 0);
});

test('V02: Mon 2 Nov 11:00 like works, like +1', () => {
  const app = openApp();
  assert.deepEqual(app.vote(MON, 'like'), { like: 1, dislike: 0, mine: 'like' });
  assert.deepEqual(votesOn(app, MON), { like: 1, dislike: 0, mine: 'like' });
  assert.equal(app.voteRows()[0][0], MON, 'the date is stored as text, not converted to a date');
});

test('V03 (date-typed row): a row stored as a date cell is found, counted and toggled off in place', () => {
  const app = createApp({ votes: [[MON, USER, 'like', false]] }).as(USER, '2026-11-02T11:00');
  assert.deepEqual(votesOn(app, MON), { like: 1, dislike: 0, mine: 'like' });
  assert.deepEqual(app.vote(MON, 'like'), { like: 0, dislike: 0, mine: '' });
  assert.deepEqual(votesOn(app, MON), { like: 0, dislike: 0, mine: '' });
  assert.equal(app.voteRows().length, 1);
});

test('V03: clicking like again removes the vote, like -1, no active vote', () => {
  const app = openApp();
  app.vote(MON, 'like');
  assert.deepEqual(app.vote(MON, 'like'), { like: 0, dislike: 0, mine: '' });
  assert.deepEqual(votesOn(app, MON), { like: 0, dislike: 0, mine: '' });
});

test('V04: voting again after removing, like +1, still one row for that user and day', () => {
  const app = openApp();
  app.vote(MON, 'like');
  app.vote(MON, 'like');
  assert.deepEqual(app.vote(MON, 'like'), { like: 1, dislike: 0, mine: 'like' });
  assert.deepEqual(votesOn(app, MON), { like: 1, dislike: 0, mine: 'like' });
  assert.equal(app.voteRows().length, 1);
});

test('V05: dislike while liked, like -1, dislike +1', () => {
  const app = openApp();
  app.vote(MON, 'like');
  assert.deepEqual(app.vote(MON, 'dislike'), { like: 0, dislike: 1, mine: 'dislike' });
  assert.deepEqual(votesOn(app, MON), { like: 0, dislike: 1, mine: 'dislike' });
});

test('V06: like while disliked, dislike -1, like +1', () => {
  const app = openApp();
  app.vote(MON, 'dislike');
  assert.deepEqual(app.vote(MON, 'like'), { like: 1, dislike: 0, mine: 'like' });
  assert.deepEqual(votesOn(app, MON), { like: 1, dislike: 0, mine: 'like' });
});

test('V07: Tue 3 Nov 10:59 a vote for 2 Nov still works', () => {
  const app = createApp().as(USER, '2026-11-03T10:59');
  assert.deepEqual(app.vote(MON, 'like'), { like: 1, dislike: 0, mine: 'like' });
  assert.deepEqual(votesOn(app, MON), { like: 1, dislike: 0, mine: 'like' }, 'the vote was saved');
});

test('V08 (server): Tue 3 Nov 11:00 refuses a vote for 2 Nov, counts unchanged', () => {
  const app = openApp();
  app.vote(MON, 'like');
  app.at('2026-11-03T11:00');
  assert.throws(() => app.vote(MON, 'dislike'), NOT_OPEN);
  assert.throws(() => app.vote(MON, 'like'), NOT_OPEN);
  assert.deepEqual(votesOn(app, MON), { like: 1, dislike: 0, mine: 'like' });
});

test('V08 (page): Tue 3 Nov 11:00 has the 2 Nov icons disabled and the count unchanged', () => {
  const app = openApp();
  app.vote(MON, 'like');
  app.at('2026-11-03T11:00');
  const page = renderPage(app.getWeek());
  assert.equal(page.likeButton('November 2nd').disabled, true);
  assert.equal(page.dislikeButton('November 2nd').disabled, true);
  assert.deepEqual(page.voteCounts('November 2nd'), { like: 1, dislike: 0 });
});

test('V09 (server): Mon 2 Nov 12:00 refuses a vote for 4 Nov', () => {
  const app = createApp().as(USER, '2026-11-02T12:00');
  assert.throws(() => app.vote(WED, 'like'), NOT_OPEN);
  assert.equal(app.voteRows().length, 0);
});

test('V09 (page): Mon 2 Nov 12:00 has the 4 Nov icons disabled', () => {
  const page = renderPage(createApp().as(USER, '2026-11-02T12:00').getWeek());
  assert.equal(page.likeButton('November 4th').disabled, true);
  assert.equal(page.dislikeButton('November 4th').disabled, true);
  assert.equal(page.likeButton('November 2nd').disabled, false, 'the open day stays votable');
});

test('V10: Fri 6 Nov is votable on Sat 7 Nov 10:59; at 11:00 the next week shows and the vote is refused', () => {
  const app = createApp().as(USER, '2026-11-07T10:59');
  assert.ok(app.day(FRI), 'Friday is on the page at 10:59');
  assert.deepEqual(app.vote(FRI, 'like'), { like: 1, dislike: 0, mine: 'like' });

  app.at('2026-11-07T11:00');
  assert.equal(app.day(FRI), undefined, 'Friday is off the page at 11:00');
  assert.equal(app.getWeek().monday, '2026-11-09');
  assert.throws(() => app.vote(FRI, 'dislike'), NOT_OPEN);
  assert.equal(app.voteRows().length, 1);
  assert.equal(app.voteRows()[0][2], 'like', 'the saved vote is unchanged');
});

test('V13 (server): two vote calls in a row count once, then toggle off, never +2', () => {
  const app = openApp();
  const first = app.vote(MON, 'like');
  const second = app.vote(MON, 'like');
  assert.equal(first.like, 1);
  assert.equal(second.like, 0);
  assert.equal(votesOn(app, MON).like, 0);
  assert.equal(app.voteRows().length, 1);
});

test('V13 (server): each vote reads and writes the sheet only while holding the lock', () => {
  const app = openApp();
  for (const clicked of ['like', 'like', 'dislike']) {
    app.clearVoteLog();
    app.vote(MON, clicked);
    const log = app.voteLog();
    assert.equal(log[0], 'lock', 'the lock is taken before the sheet is touched');
    assert.equal(log[log.length - 1], 'unlock', 'the lock is released last');
    const inside = log.slice(1, -1);
    assert.ok(!inside.includes('lock') && !inside.includes('unlock'), 'one continuous lock');
    assert.ok(inside.includes('read') && inside.includes('write'));
    assert.ok(inside.indexOf('read') < inside.indexOf('write'), 'the existing vote is read before writing');
  }
});

test('V13 (page): a double click before the server responds sends one vote and counts +1', () => {
  const app = openApp();
  const page = renderPage(app.getWeek());
  const firstButton = page.likeButton('November 2nd');
  firstButton.click();
  firstButton.click();
  page.likeButton('November 2nd').click();
  assert.equal(page.queue.length, 1, 'only one vote call is sent');
  assert.equal(page.likeButton('November 2nd').disabled, true, 'icons are disabled while it is saving');

  page.deliver(app);
  assert.deepEqual(page.voteCounts('November 2nd'), { like: 1, dislike: 0 });
  assert.equal(votesOn(app, MON).like, 1);
  assert.equal(page.likeButton('November 2nd').disabled, false, 'icons work again afterwards');
});
