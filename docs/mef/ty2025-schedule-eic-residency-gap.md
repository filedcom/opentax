# TY2025 Schedule EIC child residency projection

The [2025 Schedule EIC](https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf)
line 6 asks for the number of months a qualifying child lived with the filer
**in the United States**. The
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require more than half-year U.S. residence for the qualifying-child EIC, subject
to their stated exceptions.

`general.dependents` records actual calendar `months_lived_with_you_in_us`
separately from `months_in_home` and the U.S. residency Boolean. An ordinary
qualifying child needs an explicit 7–12 U.S.-month answer no greater than home
months. For a child born during 2025, a reviewed birth record, U.S. home record,
verified residence with the filer from birth through December 31, and verified
survival through December 31 support the narrower full-life birth route. The
actual months must equal the calendar months from the birth month through
December; the native MeF and filled PDF then print **12** on line 6 as the
Schedule EIC instructions require. A second, explicitly reviewed birth route
records one continuous U.S. home interval within the child's lifetime in 2025.
Its inclusive days must exceed half of the days from birth through December 31,
and both actual-month fields must equal the calendar months in that interval.
The native and PDF line 6 also print **12** for this narrower partial-life case,
as the [2025 Schedule EIC](https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf)
directs. Form 1040 dependent residency uses the same reviewed birth fact. An
EIC candidate born late in 2025 with an affirmative
U.S. residency answer and no birth review fails calculation so the return does
not silently become childless EIC. An inconsistent review cannot manufacture
residence months beyond the birth date.

The calculated EIC child detail retains the actual months and review. The
shared export preflight matches them and the residency Boolean to exactly one
general child source alongside SSN, name, relationship, date of birth, and home
months. Repeated EIC child SSNs fail calculation and both exporters. A
source-backed three-child fixture exercises ordinary 12 and 8 months plus a
December-born child with one actual month and printed 12, including TY2025
schema validation and a rendered filled PDF review.

The three-child source audit also found that a child's SSN could equal the
taxpayer's SSN and still reach the EIC graph and PDF projection. The general
EIC child selection now rejects an SSN reused by the taxpayer or spouse; the
shared final-export source check rejects a child SSN reused by the filer or
joint spouse before either native or PDF filing. A source-preserving
three-child graph/PDF/XML case validates against the local TY2025 v5.4 XSD;
negative cases cover a taxpayer collision in calculation and both filer and
joint-spouse collisions at final export. The native Schedule EIC serializer
already rejected filer/spouse collisions; the added shared check closes the
PDF/final-bundle gap.

Final export also replays the ordered, capped three-child Schedule EIC roster
from the parsed general source. It rejects an EIC attachment that drops an
eligible child or changes child order while leaving the EIC amount intact.
Both native and PDF builders use this check. A focused three-child case with
Ada at 12 actual U.S. months, Ben at 8, and December-born Cora at 1 rejects
a forged Ada/Cora-only attachment. The positive review fixture now includes
the W-2 employee SSN matching its filer, so its withholding evidence can
reach final-bundle and local XSD validation.

A post-calculation residence audit confirms that native and PDF final export
reject source-only changes to Ben's U.S. months or U.S. residence status through
the Form 1040 dependent-source check, and reject an EIC-row-only month change
through the EIC source check. Changing the filed child count to zero while
retaining the child-based EIC is already blocked by the Form 1040 childless EIC
source check. These checks replay the retained source; they do not authenticate
the original residence record or detect a coordinated rewrite of every source
and filed projection after calculation.

The dated ordinary-child route below now models the printed **7** when reviewed U.S. home days exceed half the year but the actual calendar-month count is six. The multiple-period birth route below now covers separated U.S. home intervals totaling more than half of2025 life. The printed **12** for a child deceased in2025 who met the special home test remains unmodeled. Kidnapping and other special residence rules also need their own
reviewed facts. A record reference is not authentication of the source
document; source-document authentication remains open. The official
[TY2025 IRS ATS Scenario 5](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf)
shows 12 U.S. months for both qualifying children used by the corresponding
source fixture. Other synthetic fixtures explicitly state their own U.S. month
count.

## October 8 — dated ordinary-child residence and printed seven

The existing ScheduleEIC residency requirement now has an isolated source-backed implementation for reviewed2025 U.S. home intervals. The strict review binds the child's SSN and each period's actual start/end date, retained record reference and verified residence with the filer in the U.S. The intervals may be entered in either order, but overlapping or repeated days reject; exact inclusive days must exceed half of365. Distinct calendar months must equal the child's actual U.S.-month answer and cannot exceed home months. The ordinary review requires a child born before2025 and cannot coexist with a birth review. These structured assertions do not authenticate residence records.

The general-source child/dependent selection replays the dated review, retains it through the calculated EIC child schema, and the final source check compares the exact review. Both registered native/PDF ScheduleEIC use the same line6 conversion. July2–December31 gives183days/six actual months and prints7; July3–December31 gives182days and rejects. Split periods preserve day/month totals without double counting. The existing [2025 ScheduleEIC](https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf) line6 directs seven for more-than-half-year residence under seven months.

