// QA-MATRIX.md Group 4: the public view, sign-in and avatar (AC15, AC17, AC20).
// The view must depend on the deployment, not on who the visitor is, so most
// checks run for a signed-out visitor, a company user and the admin on the public URL.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const L = require('../src/Logic.js');
const { createApp, ADMIN, USER } = require('./helpers/app.js');
const { renderPage } = require('./helpers/page.js');
const { assertNoCounts, assertHasCounts } = require('./helpers/no-counts.js');

const OPEN = '2026-11-02T11:00';
const MON = '2026-11-02';
const SIGNED_OUT = '';
const OUTSIDE = 'someone@gmail.com';
const NI_NGO = 'ni.ngo@asnet.com.vn';

// Everyone who could reach the public URL. Google decides which email the script can see,
// so an admin's email must not change anything there.
const PUBLIC_VISITORS = [['signed out', SIGNED_OUT], ['outside account', OUTSIDE], ['company user', USER], ['admin', ADMIN]];

const publicApp = (email = SIGNED_OUT) => createApp().as(email, OPEN).onPublicDeployment();

test('R01 (server): the public view has the menu and like/dislike counts, and no meal counts', () => {
  const app = createApp().as(USER, OPEN);
  app.vote(MON, 'like');
  const week = app.as(SIGNED_OUT).onPublicDeployment().getWeek();
  assert.equal(week.days[0].dishes[0].name, 'Cá chiên mắm xoài');
  assert.deepEqual(week.days[0].votes, { like: 1, dislike: 0, mine: '' });
  assert.equal(week.canVote, false);
  assertNoCounts(week);
});

test('R01 (page): vote icons disabled during the open window, no counts table, Sign in shown', () => {
  const page = renderPage(publicApp().getWeek());
  assert.equal(page.likeButton('November 2nd').disabled, true);
  assert.equal(page.dislikeButton('November 2nd').disabled, true);
  assert.deepEqual(page.countsTable(), []);
  assert.equal(page.account().signIn.textContent, 'Sign in');
  assert.equal(page.account().avatar, null);
});

/** The declarations of one CSS rule in src/Styles.html, as { property: value }. */
function cssRule(selector) {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'Styles.html'), 'utf8');
  const start = css.search(new RegExp('^\\s*' + selector.replace('.', '\\.') + ' \\{', 'm'));
  assert.ok(start >= 0, 'no CSS rule for ' + selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries(body.split(';').map((d) => d.split(':').map((s) => s.trim())).filter((d) => d[0]));
}

// The fake DOM has no layout, so these check the rules that place the account area.
// The real position was checked in a browser and QA checks it by hand (R01, R09).
for (const id of ['R01', 'R09']) {
  test(`${id} (page): the Sign in button and avatar are placed at the top right of the header`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'Index.html'), 'utf8');
    const header = html.slice(html.indexOf('class="banner"'), html.indexOf('</header>'));
    assert.ok(header.includes('id="account"'), 'the account area is in the header');
    const account = cssRule('.account');
    assert.equal(account.position, 'absolute');
    assert.ok('top' in account && 'right' in account, 'anchored to the top right');
    assert.equal('left' in account, false);
    assert.equal(cssRule('.banner').position, 'relative', 'anchored to the header, not the window');
  });
}

test('R10 (page): the avatar menu opens under the avatar, inside the right edge', () => {
  const menu = cssRule('.account-menu');
  assert.equal(menu.right, '0');
  assert.equal('left' in menu, false);
});

test('R02 (page): Sign in opens the company view at the top of the window', () => {
  const app = publicApp();
  const signIn = renderPage(app.getWeek()).account().signIn;
  assert.equal(signIn.href, `https://script.google.com/a/macros/asnet.com.vn/s/${app.companyDeploymentId()}/exec`);
  assert.equal(signIn.target, '_top');
});

