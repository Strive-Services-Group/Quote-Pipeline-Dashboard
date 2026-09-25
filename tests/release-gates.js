'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const DATASET_HEALTH_URL = 'https://ssg-prpo-proxy-h4cvfegaduftedhz.uaenorth-01.azurewebsites.net/api/dataset-health';

async function main() {
  if (String(process.env.BREAK_RELEASE_GATE).toLowerCase() === 'true') {
    throw new Error('Deliberate release-gate failure requested. Deployment was not started.');
  }

  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /\?view=dashboard&refresh=0/, 'dashboard must request the compact dataset by default');
  assert.match(html, /indexedDB\.open\(QP_CACHE_DB,1\)/, 'last complete snapshot must remain in IndexedDB');
  assert.match(html, /bookableresourcebookings\?\$select=ssg_plannedstartdate,endtime,createdon/, 'bookings query is not reduced');
  assert.doesNotMatch(html, /bookableresourcebookings\?\$select=ssg_bookingnumber/, 'unused booking columns returned');
  assert.match(html, /function rfqCrmWaits\(/, 'RFQ band must use the CRM Sent for RFQ -> RFQ Completed window');
  assert.match(html, /c\.rfqLine!==true/, 'RFQ population must require an RFQ = Yes estimation line');
  assert.match(html, /The clock starts when the quote is marked Sent for RFQ and stops when it is marked RFQ Completed\./, 'band must state the clock');
  assert.match(html, /The system does not mark regular or recurring work, so one-off work is included\./, 'six-hour comparison must state its scope');
  assert.match(html, /this is not zero/, 'an unread Process History must never show as zero');
  assert.doesNotMatch(html, /Within 6h target/, 'waiting rows must not be shown as target performance');

  const healthResponses = [];
  for (let i = 0; i < 2; i += 1) {
    const response = await fetch(DATASET_HEALTH_URL + '?gate=' + Date.now() + '-' + i, { cache: 'no-store' });
    assert.equal(response.ok, true, 'dataset health endpoint failed');
    const health = await response.json();
    assert.equal(health.ok, true, 'compact dataset health is not OK');
    assert.equal(health.route, '/api/dataset?view=dashboard&refresh=0');
    assert.ok(health.artifact && health.artifact.bytes < 1000000, 'default dataset is not under 1 MB');
    assert.equal(health.reads.length, 2, 'two storage reads were not measured');
    health.reads.forEach(read => assert.ok(read.durationMs < 3000, 'compact dataset read exceeded 3 seconds'));
    healthResponses.push({ artifact: health.artifact, reads: health.reads });
  }
  console.log(JSON.stringify({ result: 'PASS', healthResponses }));
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
