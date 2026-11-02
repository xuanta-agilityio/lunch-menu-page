/**
 * Main-dish images (AC13), read from the private Drive folder and sent to the
 * page as data URIs. Nothing is shared or made public. This file must only
 * read Drive: `npm test` fails if a write method appears here.
 *
 * Drive's thumbnail is enough for the 128 px image slot and much smaller than
 * the original. Results are cached, so most page loads don't touch Drive.
 */

var IMAGE_INDEX_CACHE_KEY = 'dishImageIndex';
var IMAGE_INDEX_TTL_SECONDS = 10 * 60;
var IMAGE_TTL_SECONDS = 6 * 60 * 60; // CacheService maximum
var MAX_IMAGE_BYTES = 120 * 1024;    // Larger originals keep the placeholder

function dishImageIndex_(cache) {
  var cached = cache.get(IMAGE_INDEX_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  var files = [];
  var it = DriveApp.getFolderById(CONFIG.DISH_IMAGES_FOLDER_ID).getFiles();
  while (it.hasNext()) {
    var f = it.next();
    files.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), updated: f.getLastUpdated().getTime() });
  }
  var index = buildImageIndex(files);
  cachePut_(cache, IMAGE_INDEX_CACHE_KEY, JSON.stringify(index), IMAGE_INDEX_TTL_SECONDS);
  return index;
}

/** Data URI of a file's thumbnail, or of the original if it is small enough; else null. */
function imageDataUri_(fileId) {
  var file = DriveApp.getFileById(fileId);
  var blob = null;
  try {
    blob = file.getThumbnail();
  } catch (err) {
    console.warn('No thumbnail for ' + fileId + ': ' + err);
  }
  if (!blob || !blob.getBytes().length) blob = file.getBlob();
  var bytes = blob.getBytes();
  if (bytes.length > MAX_IMAGE_BYTES) return null;
  return 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(bytes);
}

function cachePut_(cache, key, value, ttl) {
  try {
    cache.put(key, value, ttl);
  } catch (err) {
    console.warn('Not cached: ' + key + ': ' + err); // e.g. over the 100 KB value limit
  }
}

/**
 * { dish name: data URI } for the dishes that have an image. A problem with
 * Drive is logged and leaves placeholders; it never stops the page from loading.
 */
function dishImageUrls_(names) {
  var urls = {};
  try {
    var cache = CacheService.getScriptCache();
    var index = dishImageIndex_(cache);
    var wanted = names.filter(function (n) { return index[dishImageKey(n)]; });
    var cacheKeyOf = function (n) {
      var entry = index[dishImageKey(n)];
      return 'dishImage:' + entry.id + ':' + entry.updated;
    };
    var cached = cache.getAll(wanted.map(cacheKeyOf));
    wanted.forEach(function (n) {
      var key = cacheKeyOf(n);
      try {
        if (!cached[key]) {
          cached[key] = imageDataUri_(index[dishImageKey(n)].id);
          if (cached[key]) cachePut_(cache, key, cached[key], IMAGE_TTL_SECONDS);
        }
        if (cached[key]) urls[n] = cached[key];
      } catch (err) {
        console.error('Image failed for ' + n + ': ' + err);
      }
    });
  } catch (err) {
    console.error('Dish images unavailable: ' + err);
  }
  return urls;
}
