# Quote Pipeline Ageing Dashboard notes

This file is published with the site. It holds no record numbers and no personal names.

## 24 September 2026, 17:15 Dubai: v61 Home Maintenance RFQ band

### Why

Home Maintenance requisitions never stand at authorised gate 0.05 "Inquiry sent to suppliers", so the RFQ band reported nothing for them. In the compact feed read at 16:59, the 636 Home Maintenance requisitions stood at 0.03 (566), 0.09 (63), 0.20 (5) and 0.08 (2), and none at 0.05. Gate 0.05 held 123 rows: Building Services 43, Landscaping 8, Contracted Cleaning 2, FitOut 1, blank department 69.

The department dropdown already filtered the 0.05 band. With Home Maintenance selected, the band showed "No source data — nothing has been recorded for RFQ gate 0.05", and the header still said "all departments". That is the misleading blank.

### Change (commit f35bc5e)

- A new band, "Home Maintenance · RFQ Time · PR received → supplier price updated in PR", sits under the 0.05 band.
  - Priced means the requisition is at gate 0.09 now. The card shows count, median, fastest, slowest, and "n of m within 6 hours" with the percentage.
  - Waiting for a price means the requisition is at gate 0.03 now. The card shows count, median wait so far, longest wait, and the number over 6 hours.
  - Both cards drill through to requisition, quote, project, created, priced at or gate-0.03 time, and elapsed.
- The clock starts at `createdDateTime` only. A date-only fallback would start at midnight, so a row without a creation time is counted as not measured, never as zero. Priced stops at `stepDate`. Waiting stops at the moment the page is read. Negative clocks are not measured.
- Six-hour comparison: `<= 6h` against every Home Maintenance requisition, as stated on the band.
- Not counted, and named on the band: gate 0.20, LPO created (whole feed and in the selected dates), and any other gate such as 0.08.
- The 0.05 band header now names the selected department. With Home Maintenance selected and no Home Maintenance row at 0.05 in the feed, it shows 0 and "no Home Maintenance requisition passes through this step". The 0.05 rules, figures and other wording are unchanged.
- Version v61. The as-at stamps, light and dark themes, and stale banner are untouched.
- Scope follows the page's From and To controls and department dropdown. The band uses the requisition's own `department` field. The page reads the date controls in the browser's time zone, which is Dubai for users in the UAE.

### Tests

- `node tests/quote-dashboard-proof.js`: PASS. It adds synthetic Home Maintenance cases for a missing stop time, a negative clock, a date-only creation value, moved-on, other gate, the empty set, and "no data is not 0%".
- `node tests/release-gates.js`: PASS, including two dataset-health reads.

### Deploy evidence

- Main was fast-forwarded to f35bc5e and pushed. The "Deploy to GitHub Pages" run for f35bc5e completed with success.
- Live `index.html` fetched at 17:08 Dubai carries `<span class="ver">v61</span>` and `function hmsRfqSplit(`. Its SHA-256 equals the committed blob of f35bc5e.
- A signed-in headless browser, using a copy of the local Chrome session, loaded the live page at 17:08 and read the following.
  - 0.05 band: 43 waiting, median 1d 3h, 42 of 43 measured, longest 5d 2h, average 1d 10h.
  - Home Maintenance band: priced 36, median 8h 11m, fastest 4h 26m, slowest 6d 0h, 15 of 36 within 6 hours (42%).
  - Waiting 35, median 19d 3h, longest 30d 3h, 35 over 6 hours. At 0.20: 5 in the feed, 0 in the window. At 0.08: 1 in the window.
- An independent Python recount from the same raw feed gives the same figures.

### Assumptions and risks

- A Home Maintenance requisition is one whose feed `department` is "Home Maintenance Services".
- The feed carries only the current step, so a requisition priced and then moved on to an LPO is not in the priced figures.
- The median is the standard median, the mean of the two middle values when the count is even.
- Waiting figures grow with time between reads.

## 25 September 2026: v62 one RFQ band on the CRM clock

### What changed

- The two RFQ bands (gate 0.05 and the Home Maintenance 0.03 to 0.09 band) are replaced by one band: "RFQ · Sent for RFQ → RFQ Completed · all departments". The department dropdown applies.
- Population: quotes with at least one RFQ quote line. The clock starts when the quote is marked Sent for RFQ and stops when it is marked RFQ Completed. What Procurement does in F&O in between is shown inside each row.
- The system does not mark regular or recurring work, so one-off work is included.
- Cards: Completed (count, median, fastest, slowest, within 6h), Still waiting (count, median wait, longest, over 6h), Cycled. Each card drills to rows with the F&O sub-steps.
- The band shows when the history was read and the observed capture lag.
- New RFQ circuit view (header button, or `#rfq-circuit`): one panel per quote waiting on RFQ, longest wait first, and a lane of completions in the last 7 days.
- If the proxy cannot read the history, the band says so and states that this is not zero. No figure is shown.

