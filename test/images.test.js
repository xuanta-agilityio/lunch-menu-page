// Runs the real src/Images.js against in-memory fakes of DriveApp and CacheService.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('../src/Logic.js');

const { IMAGE_FILES: FILE_NAMES } = require('./helpers/fixtures.js');

// The main dishes in menu tab 11/2026, spelled as in the sheet (some end with a space).
const MAIN_DISHES = [
  'Cá chiên mắm xoài', 'Thịt rang tôm', 'Bún cá', 'Mực xào thơm cà', 'Cơm gà quay', 'Sườn kho đậu khuôn', 'Phở bò',
  'Cá kho thơm', 'Thịt xíu mại xốt cà', 'Mì quảng cá ', 'Đậu khuôn nhồi thịt ', 'Cá kho tộ', 'Bún giò', 'Gà xào sả ớt',
  'Cơm tấm', 'Cá chiên', 'Miến lươn', 'Thịt heo quay', 'Cá kho tộ', 'Hủ tiếu mực'
];

const jpeg = (name, i = 0) => ({ id: 'id-' + name, name, mimeType: 'image/jpeg', updated: 1000 + i });

test('every November main dish matches a file; names ignore date prefix, accents and case', () => {
  const index = L.buildImageIndex(FILE_NAMES.map(jpeg));
  assert.equal(Object.keys(index).length, 19, '20 files, Cá kho tộ twice');
  MAIN_DISHES.forEach((dish) => assert.ok(index[L.dishImageKey(dish)], 'no image for ' + dish));
  assert.equal(L.imageFileKey('02-11_Ca-chien-mam-xoai.jpg'), 'ca chien mam xoai');
  assert.equal(L.dishImageKey('CÁ CHIÊN mắm  XOÀI '), 'ca chien mam xoai');
  assert.equal(L.dishImageKey('Đậu khuôn'), 'dau khuon');
  assert.equal(L.dishImageKey('Mì quảng cá'.normalize('NFD')), 'mi quang ca');
});

test('similar names stay separate and a repeated dish reuses one file', () => {
  const index = L.buildImageIndex(FILE_NAMES.map(jpeg));
  assert.equal(index[L.dishImageKey('Cá chiên')].id, 'id-23-11_Ca-chien.jpg');
  assert.equal(index[L.dishImageKey('Cá chiên mắm xoài')].id, 'id-02-11_Ca-chien-mam-xoai.jpg');
  assert.equal(index[L.dishImageKey('Cá kho tộ')].id, 'id-17-11_Ca-kho-to.jpg');
  assert.equal(index[L.dishImageKey('Bầu luộc')], undefined);
});

test('files that are not supported images are skipped', () => {
  const index = L.buildImageIndex([{ id: 'a', name: '01-12_Notes.pdf', mimeType: 'application/pdf', updated: 1 }]);
  assert.deepEqual(index, {});
});

test('thumbnail links are resized, and only Google https hosts qualify', () => {
  assert.equal(L.sizedThumbnailUrl('https://lh3.googleusercontent.com/drive-storage/abc=s220', 256),
    'https://lh3.googleusercontent.com/drive-storage/abc=s256');
  assert.equal(L.sizedThumbnailUrl('https://lh3.googleusercontent.com/drive-storage/abc', 256),
    'https://lh3.googleusercontent.com/drive-storage/abc=s256');
  assert.equal(L.sizedThumbnailUrl('https://drive.google.com/thumbnail?id=1=s220', 256), 'https://drive.google.com/thumbnail?id=1=s256');
  assert.equal(L.sizedThumbnailUrl('http://lh3.googleusercontent.com/a=s220', 256), null);
  assert.equal(L.sizedThumbnailUrl('https://googleusercontent.com.evil.example/a=s220', 256), null);
  assert.equal(L.sizedThumbnailUrl('https://evil.example/googleusercontent.com/a', 256), null);
  assert.equal(L.sizedThumbnailUrl(undefined, 256), null);
});