test('R02 (server): after signing in the page has the view for the role, and voting works', () => {
  const app = createApp().as(USER, OPEN);
  assert.equal(app.getWeek().canVote, true);
  assert.deepEqual(app.vote(MON, 'like'), { like: 1, dislike: 0, mine: 'like' });
  assertNoCounts(app.getWeek());
  app.as(ADMIN);
  assert.equal(app.getWeek().isAdmin, true);
  assertHasCounts(app.getWeek());
  assert.deepEqual(app.vote(MON, 'dislike'), { like: 1, dislike: 1, mine: 'dislike' });
});

test('R03 (manifest): the company deployment stays limited to the domain, run as the owner', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'appsscript.json'), 'utf8'));
  assert.deepEqual(manifest.webapp, { executeAs: 'USER_DEPLOYING', access: 'DOMAIN' });
});

test('R03 (server): an outside account gets no data from the company view, if Google ever let it through', () => {
  const app = createApp().as(OUTSIDE, OPEN);
  assert.throws(() => app.getWeek(), /sign in/i);
  assert.throws(() => app.vote(MON, 'like'), /sign in/i);
  const { data } = app.doGet();
  assert.deepEqual(Object.keys(data), ['error']);
  assert.equal(app.voteRows().length, 0);
});

test('R03 (server): an outside account can still use the public view, without voting', () => {
  const app = publicApp(OUTSIDE);
  const week = app.getWeek();
  assert.equal(week.days.length, 5);
  assert.equal(week.canVote, false);
  assert.throws(() => app.vote(MON, 'like'), /sign in/i);
  assert.equal(app.voteRows().length, 0);
});

for (const [who, email] of PUBLIC_VISITORS) {
  test(`R06 (public, ${who}): getWeek and the page source send no meal counts or total`, () => {
    const app = publicApp(email);
    assertNoCounts(app.getWeek());
    const { data } = app.doGet();
    assert.equal(data.error, undefined);
    assertNoCounts(data);
    assert.equal(app.openedSignupSheet(), false, 'the sign-up sheet is not even opened');
  });

  test(`R08 (${who}): a vote on the public view is refused and nothing is saved`, () => {
    const app = publicApp(email);
    assert.throws(() => app.vote(MON, 'like'), /sign in/i);
    assert.throws(() => app.vote(MON, 'dislike'), /sign in/i);
    assert.equal(app.voteRows().length, 0);
  });
}

test('R06 (public): ?now= is ignored for everyone, including the admin', () => {
  const app = publicApp(ADMIN);
  for (const week of [app.getWeek('2026-11-16T12:00'), app.doGet({ now: '2026-11-16T12:00' }).data]) {
    assert.equal(week.testMode, false);
    assert.equal(week.monday, MON);
    assertNoCounts(week);
  }
});

test('R08 (page): clicking a vote icon on the public view sends nothing', () => {
  const page = renderPage(publicApp().getWeek());
  page.likeButton('November 2nd').click();
  page.dislikeButton('November 2nd').click();
  assert.equal(page.queue.length, 0);
});

const UNKNOWN_DEPLOYMENTS = [
  ['another deployment', () => 'https://script.google.com/macros/s/SOME_OTHER_ID/exec'],
  ['a URL that only contains the company ID', (id) => `https://script.google.com/macros/s/${id}x/exec`],
  ['a query string with the company ID', (id) => `https://script.google.com/macros/s/OTHER/exec?x=/s/${id}/exec`],
  ['another site', (id) => `https://example.com/macros/s/${id}/exec`],
  ['no URL', () => null],
  ['an error reading the URL', () => { throw new Error('no service'); }]
];

for (const [label, url] of UNKNOWN_DEPLOYMENTS) {
  test(`R08 (fail closed): ${label} gets the public view, even for the admin`, () => {
    const app = createApp().as(ADMIN, OPEN);
    const id = app.companyDeploymentId();
    app.withServiceUrl(() => url(id));
    assertNoCounts(app.getWeek());
    assert.equal(app.getWeek().canVote, false);
    assert.throws(() => app.vote(MON, 'like'), /sign in/i);
    assert.equal(app.voteRows().length, 0);
  });
}

