# Current TY2026 household employment sources and Schedule H

The `household_employment` source is registered in the 2026 development graph.
It derives employer tax from a complete 2025/2026 employee/payment inventory,
then sends it to Schedule 2 line 17a and Form 1040 line 23. Employee wages and
withheld income tax do not become the employer's wages or withholding credits.
The complete target remains [SCHEDULEH-GRAPH.md](SCHEDULEH-GRAPH.md).

## Source ownership and annual rules

The claim binds its employer SSN to the filer or joint spouse and retains the
employer EIN, employee identities, relationship records, dated gross cash wage
payments, work states, W-4 agreements and employee W-2 records. It requires a
complete inventory and confirms that an agent or business employment return
has not already reported these taxes. Duplicate workers/payments and W-2
identity or wage mismatches are rejected.

The source derives each employee's $3,000 FICA threshold, $184,500 Social
Security wage base, uncapped Medicare wages and wages over the $200,000
Additional Medicare withholding threshold. Family and minor exclusions precede
these calculations. Employer totals round only after the per-worker limits.
The 2025 node and 2026 adapter share the extracted Part I and Section A tax
arithmetic; the existing 2025 source validator is preserved.

Current family support covers spouses, children outside an age-21 transition,
parents with no child in the employer's home, and documented parent care
exceptions applying throughout the service year. Parent exceptions reconcile
employer filing status and child age or incapacity with the reviewed household
circumstances. Unrelated minors need a student/principal-occupation review;
student minors remain FUTA workers even when their wages are exempt from FICA.
Changing family circumstances and child age-21 transitions need dated service
allocation and remain rejected.

Both years' eligible wages are grouped into calendar quarters before the $1,000
FUTA test. Each eligible worker's current wages are capped at $7,000. Section A
requires one state, all FUTA wages taxable by that state, a complete annual rate
and wage-base assessment, and matching payments by April 15, 2027. A zero
experience rate retains the 0.6% federal tax without inventing state payments.
Lower state wage bases, multiple states, late or unpaid contributions and other
Section B cases remain outside this contract.

## Authorities and current limits

The [2026 Schedule H instructions](https://www.irs.gov/pub/irs-dft/i1040sh--dft.pdf)
and [Publication 926 (2026)](https://www.irs.gov/publications/p926) establish the
annual thresholds and employer reporting. The pinned August 19 instruction
snapshot's Worksheet 2 still shows `0.0XX` for California and the Virgin Islands;
those states fail explicitly until final rates are sourced. Other Worksheet 2
states show zero in this draft, which is not final filing authorization.

Ordinary cash wages are supported. Employer-paid employee taxes, state
disability adjustments, noncash benefits, complex state assessments, changing
state rates, multiple employer EINs, standalone Schedule H returns and Section B
remain to implement. Full 2025 parity includes these outstanding source paths.

## Draft return and verification

The PDF builder replays the source, matches employer identity and Schedule 2's
household tax, and uses the pinned 72-widget draft at SHA-256
`0fbdf600ded379d23f381286a3f9b35d15af062c83072b50de149d5c5afb3077`.
It derives the A/B/C and line 9 answers and obeys their skip instructions.
FUTA-only returns leave Part I blank and put zero on line 25. Part I-only
returns leave the FUTA and total-tax page blank. Section A checks lines 10–12
Yes and line 27 Yes. The two official pages attach at sequence 44; the cover,
annotations and AcroForm tree are removed.

Tests cover the FICA threshold in cents, per-worker caps, prior-year FUTA
quarters, zero state rates, withholding-only family payroll, student minors,
parent exclusions/exceptions, duplicate/invalid records, state contributions
and ownership. Four full draft returns exercise FICA-only, Section A,
FUTA-only and withholding-only paths. They reconcile Schedule H, Schedule 2
and Form 1040 and verify static PDF structure. All 24 pages were reopened,
rendered and visually checked on October 15, 2026.

ATS scenario 1 prints $4,100 FICA wages and line 9 No but omits employee and
quarter details. Ordinary FUTA-eligible cash wages of $4,100 cannot fit in four
quarters all below $1,000. The regression uses an explicitly synthetic parent
care exception (FICA taxable, FUTA excluded) to independently reproduce $508
Social Security tax + $119 Medicare tax = $627. It does not assert that those
family facts were provided by the IRS packet. Actual scenario completion also
requires the missing source facts, Form 5695 and Form 1062, current MeF rules,
final forms and IRS ATS acceptance.