function load({ thumbnail = (f) => blob('image/png', 2000), original = () => blob('image/jpeg', 70000), driveError, link } = {}) {
  const calls = { list: 0, file: 0, meta: 0, fetches: [], requireAllScopes: [] };
  const ttls = {};
  const store = {};
  const fileFake = (f) => ({
    getId: () => f.id, getName: () => f.name, getMimeType: () => f.mimeType, getLastUpdated: () => new Date(f.updated),
    getBlob: () => original(f)
  });
  const state = { driveError, files: FILE_NAMES.map(jpeg) };
  const ctx = {
    console: { warn() {}, error() {}, log() {} },
    CONFIG: { DISH_IMAGES_FOLDER_ID: 'folder' },
    ScriptApp: {
      AuthMode: { FULL: 'FULL' },
      getOAuthToken: () => 'owner-token',
      getAuthorizationInfo: () => ({ getAuthorizedScopes: () => ['scope-a'] }),
      requireAllScopes: (mode) => { calls.requireAllScopes.push(mode); }
    },
    Drive: {
      Files: {
        get: (id) => {
          calls.meta++;
          return { thumbnailLink: link === undefined ? 'https://lh3.googleusercontent.com/drive-storage/' + id + '=s220' : link };
        }
      }
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        calls.fetches.push({ url, opts });
        const id = /drive-storage\/(.+)=s\d+$/.exec(url)[1];
        const b = thumbnail(state.files.find((f) => f.id === id));
        return b
          ? { getResponseCode: () => 200, getBlob: () => b }
          : { getResponseCode: () => 403, getBlob: () => blob('text/html', 500) };
      }
    },
    Utilities: { base64Encode: (bytes) => Buffer.from(bytes).toString('base64') },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => store[k] ?? null,
        getAll: (keys) => Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]])),
        put: (k, v, ttl) => { if (v.length > 100 * 1024) throw new Error('too large'); store[k] = v; ttls[k] = ttl; }
      })
    },
    DriveApp: {
      getFolderById: () => {
        calls.list++;
        if (state.driveError) throw new Error(state.driveError);
        let i = 0;
        return { getFiles: () => ({ hasNext: () => i < state.files.length, next: () => fileFake(state.files[i++]) }) };
      },
      getFileById: (id) => { calls.file++; return fileFake(state.files.find((f) => f.id === id)); }
    }
  };
  vm.createContext(ctx);
  for (const f of ['Logic.js', 'Images.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, calls, state, store, ttls };
}
const blob = (type, size) => ({ getContentType: () => type, getBytes: () => new Array(size).fill(65) });

test('the page gets small thumbnails as data URIs; placeholders stay for dishes without one', () => {
  const { ctx } = load();
  const urls = ctx.dishImageUrls_(['Cá chiên mắm xoài', 'Món mới']);
  assert.match(urls['Cá chiên mắm xoài'], /^data:image\/png;base64,/);
  assert.ok(urls['Cá chiên mắm xoài'].length < 3000);
  assert.equal(urls['Món mới'], undefined);
});

test('a repeated dish uses the same image; later loads come from the cache', () => {
  const { ctx, calls } = load();
  const urls = ctx.dishImageUrls_(['Cá kho tộ']);
  assert.equal(calls.fetches.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.dishImageUrls_(['Cá kho tộ']))), JSON.parse(JSON.stringify(urls)));
  assert.equal(calls.list, 1);
  assert.equal(calls.fetches.length, 1);
});

test('the 256 px thumbnail is requested with the owner token; the original is not read', () => {
  const { ctx, calls } = load();
  ctx.dishImageUrls_(['Phở bò']);
  assert.match(calls.fetches[0].url, /=s256$/);
  assert.equal(calls.fetches[0].opts.headers.Authorization, 'Bearer owner-token');
  assert.equal(calls.file, 0);
});

test('a thumbnail link on another host is never fetched, so the token is not sent there', () => {
  const { ctx, calls } = load({ link: 'https://evil.example/thumb=s220' });
  assert.match(ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\/jpeg;base64,/);
  assert.equal(calls.fetches.length, 0);
});

test('without a thumbnail link the small original is used', () => {
  const { ctx, calls } = load({ link: null });
  assert.match(ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\/jpeg;base64,/);
  assert.equal(calls.file, 1);
});

test('a non-image thumbnail response is not sent to the page', () => {
  const { ctx } = load({ thumbnail: () => blob('text/html', 500) });
  assert.match(ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\/jpeg;base64,/);
});

