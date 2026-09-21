const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script>([\s\S]*)<\/script>/);
assert(match, 'index.html script block not found');

const storage = {};
const documentElement = {
  attrs: {},
  setAttribute(name, value) { this.attrs[name] = value; },
  getAttribute(name) { return this.attrs[name] || ''; }
};
const document = {
  documentElement,
  body: { style: {} },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; }
};
const windowObj = {
  document,
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  },
  matchMedia() { return { matches: false }; },
  addEventListener() {},
  location: { origin: 'https://strive-services-group.github.io', pathname: '/Quote-Pipeline-Dashboard/' }
};

const sandbox = {
  window: windowObj,
  document,
  localStorage: windowObj.localStorage,
  console,
  Map,
  Date,
  Intl,
  setTimeout,
  clearTimeout,
  clearInterval
};
vm.createContext(sandbox);
vm.runInContext(match[1], sandbox, { filename: 'index.html' });

const qp = sandbox.window.__QP_TEST__;
assert(qp, 'test helpers were not exposed');

function iso(value) {
  return value.toISOString();
}

const monday = qp.weekBoundaries(new Date('2026-09-21T06:52:00Z'));
assert.equal(iso(monday[2].start), '2026-09-20T20:00:00.000Z');
assert.equal(iso(monday[1].start), '2026-09-13T20:00:00.000Z');
assert.equal(iso(monday[1].end), '2026-09-14T06:52:00.000Z');
assert.match(monday[2].label, /^This week so far/);

const midweek = qp.weekBoundaries(new Date('2026-09-23T08:00:00Z'));
assert.equal(midweek[2].start.getTime() - midweek[1].start.getTime(), 7 * 86400000);
assert.equal(midweek[2].end.getTime() - midweek[2].start.getTime(), midweek[1].end.getTime() - midweek[1].start.getTime());

const sunday = qp.weekBoundaries(new Date('2026-09-20T18:00:00Z'));
assert.equal(iso(sunday[2].start), '2026-09-13T20:00:00.000Z');
assert.equal(sunday[2].end.getTime() - sunday[2].start.getTime(), sunday[1].end.getTime() - sunday[1].start.getTime());

assert.equal(qp.freshnessState('2026-09-20T07:00:00Z', '2026-09-21T06:00:00Z').cls, 'live');
assert.equal(qp.freshnessState('2026-09-19T05:00:00Z', '2026-09-21T06:00:00Z').cls, 'warn');
assert.equal(qp.freshnessState('2026-09-17T04:59:00Z', '2026-09-21T06:00:00Z').cls, 'bad');

const emptyMessage = qp.sourceEmptyMessage('legacy RFQ field', '2025-07-19T00:00:00Z');
assert.match(emptyMessage, /^No source data/);
assert.match(emptyMessage, /legacy RFQ field/);

const sourceRows = qp.rfqSourceRows([
  { purchaseRequisition: 'CPR-100', createdDate: '2026-09-20T20:00:00Z', stepDate: '2026-09-21T09:00:00Z', authorisedGateNumber: '0.05' },
  { purchaseRequisition: 'CPR-101', createdDate: '2026-09-19T00:00:00Z', stepDate: '2026-09-20T17:00:00Z', authorisedGateName: 'Inquiry Sent to Suppliers' },
  { purchaseRequisition: 'CPR-102', createdDate: '2026-09-19T00:00:00Z', stepDate: '2026-09-20T17:00:00Z', authorisedGateNumber: '0.07' },
  { purchaseRequisition: 'PR-103', createdDate: '2026-09-19T00:00:00Z', stepDate: '2026-09-20T17:00:00Z', authorisedGateNumber: '0.05' }
]);
assert.equal(sourceRows.length, 2);
const elapsed = sourceRows.map(qp.rfqElapsedMs);
assert.deepEqual(elapsed, [13 * 3600000, 41 * 3600000]);
assert.equal(elapsed.filter(ms => ms <= 6 * 3600000).length, 0);
assert.equal(qp.median(elapsed), 27 * 3600000);

qp.applyTheme('dark');
assert.equal(documentElement.attrs['data-theme'], 'dark');
assert.equal(storage.qp_theme, 'dark');
qp.toggleTheme();
assert.equal(documentElement.attrs['data-theme'], 'light');
assert.equal(storage.qp_theme, 'light');

console.log(JSON.stringify({
  monday: { currentStartUtc: iso(monday[2].start), samePointLastWeekEndUtc: iso(monday[1].end), currentLabel: monday[2].label },
  midweek: { currentElapsedMs: midweek[2].end.getTime() - midweek[2].start.getTime(), priorElapsedMs: midweek[1].end.getTime() - midweek[1].start.getTime() },
  sunday: { currentStartUtc: iso(sunday[2].start), currentElapsedMs: sunday[2].end.getTime() - sunday[2].start.getTime() },
  staleStates: {
    fresh: qp.freshnessState('2026-09-20T07:00:00Z', '2026-09-21T06:00:00Z').cls,
    amber: qp.freshnessState('2026-09-19T05:00:00Z', '2026-09-21T06:00:00Z').cls,
    red: qp.freshnessState('2026-09-17T04:59:00Z', '2026-09-21T06:00:00Z').cls
  },
  noSourceMessage: emptyMessage,
  realZero: { sourceRows: sourceRows.length, underSixHours: elapsed.filter(ms => ms <= 6 * 3600000).length, medianHours: qp.median(elapsed) / 3600000 },
  theme: { persistedAfterToggle: storage.qp_theme, documentTheme: documentElement.attrs['data-theme'] }
}, null, 2));
