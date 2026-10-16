# TY2025 Form 4952, Schedule J, Form 8814 and Form 6251 source slice

The public source packet is `form4952ScheduleJChildInputs()` in
`forms/f1040/2025/domains/deductions/investments/form4952/form4952_schedulej_child.fixture.ts`. It retains the
previously reviewed Ada farm, engineering W-2, parent and child dividend,
Form 4972, and ISO facts. New facts are one owner-paid $100,000 loan directly
used to buy taxable shares on January 10, 2025, and two distinct $10,000
interest payments. The parent Form 1099-DIV is marked as investment property.
The election includes $15,000 of qualified dividends in investment income,
with zero of the $426 capital-gain portion selected. Source joins compare the
owner, lender and payment references, loan use, dividend owner and amount,
child election, regular and AMT Form 4952 copies, Schedule A line 9, and the
final Form 1040 and Form 6251 operands. Altered source facts and prepared
MeF/PDF fields reject.

Independently derived amounts for this packet are Form 4952 line 4a $36,574,
line 4b $30,787, line 4e $426, line 4g $15,000, and line 8 $20,000.
Form 1040 taxable income is $309,604. Its Schedule J tax is $71,159,
Form 6251 regular tax is $74,801, AMT is $47,530, Form 1040 line 16 is
$74,062, and total tax is $137,792. Removing only the Schedule J election
gives Form 1040 line 16 $77,569. Form 6251 Part III's preferential pool is
$16,213 after the Form 4952 election. The native Form 4952 line 4e includes
`investmentPropGainElectedCd="ELEC"` and elected amount `0`; its filled PDF
prints `Elec. 0` beside line 4e as required by the instructions on pages
3–4 of the [2025 Form 4952 PDF](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf). The
[2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
require a separately refigured AMT Form 4952 and a line 2c comparison;
both reviewed copies produce a zero line 2c adjustment here.

The final tracked source test is
`forms/f1040/2025/domains/deductions/investments/form4952/form4952_schedulej_child_source.test.ts`. Its retained
packet directory is `/tmp/opentax-form4952-schedulej-child-test-final-oct6`;
the filled PDF has 26 pages and SHA-256
`de80a0215a77e9690b7ced50c4dfde589107185f59b083006711442168331721`.
The full local TY2025 v5.4 Return1040 XSD validates its native XML.
The separately retained prototype versions document the PDF placement
correction; the final source JSON and PDF match the visually reviewed v4
packet exactly. Independent source-only Decimal arithmetic and all-page
review are recorded in `/tmp/opentax-4952-j-independent-review-oct6`.
The frozen typed source test passes 1/0 at
`/tmp/opentax-form4952-schedulej-child-test-final-oct6.log`.
An actual saved-source replay of the three earlier child-capital packets
passes 3/76 pages with exact normalized graph, carry, origins, and PDF;
native XML differs only in `ReturnTs`, and every replay validates against the
full TY2025 v5.4 XSD. Its result is
`/tmp/opentax-form4952-schedulej-child-prior3-replay-output-v2-oct6/report.json`.

This supports the actual current-year owner-paid taxable-share debt and equal
regular/AMT election shown. Other debt uses, multiple Form 1099-DIV owners,
sale sources, differing AMT refigures, prior-year interest carryovers, source
authentication, IRS business rules, and ATS acceptance remain open under the
existing parent tasks. No accepted-prior-return or issuer authentication is
inferred from reviewed reference strings.


## Main completion evidence

Main production ac5fd2bde/f6cb044a1 passed the normal28-module typed gate100/0(24m44s), log `/tmp/opentax-form4952-main-standard-oct6.log`. Shared output arguments allowed the older child-tax test to overwrite the new bare packet, so the original output/mapping failure is preserved under `/tmp/opentax-form4952-main-standard-qualified-oct6`. A separate normal focused gate passed1/0 and generated the exact reviewed26-pagepacket under `/tmp/opentax-form4952-main-isolated-ordinary-oct6`. Combined sixteen PDFs match262reviewedpages; all JSON values match and XML differs only byReturnTs. Final verifier `/tmp/opentax-form4952-main-standard-verify-v2-oct6.py` terminated0 and preserved89files. All49current runtime/test hashes remain unchanged. Main actual4-source replay already passed102pages/freshfullXSD and exactgraph/carry/origins/PDF;177integration+95actual-main+89ordinary=361physicallydistinct rehashedfiles. This closes only the described bounded slice.
