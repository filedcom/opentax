# TY2025 Form 4972: unequal beneficiary shares and fractional allocations

## Source and rounding contract

The [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf), pages 2–4, require combining a participant's same-year distributions, grossing cash up by box 9a and annuity value by its separate box 8 percentage, and multiplying the full Part III residual tax by box 9a for line 29. The NUA and Death Benefit Worksheet ratios and form line 20 permit at least three decimal places; this route uses five. The Death Benefit Worksheet ratio also allocates estate tax between capital and ordinary income. [2025 Form 1040 rounding instructions](https://www.irs.gov/instructions/i1040gi) allow whole-dollar filing, with cents retained when combining amounts before rounding the total. [2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf), pages 10 and 16, identify the beneficiary as recipient and distinguish cash and annuity percentages.

The public election retains the existing owner, participant, plan, issued-copy and complete-distribution evidence. It cannot supply replacement boxes or percentages. Issued cents remain in source pending, including taxable cash $10,000.49/$10,000.51/$10,000.53, pre-1974 capital $2,000.51/$2,000.53/$2,000.55 where applicable, NUA $2,000.49/$2,000.51/$2,000.53 and annuity $1,500.49/$1,500.51/$1,500.53 where applicable. Each copy's gross cash equals taxable cash plus NUA at cent precision. Source money must be cent-valued; partial-source subcent issued money is rejected. Cash shares are 37.5%, 62.5% and 33.333%, with annuity shares 22.5%, 17.125% and 41.375% independently retained.

Administrator exclusions and estate amounts are also retained monetary facts, with separate statement references. The $4,999.99 full death exclusion uses a complete reciprocal recipient inventory. For the 33.333% recipient, its proportional $1,666.6466667 reconciles to the stated $1,666.65; the complementary recipient has $3,333.34, conserving $4,999.99. Estate tax is $2,000.03 with a separately stated recipient allocation and cent-valued full taxable distribution. Proportional source allocations and gross-ups are reconciled at cent precision, without requiring their mathematical intermediate values to be integers. Filed lines are computed from retained issued cents and the worksheet ratios, then rounded to dollars. The complete inventory must still conserve the full exclusion.

A separate issued-cash boundary packet has $82,475.84 at 33.333%, no NUA, annuity, death exclusion or estate adjustment. Its full line 8 is $247,430. Lines 23/24/25 are $24,743/$5,000/$50,000; recipient line 29 is $16,666.50 rounded to **$16,667**. Binary multiplication can produce $16,666.499999999996 and round down incorrectly. Decimal integer quotient arithmetic now protects this boundary in calculation and PDF reconciliation. The five-place worksheet monetary arithmetic retains seven decimal places internally (two source money places times five ratio places). Source percentages are parsed as their decimal values. Native Form 1099-R converts the issued percentage into its decimal fraction by shifting its decimal point, preserving 33.333% as 0.33333 without binary tails or silently rounding a more precise issued percentage to fit MeF.

## Actual public packets and independently expected results

There are 17 complete alternative reviewed public source returns (not simultaneous filings for one beneficiary): every retained two-copy death/estate/NUA/annuity combination, two single-copy combined routes, a three-copy combined route, and the actual half-dollar tax boundary. All claim the same identified beneficiary's issued distribution. Each emits one IRS4972 and the actual number of issued IRS1099R copies (32 source copies across the family), and has three filled PDF pages: Form 1040 pages 1–2 and Form 4972 page 3. The tax reaches Form 1040 lines 16 and 24 exactly once; elected pension income is absent from line 5b.

The checked-in expected JSON was computed separately with Python Decimal from the official worksheets and tax schedule, without importing the TypeScript calculator. All defined/omitted lines 6–30 and both NUA annotations are checked; native monetary tags for lines 6/8/11/20–30 are checked independently as well. The independent oracle, inputs and output are preserved with the artifact snapshot.

| Source case | Line 6 | Line 8 | Line 11 | Line 20 | Line 29 | Line 30 / 1040 tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `single-tax-half-33333` | — | 247430 | 0 | — | 16667 | **16667** |
| `two-death-estate-nua-annuity` | 3876 | 46934 | 6669 | 0.13445 | 1841 | **2616** |
| `two-estate-nua-annuity-part3` | — | 35202 | 6669 | 0.15927 | 2244 | **2244** |
| `two-death-nua-part3` | — | 66005 | 0 | — | 2620 | **2620** |
| `two-estate-nua-part3` | — | 58671 | 0 | — | 2678 | **2678** |
| `two-death-nua` | 3776 | 28160 | 0 | — | 1050 | **1805** |
| `two-estate-nua` | 4268 | 52801 | 0 | — | 2047 | **2901** |
| `two-death-estate-nua` | 3876 | 46934 | 0 | — | 1673 | **2448** |
| `two-death-annuity` | — | 32002 | 6669 | 0.19806 | 1588 | **1588** |
| `two-estate-annuity` | — | 60004 | 6669 | 0.10003 | 2617 | **2617** |
| `two-death-estate-annuity` | — | 53336 | 6669 | 0.12124 | 2171 | **2171** |
| `two-death` | — | 32002 | 0 | — | 1306 | **1306** |
| `two-estate` | — | 60004 | 0 | — | 2460 | **2460** |
| `two-death-estate` | — | 53336 | 0 | — | 1991 | **1991** |
| `single-all-33333` | 1934 | 28801 | 8762 | 0.26106 | 710 | **1097** |
| `single-all-375` | 1876 | 25601 | 6669 | 0.2359 | 585 | **960** |
| `three-all-625` | 5927 | 43521 | 7253 | 0.15506 | 2738 | **3923** |