test('R08 (deployment URLs): all three URL forms of a company deployment are recognised', () => {
  const ids = ['COMPANY'];
  for (const url of [
    'https://script.google.com/macros/s/COMPANY/exec',
    'https://script.google.com/a/asnet.com.vn/macros/s/COMPANY/exec',
    'https://script.google.com/a/macros/asnet.com.vn/s/COMPANY/exec',
    'https://script.google.com/macros/s/COMPANY/dev'
  ]) assert.equal(L.isDeploymentUrl(url, ids), true, url);
});

test('R07 (page): the admin\'s avatar menu has Sign out, which signs out of Google', () => {
  const page = renderPage(createApp().as(ADMIN, OPEN).getWeek());
  page.account().avatar.click();
  const signOut = page.account().menu.children[0];
  assert.equal(signOut.textContent, 'Sign out');
  assert.match(signOut.href, /^https:\/\/accounts\.google\.com\/Logout/);
  assert.equal(signOut.target, '_top');
});

test('R07 (server): the sign-out link returns to the public page when one is configured', () => {
  assert.equal(L.signOutUrl('https://script.google.com/macros/s/PUBLIC/exec'),
    'https://accounts.google.com/Logout?continue=https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2FPUBLIC%2Fexec');
  assert.equal(L.signOutUrl(''), 'https://accounts.google.com/Logout');
  const app = createApp().as(ADMIN, OPEN);
  const id = app.publicDeploymentId();
  const expected = L.signOutUrl(id ? `https://script.google.com/macros/s/${id}/exec` : '');
  assert.equal(app.getWeek().signOutUrl, expected);
});

test('R07 (page): reopening the public page after signing out shows Sign in', () => {
  const page = renderPage(publicApp().getWeek());
  assert.equal(page.account().signIn.textContent, 'Sign in');
  assert.equal(page.account().avatar, null);
  assert.equal(page.account().menu, null);
});

test('R09 (page): the admin sees avatar "XT" instead of Sign in', () => {
  const page = renderPage(createApp().as(ADMIN, OPEN).getWeek());
  assert.equal(page.account().avatar.textContent, 'XT');
  assert.equal(page.account().signIn, null);
  assert.equal(page.account().menu, null, 'the menu stays closed until the avatar is clicked');
});

for (const [who, email, nameParts] of [['admin', ADMIN, /xuan|tathanh/i], ['normal user', NI_NGO, /ni\.ngo|ngo@/i]]) {
  test(`R09 (server): no name or email is sent to the page, for the ${who}`, () => {
    const app = createApp().as(email, OPEN);
    app.vote(MON, 'like');
    const sent = JSON.stringify(app.getWeek()) + JSON.stringify(app.doGet().data);
    assert.doesNotMatch(sent, nameParts);
    assert.doesNotMatch(sent, /@asnet/);
  });
}

test('R09 (page): no name is shown on the page', () => {
  const page = renderPage(createApp().as(ADMIN, OPEN).getWeek());
  const shown = page.account().box.textContent + page.elements.week.textContent;
  assert.doesNotMatch(shown, /xuan|tathanh/i);
});

test('R10 (page): ni.ngo sees avatar "NN"; clicking it opens the menu with Sign out', () => {
  const page = renderPage(createApp().as(NI_NGO, OPEN).getWeek());
  assert.equal(page.account().avatar.textContent, 'NN');
  assert.equal(page.account().avatar.getAttribute('aria-expanded'), 'false');
  page.account().avatar.click();
  assert.equal(page.account().menu.children[0].textContent, 'Sign out');
  assert.equal(page.account().avatar.getAttribute('aria-expanded'), 'true');
  page.account().avatar.click();
  assert.equal(page.account().menu, null, 'a second click closes it');
});

test('R10 (server): initials are the first letters of the "."-separated parts of the email name', () => {
  assert.equal(L.emailInitials('xuan.tathanh@asnet.com.vn'), 'XT');
  assert.equal(L.emailInitials('ni.ngo@asnet.com.vn'), 'NN');
  assert.equal(L.emailInitials('ngo@asnet.com.vn'), 'N');
  assert.equal(L.emailInitials('a.b.c@asnet.com.vn'), 'ABC');
  assert.equal(L.emailInitials('a..b@asnet.com.vn'), 'AB');
});
