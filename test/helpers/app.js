// Runs the real src/*.js in a vm context with in-memory fakes for the Google
// services, as test/votes.test.js does. Tests call the real getWeek, vote and doGet.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('../../src/Logic.js');
const { menuNovember, signupNovember, IMAGE_FILES } = require('./fixtures.js');
const { fakeVotesSheet } = require('./votes-sheet.js');

const ADMIN = 'xuan.tathanh@asnet.com.vn';
const USER = 'normal.user@asnet.com.vn';
const USER_B = 'second.user@asnet.com.vn';

const SOURCE_FILES = ['Config.js', 'Logic.js', 'SourceSheets.js', 'Votes.js', 'Images.js', 'Api.js'];
const MENU_ID = '1Dw9jGlMDs9iUY_zrgVEfpfaGV8L17B5M1ix1HooRh2g';
const SIGNUP_ID = '1kuW7OIoI1i7xL77jOdcXqijWGkx4ELkI4HEPVjD6T-Q';
const VOTES_ID = 'fake-votes-sheet';

const VOTE_HEADER = ['date', 'email', 'vote', 'isTest', 'updatedAt'];
const SRC_DIR = path.join(__dirname, '..', '..', 'src');

const EMBEDDED_DATA = /var INITIAL = (.*?);<\/script>/s;

const plain = (o) => JSON.parse(JSON.stringify(o));
const readSourceHtml = (name) => fs.readFileSync(path.join(SRC_DIR, name + '.html'), 'utf8');

/** A source sheet tab: reading works, and any other call fails the test. */
function sourceSheet(values) {
  const target = { getDataRange: () => ({ getDisplayValues: () => values.map((r) => r.slice()) }) };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t || typeof prop !== 'string') return t[prop];
      return () => { throw new Error('Write to a source sheet: ' + prop); };
    }
  });
}

/** Thumbnails hold their file name, so a test can tell which image reached the page. */
function fakeDrive() {
  const files = IMAGE_FILES.map((name, i) => ({ id: 'file-' + i, name }));
  const blob = (name) => ({ getContentType: () => 'image/jpeg', getBytes: () => Array.from(Buffer.from(name)) });
  return {
    DriveApp: {
      getFolderById: () => {
        let i = 0;
        return {
          getFiles: () => ({
            hasNext: () => i < files.length,
            next: () => {
              const f = files[i++];
              return { getId: () => f.id, getName: () => f.name, getMimeType: () => 'image/jpeg', getLastUpdated: () => new Date(1000) };
            }
          })
        };
      }
    },
    Drive: { Files: { get: (id) => ({ thumbnailLink: 'https://lh3.googleusercontent.com/' + id + '=s220' }) } },
    UrlFetchApp: {
      fetch: (url) => {
        const id = /googleusercontent\.com\/(.+)=s256$/.exec(url)[1];
        return { getResponseCode: () => 200, getBlob: () => blob(files.find((f) => f.id === id).name) };
      }
    }
  };
}

/**
 * The app with fake Google services. Pass `menu` / `signup` as { tabName: rows };
 * by default only the November tabs exist, as in the real sheets. `votes` seeds the
 * votes sheet with [dateKey, email, vote, isTest] rows, stored as date cells, as
 * Sheets stored the rows written before the #13/#14 fix.
 */
