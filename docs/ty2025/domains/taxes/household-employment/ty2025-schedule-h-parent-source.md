# TY2025 Schedule H parent payroll source proof

The complete household employee inventory now retains an actual parent
relationship beside unrelated, child and spouse employees. Parent wages remain
excluded from the FUTA quarterly test and per-employee wage cap. FICA is derived
from the parent exception's household and service-quarter circumstances.

[2025 Schedule H instructions, line A and parent exception](https://www.irs.gov/pub/irs-prior/i1040sh--2025.pdf)
and [2025 Publication 926](https://www.irs.gov/pub/irs-prior/p926--2025.pdf)
require a child of the employer living in the home, under 18 or needing adult
care for four continuous weeks in the service quarter, together with the
employer's qualifying divorce, widowhood or incapable resident spouse.
The source contract records those facts; it does not substitute a claim that
the parent performed child-care duties for the statutory household conditions.

A reviewed no-child-in-home source permits the general parent exclusion.
Otherwise four distinct quarterly reviews join child birth/relationship and
residence, employer marital continuity or spouse identity/residence/medical
periods, and a dated cash-payment ledger. Medical periods must cover at least
28 inclusive continuous days within the service quarter. Payment-quarter totals
and annual cash wages reconcile independently of service-quarter qualification.
The $2,800 test applies to qualifying cash wages; W-2 Social Security/Medicare
wages match that result, including the per-worker Social Security limit and
Additional Medicare threshold. Actual income tax withholding needs its W-4
agreement and is included even when FICA and FUTA exclude wages.

Native export joins year-end spouse facts to the current filer identity and
filing status, retained payroll inventory, actual Schedule 2 line 9/21, and
Form 1040 line 23. Direct PDF export uses that same native source validation.

## Independent full-return cases

Every case includes the actual unrelated workers and a parent, rather than
renaming the parent as an unrelated employee.

| Source circumstances | Schedule H tax | FUTA tax |
| --- | ---: | ---: |
| No child of employer living in the home | 728 | 0 |
| Divorced employer, child under 18 | 1,493 | 0 |
| Widowed employer, adult child with qualifying care periods | 1,493 | 0 |
| Resident incapable spouse, child under 18 | 1,493 | 0 |
| Adult-child care and spouse incapacity in two quarters | 1,490 | 0 |
| Never-married employer, child under 18 | 728 | 0 |
| Only $2,000 qualifies, below the $2,800 threshold | 878 | 0 |
| Qualifying parent plus unrelated FUTA payroll | 1,579 | 24 |

The final case has $4,000 FUTA wages, excluding all parent wages. The two-quarter
case has $4,000 of the parent's $8,000 wages subject to FICA, combined with
$2,800 unrelated FICA wages and $450 withholding. Tax is $843 Social Security,
$197 Medicare and $450 withholding. Source tests independently assert these
amounts, actual Form 1040 joins, native fields, PDF page inventory and full
cached TY2025v5.4 XSD.

Negative cases reject 27-day or out-of-quarter medical periods, duplicate
quarters/payments, unreconciled amounts, a cross-quarter service row, a marital
event after its claimed full-quarter start, employer/child identity collision,
wrong or missing parent FICA W-2, missing withholding agreement, parent wages
included in FUTA, substituted relationship references, forged Schedule 2 tax,
and a mismatched return spouse.

## Retained evidence and limits

The initial diagnostic source claimed no parent child-care work. That predicate
was insufficient and remains separately retained at
`/tmp/opentax-scheduleh-parent-before-source-oct6.json` with its original failure.
The corrected no-child-in-home source was saved before implementation at
`/tmp/opentax-scheduleh-parent-before-source-v2-oct6.json`; it has exactly the same input content to the final excluded case's inputs. The first typed test failed
because its negative mutation did not narrow the worker union; that log remains
at `/tmp/opentax-scheduleh-parent-focus-oct6.log`. The corrected source focus
passed **2/0 (37s)** at `/tmp/opentax-scheduleh-parent-focus-v2-oct6.log`.

Eight saved full returns are at `/tmp/opentax-scheduleh-parent-evidence-v2-oct6`.
All **41 pages** were rendered and reviewed in
`/tmp/opentax-scheduleh-parent-rendered-oct6`; full-size review included partial
and widowed FICA pages and both FUTA pages. The root review manifest is
`/tmp/opentax-scheduleh-parent-root-review-oct6.json`. These are the repository's
existing flattened packets; reopening verified zero widgets and zero canonical
AcroForm fields. No source PDF was changed. All 24 new JSON/XML/PDF originals
were privately copied with distinct inodes; 60 prior originals and private
copies were rechecked in `/tmp/opentax-scheduleh-parent-all84-preservation-oct6.json`.

Partial-quarter residence or marital-event histories, services spanning a
child's 18th birthday without separately sourced periods, prior-year services,
other wage forms and wider state/rate/employer combinations remain guarded or
unfinished within the existing Schedule H parent task. Reviewed synthetic source
facts and preservation hashes do not authenticate issuers or medical signatures.
Local XSD does not establish IRS business-rule or ATS acceptance.

The final twelve-module payroll standard passed **56/0, zero ignored (2m5s)**
at `/tmp/opentax-scheduleh-parent-standard-oct6.log`. Actual saved-source replay
passed **24 returns / 125 pages** at
`/tmp/opentax-scheduleh-parent-final24-raw-oct6/report.json`, using the sibling
`.ts` reader and `...-raw-v2-oct6.log`: 21 newer archives have exact pending,
prepared pending, carryforwards, origins, source and PDF; three October 4
archives retain the prior documented historical comparison and intentional
employer-name correction. Every packet has XML equality except ReturnTs and
full XSD. Original archives were read directly and were never regenerated.
The first raw command lacked the repository import config and stopped before
execution; its log remains separately retained. The final command used
`deno run --config deno.json` with read/write, xmllint and IRS permissions.
