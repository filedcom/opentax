# ATS cover-sheet attachment inventory — October 12, 2026

All eight TY2025 Form1040 scenario covers were downloaded, rendered and visually
reviewed. The executable inventory now retains each cover’s SHA-256 digest,
page number and exact named binary attachments. This completes the cover-sheet
inventory for the existing ATS matrix task; conditional form-level requirements,
statement contents and complete scenario preparation remain open.

| Scenario | Named binary attachment on cover page 1 | Current observation |
| --- | --- | --- |
| [1040-01](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-1-12012025.pdf) | No binary attachment named on cover | No cover requirement; conditional requirements remain open |
| [1040-02](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-2-12012025.pdf) | Nonresident Spouse Choice Statement | Preparation blocked; attachment not evaluated |
| [1040-03](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf) | No binary attachment named on cover | No cover requirement; conditional requirements remain open |
| [1040-04](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-4-10212025.pdf) | Transfer Election Statement | Missing from prepared partial packet |
| [1040-05](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf) | No binary attachment named on cover | No cover requirement; conditional requirements remain open |
| [1040-08](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-8-10212025.pdf) | No binary attachment named on cover | No cover requirement; conditional requirements remain open |
| [1040-12](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-12-10292025.pdf) | No binary attachment named on cover | No cover requirement; conditional requirements remain open |
| [1040-13](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-13.pdf) | No binary attachment named on cover | No cover requirement; conditional requirements remain open |

The Scenario 2 statement was already described in the source facts but absent
from the executable attachment ledger. Its addition gives **201 observations**,
including two attachment rows: one missing (Scenario 4), one unevaluated
(Scenario 2). All 200 prior ledger rows remain identical as JSON objects.
Calculation matches and the **about 75% individual-check estimate (50–85%
judgment range)** are unchanged.

An empty reviewed cover list is distinct from an uninventoried list. Neither
establishes that all conditional requirements are resolved. A blocked packet
has unknown attachment presence even with an empty cover list. The replay now
exposes `completeRequirementsInventoried: false` explicitly for every scenario,
and keeps cover provenance alongside the observed manifest records. No blank
or fabricated statements were generated, and no filing guards were changed.

Source packet digests:

| Scenario | PDF pages | SHA-256 |
| --- | ---: | --- |
| 1040-01 | 14 | `fb6054bf4417094f0c102bd47b7d021596143929d6789f1971912994e3738cd3` |
| 1040-02 | 12 | `1d94fce66edb816fe780e532a88d998617eb20d9edc3cf9a36355fa0c5236689` |
| 1040-03 | 17 | `29fb04a95cb926bf9157c9e8f5b4c35c806ec83dfa995412866da3394a8715ce` |
| 1040-04 | 21 | `190429244b03144c5952cfdac0df812e87bfcc16872b55c10f2d766b2d09faba` |
| 1040-05 | 17 | `2ecfd873224b8d1e0912caa68682f3b06a8887565205808e0ed8777cc408c779` |
| 1040-08 | 5 | `3016890611382ee3ae9876b7cd8c81260bcf8e1b611920aac82611fd52e02fae` |
| 1040-12 | 15 | `f0bfcfda3c29e216687ba74c78a5c73f33d11487f82aab0808ee9cd128146c83` |
| 1040-13 | 9 | `254ae93adb93791c3ac7257bf7de404d4b962bfa2e56da9d49d19c33fba265c1` |

The eight observed pages are IRS source covers, not generated return/PDF output;
they do not increase complete-return or qualified-output-page counts. No new
deferred task or repair is added. Existing 52 main TODOs and 161 future items
remain unchanged.

Evidence: `.state/research/ats-attachment-inventory-2026-10-12/` retains all
downloaded packets, extracted text, rendered covers, visual-review hashes,
before/after ledgers and the typed test log.

The full ATS directory passes **81 typed tests, zero failures or ignored tests**.
Focused lint and diff checks pass.

Reproduce with `deno test -A forms/f1040/e2e/ats` and
`deno run -A forms/f1040/e2e/ats/ty2025-check-ledger.ts /tmp/ats-ledger.json`.