test('a missing UrlFetch permission: the original is cached briefly, so the thumbnail is retried soon', () => {
  const noPermission = () => { throw new Error('You do not have permission to call UrlFetchApp.fetch'); };
  const failing = load({ thumbnail: noPermission });
  assert.match(failing.ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\/jpeg;base64,/);
  const key = Object.keys(failing.ttls).find((k) => k.startsWith('dishImage:'));
  assert.equal(failing.ttls[key], 10 * 60, 'original kept for 10 minutes');

  const working = load();
  working.ctx.dishImageUrls_(['Phở bò']);
  const thumbKey = Object.keys(working.ttls).find((k) => k.startsWith('dishImage:'));
  assert.equal(working.ttls[thumbKey], 6 * 60 * 60, 'thumbnail kept for 6 hours');
});

test('checkDishImages asks for missing permissions before reading Drive', () => {
  const { ctx, calls } = load();
  ctx.currentEmail_ = () => 'admin@x';
  ctx.isAdmin_ = () => true;
  ctx.ScriptApp.requireAllScopes = () => { throw new Error('Authorization required'); };
  assert.throws(() => ctx.checkDishImages(), /Authorization required/);
  assert.equal(calls.list, 0);
});

test('the page itself never prompts for permissions', () => {
  const { ctx, calls } = load();
  ctx.dishImageUrls_(['Phở bò']);
  assert.deepEqual(calls.requireAllScopes, []);
});

test('checkDishImages reads every thumbnail and refuses non-admins', () => {
  const { ctx, calls } = load();
  ctx.currentEmail_ = () => 'admin@x';
  ctx.isAdmin_ = () => true;
  ctx.DriveApp.getFolderById = ((orig) => () => Object.assign(orig(), { getName: () => 'Menu - images' }))(ctx.DriveApp.getFolderById);
  ctx.checkDishImages();
  assert.equal(calls.fetches.length, 19);
  ctx.isAdmin_ = () => false;
  assert.throws(() => ctx.checkDishImages(), /Admin only/);
});

test('without a thumbnail a small original is used; an oversized one keeps the placeholder', () => {
  const noThumb = () => null;
  assert.match(load({ thumbnail: noThumb }).ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\/jpeg;base64,/);
  const huge = load({ thumbnail: noThumb, original: () => blob('image/jpeg', 500000) });
  assert.equal(huge.ctx.dishImageUrls_(['Phở bò'])['Phở bò'], undefined);
  const throwing = load({ thumbnail: () => { throw new Error('no thumbnail'); } });
  assert.match(throwing.ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\/jpeg;base64,/);
});

test('a permission error is not cached: images appear on the next load after approval', () => {
  const { ctx, state, store } = load({ driveError: 'You do not have permission to call DriveApp.getFolderById' });
  assert.equal(ctx.dishImageUrls_(['Phở bò'])['Phở bò'], undefined);
  assert.deepEqual(store, {}, 'nothing cached after a failed read');
  state.driveError = null;
  assert.match(ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\//);
});

test('an empty folder read is not cached: a new file is found on the next load', () => {
  const { ctx, state, store } = load();
  const files = state.files;
  state.files = [];
  assert.equal(ctx.dishImageUrls_(['Phở bò'])['Phở bò'], undefined);
  assert.deepEqual(store, {}, 'nothing cached after an empty read');
  state.files = files;
  assert.match(ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\//);
});

test('an empty file is not cached or sent as an image', () => {
  const empty = () => blob('image/jpeg', 0);
  const { ctx, store } = load({ thumbnail: empty, original: empty });
  assert.equal(ctx.dishImageUrls_(['Phở bò'])['Phở bò'], undefined);
  assert.deepEqual(Object.keys(store).filter((k) => k.startsWith('dishImage:')), []);
});

test('one image failing is not cached and does not affect the others', () => {
  const { ctx, store } = load({
    thumbnail: (f) => { if (f.name.includes('Pho-bo')) throw new Error('x'); return blob('image/png', 2000); },
    original: (f) => { if (f.name.includes('Pho-bo')) throw new Error('read failed'); return blob('image/jpeg', 70000); }
  });
  const urls = ctx.dishImageUrls_(['Phở bò', 'Bún cá']);
  assert.equal(urls['Phở bò'], undefined);
  assert.match(urls['Bún cá'], /^data:image\//);
  assert.equal(Object.keys(store).filter((k) => k.startsWith('dishImage:')).length, 1);
});

test('a Drive problem leaves placeholders and does not stop the page', () => {
  const { ctx } = load({ driveError: 'Exception: no access' });
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.dishImageUrls_(['Phở bò']))), {});
});
