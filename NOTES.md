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
