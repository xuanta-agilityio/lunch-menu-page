// Runs the real src/*.js in a vm context with in-memory fakes for the Google
// services, as test/votes.test.js does. Tests call the real getWeek, vote and doGet.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('../../src/Logic.js');
const { menuNovember, signupNovember, IMAGE_FILES } = require('./fixtures.js');

const ADMIN = 'xuan.tathanh@asnet.com.vn';
const USER = 'normal.user@asnet.com.vn';
const USER_B = 'second.user@asnet.com.vn';

const SOURCE_FILES = ['Config.js', 'Logic.js', 'SourceSheets.js', 'Votes.js', 'Images.js', 'Api.js'];
const MENU_ID = '1Dw9jGlMDs9iUY_zrgVEfpfaGV8L17B5M1ix1HooRh2g';
const SIGNUP_ID = '1kuW7OIoI1i7xL77jOdcXqijWGkx4ELkI4HEPVjD6T-Q';
const VOTES_ID = 'fake-votes-sheet';

const plain = (o) => JSON.parse(JSON.stringify(o));
const looksLikeDateKey = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

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

/** The votes sheet. Like Google Sheets, appendRow turns the text "2026-11-02" into a date. */
function votesSheet(asDate) {
  const cells = [['date', 'email', 'vote', 'isTest', 'updatedAt']];
  const display = (v) => {
    if (v && typeof v.getTime === 'function') return L.dateKeyOf(v.getTime());
    if (v === true) return 'TRUE';
    if (v === false) return 'FALSE';
    return String(v ?? '');
  };
  const range = (row, col, rows, cols) => {
    const read = () => Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => (cells[row - 1 + i] || [])[col - 1 + j] ?? ''));
    return {
      getValues: read,
      getDisplayValues: () => read().map((r) => r.map(display)),
      setValues(values) {
        values.forEach((r, i) => r.forEach((v, j) => { (cells[row - 1 + i] ||= [])[col - 1 + j] = v; }));
        return this;
      },
      setNumberFormat() { return this; }
    };
  };
  return {
    cells,
    getLastRow: () => cells.length,
    getRange: (row, col, rows = 1, cols = 1) => range(row, col, rows, cols),
    appendRow: (values) => { cells.push(values.map((v) => (looksLikeDateKey(v) ? asDate(v) : v))); },
    getParent: () => ({ getSpreadsheetTimeZone: () => 'Asia/Ho_Chi_Minh' })
  };
}

/** Thumbnails hold their file name, so a test can tell which image reached the page. */
function fakeDrive(state) {
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
        state.imageFetches++;
        const id = /googleusercontent\.com\/(.+)=s256$/.exec(url)[1];
        return { getResponseCode: () => 200, getBlob: () => blob(files.find((f) => f.id === id).name) };
      }
    }
  };
}

/**
 * The app with fake Google services. Pass `menu` / `signup` as { tabName: rows };
 * by default only the November tabs exist, as in the real sheets.
 */
function createApp({ menu = { '11/2026': menuNovember() }, signup = { '2026-11': signupNovember() } } = {}) {
  const state = { email: ADMIN, now: 0, opened: [], imageFetches: 0, template: null };
  const cacheStore = {};

  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Session: { getActiveUser: () => ({ getEmail: () => state.email }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => VOTES_ID, setProperty() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
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
      createTemplateFromFile: () => {
        state.template = {
          evaluate: () => ({ setTitle() { return this; }, addMetaTag() { return this; } })
        };
        return state.template;
      }
    },
    ...fakeDrive(state)
  };
  vm.createContext(ctx);
  ctx.currentTime = () => state.now;
  vm.runInContext('Date.now = function () { return currentTime(); };', ctx);
  const VmDate = vm.runInContext('Date', ctx);
  const votes = votesSheet((key) => new VmDate(L.vnInstant(key, 0)));

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
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'src', file), 'utf8'), ctx, { filename: file });
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
    /** Runs doGet and returns the JSON text embedded in the page, plus its parsed data. */
    doGet: (parameter = {}) => {
      ctx.doGet({ parameter });
      return { raw: state.template.initialJson, data: JSON.parse(state.template.initialJson) };
    },
    /** One day's card from the week shown now. */
    day: (date) => app.getWeek().days.find((d) => d.date === date),
    /** Data rows in the votes sheet. */
    voteRows: () => votes.cells.slice(1),
    /** Forgets which sheets were opened so far. */
    clearOpened: () => { state.opened.length = 0; },
    openedSignupSheet: () => state.opened.includes(SIGNUP_ID)
  };
  return app;
}

/** Decodes a card's image to the Drive file name it came from. */
const imageFileName = (card) => Buffer.from(card.image.url.split(',')[1], 'base64').toString();

module.exports = { createApp, imageFileName, ADMIN, USER, USER_B };
