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
assert.match(html, /<span class="ver">v62<\/span>/);
assert.match(html, /RFQ · Sent for RFQ → RFQ Completed<small>· '\+\(dept \? escapeHtml\(dept\) : 'all departments'\)/);
assert.match(html, /The clock starts when the quote is marked Sent for RFQ and stops when it is marked RFQ Completed\. What Procurement does in F&O in between is shown inside each row\./);
assert.match(html, /The system does not mark regular or recurring work, so one-off work is included\./);
assert.doesNotMatch(html, /Home Maintenance · RFQ Time/, 'the retired Home Maintenance F&O band must not return');
assert.doesNotMatch(html, /Procurement · RFQ Waiting Time/, 'the retired gate 0.05 band must not return');
assert.doesNotMatch(html, /\$top=\d+[^']*quotedetails|quotedetails\?\$top/, 'no truncation on RFQ line reads');
assert.match(html, /PR\/PO figures still loading/);
assert.match(html, /PRPO_DATASET_URL \+ '\?view=dashboard&refresh=0'/);
assert.match(html, /PRPO_DATASET_URL\+'\?view=full&refresh=0'/);
assert.doesNotMatch(html, /PRPO_DATASET_URL \+ \(force \? '\?refresh=1'/);
assert.match(html, /bookableresourcebookings\?\$select=ssg_plannedstartdate,endtime,createdon/);
assert.doesNotMatch(html, /bookableresourcebookings\?\$select=ssg_bookingnumber/);
assert.match(html, /msdyn_workorder\/ssg_quotenumber ne null/);
assert.doesNotMatch(html, /4200000/);
assert.doesNotMatch(html, /raw:\s*row/);
assert.match(html, /indexedDB\.open\(QP_CACHE_DB,1\)/);
assert.match(html, /if\(PRPO_LOADING\) return; \/\/ keep the last complete durable snapshot/);
assert.match(html, /const hadCache = await qpCacheLoad\(\)/);
assert.match(html, /6-hour comparison:<\/strong> applied to every quote\./);
assert.doesNotMatch(html, /Within 6h target/);
assert.match(html, /\.tcard\.static \.tavg\{[^}]*white-space:normal/);

const guardedFreshness = qp.recordFreshness([
  '2026-09-20T08:00:00Z',
  '2026-12-26T08:00:00Z',
  '2026-09-21T05:59:00Z'
], '2026-09-21T06:00:00Z');
assert.equal(guardedFreshness.newestUtc, '2026-09-21T05:59:00.000Z');
assert.equal(guardedFreshness.futureIgnored.count, 1);
assert.match(qp.futureIgnoredText(guardedFreshness.futureIgnored), /future-dated record ignored/);
assert.equal(qp.mergeFutureIgnored(guardedFreshness.futureIgnored, null).count, 1);

const emptyMessage = qp.sourceEmptyMessage('legacy RFQ field', '2025-07-19T00:00:00Z');
assert.match(emptyMessage, /^No source data/);
assert.match(emptyMessage, /legacy RFQ field/);

const sourceRows = qp.rfqSourceRows([
  { purchaseRequisition: 'CPR-100', createdDate: '2026-09-20T20:00:00Z', createdDateTime: '2026-09-21T04:00:00Z', stepDate: '2026-09-21T09:00:00Z', authorisedGateNumber: '0.05' },
  { purchaseRequisition: 'CPR-101', createdDate: '2026-09-19T00:00:00Z', stepDate: '2026-09-20T17:00:00Z', authorisedGateName: 'Inquiry Sent to Suppliers' },
  { purchaseRequisition: 'CPR-102', createdDate: '2026-09-19T00:00:00Z', stepDate: '2026-09-20T17:00:00Z', authorisedGateNumber: '0.07' },
  { purchaseRequisition: 'PR-103', createdDate: '2026-09-19T00:00:00Z', stepDate: '2026-09-20T17:00:00Z', authorisedGateNumber: '0.05' }
]);
assert.equal(sourceRows.length, 2);
const elapsed = sourceRows.map(qp.rfqElapsedMs);
assert.deepEqual(elapsed, [5 * 3600000, 41 * 3600000]);
assert.equal(elapsed.filter(ms => ms <= 6 * 3600000).length, 1);
assert.equal(qp.median(elapsed), 23 * 3600000);
assert.equal(qp.draftingClockExclusions([{ _draftingClockInvalid: true }, { _draftingClockInvalid: false }]), 1);
const compactRows = qp.normalizePrRows([['CPR-200','Q-200','2026-09-21T05:00:00Z','2026-09-21T10:00:00Z','Commercial','','','Procurement sends inquiry/RFQ to suppliers','2026-09-21T09:00:00Z','0.05','Inquiry Sent to Suppliers']],
  ['purchaseRequisition','quotationReference','createdDateTime','submittedDate','department','projectId','ledgerDimensionRaw','stepName','stepDate','authorisedGateNumber','authorisedGateName']);
assert.equal(compactRows[0].purchaseRequisition, 'CPR-200');
assert.equal(compactRows[0].createdDateTime, '2026-09-21T05:00:00Z');

// CRM RFQ window: Sent for RFQ -> RFQ Completed, population = quotes with an RFQ = Yes line.
const H = 3600000;
const now = Date.parse('2026-09-25T06:00:00Z');
const FIELDS = ['quoteId','division','start','end','elapsedMs','cycles','open','waits'];
const row = (id, waits) => [id, 'FACILITIES_MANAGEMENT', waits[0][0], waits[0][1], waits[0][1] ? Date.parse(waits[0][1]) - Date.parse(waits[0][0]) : null, waits.length, !waits[waits.length - 1][1], waits];
const section = { status: 'OK', historyReadAt: '2026-09-25T05:59:00Z', newestEventUtc: '2026-09-25T05:50:00Z',
  captureDelayMinutes: { median: 7.7, p90: 14.2, max: 15.6 }, fields: FIELDS, rows: [
  row('a', [['2026-09-20T04:00:00Z', '2026-09-20T08:00:00Z']]),
  row('b', [['2026-09-21T04:00:00Z', '2026-09-22T10:00:00Z']]),
  row('c', [['2026-09-24T06:00:00Z', null]]),
  row('d', [['2026-09-23T06:00:00Z', null]]),
  row('e', [['2026-09-10T04:00:00Z', '2026-09-10T05:00:00Z'], ['2026-09-18T04:00:00Z', '2026-09-18T12:00:00Z']]),
  row('f', [['2026-09-20T04:00:00Z', '2026-09-20T05:00:00Z']]),
  row('g', [['2026-09-20T09:00:00Z', '2026-09-20T08:00:00Z']]),
  row('h', [['2026-08-01T04:00:00Z', '2026-08-01T05:00:00Z']]),
  row('i', [['2026-09-24T12:00:00Z', null]]),
  row('j', [['2026-09-20T04:00:00Z', '2026-09-20T10:00:00Z']])
] };
const BS = 'Building Services', HMS = 'Home Maintenance Services';
const ctx = {
  a: { quoteNo: 'Q-A', dept: HMS, project: 'P1', status: 'Posted WorkOrder', rfqLine: true },
  b: { quoteNo: 'Q-B', dept: BS, project: 'P2', status: 'RFQ Completed', rfqLine: true },
  c: { quoteNo: 'Q-C', dept: BS, project: 'P2', status: 'Sent for RFQ', rfqLine: true },
  d: { quoteNo: 'Q-D', dept: BS, project: 'P3', status: 'In Progress', rfqLine: true },
  e: { quoteNo: 'Q-E', dept: HMS, project: 'P1', status: 'RFQ Completed', rfqLine: true },
  f: { quoteNo: 'Q-F', dept: HMS, project: 'P1', status: 'RFQ Completed', rfqLine: false },
  g: { quoteNo: 'Q-G', dept: BS, project: 'P4', status: 'RFQ Completed', rfqLine: true },
  h: { quoteNo: 'Q-H', dept: BS, project: 'P4', status: 'RFQ Completed', rfqLine: true },
  i: { quoteNo: 'Q-I', dept: HMS, project: 'P1', status: 'Sent for RFQ', rfqLine: true },
  j: { quoteNo: 'Q-J', dept: HMS, project: 'P1', status: 'RFQ Completed', rfqLine: true }
};
const scope = { fromMs: Date.parse('2026-08-24T20:00:00Z'), toMs: Date.parse('2026-09-25T19:59:59Z'), nowMs: now };
const waits = qp.rfqCrmWaits(section, ctx, scope);
assert.equal(waits.some(w => w.quoteId === 'f'), false, 'a quote with no RFQ = Yes line is outside the population');
assert.equal(waits.some(w => w.quoteId === 'h'), false, 'a wait sent before the From date is outside the dates');
assert.equal(waits.find(w => w.quoteId === 'd').state, 'movedOn', 'open wait on a quote no longer in Sent for RFQ is not waiting');
assert.equal(waits.find(w => w.quoteId === 'g').state, 'negative');
assert.equal(waits.find(w => w.quoteId === 'g').elapsedMs, null, 'a negative clock is not measured, never zero');
const stats = qp.rfqCrmStats(waits);
assert.equal(stats.completed.n, 5, 'a, b, both cycles of e, j');
assert.equal(stats.completed.minMs, 1 * H);
assert.equal(stats.completed.maxMs, 30 * H);
assert.equal(stats.completed.medianMs, 6 * H);
assert.equal(stats.completed.within6h, 3, '<= 6h counts as within');
assert.equal(stats.completed.pct6h, 60);
assert.equal(stats.waiting.n, 2);
assert.equal(stats.waiting.maxMs, 24 * H);
assert.equal(stats.waiting.medianMs, (24 + 18) / 2 * H);
assert.equal(stats.waiting.over6h, 2);
assert.equal(stats.cycled.quotes, 1);
assert.equal(stats.cycled.waits, 2);
assert.equal(stats.movedOn, 1);
assert.equal(stats.negative, 1);
const hmsStats = qp.rfqCrmStats(qp.rfqCrmWaits(section, ctx, Object.assign({ dept: HMS }, scope)));
assert.equal(hmsStats.completed.n, 4);
assert.equal(hmsStats.waiting.n, 1);
const empty = qp.rfqCrmStats([]);
assert.equal(empty.completed.pct6h, null, 'no data is not 0%');
assert.equal(empty.completed.medianMs, null);
assert.deepEqual(qp.rfqContextIds(section, scope.fromMs, scope.toMs, now).sort(), ['a','b','c','d','e','f','g','i','j']);

qp.setRfqState({ RFQ_CRM: section, RFQ_CTX: ctx, RFQ_POP: { createdWithLine: 3, noStart: [{ quoteId: 'z', dept: BS, status: 'Requested for Revised' }] }, RFQ_CTX_READY: true, PRPO_LOADING: false,
  PR_ROWS: [{ purchaseRequisition: 'CPR-1', quotationReference: 'Q-C', createdDateTime: '2026-09-24T07:00:00Z', stepDate: '2026-09-24T09:00:00Z', authorisedGateNumber: '0.05', authorisedGateName: 'Inquiry Sent to Suppliers', holder: 'Procurement buyer' }] });
const band = qp.rfqCrmBandHtml('');
assert.match(band, /RFQ · Sent for RFQ → RFQ Completed<small>· all departments/);
assert.match(band, /History read at<\/strong>/);
assert.match(band, /median 8 min after it happens \(slowest 16 min in the last 7 days\)/);
assert.match(band, /1 quote created in these dates with an RFQ line has never been marked Sent for RFQ \(most are now Requested for Revised\)/);
assert.match(qp.rfqCrmBandHtml(BS), /<small>· Building Services/);
const steps = qp.rfqSteps('Q-C');
assert.equal(steps.length, 1);
assert.equal(steps[0].gate, '0.05');
const lanes = qp.circuitLanes(section, ctx, '', now);
assert.deepEqual(lanes.pending.map(w => w.quoteId), ['c', 'i'], 'longest wait first');
assert.deepEqual(lanes.done.map(w => w.quoteId), ['b', 'j', 'a', 'e'], 'completed in the last 7 days, newest first');
assert.match(qp.circuitPanel(lanes.pending[0]), /Holder: <b>Procurement buyer<\/b>/);
assert.match(qp.circuitPanel(lanes.pending[0]), /CPR-1 · 0\.05 Inquiry Sent to Suppliers since/);
qp.setRfqState({ RFQ_CRM: { status: 'UNAVAILABLE', historyReadAt: '2026-09-25T06:00:00Z', reason: 'Dataverse 403: missing prvReadssg_processevent' } });
assert.match(qp.rfqCrmBandHtml(''), /missing prvReadssg_processevent\. No figure is shown; this is not zero\./);
qp.setRfqState({ RFQ_CRM: null });
assert.match(qp.rfqCrmBandHtml(''), /does not carry the Process History RFQ window yet/);
qp.setRfqState({ PRPO_LOADING: true });
assert.match(qp.rfqCrmBandHtml(''), /RFQ history still loading/);
qp.setRfqState({ PRPO_LOADING: false, RFQ_CRM: null, PR_ROWS: [] });

const refreshPolicy = { weekdays:[1,2,3,4,5], slotsMinutes:[305,335], marginMinutes:20 };
assert.equal(qp.datasetScheduleState({generatedAt:'2026-09-21T05:36:00Z',refreshPolicy},'2026-09-21T06:00:00Z').stale, false);
assert.equal(qp.datasetScheduleState({generatedAt:'2026-09-21T05:04:00Z',refreshPolicy},'2026-09-21T06:00:00Z').stale, true);
assert.equal(qp.staleRefreshLabel('2026-09-21T07:04:00Z'), '11:04 on 21 September');
assert.match(html, /These figures were last refreshed at/);
assert.match(html, /A refresh has not completed since\. They may be out of date\./);

qp.applyTheme('dark');
assert.equal(documentElement.attrs['data-theme'], 'dark');
assert.equal(storage.qp_theme, 'dark');
qp.toggleTheme();
assert.equal(documentElement.attrs['data-theme'], 'light');
assert.equal(storage.qp_theme, 'light');

const prpoIssue = qp.sourceFailure('prpo', 'PR/PO RFQ source', 'rfq', new TypeError('Failed to fetch'));
assert.match(qp.sourceIssueMessage(prpoIssue), /RFQ source could not be reached/);
assert.match(qp.sourceIssueMessage(prpoIssue), /rest of this page is live and correct/);
assert.doesNotMatch(qp.sourceIssueMessage(prpoIssue), /TypeError/);
assert.equal(qp.mergeSourceIssues([prpoIssue], [prpoIssue]).length, 1);

async function runAsyncProof() {
  sandbox.fetchPrpoDataset = async () => { throw new TypeError('Failed to fetch'); };
  sandbox.dvGet = async (path) => {
    if (path.startsWith('quotes?')) {
      return [{
        quoteid: '00000000-0000-0000-0000-000000000001',
        quotenumber: 'Q-PRPO-DOWN',
        createdon: '2026-09-21T07:00:00Z',
        statuscode: 1,
        'statuscode@OData.Community.Display.V1.FormattedValue': 'Draft',
        name: 'PRPO unavailable proof quote',
        opportunityid: { createdon: '2026-09-21T06:00:00Z', name: 'Proof opportunity', ssg_textdepartment: 'Commercial' }
      }];
    }
    if (path.startsWith('msdyn_workorders?')) {
      return [{
        msdyn_name: 'WO-PROOF',
        ssg_quotenumber: 'Q-PRPO-DOWN',
        msdyn_systemstatus: 1,
        createdon: '2026-09-21T09:00:00Z',
        '_ssg_department_value@OData.Community.Display.V1.FormattedValue': 'Commercial'
      }];
    }
    return [];
  };
  const fastSources = await qp.fetchDataverseSources('2026-09-20T20:00:00.000Z', '2026-09-21T19:59:59.000Z');
  const progressive = qp.joinSources(fastSources, null, true);
  assert.equal(progressive.rows.length, 1);
  assert.equal(progressive.rows[0]._prpoPending, true);
  assert.equal(progressive.sourceIssues.some(issue => issue.key === 'prpo'), false);
  assert.equal(progressive.prRows.length, 0);

  const joined = await qp.fetchAndJoin('2026-09-20T20:00:00.000Z', '2026-09-21T19:59:59.000Z', true);
  assert.equal(joined.rows.length, 1);
  assert.equal(joined.prRows.length, 0);
  assert.equal(joined.rows[0].quoteNo, 'Q-PRPO-DOWN');
  assert.equal(joined.rows[0].rfq.val, null);
  assert(joined.rows[0].drafting.val, 'Dataverse-dependent drafting should still calculate');
  assert(joined.sourceIssues.some(issue => issue.key === 'prpo'), 'PR/PO failure should be reported as a contained source issue');

  console.log(JSON.stringify({
    monday: { currentStartUtc: iso(monday[2].start), samePointLastWeekEndUtc: iso(monday[1].end), currentLabel: monday[2].label },
    midweek: { currentElapsedMs: midweek[2].end.getTime() - midweek[2].start.getTime(), priorElapsedMs: midweek[1].end.getTime() - midweek[1].start.getTime() },
    sunday: { currentStartUtc: iso(sunday[2].start), currentElapsedMs: sunday[2].end.getTime() - sunday[2].start.getTime() },
    staleStates: {
      fresh: qp.freshnessState('2026-09-20T07:00:00Z', '2026-09-21T06:00:00Z').cls,
      amber: qp.freshnessState('2026-09-19T05:00:00Z', '2026-09-21T06:00:00Z').cls,
      red: qp.freshnessState('2026-09-17T04:59:00Z', '2026-09-21T06:00:00Z').cls
    },
    guardedFreshness,
    noSourceMessage: emptyMessage,
    realZero: { sourceRows: sourceRows.length, underSixHours: elapsed.filter(ms => ms <= 6 * 3600000).length, medianHours: qp.median(elapsed) / 3600000 },
    rfqCrm: { completed: stats.completed, waiting: stats.waiting, cycled: stats.cycled, movedOn: stats.movedOn, negative: stats.negative },
    progressive: { rowsReturned: progressive.rows.length, prpoPending: progressive.rows[0]._prpoPending },
    prpoFailure: { rowsReturned: joined.rows.length, issueKeys: joined.sourceIssues.map(issue => issue.key), rfqValue: joined.rows[0].rfq.val },
    theme: { persistedAfterToggle: storage.qp_theme, documentTheme: documentElement.attrs['data-theme'] }
  }, null, 2));
}

runAsyncProof().catch(err => {
  console.error(err);
  process.exit(1);
});
