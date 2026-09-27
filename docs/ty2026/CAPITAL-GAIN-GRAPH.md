# TY2026 capital-gain path and Schedule D work order

Source baseline: the pinned [2026 draft Schedule D](corpus/draft/f1040sd.pdf)
(SHA-256 `0df9af0711964b3198ea04bb0037b29d6afa85578a671553daed46251630b5f1`),
the pinned [2026 draft Form 1040](corpus/draft/f1040.pdf), and the
[2025 Form 1040 instructions](corpus/authorities/i1040gi--2025.pdf) as a
**prior-year comparator** for the direct box 2a exception. The draft 2026
1040 retains line 7a and the line 7b “Schedule D not required” checkbox;
the draft Schedule D retains capital gain distributions on line 13. Obtain
final 2026 instructions before treating the prior-year exception conditions
as a filing rule.

## Calculation and filing decision

| Fact | Existing route | TY2026 disposition and next code |
| --- | --- | --- |
| Plain Form 1099-DIV box 2a, with no other modeled capital activity | `f1099div_2026` → shared `schedule_d` direct-distribution branch → AGI, 1040 line 7a/7b, qualified-dividend/capital-gain tax, Form 8960 | Registered and graph/PDF tested. The 1040 line 7b checkbox is mapped to the pinned draft. Capture capital loss carryovers, other transactions, and QOF elections as public facts before the direct-filing decision can be complete. |
| 1099-DIV boxes 2b–2d and 2f | Schedule D line 13 plus unrecaptured §1250, §1202, 28% rate, or §897 work | The 2026 input rejects these nonzero amounts. Audit each worksheet, add source detail, then file Schedule D and any required statements. |
| 1099-B/1099-DA and Form 8949 transactions | Schedule D short/long-term lines 1a–10; Form 8949 attachments where basis/adjustments require them | Audit 2026 forms and the shared transaction schema, register sources together, and preserve proceeds, basis, dates, codes, and payer detail for PDF/MeF. |
| Capital loss carryover and other gain sources (Forms 2439, 4797, 6252, 4684, 6781, 8824, 8814, K-1) | Schedule D lines 4–6 and 11–14 | Add explicit prior-year carryforward provenance and each supported source route. A carryover or other capital activity disables direct 1040 reporting. |
| QOF deferral or inclusion | Form 8949 / Form 8997 and Schedule D | Add election and carryforward facts. Do not infer that no QOF activity exists merely because no current source node supplied it. |

The shared Schedule D calculator already distinguishes the direct
distribution case from a filed schedule and routes net capital gain into the
preferential-rate tax calculation. Its full TY2026 transaction, carryover,
and worksheet behavior remains `audit-required` in `node-coverage.csv`.
Registering it exposed a shared line 14 sign error: a positive long-term loss
carryover must reduce the long-term net gain. The existing Schedule D tests
cover this correction, and the TY2025 Schedule D MeF and PDF tests pass.
The current PDF boundary rejects nonzero 1040 line 7a when the direct-case
line 7b checkbox is false: the 2026 Schedule D attachment is not built yet.
The shared Schedule D print record currently hardcodes its QOF disposition
answer to `false`; TY2026 must collect the actual return-level answer before
that filed schedule can be enabled. Existing Form 8997 and Form 1099-B QOF
nodes are outside the dedicated 2026 registry. The direct box 2a case still
needs explicit return-level carryover and QOF facts to establish eligibility;
absence of a registered source is not an affirmative answer.

## End-to-end implementation order

1. Define public capital-activity facts: carryovers by origin year, QOF
   elections/inclusions/dispositions, and other transactions. Reconcile the
   entire return before deciding whether Schedule D is required; source-by-source
   absence is not proof of eligibility. Replace the shared node's hardcoded
   QOF disposition answer with the collected fact, and require affirmative
   evidence before taking the direct line 7b route.
2. Audit the shared Schedule D node against the final 2026 form and
   instructions, including lines 17–22, loss limits, Form 8949 aggregation,
   28% and unrecaptured §1250 gain worksheets, and AMT preferential rates.
   Register sources only with their corresponding calculation and print
   detail. Check interactions with QBI Form 8995/8995-A and Form 8960.
3. Build the TY2026 Schedule D and Form 8949 PDFs from their pinned drafts.
   Reconcile line 16/21 with 1040 line 7a, choose attachments from actual
   filing conditions, render the completed pages, and test continuation rows.
4. Map the same filed forms to the selected current TY2026 MeF schema and
   active rules, including document order, required attachments, and the
   direct line 7b election. The downloaded May v1 schema is research input,
   not an acceptance target.
5. Turn the 2026 ATS capital-gain examples into complete fixtures. Compare
   independently computed tax, Form 1040, Schedule D, Form 8949, PDF, and
   schema-valid XML; run TY2025 regression tests for shared node changes.