Normal typed six-module gate finished **14:42:31UTC, actualexit0,103/0**, SHA `58f88f6b8b849d7e0873d03216d041e95c1fff398b27229b10fe9291e9e37fb1`. Four actual complete returns pass retained TY2025v5.4 Return1040 XSD: continuous/split residence for a retained dependent and a reviewed custodial release. Altered/deleted source/child copies reject native and PDF. Day-boundary, duplicate/overlap, invalid/reversed dates, child-identity and month conflicts reject. Private `eic-dated-residency-20261008-v2/` retains command/runtime/terminal/XML evidence. The preserved firstgate ended100/3 because the new retained-dependent fixtures lacked the complete existing8812 credit-limit workpaper and an undefined projected field changed the legacy shape; complete source inputs and conditional optional projection resolved them without weakening guards.

Four prepared-bundle-bound complete PDF packets finished **14:42:52UTC, actualexit0**, SHA `14d4ac4e8f7bd27ee7b64c02bcafea13b99c5ddb0a951dc350ece677391263ba`; **all12 pages directly reviewed**. Each contains two1040 pages and oneEIC page, with AdaExample/111223334/2017/DAUGHTER and printed7 legible. Actual source remains six months. AGI15,000, standarddeduction15,750, zero tax, EIC4,328, withholding1,500 andrefund5,828 reconcile. The custodial-release child is absent from1040 dependents; the retained dependent has home/U.S./CTC indicators, with no ACTC elected. Original-bundle PDF rejects a changed review reference in allfour cases. These existing filler outputs are flattened, with zero widgets/canonical fields; no interactive claim. Private `eic-dated-residency-print-20261008-v1/` preserves source/pending/filer/origins/XML/PDF/text/images/hash inventory and completed review.

Candidate2,725 runtime paths differ from frozen root by two new andfour changed files. Root's2,723-path serial full remains live and unchanged; root integration and its later serial-full validation are pending. No broad main checkbox, aggregate packet count, future item, source-authentication or IRS acceptance claim changes. Remaining birth/death/kidnapping and other applicable special-source requirements above remain open.

## October 8 — multiple actual birth-year home periods

The existing birth/residency requirement now has an isolated strict review with retained birth reference, verified survival throughDecember31 and an inventory of actual U.S. home periods. The shared period replayer validates each2025 date/reference/verified-with-filer fact, rejects dates before birth and overlapping/repeated days, sums unique inclusive days and counts actual calendar months. Total home days must exceed half the child's2025 lifetime, and both actual-month answers must match that inventory. The [2025 Form1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), EIC exception on printedpage43, use more than half the time alive; [ScheduleEIC](https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf) directs printed12. Existing ordinary-child and continuous birth contracts remain distinct and source-replayed.

Normal typed seven-module gate finished **14:50:16UTC, actualexit0,107/0**, SHA `765423672a5a0765b484d5f8324de0c8abc0cf456371c40f6f2ab2a5dbb6cca5`; this supersedes103 without addition. Four ordinary-child full native cases repeat and three new complete birth-period returns pass retained TY2025v5.4 Return1040 XSD. December21/31days, boundary16/31days andNovember32/61days qualify;15/31days, overlap/duplicate, prebirth/invalid dates and changed actualmonths reject. Changed source-only reference or removed child review rejects native and PDF. Private `eic-birth-periods-20261008-v1/` retains command/runtime/terminal and seven exact original/retained XML pairs.

Three original-prepared-bundle complete PDF packets finished **14:50:53UTC, actualexit0**, SHA `56afaff6d7552b0fe631a68d5e0a5b0e89226b976b82aa4a1cba5963442248e3`; **allnine pages directly reviewed**. Each contains two1040 pages and onethree-childEIC page. Ada/Ben/Cora names, SSNs, birthyears and relationships reconcile; printed months12/8/12 retain youngest actualmonths1/1/2. Allthree dependent home/U.S./CTC marks reconcile to source, with noACTC elected; AGI15,000/deduction15,750/zeroTax/EIC6,761/withholding1,500/refund8,261 agree. Changed youngest review-reference against each originalbundle rejects. The existing flattened filler has zero widgets/canonical fields; no interactive claim. Private `eic-birth-periods-print-20261008-v1/` preserves snapshots/origins/native/PDF/text/images/digests and completed review. The previous four ordinary packets remain evidence at their named103/0 revision, not fresh birth-gate renderings.

Independent14:52:31UTC audit verifies candidate2,726 exact focused paths and frozen root2,723 exact live-full paths, seven XML pairs and three packet XSDs; main52/future57 remain unchanged. Root integration and the subsequent serial full remain pending. Death, kidnapping, adoption/other special-source rules, wider ownership/filer combinations, external source authenticity, BR and IRS acceptance remain open. This advances the existing requirement without a broad checkoff, aggregate count increase or future implementation.