## Verification and artifacts

Final source/native/full local TY2025 v5.4 Return1040.xsd/PDF gate passes **15/0 in 1m14s**, including thirteen standalone native 1099-R tests and both source packet/conflict tests (`/tmp/opentax-form4972-fractional-current-terminal.log`). The earlier dedicated final 17-packet source gate passes **2/0 in 1m8s** (`/tmp/opentax-form4972-fractional-full-source-terminal.log`); the expanded independent native-field/copy-inventory assertions pass **2/0 in 1m12s** (`/tmp/opentax-form4972-fractional-inventory-terminal.log`). The 36-file prior-route preservation gate passes **298/0 in 3m19s** (`/tmp/opentax-form4972-fractional-preservation-terminal.log`). The final decimal-shift native formatter refinement was subsequently covered by the 15/0 gate; no tax arithmetic changed after the preservation run. Twelve changed TypeScript/JSON files pass formatting checks and `git diff --check` is clean.

All 17 complete packets and 51 pages are preserved at `/tmp/opentax-form4972-fractional-terminal-evidence`, with original source JSON, complete XML, flattened PDF, extracted text, renders, the independent Decimal oracle, and manifest `source-xml-pdf-render-manifest.json`. The snapshot has **32 actual issued native 1099-R copies**, 17 actual IRS4972 copies, and expected page origins recorded independently from the public inputs. Every PDF is reopened with zero fields and zero Widget annotations. All 48 pages of the first sixteen packets were inspected in contact sheets, with enlarged combined Form4972 pages for single33.333%, two-copy37.5% and three-copy62.5%; all three new tax-boundary pages were inspected, with enlarged Form4972. The final sixteen prior fractional source JSONs and PDFs remain byte-identical to those already reviewed; their XML differs only by ReturnTs. Their earlier48 source/XML/PDF artifacts remain unchanged in `/tmp/opentax-form4972-fractional-source-evidence`. Render log: `/tmp/opentax-form4972-fractional-terminal-render.log`.

The older two/three-copy 50% cash/25% annuity source inputs also remain semantically identical and both previously reviewed PDFs retain their exact hashes (`cbd76317c9c4170c40a79a5b2c1fa234200bf4ef24a78bcb4e20c6e37c995b49`, `5a7534a1a45456b272a5b2e1051dd6087fc2cc05e53c3f805294fdef867ae7c1`); their XML changes only ReturnTs. Compared with their older retained pending JSON, current main adds only `form4972.source_forms[0].recipient_ssn`, derived from the same actual issued recipient SSN123456789. The original older files are retained. Both this comparison and the sixteen-packet byte comparison are in the terminal snapshot.

The negative proof has 57 labeled finalized-return mutations, each tested in native preparation and direct PDF rendering (114 rejection assertions), plus three public-input rejects. They cover one-cent detached taxable/gain/NUA/annuity sources, cash and independent annuity percentages, source recipient and participant, duplicate issued references, death/estate source allocations and full amounts, subcent source money, individual worksheet lines and finalized Form 1040 special tax. The before-graph old multi-copy negative that increased a valid issued capital box by $1 formerly failed only because it created a nonintegral NUA split. That input is applicable after this repair; the negative now makes box 3 exceed box 2a. Changed-box export mutations continue to reject against retained calculated fields. No meaningful detached-source mutation was removed.

## Remaining boundaries

This proof does not complete the Form 4972 parent. Different box 9a percentages across one participant's issued copies remain guarded: the current source model has one full cash pool and one cash share and does not establish a different-pool weighting interpretation. Separate partial-beneficiary spouse groups, arbitrary penny-residual administrator apportionment schemes, percentage precision beyond native MeF's representable fraction, other unsupported election combinations, issuer authenticity and prior-election history are not established by these packets. Full-share and spouse routes keep their existing source restrictions; this is not a claim of global source-cent support. Schema validation is local XSD validation, not IRS business-rule, ATS or filing acceptance. No main, board, catalog or PR changes were made.


Terminal manifest SHA-256: `4fee7ab230c79332a3940fb5cc69ae10cd34e033a9ab7358a8d177bcdec49b35`.


Historical development failures are retained: the first source test compile failure, the first full-source XSD failure caused by the binary percentage tail (`/tmp/opentax-form4972-fractional-full-source-v2.log`, 1/1), and the initial compatibility 9/1 caused by the formerly nonintegral-Nua negative (`/tmp/opentax-form4972-fractional-initial-compat.log`). Intermediate preservation attempts were stopped for known repairs and are not reported as green. The terminal logs above supersede those checkpoints.
