/**
 * Web app entry point and the two calls the page makes (getWeek, vote).
 * Meal counts are only added to the response for the admin (AC5, AC18).
 */

var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  try {
    var email = currentEmail_();
    var clock = resolveNow_(email, e && e.parameter && e.parameter.now);
    template.initialJson = safeJson_(buildWeek_(email, clock));
  } catch (err) {
    template.initialJson = safeJson_({ error: String(err && err.message || err) });
  }
  return template.evaluate()
    .setTitle('Lunch Menu')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/** Called by the page on refresh. nowParam is only honoured for the admin. */
function getWeek(nowParam) {
  var email = currentEmail_();
  return buildWeek_(email, resolveNow_(email, nowParam));
}

/** Called by the page when a heart or dislike icon is clicked. */
function vote(dateKey, clicked, nowParam) {
  var email = currentEmail_();
  var clock = resolveNow_(email, nowParam);
  if (clicked !== 'like' && clicked !== 'dislike') throw new Error('Unknown vote.');
  if (!isDateKey(dateKey)) throw new Error('Unknown day.');
  var dow = vnParts(vnInstant(dateKey, 12)).dow;
  if (dow < 1 || dow > 5) throw new Error('Unknown day.');
  if (voteStatus(dateKey, clock.ms) !== 'open') throw new Error('Voting for this day is not open.');
  var day = readMenuMonth_(dateKey, {})[dateKey];
  if (day && day.holiday) throw new Error('No voting on holidays.');
  return applyVote_(dateKey, email, clicked, clock.test);
}

function currentEmail_() {
  var email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email || email.split('@')[1] !== CONFIG.DOMAIN) {
    throw new Error('Please sign in with your @' + CONFIG.DOMAIN + ' account.');
  }
  return email;
}

function isAdmin_(email) {
  return email === CONFIG.ADMIN_EMAIL.toLowerCase();
}

/** Current time, or the admin's test time from ?now= (Vietnam local). */
function resolveNow_(email, nowParam) {
  if (nowParam && isAdmin_(email)) {
    var ms = parseVnLocal(nowParam);
    if (ms == null) throw new Error('Invalid ?now= value. Use e.g. ?now=2026-11-02T10:59');
    return { ms: ms, test: true };
  }
  return { ms: Date.now(), test: false };
}

function buildWeek_(email, clock) {
  var admin = isAdmin_(email);
  var monday = weekMonday(clock.ms);
  var days = weekDays(monday);
  var cache = {};
  var votes = tallyVotes(readVoteRows_(votesSheet_()), days, email, clock.test);
  var menus = days.map(function (dateKey) {
    return readMenuMonth_(dateKey, cache)[dateKey] || { dishes: [], holiday: null };
  });
  var mainOf = function (menu) { return menu.dishes.filter(function (d) { return d.main; })[0] || null; };
  var dishImages = dishImageUrls_(menus.filter(function (m) { return !m.holiday && mainOf(m); })
    .map(function (m) { return mainOf(m).name; }));

  var cards = days.map(function (dateKey, i) {
    var menu = menus[i];
    var main = mainOf(menu);
    var dow = vnParts(vnInstant(dateKey, 12)).dow;
    var card = {
      date: dateKey,
      weekday: WEEKDAYS[dow],
      weekdayNumber: dow + 1,
      dishes: menu.dishes,
      holiday: menu.holiday,
      image: menu.holiday
        ? { kind: 'holiday', name: menu.holiday.name, url: IMAGES.holidays[normalizeLabel(menu.holiday.name)] || null }
        : main ? { kind: 'dish', name: main.name, url: dishImages[main.name] || null } : null,
      state: dayState(dateKey, clock.ms),
      votes: votes[dateKey]
    };
    if (admin) {
      var counts = readSignupMonth_(dateKey, cache)[+dateKey.slice(8)] || { nt604: null, tl18: null, home: null };
      card.counts = counts;
      card.total = dailyTotal(counts);
    }
    return card;
  });

  var week = {
    monday: monday,
    friday: days[4],
    days: cards,
    isAdmin: admin,
    testMode: clock.test,
    nowMs: clock.ms,
    nextRefreshMs: nextBoundary(clock.ms)
  };
  if (admin) week.locations = LOCATIONS.map(function (l) { return { id: l.id, name: l.name }; });
  return week;
}

function safeJson_(obj) {
  // Escape "<" and the JS line separators U+2028/U+2029 so the JSON is safe inside <script>.
  return JSON.stringify(obj).replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
