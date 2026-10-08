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

The dated ordinary-child route below now models the printed **7** when reviewed U.S. home days exceed half the year but the actual calendar-month count is six. The multiple-period birth route below now covers separated U.S. home intervals totaling more than half of2025 life. The deceased-child route below now prints **12** for a reviewed2025 lifetime/home test with a valid SSN; the distinct born-and-died missing-SSN/required-document route is deferred in future58. Kidnapping and other special residence rules also need their own
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

## October 8 — reviewed deceased-child lifetime with a valid SSN

An isolated strict death review now binds the actual child's SSN, birth/death source references,2025 death date and actual verified U.S. home periods. Birth and death dates must be valid, birth cannot follow death, and home periods must lie inside the child's2025 lifetime. The shared period replayer rejects overlap/repeated days; inclusive residence days must exceed half of inclusive life days, with matching actual home/U.S. calendar months. Death, survival-to-year-end birth and ordinary full-year reviews cannot coexist. General dependent/EIC selection retains and replays the review, and both final exporters require its exact source copy. Native/PDF line6 prints12 while actual months remain unchanged. [2025 Form1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf) printedpage43 and [ScheduleEIC](https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf) provide the lifetime/printed-value rule. Reviewed structured references are not authenticated birth/death/home bytes.

Normal typed eight-module gate finished **14:59:36UTC, actualexit0,112/0**, SHA `5b79d1f501207c89a4beeca54b1ed9810a8722ab44d5da6f46296dab4b3c68e7`, superseding107 without addition. Eleven actual whole native returns pass retained TY2025v5.4 XSD: seven prior ordinary/birth-period cases repeat andfour new valid-SSN deceased-child cases execute. Older child30/59days, same-year birth/death6/10days, separated16/31days andone-day lifetime qualify;29/59 and5/10 do not. Invalid/reversed birth/death dates, prebirth/postdeath residence, repeated days, wrong SSN, blank death reference, conflicting lifetime reviews and changed month counts reject. Missing SSN explicitly rejects this new reviewed route in public execution. Removed child review and source-only reference changes reject native andPDF. Private `eic-death-residency-20261008-v1/` retains command/runtime/terminal andeleven exact native byte pairs.

Four original-prepared-bundle full PDF packets finished **15:00:03UTC, actualexit0**, SHA `3df3103e06e9b0ef9229df5556113979b583aaf7a7b7a000c07db3d0a7236d3f`; **alltwelve pages directly reviewed**. Each has two1040 pages andoneEIC page, proper Ada/Ben/Cora identity/year/relationship and printedmonths12/8/12. The deceased-child source retains one actual month, deathdate and home periods. Dependent home/U.S./CTC marks agree; noACTC elected. AGI15,000/deduction15,750/zeroTax/EIC6,761/withholding1,500/refund8,261 reconcile. Allfour originalbundles reject changed death references. Existing filler outputs are flattened with zero widgets/canonicalfields; no interactive claim. Private `eic-death-residency-print-20261008-v1/` preserves snapshots/origins/native/PDF/images/text/digests/completed review.

The separate ScheduleEIC line2 instruction for a child born and died in2025 without an SSN requires the “Died” presentation and birth/death or qualifying hospital records. That distinct unsupported intake/native/PDF/attachment route is newly recorded in future58 and remains unworked; the new positive route requires an SSN and does not bypass it. Independent audit verifies candidate2,728 exact focused paths and unchanged root2,723 live-full paths,eleven native pairs andfour packet XSDs. Main52 remain unchanged;future57 precede the newly deferred58th item. Root integration/full regression, adoption/kidnapping/other special rules, wider filer/owner combinations, source authenticity, BR and IRS acceptance remain open. No broad checkoff or aggregate packet-count addition.

## October 8 — joint roster and wage ownership reconciliation

The existing joint/source-ownership requirement now has nine complete native returns: ordinary dated, multiple-period birth and valid-SSN death residence, each with primary-only, spouse-only or split wages. The two new fixture/test files leave every preceding2,728 runtime path byte-identical; no additional product guard or residence route is introduced. Each return replays the same three-child identity/lifetime roster, both joint filers and owned W2 records, retaining wages/AGI15,000, three qualifying children/EIC6,761 andrefund8,261. The registered PDF field projector gives ordinarymonths7/8/12 andbirth/deathmonths12/8/12. Alien W2 recipients and an EIC child using the spouseSSN reject native andPDF in every case:36 hostile calls.

Normal typed nine-module gate finished **15:12:07UTC, actualexit0,121/0**, SHA `f62dc40f78cfdc3d6d862120dcd2e4202ee1b2646fa52497bde52cb212da1c70`, superseding112 without addition. Twenty logged complete returns pass retained TY2025v5.4 XSD: eleven prior ordinary/birth/death cases andnine joint cases. Private `eic-joint-residency-20261008-v2/` retains command/runtime/terminal andtwenty exact native pairs. Preserved v1 ended112/9 because the new mutation assertion indexed normalizedW2 as an array instead of its actual `w2s` collection; allnine positive XMLs had validated before that test failure. The corrected test mutates the actual source row without changing a product guard or using --no-check.

