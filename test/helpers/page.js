// Runs the real page script from src/Script.html against a small fake DOM and a
// queued google.script.run, so a test controls when the server responds.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeElement {
  constructor(tag) {
    this.tag = tag;
    this.className = '';
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.disabled = false;
    this.ownText = '';
    this.innerHTML = '';
  }
  get textContent() {
    return this.ownText + this.children.map((c) => c.textContent).join('');
  }
  set textContent(value) {
    this.ownText = String(value);
    this.children = [];
  }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  insertAdjacentHTML() {}
  /** Like a browser, a click on a disabled button does nothing. */
  click() {
    if (this.disabled) return;
    (this.listeners.click || []).forEach((fn) => fn());
  }
  hasClass(name) { return this.className.split(/\s+/).includes(name); }
  /** All descendants matching the class name, in document order. */
  all(name) {
    const found = [];
    const walk = (el) => el.children.forEach((c) => { if (c.hasClass(name)) found.push(c); walk(c); });
    walk(this);
    return found;
  }
  allByTag(tag) {
    const found = [];
    const walk = (el) => el.children.forEach((c) => { if (c.tag === tag) found.push(c); walk(c); });
    walk(this);
    return found;
  }
}

const PAGE_IDS = ['test-banner', 'range', 'error', 'week', 'counts', 'counts-table', 'toast'];

function pageScript() {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'Script.html'), 'utf8');
  return /<script>([\s\S]*)<\/script>/.exec(html)[1];
}

/** Renders the page from server data (what doGet embeds as INITIAL). */
function renderPage(week) {
  const elements = Object.fromEntries(PAGE_IDS.map((id) => [id, new FakeElement('div')]));
  elements['counts-table'].tag = 'table';
  const queue = [];

  const run = () => {
    const call = { success: null, failure: null };
    const chain = {
      withSuccessHandler(fn) { call.success = fn; return chain; },
      withFailureHandler(fn) { call.failure = fn; return chain; },
      vote(...args) { queue.push({ ...call, name: 'vote', args }); },
      getWeek(...args) { queue.push({ ...call, name: 'getWeek', args }); }
    };
    return chain;
  };

  const ctx = {
    INITIAL: JSON.parse(JSON.stringify(week)),
    console,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    document: {
      hidden: false,
      getElementById: (id) => elements[id],
      createElement: (tag) => new FakeElement(tag),
      addEventListener() {}
    },
    google: { script: { get run() { return run(); } } }
  };
  vm.createContext(ctx);
  vm.runInContext(pageScript(), ctx, { filename: 'Script.html' });

  const cards = () => elements.week.all('day');
  const page = {
    elements,
    queue,
    /** A day's card, found by the date in its label, e.g. 'November 2nd'. */
    card: (label) => cards().find((c) => c.getAttribute('aria-label').includes(label)),
    cards,
    likeButton: (label) => page.card(label).all('like')[0],
    dislikeButton: (label) => page.card(label).all('dislike')[0],
    /** Counts shown beside a day's icons. */
    voteCounts: (label) => ({
      like: Number(page.likeButton(label).all('count')[0].textContent),
      dislike: Number(page.dislikeButton(label).all('count')[0].textContent)
    }),
    /** The admin counts table as rows of cell text; [] if it is hidden or empty. */
    countsTable: () => (elements.counts.hidden ? [] : elements['counts-table'].allByTag('tr')
      .map((tr) => tr.children.map((cell) => cell.textContent))),
    /** Sends every queued call to the real server code and hands back the results. */
    deliver(app) {
      while (queue.length) {
        const call = queue.shift();
        try {
          call.success(app[call.name](...call.args));
        } catch (err) {
          call.failure({ message: err.message });
        }
      }
    }
  };
  return page;
}

module.exports = { renderPage };