function createApp({ menu = { '11/2026': menuNovember() }, signup = { '2026-11': signupNovember() }, votes: seedVotes = [] } = {}) {
  const state = { email: ADMIN, now: 0, opened: [], template: null, html: null, voteLog: [] };
  const cacheStore = {};

  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Session: { getActiveUser: () => ({ getEmail: () => state.email }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => VOTES_ID, setProperty() {} }) },
    LockService: {
      getScriptLock: () => ({
        waitLock() { state.voteLog.push('lock'); },
        releaseLock() { state.voteLog.push('unlock'); }
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cacheStore[k] ?? null,
        getAll: (keys) => Object.fromEntries(keys.filter((k) => k in cacheStore).map((k) => [k, cacheStore[k]])),
        put: (k, v) => { cacheStore[k] = v; }
      })
    },
    ScriptApp: { getOAuthToken: () => 'owner-token' },
    Utilities: {
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      formatDate: (d) => L.dateKeyOf(d.getTime())
    },
    HtmlService: {
      createHtmlOutputFromFile: (name) => ({ getContent: () => readSourceHtml(name) }),
      // Renders the real template: <?!= expression ?> is evaluated with the template's variables.
      createTemplateFromFile: (name) => {
        const template = {
          evaluate: () => {
            state.html = readSourceHtml(name).replace(/<\?!?=\s*(.+?)\s*\?>/g, (_, expr) =>
              String(vm.runInContext(`(function (t) { with (t) { return (${expr}); } })`, ctx)(template)));
            return { setTitle() { return this; }, addMetaTag() { return this; } };
          }
        };
        state.template = template;
        return template;
      }
    },
    ...fakeDrive()
  };
  vm.createContext(ctx);
  ctx.currentTime = () => state.now;
  vm.runInContext('Date.now = function () { return currentTime(); };', ctx);
  const VmDate = vm.runInContext('Date', ctx);
  const asDate = (key) => new VmDate(L.vnInstant(key, 0));
  const seededRows = seedVotes.map(([date, email, vote, isTest]) => [asDate(date), email, vote, isTest, new VmDate(1000)]);
  const votes = fakeVotesSheet([VOTE_HEADER, ...seededRows], { asDate, onAccess: (kind) => state.voteLog.push(kind) });

  ctx.SpreadsheetApp = {
    openById: (id) => {
      state.opened.push(id);
      if (id === VOTES_ID) return { getSheets: () => [votes] };
      const tabs = id === MENU_ID ? menu : id === SIGNUP_ID ? signup : null;
      if (!tabs) throw new Error('Unknown spreadsheet: ' + id);
      return { getSheetByName: (name) => (tabs[name] ? sourceSheet(tabs[name]) : null) };
    }
  };

  for (const file of SOURCE_FILES) {
    vm.runInContext(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'), ctx, { filename: file });
  }

  const app = {
    /** Signs in as this email at this Vietnam time, e.g. '2026-11-02T09:00'. */
    as(email, time) {
      state.email = email;
      if (time) app.at(time);
      return app;
    },
    at(time) {
      const ms = L.parseVnLocal(time);
      if (ms == null) throw new Error('Bad test time: ' + time);
      state.now = ms;
      return app;
    },
    getWeek: (nowParam) => plain(ctx.getWeek(nowParam)),
    vote: (date, clicked, nowParam) => plain(ctx.vote(date, clicked, nowParam)),
    /** Runs doGet and returns the rendered page, plus the data embedded in it. */
    doGet: (parameter = {}) => {
      ctx.doGet({ parameter });
      const embedded = EMBEDDED_DATA.exec(state.html);
      if (!embedded) throw new Error('No embedded data in the page');
      return {
        html: state.html,
        htmlWithoutData: state.html.replace(EMBEDDED_DATA, 'var INITIAL = null;'),
        data: JSON.parse(embedded[1])
      };
    },
    /** One day's card from the week shown now. */
    day: (date) => app.getWeek().days.find((d) => d.date === date),
    /** Data rows in the votes sheet. */
    voteRows: () => votes.cells.slice(1),
    /** Lock and votes-sheet events ('lock', 'read', 'write', 'unlock') in order. */
    voteLog: () => state.voteLog.slice(),
    clearVoteLog: () => { state.voteLog.length = 0; },
    openedSignupSheet: () => state.opened.includes(SIGNUP_ID)
  };
  return app;
}

/** Decodes a card's image to the Drive file name it came from. */
const imageFileName = (card) => Buffer.from(card.image.url.split(',')[1], 'base64').toString();

module.exports = { createApp, imageFileName, ADMIN, USER, USER_B };
