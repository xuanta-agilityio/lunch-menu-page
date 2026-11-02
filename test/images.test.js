// Runs the real src/Images.js against in-memory fakes of DriveApp and CacheService.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('../src/Logic.js');

// The file names in the real Drive folder (20 files; none for 30/11).
const FILE_NAMES = [
  '02-11_Ca-chien-mam-xoai.jpg', '03-11_Thit-rang-tom.jpg', '04-11_Bun-ca.jpg', '05-11_Muc-xao-thom-ca.jpg',
  '06-11_Com-ga-quay.jpg', '09-11_Suon-kho-dau-khuon.jpg', '10-11_Pho-bo.jpg', '11-11_Ca-kho-thom.jpg',
  '12-11_Thit-xiu-mai-xot-ca.jpg', '13-11_Mi-quang-ca.jpg', '16-11_Dau-khuon-nhoi-thit.jpg', '17-11_Ca-kho-to.jpg',
  '18-11_Bun-gio.jpg', '19-11_Ga-xao-sa-ot.jpg', '20-11_Com-tam.jpg', '23-11_Ca-chien.jpg', '24-11_Mien-luon.jpg',
  '25-11_Thit-heo-quay.jpg', '26-11_Ca-kho-to.jpg', '27-11_Hu-tieu-muc.jpg'
];
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

function load({ thumbnail = (f) => blob('image/png', 2000), original = () => blob('image/jpeg', 70000), driveError } = {}) {
  const calls = { list: 0, file: 0 };
  const store = {};
  const fileFake = (f) => ({
    getId: () => f.id, getName: () => f.name, getMimeType: () => f.mimeType, getLastUpdated: () => new Date(f.updated),
    getThumbnail: () => thumbnail(f), getBlob: () => original(f)
  });
  const files = FILE_NAMES.map(jpeg);
  const ctx = {
    console: { warn() {}, error() {} },
    CONFIG: { DISH_IMAGES_FOLDER_ID: 'folder' },
    Utilities: { base64Encode: (bytes) => Buffer.from(bytes).toString('base64') },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => store[k] ?? null,
        getAll: (keys) => Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]])),
        put: (k, v) => { if (v.length > 100 * 1024) throw new Error('too large'); store[k] = v; }
      })
    },
    DriveApp: {
      getFolderById: () => {
        calls.list++;
        if (driveError) throw new Error(driveError);
        let i = 0;
        return { getFiles: () => ({ hasNext: () => i < files.length, next: () => fileFake(files[i++]) }) };
      },
      getFileById: (id) => { calls.file++; return fileFake(files.find((f) => f.id === id)); }
    }
  };
  vm.createContext(ctx);
  for (const f of ['Logic.js', 'Images.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, calls };
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
  assert.equal(calls.file, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.dishImageUrls_(['Cá kho tộ']))), JSON.parse(JSON.stringify(urls)));
  assert.equal(calls.list, 1);
  assert.equal(calls.file, 1);
});

test('without a thumbnail a small original is used; an oversized one keeps the placeholder', () => {
  const noThumb = () => null;
  assert.match(load({ thumbnail: noThumb }).ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\/jpeg;base64,/);
  const huge = load({ thumbnail: noThumb, original: () => blob('image/jpeg', 500000) });
  assert.equal(huge.ctx.dishImageUrls_(['Phở bò'])['Phở bò'], undefined);
  const throwing = load({ thumbnail: () => { throw new Error('no thumbnail'); } });
  assert.match(throwing.ctx.dishImageUrls_(['Phở bò'])['Phở bò'], /^data:image\/jpeg;base64,/);
});

test('a Drive problem leaves placeholders and does not stop the page', () => {
  const { ctx } = load({ driveError: 'Exception: no access' });
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.dishImageUrls_(['Phở bò']))), {});
});
