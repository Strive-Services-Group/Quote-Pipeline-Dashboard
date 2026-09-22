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
assert.match(html, /v60/);
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
assert.match(html, /Waiting population:/);
assert.match(html, /No row is assessed against the target and the percentage is suppressed\./);
assert.doesNotMatch(html, /percentage suppressed until the target is agreed/);
assert.doesNotMatch(html, /Within 6h target/);

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
const waitingSplit = qp.rfqWaitingSplit([
  { purchaseRequisition: 'CPR-035825', quotationReference: 'Q-44031', createdDateTime: '2026-09-19T13:50:48Z', stepDate: '2026-09-21T10:12:59Z', authorisedGateNumber: '0.05' },
  { purchaseRequisition: 'CPR-035894', quotationReference: 'Q-44100', createdDateTime: '2026-09-22T01:55:24Z', stepDate: '2026-09-22T06:25:22Z', authorisedGateNumber: '0.05' },
  { purchaseRequisition: 'CPR-035900', quotationReference: 'Q-44106', createdDateTime: '2026-09-22T02:00:00Z', stepDate: '2026-09-22T06:40:07Z', authorisedGateNumber: '0.05' }
], [
  { quoteNo: 'Q-44031', status: 'Unscheduled WorkOrder', customer: { status:'Sent for approval', start:'2026-09-22T09:28:44Z' }, scheduling: { a:'2026-09-22T12:59:22Z' }, _woName:'1697002' },
  { quoteNo: 'Q-44100', status: 'Sent for Customer Approval', internal: { status:'Approved', start:'2026-09-22T05:55:30Z', end:'2026-09-22T06:24:45Z' }, customer: { status:'Sent for approval', start:'2026-09-22T06:25:22Z' } },
  { quoteNo: 'Q-44106', status: 'Sent for RFQ', est: { any:false }, internal: {}, customer: {}, scheduling: {}, workExec: {} }
]);
assert.equal(waitingSplit.candidates.length, 3);
assert.deepEqual(Array.from(waitingSplit.excluded, entry => entry.p.quotationReference).sort(), ['Q-44031','Q-44100']);
assert.deepEqual(Array.from(waitingSplit.waiting, entry => entry.p.quotationReference), ['Q-44106']);
assert.equal(qp.quoteProgressedPastRfq({ est:{ any:true } }), true);
assert.equal(qp.quoteProgressedPastRfq({ status:'Sent for RFQ', est:{ any:false }, internal:{}, customer:{} }), false);
assert.equal(qp.RFQ_TARGET_POLICY.department, 'Home Maintenance Services');
assert.equal(qp.RFQ_TARGET_POLICY.markerAvailable, false);
assert.match(qp.RFQ_TARGET_POLICY.markerReason, /does not identify regular or recurring work/);
const compactRows = qp.normalizePrRows([['CPR-200','Q-200','2026-09-21T05:00:00Z','2026-09-21T10:00:00Z','Commercial','','','Procurement sends inquiry/RFQ to suppliers','2026-09-21T09:00:00Z','0.05','Inquiry Sent to Suppliers']],
  ['purchaseRequisition','quotationReference','createdDateTime','submittedDate','department','projectId','ledgerDimensionRaw','stepName','stepDate','authorisedGateNumber','authorisedGateName']);
assert.equal(compactRows[0].purchaseRequisition, 'CPR-200');
assert.equal(compactRows[0].createdDateTime, '2026-09-21T05:00:00Z');
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
    waitingPopulation: { candidates: waitingSplit.candidates.length, waiting: waitingSplit.waiting.length, excludedQuoteNumbers: Array.from(waitingSplit.excluded, entry => entry.p.quotationReference) },
    targetPolicy: qp.RFQ_TARGET_POLICY,
    progressive: { rowsReturned: progressive.rows.length, prpoPending: progressive.rows[0]._prpoPending },
    prpoFailure: { rowsReturned: joined.rows.length, issueKeys: joined.sourceIssues.map(issue => issue.key), rfqValue: joined.rows[0].rfq.val },
    theme: { persistedAfterToggle: storage.qp_theme, documentTheme: documentElement.attrs['data-theme'] }
  }, null, 2));
}

runAsyncProof().catch(err => {
  console.error(err);
  process.exit(1);
});
