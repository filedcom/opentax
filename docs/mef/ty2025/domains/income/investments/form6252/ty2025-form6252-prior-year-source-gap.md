# TY2025 Form 6252 later-year source reconciliation

The [October10 complete-return checkpoint](./ty2025-form6252-filled-review.md#october-10-principal-interest-and-later-year-complete-return-checkpoint)
adds a six-page final-payment return and a four-page interest-only return for a
reviewed2024 sale with30,000 earlier payments, including20,000 mortgage deemed
payment. Both retain Form6252, reconcile separately reported interest and final
tax, and pass full local XSD. Neither repeats the mortgage payment in2025.
They are part of six returns/38 reviewed pages and357 passing tests. This is
bounded synthetic evidence: the transcribed2024 form is not authenticated filing
proof, principal and interest have no shared receipt reconciliation (deferred128),
and zero-payment public holding-period validation differs from export (129).
Property code127, short-term Schedule D presentation130 and prior native
Schedule D completeness15 remain deferred. These findings do not close this gap.

The [2025 Form 6252 instructions](https://www.irs.gov/pub/irs-prior/f6252--2025.pdf) require Form 6252 in the sale year and each later payment year. Part II line 19 retains the gross profit percentage determined in the sale year. Line 23 includes all earlier money, fair market value, and deemed payments; interest or original issue discount belongs on a separate return line.

The bounded 2024-sale/2025-payment path now requires a reviewed 2024 Form 6252 line record, alongside the 2025 sale facts. The record identifies the property and dates and gives filed lines 16, 18, 19, 20, 22, 23, and 26. Calculation and native/PDF export reject mismatched identity, gross profit, contract, five-decimal ratio, deemed year-of-sale payment, prior-payment total, or prior recognized gain. A 2024 sale with no prior form record, and sales before 2024 without a longer filed history, reject. The 2025 final-payment fixture carries $20,000 of 2024 payments, $80,000 of 2025 payments, a 0.60000 ratio, and $48,000 to Schedule D and Form 1040; tampered ratio and prior-payment fixtures reject.

This record is a transcribed source reference, not authenticated accepted-return bytes. The existing later-year full-return fixture and two tamper cases were replayed on October8; the five-page filled packet and local XSD result are recorded below. Full native packet parity remains qualified. Current-year principal-versus-interest evidence, filed-source authenticity, related-party transfers, recapture, older sale years, IRS business rules, and ATS acceptance remain open.


### October8, 08:51 UTC — Form6252 existing later-year packet review

The existing `2024 land sale final payment joins 2025 Schedule D, Form 1040, native XML and PDF` source fixture was replayed through the current root public return graph, prepared native bundle, full local TY2025v5.4 Return1040 XSD and filled PDF builder. Actual generation tool exit0; five pages were rendered and visually inspected: Form1040 pages1–2, ScheduleD pages1–2 and Form6252. Printed identity/dates/related-party No/determinable-price Yes and the source's100,000 selling price/40,000 basis/60,000 gross profit/100,000 contract/.60000 ratio/20,000 prior payment/80,000 current payment reconcile. Gain48,000 reaches ScheduleD11/15/16 and1040line7a; wages75,000, AGI123,000, deduction15,750, taxableincome107,250, tax15,155, withholding11,000 and owed4,155 match the calculated graph. Tampered prior ratio and prior-payment total both reject with the existing source-conflict guard.

Private `form6252-later-year-review-20261008-v1/` retains the exact source/result, generator, XML, filled packet, five rendered pages and independent08:51:07 review. PDF SHA256 `7e8c1e4c51da62b88ec44007f249e1012a1cb93a2b585a1535d5b44c4147fd56`; XML SHA256 `1acfc0e91046250a2b6dac49c49ea25e39bc7e6621a25137516407dba6ce65a6`. Reopened flattened PDF has zero widgets, zero logical fields and no AcroForm; source/printed values, legibility and page order were inspected. All2,696 root runtime path sets/hashes remain exactly frozen. Official2025 Form6252 with integrated instructions was retained08:51:08, SHA256 `b2d42f3194dc715cc6c3e6ee3d168b5b8fb5cff6afd169940cf93d34a17e6a77`, [IRS source](https://www.irs.gov/pub/irs-prior/f6252--2025.pdf). The separate historical instructions URL returned unavailable; no separate instruction snapshot is claimed.

Full packet parity is **qualified**, not approved: native ScheduleD contains only `LTGainOrLossFromFormsAmt=48000`, omitting the printed15/16 totals and QOF/17/20 answers. This reproduces the already-deferred native ScheduleD completeness issue in `future_todo`; that issue remains unworked, with no new distinct TODO or frozen-board checkoff. The sale/payment/prior-form records are synthetic references, not authenticated ownership/payment/accepted-return evidence. Older sale years, interest/OID, related parties, recapture, source authenticity, matching BR and ATS acceptance remain open. No broad coverage/PDF readiness count is increased.

The PDF skill's initial Node marker invocation was unavailable in this shell; the same marker ran successfully under Deno after generation had started. This sequencing error is retained here; it changes no PDF or validation result. Previous turn committed retained historical-AMT source verification. This turn adds an actual full-return artifact review for the original Form6252 requirement while the serial root full regression continues. Main52 and future48 remain exact; latest candidate Form172 focused378/0 is unchanged, and no new full run or root runtime integration occurs.
