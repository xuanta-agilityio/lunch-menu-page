/**
 * Main-dish images (AC13), read from the private Drive folder and sent to the
 * page as data URIs. Nothing is shared or made public. This file must only
 * read Drive: `npm test` fails if a write method appears here.
 *
 * A 256 px Drive thumbnail is enough for the 128 px image slot and much smaller
 * than the original. Results are cached, so most page loads don't touch Drive.
 */

// Bump the version to discard everything already cached.
var IMAGE_CACHE_VERSION = 'v4';
var IMAGE_INDEX_CACHE_KEY = 'dishImageIndex:' + IMAGE_CACHE_VERSION;
var IMAGE_INDEX_TTL_SECONDS = 10 * 60;
var IMAGE_TTL_SECONDS = 6 * 60 * 60; // CacheService maximum
var IMAGE_FALLBACK_TTL_SECONDS = 10 * 60; // An original is only a stopgap: retry the thumbnail soon
var IMAGE_THUMBNAIL_PX = 256;        // Twice the slot size, for sharp high-DPI screens
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
  // Only a successful, non-empty read is cached; anything else is retried on the next load.
  if (Object.keys(index).length) {
    cachePut_(cache, IMAGE_INDEX_CACHE_KEY, JSON.stringify(index), IMAGE_INDEX_TTL_SECONDS);
  }
  return index;
}

/** A file's 256 px thumbnail from Drive as a blob, or null (the reason is logged). */
function thumbnailBlob_(fileId) {
  try {
    var url = sizedThumbnailUrl(Drive.Files.get(fileId, { fields: 'thumbnailLink' }).thumbnailLink, IMAGE_THUMBNAIL_PX);
    if (!url) {
      console.warn('No usable thumbnail link for ' + fileId);
      return null;
    }
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    var blob = response.getBlob();
    if (response.getResponseCode() !== 200 || String(blob.getContentType()).indexOf('image/') !== 0 || !blob.getBytes().length) {
      console.warn('Thumbnail unavailable for ' + fileId + ': HTTP ' + response.getResponseCode() + ', ' + blob.getContentType());
      return null;
    }
    return blob;
  } catch (err) {
    console.warn('Thumbnail failed for ' + fileId + ': ' + err);
    return null;
  }
}

/** { uri, isThumbnail } from a file's thumbnail, or its original if small enough; else null. */
function loadDishImage_(fileId) {
  var blob = thumbnailBlob_(fileId);
  var isThumbnail = !!blob;
  if (!blob) {
    console.warn('Using the original file for ' + fileId);
    blob = DriveApp.getFileById(fileId).getBlob();
  }
  var bytes = blob.getBytes();
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    console.warn('Placeholder kept for ' + fileId + ': ' + bytes.length + ' bytes');
    return null;
  }
  return {
    uri: 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(bytes),
    isThumbnail: isThumbnail
  };
}

function cachePut_(cache, key, value, ttl) {
  try {
    cache.put(key, value, ttl);
  } catch (err) {
    console.warn('Not cached: ' + key + ': ' + err); // e.g. over the 100 KB value limit
  }
}

/**
 * Admin only: run this from the Apps Script editor to grant new permissions.
 * A page load or a normal Run doesn't prompt once some permissions are granted,
 * so this asks Google to prompt for any that are missing. It then reads every
 * thumbnail, skipping the image cache, and logs the sizes.
 */
function checkDishImages() {
  if (!isAdmin_(currentEmail_())) throw new Error('Admin only.');
  console.log('Granted permissions: ' + ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL).getAuthorizedScopes());
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  var folder = DriveApp.getFolderById(CONFIG.DISH_IMAGES_FOLDER_ID);
  var index = dishImageIndex_(CacheService.getScriptCache());
  var dishes = Object.keys(index);
  var sizes = [];
  dishes.forEach(function (key) {
    var blob = thumbnailBlob_(index[key].id);
    if (blob) sizes.push(blob.getBytes().length);
  });
  var total = sizes.reduce(function (sum, n) { return sum + n; }, 0);
  console.log('Drive access OK. Folder "' + folder.getName() + '": ' + dishes.length + ' dishes, ' + sizes.length +
    ' thumbnails, ' + Math.round(total / 1024) + ' KB in total, largest ' + Math.round(Math.max.apply(null, sizes.concat(0)) / 1024) + ' KB.');
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
      return 'dishImage:' + IMAGE_CACHE_VERSION + ':' + entry.id + ':' + entry.updated;
    };
    var cached = cache.getAll(wanted.map(cacheKeyOf));
    wanted.forEach(function (n) {
      var key = cacheKeyOf(n);
      try {
        if (!cached[key]) {
          var image = loadDishImage_(index[dishImageKey(n)].id);
          if (image) {
            cached[key] = image.uri;
            cachePut_(cache, key, image.uri, image.isThumbnail ? IMAGE_TTL_SECONDS : IMAGE_FALLBACK_TTL_SECONDS);
          }
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
