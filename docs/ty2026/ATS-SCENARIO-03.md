# TY2026 ATS Form 1040 scenario 3 fixture contract

Source: pinned [18-page IRS scenario 3 packet](corpus/ats/1040-scenario-03.pdf),
SHA-256 `c52160656064f83aed27b72683d3247b654f3c81b30f02a4c50ac76041c1bc79`.
It is a draft packet with many calculation fields blank. Keep **printed
source**, **independent expectation**, and **application output** separate in
the executable fixture. Do not transcribe a blank as zero.

| PDF page | Printed source facts | Fixture route and verification |
| --- | --- | --- |
| 1 | Lynette Heather, SSN 400-00-1035, IP PIN 876534; born October 2, 1968; U.S. citizen; taxable state refund $4,089. She elects farm optional SE method, does not elect farm income averaging, is a patron of a specified agricultural cooperative, and reports no QOF investment. | Filer identity, prior-year state-tax benefit evidence for Schedule 1 line 1, optional-method election, Schedule J absence, cooperative/QBI evidence, and QOF answer. The packet states the refund is taxable; the executable fixture must preserve that explicit fact or derive it from a prior-year return. |
| 2–3 | Single, no dependents, Idaho address; digital-assets **Yes** and an IP PIN. Form 1040 income/tax/payment lines are largely blank. | Preserve the checked answers and independently calculate the whole 1040. The packet does not include a digital-asset source record; require an explicit source/answer reconciliation before filing. |
| 4 | Form 1099-R code 7: gross $57,766, taxable $49,568, federal withholding $4,980. | Dedicated 2026 1099-R → 1040 line 5a/5b and withholding line 25b. Do not treat the $8,198 difference as a new deduction or another distribution. |
| 5–6 | Schedule 1 is mostly blank; cover sheet supplies the taxable $4,089 refund. | Line 1 $4,089, line 5 from Schedule E, line 6 from Schedule F, line 15 from Schedule SE; reconcile line 10 to 1040 line 8 and line 26 to 1040 line 10. |
| 7–8 | Schedule 2 lines are blank. | Schedule SE line 12 must reach Schedule 2 line 4, line 15 and 21, then 1040 line 23. Any other tax needs its own source; a blank row does not prove zero. |
| 9–10 | Schedule D line 1a proceeds $15,234 / basis $12,768; line 8a proceeds $16,321 / basis $4,900; lines 18 and 19 show zero. No broker document or transaction rows are in the packet. | Independently derive short gain $2,466, long gain $11,421, total gain $13,887 to 1040 line 7a. Record that the summary is printed but the 1099-B/DA evidence is absent. A source-backed filing fixture needs broker statements or an explicit reconciled direct-summary source; do not invent trades. The gain may require the preferential-rate tax worksheet. |
| 11–13 | Schedule E Part I property rows and Parts II–IV activity rows are blank. Page 3 totals are blank. | The attached Form 4835 belongs on Schedule E Part V lines 40/42, then line 41 and Schedule 1 line 5. Do not create a rental property or K-1 activity from the blank Schedule E pages. |
| 14–15 | Schedule F: cash method, material participation Yes, no Form 1099 payments; line 1a $9,233, line 1b $0; expenses 11 $876, 16 $675, 17 $1,488, 26 $1,222, 28 $765. Other monetary lines are unfilled. | [Schedule F contract](SCHEDULEF-GRAPH.md): derive line 9 $9,233; line 33 $5,026; line 34 profit $4,207 to Schedule 1 line 6 and farm SE/QBI paths. Confirm checked boxes from the rendered page. |
| 16–17 | Schedule SE: farm optional method elected by the cover sheet; line 7 wage base $184,500, line 14 optional-method cap $7,560. Form lines 12/13 and optional line 15 are blank. | [Schedule SE contract](SCHEDULESE-GRAPH.md): gross farm income $9,233 is within the printed $11,340 eligibility test. Unrounded line 15 is two-thirds of $9,233 ($6,155⅓), below $7,560. Skip regular farm lines 1a/1b; the elected amount enters lines 4b/4c and drives SE tax and its half-tax deduction. The shared Schedule SE node currently has no optional-method input or calculation. Reconcile whole-dollar rounding with the current instructions and MeF rules. |
| 18 | Form 4835: active participation Yes, line 1 $19,233; expenses 9 $900, 14 $465, 15 $700, 22a $3,222, 26 $2,038; other monetary lines unfilled. | [Form 4835 contract](FORM4835-GRAPH.md): independently derive line 7 $19,233, line 31 $7,325, line 32 net income $11,908. Send line 32 to Schedule E line 40 and line 7 to Schedule E line 42. This farm rent is outside Schedule SE net farm earnings. |

The directly printed arithmetic gives a provisional Schedule 1 additional-
income total of **$20,204** ($4,089 refund + $4,207 farm profit + $11,908
farm rent). Together with $49,568 taxable pension and $13,887 capital gain,
that gives **$83,659 total income before adjustments**, assuming no other
source facts. AGI and final tax remain to derive after the farm optional
method, its deduction, preferential-rate tax, QBI/cooperative rules, and any
missing source evidence are settled.

## End-to-end acceptance order

1. Capture the page-level source facts, checked answers, and the packet hash
   in a typed fixture. Add provenance for the state refund and direct Schedule
   D summaries, or mark them as explicit ATS-only assumptions with filing
   acceptance still open. No synthetic 1099-B or 1099-DA transaction rows.
2. Complete the 2026 Schedule F, Form 4835 → Schedule E, farm optional
   Schedule SE, and Schedule 1/2 graph. Reconcile farm profit and farm rent
   separately; only the former enters Schedule SE.
3. Resolve the cooperative QBI fact using source records and the
   [QBI/cooperative contract](QBI-COOPERATIVE-GRAPH.md). The stated patron
   status selects Form 8995-A; the packet lacks the 1099-PATR/qualified-payment
   evidence needed for a numeric Schedule D (Form 8995-A) reduction. Calculate
   Schedule D (Form 1040)'s tax worksheet, 1040 tax,
   withholding, and settlement from the independent fixture facts.
4. Render all named 2026 attachments and the 1040, inspect checked answers
   and amounts, and reconcile line 7a, 8, 10, 23, and 25b to their sources.
   Match required attachment presence, not merely the final tax.
5. Build XML using the authorized current TY2026 MeF schema and business
   rules, including IP PIN and required attachment references. XSD/rule
   validation and the PDF check must cover the same calculated return.

The [May v1 drift review](MEF-V1-DRIFT.md) explains why the downloaded MeF
package cannot prove current TY2026 filing conformance. The packet is an ATS
fixture source; its blank computed fields are not expected zeros.