Three original-prepared-bundle full PDF packets finished **15:11:46UTC, actualexit0**, SHA `19644ee8d9bb9c6c450bb9409618e14de6178523ef82669fdfa5d00b8f581c79`; **allnine pages directly reviewed**. Selected ordinary/primary, birth/spouse anddeath/split cases show AlexExample andSamExample on1040 andScheduleEIC, primary111223333 onshared forms andspouse444556666 in1040. Child names/SSNs/years/relationships, actual-versus-printed months andhome/U.S./CTC indicators agree. Deduction31,500, zero tax, EIC6,761, withholding1,500 andrefund8,261 reconcile. Changed originalbundle review references reject allthree PDFcalls. These existing flattened outputs havezero widgets/canonicalfields; no interactive claim or all-nine filled-packet review. Private `eic-joint-residency-print-20261008-v1/` retains exact snapshots/origins/XML/PDF/images/text/hash inventory andcompletedreview.

Independent15:13:48UTC audit verifies candidate2,730 exactfocused paths, allpreceding2,728 paths unchanged, root2,723 exactlive-full snapshot,twenty native pairs andthree packetXSDs; main52/future58 unchanged. Rootintegration andlater serialfull remain pending. Source authenticity, other income/credit/phaseout andMFS/HOH/special-source cases, BR andIRS acceptance remain unproved;future58 staysunworked. This is bounded joint ownership/print proof, not completion of the parent residency or whole-form audit.

## October 8 — named HOH child joins reviewed residence

The existing Form1040 identity/status and ScheduleEIC source requirements now join the named, nondependent custodial-release child to the shared reviewed residence replayer. The former month-only HOH check rejected ordinary183/365days across six actual months, reviewed birth16/31days and reviewed death6/10days. Only that guard changes: named child/custody, distinct identity, relationship/age, support and more-than-half home-cost requirements remain. [2025 Form1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), printedpages14–15, require the nonclaimed qualifying child's name and allow more-than-half of the child's time alive for birth/death. The source contracts are constructed reviewed facts, not authenticated custody or residence bytes; this does not implement other HOH status or special-source paths.

Normal typed eleven-module gate finished **15:29:47UTC, actualexit0,134/0**, SHA `49e6682aa2b54d14edc7f9d7ea3354614f17be95bce6a94ece250d56b5d7671c`, superseding121 without addition. Twenty-six logged full native returns validate against retained TY2025v5.4 XSD: twenty preceding residence cases andsix HOH cases, ordinary/birth/death with either positive EIC or opt-out. Names/SSNs and zero dependent rows reconcile; the positive cases retain wages/AGI15,000, EIC4,328 andrefund5,828. Missing reviews, wrong names, inadequate home costs, failed half-year/lifetime boundaries and altered filed identities reject; six complete cases each reject three altered copies in both exporters (36 calls). Legacy named-HOH tests also repeat. Private `hoh-reviewed-residency-20261008-v3/` retains exact2,732-path runtime, terminal and26 native pairs. Failed v1 retained128/6 due omitted filer eligibility facts and absent-zero comparison; v2 retained131/3 due a test expecting the native EIC opening tag without its document attributes. Both failures and their source/native evidence remain preserved; no product safeguard was bypassed.

Four original-prepared-bundle packets finished **15:25:55UTC, actualexit0**, SHA `cdcb5fcae2c186fe49229232f03d04ca9be26ed1c232247285c6a7467d71b7e1`; **all eleven pages directly reviewed**. Three EIC packets have two1040 pages plus oneEIC page; the selected ordinary opt-out has two1040 pages and noEIC. HOH/name AveryChild appears on1040, released child stays absent from dependent/CTC rows, and ScheduleEIC identifies SSN444556666/daughter/year2015 or2025. Ordinary prints7 from actual6months; birth/death print12 from actual1month. Positive packets reconcile15,000 wages/AGI,23,625 deduction,zero tax,4,328 EIC,1,500 withholding and5,828 refund. Opt-out preserves75,000 wages,23,625 deduction,51,375 taxable,5,825 tax,11,000 withholding and5,175 refund. All four original bundles reject changed home-cost sources; flattened output haszero widgets/canonicalfields. Private `hoh-reviewed-residency-print-20261008-v2/` retains snapshots/origins/XML/PDF/text/images/digests/direct review. The later gate changes only the XML test assertion, leaving printed product runtime and fixtures unchanged.

