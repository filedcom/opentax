# TY2025 Form 4972: sourced partial beneficiary annuity with NUA, death benefit, and estate tax

This extends the existing single-source partial beneficiary route for elected
NUA, a participant-wide death-benefit allocation, and a separately sourced
estate-tax allocation to include an annuity. Both Parts II and III must be
elected; the capital gain, NUA, death benefit, estate tax, and annuity must be
positive. The raw annuity amount, including cents, is preserved with its source
box 8 percentage. The grossed-up line 11 value is rounded to whole dollars. All
existing participant, plan, recipient, issued-copy, allocation, and calculation
preflights remain required.

Authority:
[2025 IRS Form 4972 and instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf),
page 3, multiple-recipient Steps 3-5, NUA and death-benefit worksheets; page 4,
lines 6, 9, and 18; and page 1, lines 11 and 20-29. Step 3 uses box 8's own
percentage for line 11. Step 5 applies box 9a to the difference between lines 25
and 28. The annuity percentage must not be substituted with box 9a.

## Positive fixture and worksheet

The synthetic issued-source facts are box 2a $20,000, box 3 $4,000, box 6
$4,000, box 8 $3,000 and 25%, and box 9a 50%. A $5,000 full death benefit is
allocated $2,500 to each of two identified recipients. Separate administrator
and estate-return references support a $48,000 full taxable distribution, $2,000
full estate tax, and $1,000 recipient estate tax. References are supplied facts;
this does not authenticate document bytes or verify issuer provenance.

NUA capital gain is $800; the death-benefit worksheet capital ratio is 0.2. Line
6 is $4,800 less $500 recipient death benefit allocated to capital gain and $200
recipient estate tax allocated to capital gain, or $4,100. Line 7 is
$820. Line 8 is ($20,000 - $4,000 + $3,200) / 50% = $38,400. Line 9 is the full
ordinary death-benefit allocation, $4,000. Line 18 is the full ordinary
estate-tax allocation, $1,600.

| Line |               Expected amount |
| ---- | ----------------------------: |
| 10   |                        34,400 |
| 11   |                        12,000 |
| 12   |                        46,400 |
| 13   |                        10,000 |
| 14   |                        26,400 |
| 15   |                         5,280 |
| 16   |                         4,720 |
| 17   |                        41,680 |
| 18   |                         1,600 |
| 19   |                        40,080 |
| 20   |                       0.25862 |
| 21   |                         1,221 |
| 22   |                        10,779 |
| 23   |                         4,008 |
| 24   |                           504 |
| 25   |                         5,040 |
| 26   |                         1,078 |
| 27   |                           119 |
| 28   |                         1,190 |
| 29   | (5,040 - 1,190) × 50% = 1,925 |
| 30   |           820 + 1,925 = 2,745 |

The return executor routes $2,745 to Form 1040 line 16, checks the Form 4972
indicator, and leaves pension taxable income at zero for this fixture. The
native full-return XML emits one IRS4972 with NUA and MRD annotations. The
flattened three-page filing packet includes Form 1040 and filled Form 4972; PDF
text checks assert the worksheet values and Form 1040 join. Pages 2 and 3 were
rendered with Poppler and visually inspected for legibility and placement.

## Verification and limits

`form4972_partial_nua_death_estate_annuity.test.ts` covers the positive return,
all line 10-30 amounts in native and PDF projections, the real packet, local IRS
2025v5.4 full-return XSD, and rejection of death/estate allocation changes,
colliding source references, changed issued copy/participant/recipient/NUA,
changed or missing box 8 percentage, changed box 9a, changed line 11 or 20-29,
and changed Form 1040 special tax. Execution also rejects missing annuity source
shares and removed elections. XSD verification is skipped only when the local
IRS schema bundle is unavailable.

Focused verification passed 5 tests, including both positive packets and the
local XSD checks. The Form 4972 calculator/reconciliation, native, PDF, XSD, and
public executor regression passed 127 tests with no failures. Existing
tamper assertions were updated to match the route error wording; their
rejections remain required. No whole-repository completion claim is made.

Artifact generation uses `FORM4972_EVIDENCE_DIR`; the reviewed local packet is
`/tmp/opentax-f4972-annuity-evidence/filled-return.pdf` and its matching XML is
`/tmp/opentax-f4972-annuity-evidence/full-return.xml`.

A second positive fixture preserves source box 8 $3,000.13 and 25%, rounds
$12,000.52 to line 11 $12,001, and uses line 20 0.25864, line 21 $1,221, line 22
$10,780, and the same $1,925/$2,745 final taxes. It exercises native, PDF, a
real filled packet, and the full-return XSD. These cents artifacts use the
`cents-` filename prefix in the same evidence directory. Cents support here is
limited to the annuity amount; the NUA, death, and estate allocations retain the
existing exact whole-dollar constraints.

This is one bounded synthetic beneficiary route. It does not open multiple
issued copies, trust-only recipients, arbitrary fractional allocations, or other
unsupported combinations; it does not establish IRS acceptance, authenticated
source documents, or general Form 4972 completion.