### Recount on the new definition (quotes created since 25 August, Dubai)

| Scope | Completed | Median | Within 6h | Still waiting |
|---|---:|---|---:|---:|
| All departments | 186 | 1d 0h | 68 (37%) | 73 |
| Facilities Management | 105 | 2d 3h | 28 (27%) | 71 |
| Home Services | 81 | 6h 15m | 40 (49%) | 2 |
| Building Services | 93 | 2d 3h | 23 | 59 |
| Home Maintenance | 73 | 14h 55m | 35 (48%) | 2 |

- Every quote had one cycle. Negative and zero durations: none.
- 30 population quotes were never marked Sent for RFQ.
- v61 Home Maintenance (36 priced, 15 within 6h) used the F&O gate clock on requisitions at gate 0.09. The new figure uses the CRM quote status on quotes with an RFQ line. The F&O feed kept only the current step, so requisitions that were priced and moved on dropped out of v61.

### Access

- The live band depends on the proxy reading SSG Process History in DEV. At release the proxy identity was refused (Dataverse `0x80040220`, missing read on the process event table), so the live band shows the refusal until that read is granted.

## 25 September 2026, 11:35 Dubai: rolled back to v61

The live page is back to the v61 page (`index.html` and tests restored to their 24 September content). v62 showed a refusal in place of RFQ figures, because the proxy cannot yet read SSG Process History. v62 is kept on the branch `cursor/v62-rfq-crm-window-2853` and can be restored once that read is granted. No permission, role or setting was changed.

## 25 September 2026, 17:50 Dubai: v62 restored

### Access

- In DEV, the read-only role that holds the process event read had two SharePoint Data privileges (write and create) that Dataverse adds to new roles. They were removed from the parent role, so every business-unit copy now holds seven read privileges only.
- That role was then granted to the proxy's managed identity in its own business unit: one role added, 39 privileges before, 44 after.
- A forced dataset refresh from the signed-in live page, called at 17:46:46 and returned at 17:48:18, gave the RFQ section status OK with 593 quotes, history read at 17:48:17.

### How the band reads

- The Sent for RFQ and RFQ Completed times come from the proxy's shared RFQ section. The proxy reads the history with its own managed identity and keeps one copy for every caller.
- The page adds quote context (department, status, whether the quote has an RFQ estimation line) by reading CRM with the signed-in person's own access, as the rest of the dashboard already does. A viewer who cannot read all quotes would see fewer quotes in the band.

### Deploy

- Commit 66e9b2f restores `index.html` and both test files from bea85bd. Both test files pass. The Pages run succeeded. Live `index.html` carries v62 and its SHA-256 equals the committed file.

### Live figures, read 17:51 to 17:52 Dubai

Page default dates (26 August to 25 September):

| Scope | Completed | Median | Within 6h | Still waiting |
|---|---:|---|---:|---:|
| All departments | 186 | 1d 0h | 69 (37%) | 75 |
| Building Services | 96 | 2d 1h | 27 (28%) | 61 |
| Home Maintenance | 70 | 17h 17m | 32 (46%) | 2 |

Sent for RFQ from 25 August, compared with the morning recount (history read 10:42):

| Scope | Morning | Live | Change |
|---|---|---|---|
| All departments | 186 · 1d 0h · 68 (37%) · 73 | 191 · 1d 0h · 72 (38%) · 76 | +5 completed, +4 within 6h, +3 waiting |
| Building Services | 93 · 2d 3h · 23 (25%) · 59 | 98 · 2d 2h · 27 (28%) · 61 | +5 completed, +4 within 6h, +2 waiting |
| Home Maintenance | 73 · 14h 55m · 35 (48%) · 2 | 73 · 14h 55m · 35 (48%) · 2 | none |

- 2 Building Services quotes that were waiting in the morning were completed during the day.
- 8 quotes were sent for RFQ after the morning read: 7 Building Services and 1 in another department. 3 of the Building Services ones are already completed, each inside 6 hours. The other 5 are still waiting.
- No wait disappeared and no completion time changed.
- The page's default window starts on 26 August, so quotes sent on 25 August are outside it. That is why the default figures differ from the 25 August figures.
- RFQ circuit: 108 quotes pending (103 over 6 hours) and 47 completions in the last 7 days.
- No quote counted by the band or the circuit was created before 1 May. The history starts on 16 July.