Independent audit verifies candidate2,732 exact paths, root2,723 frozen live-full paths and26 native pairs. Relative to the preceding2,730-path candidate, only the shared HOH guard changes andtwo fixture/test files are added. Main52 andfuture58 remain unchanged/unworked. Root integration andserialfull are pending; wider status/ownership/source cases, external authentication, matchingBR andIRS acceptance remain open. No broad parent checkoff or aggregate packet-count increase.

## October 8 — separated-spouse source and residency matrix

The existing filing-status, source-ownership and Schedule EIC requirements now have twelve complete MFS sources. Ordinary residence covers 183 days across six actual months; birth residence covers 16 of 31 days alive; valid-SSN death residence covers six of ten days alive. Each runs under the existing last-six-months-apart and legal-separation reviews, with either a claimed child or reviewed custodial release. The two new fixture/test files leave all preceding 2,732 runtime paths unchanged. [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), printed pages 43–44, provide the lifetime and separated-spouse rules. These constructed separation/custody references do not prove external authenticity or full state-law/marital eligibility.

The normal typed twelve-module gate finished **15:42:13 UTC, exit 0, 146/0**, SHA `2c9d01cd03da2dcbb335f6d4c95809960854091a3587717c5c331da1e081b96b`, superseding 134 without addition. Thirty-eight logged complete native returns pass retained TY2025 v5.4 XSD: 26 prior residence cases plus twelve MFS cases. Each preserves the separated-spouse mark, primary-owned wages/AGI of 15,000 and one child/EIC of 4,328. Claimed children retain 1,700 ACTC and refund 7,528; released children retain no ACTC and refund 5,828. Missing separation reviews, mismatched marks, spouse-owned wages on this separate return and insufficient residence reject native and PDF in every case: 96 hostile calls. Private `eic-mfs-residency-20261008-v3/` retains the exact 2,734-path runtime, terminal and 38 native pairs. Preserved v1/v2 each ended 140/6: v1 omitted ACTC from expected refunds; v2 used a descriptive field name instead of normalized `line28_actc`. Their source/native/log evidence remains preserved. Product calculations and safeguards stayed unchanged.

All **twelve original-prepared-bundle packets** finished **15:34:48 UTC, exit 0**, SHA `48ae9d5eaf65d12bd2370cd73b17c6d79d60da6108c343f25bcf6f9fbe2b558b`. Six claimed-child packets contain five pages: two Form 1040 pages, two Schedule 8812 pages and Schedule EIC. Six released-child packets contain three pages: two Form 1040 pages and Schedule EIC. All 48 pages were rendered. **Twenty-four pages were directly inspected** across all six last-six-months-apart packets; full-resolution pixel hashes prove the 24 legal-separation counterparts identical. Twelve packet XSDs, snapshot/digest/page-origin checks and zero-widget checks pass. Every original bundle rejects a removed separation review. Private `eic-mfs-residency-print-20261008-v1/` retains original bytes, snapshots and native/PDF; `render-v2/` retains corrected amount checks, rasters/text, hashes and cross-basis parity. The first amount-review failure and partial renders remain untouched. Later assertion corrections change only the test file.

Form 1040 prints MFS, spouse Other Taxpayer/222334444, the separated-spouse mark and Alex Example/111223333. Claimed Avery Child/444556666/daughter has home/U.S./CTC indicators; the released child stays out of dependent/CTC rows. Schedule EIC shows birth year 2015 for ordinary residence or 2025 for birth/death, and printed months 7 or 12 match actual source months 6 or 1. All packets reconcile deduction 15,750, zero taxable income/tax, EIC 4,328 and withholding 1,500. Claimed Schedule 8812 shows potential CTC 2,200, zero tax limit, unused amount 2,200, child cap 1,700 and earned-income limit 1,875, yielding ACTC 1,700 on Form 1040. [2025 Schedule 8812 instructions](https://www.irs.gov/pub/irs-prior/i1040s8--2025.pdf) support the child limit. Refunds are 7,528 claimed and 5,828 released. This proves the named source and presentation cases; full status-family support remains open.

The independent audit verifies 2,734 exact candidate paths, unchanged preceding 2,732 paths, root's 2,723 frozen paths, 38 native pairs and twelve preserved packets. The official [IRS status page](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status) was read successfully at 15:40 UTC: ATS remains unavailable through October 13 at 09:00 Eastern, with TY2026 reopening at 09:01; TY2025 availability remains unconfirmed. The private web observation is retained. Restricted retrieval first failed DNS; an approved network retry subsequently retained the official HTML bytes (SHA `89c89aad52b2f449a5ce055e10d4aed01758c177044d395a2896def22048cba4`) and confirmed the same outage. Main 52 and future 58 remain unchanged, with future tasks unworked. Root integration/serial full, wider sources/status/owner cases, authentication, matching business rules and IRS acceptance remain open. No broad checkoff or aggregate prepared-packet increase.
