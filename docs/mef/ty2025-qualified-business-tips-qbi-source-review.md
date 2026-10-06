# 2025 deducted business tips and QBI source review

## Gap and official basis

The existing Schedule1A source route deducted qualified business tips on Form1040 line13b but retained the same tips in Form8995 QBI. Its wholly excluded example incorrectly retained QBI9293. The taxable-income limitation already subtracted line13b; that separate correction remains intact.

[2025 Form8995 instructions](https://www.irs.gov/pub/irs-prior/i8995--2025.pdf) and [2025 Form8995-A instructions](https://www.irs.gov/pub/irs-prior/i8995a--2025.pdf) exclude tips deducted under section224 from QBI. [Public Law119-21, section70201(d)](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm) added **199A(c)(4)(D)**, not(C). The existing letter(C) concerns guaranteed payments. Section224(c) limits business tips by business net income after allocable deductions; section224(d)(2)(B) excludes SSTB tips. [Notice2025-62](https://www.irs.gov/irb/2025-42_IRB) explains that the deduction does not reduce self-employment earnings.

## Actual implementation and allocation

Schedule1A retains the actual issued payer tip reviews, occupation, proprietor SSNs, business identities and filed profits. MFJ inputs independently retain/recompute actual owned ScheduleSE business/W2 sources and each owner's half-SE deduction. The deductible total is calculated using each business's net-income limit, the return's $25000 cap and MAGI phaseout. There is no public manually supplied business-tip exclusion.

The resulting Schedule1A source payload travels to Form8995. It is recomputed again at native/PDF preflight from the separately settled Schedule1A and actual issued payer/business/SE sources. Schedule1 line3 must equal the actual business-profit inventory, and line15 must equal the retained half-SE amount. Missing or changed source payloads reject even when no Form8995 is filed because all its QBI is excluded. The advanced WOTC route retains the payload inside its actual single-business source and refigures its wage-limitation worksheet after the tip exclusion.

When capped or phased out, the deduction is allocated proportionally to each business's eligible tips and eligible employee tips. Sorted business references and cumulative whole-dollar rounding preserve the exact filed deduction total. Employee allocations do not reduce business QBI. This is an application of reasonable, consistent item allocation under [Treasury regulation1.199A-3(b)(5)](https://www.irs.gov/pub/irs-irbs/irb19-09.pdf); **no IRS-prescribed tip-specific apportionment rule is claimed**. This review proves filed whole-dollar operands, not general support for fractional SE allocations across several businesses of one owner.

Schedule1A schema/calculation helpers were moved into a pure `calculation.ts` module and re-exported from the existing node entry point. Form8995 consumes that pure schema rather than importing a node that itself outputs toForm8995, preventing a module-initialization cycle. Existing standalone node and Publication974 imports are covered by the related gate.

ScheduleC profit, ScheduleSE income and tax remain unchanged by the tip deduction. AGI remains after the actual half-SE deduction; line13b reduces taxable income before the separate QBI income cap. Existing ordinary farm/WOTC/health source branches remain intact.

## Public source proofs

Each row uses public issued-source inputs, the complete calculation graph, native full-return XML validated against the local IRS1040 XSD, and an actual flattened full-return PDF. Independent tax-table/Tax Computation Worksheet equations and advanced worksheet constants are asserted rather than copied from the production calculator.

|Case|Profit|HalfSE|Deducted tips|QBI|QBI deduction|AGI|Taxable income|Total tax|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|Wholly excluded|10000|707|9293|0|0|9293|0|1413|
|Positive business only|72000|5087|12000|54913|7833|66913|31330|13694|
|Issued W2, QBI binding|72000|5087|12000|54913|10983|116913|78180|22286|
|$25000 cap|72000|5087|25000|41913|5233|66913|20930|12446|
|MAGI phaseout|72000|5087|10400|56513|11303|166913|129460|34090|
|MFJ independent owners|15000|488|13000|1512|302|190612|145810|22881|
|MFJ cap/phaseout allocation|140000|5311|24000|110689|22138|310789|233151|52770|
|MFJ employee/business allocation|140000|5311|16000|123395|24679|310789|238610|54080|
|Advanced event WOTC|256400|14352|15800|226248|33781|242048|176717|61893|

The MFJ cap/phaseout example allocates10286 to Casey and13714 to Alex. Their own half-SE amounts are4239 and1072; their QBI amounts are45475 and65214. The mixed employee example allocates11294 to Alex's business and4706 to employee tips; Casey's unchanged QBI is55761 and Alex's is67634.

The actual advanced nonSSTB event business has WOTC2400, filed profit256400 and wage amount3600 after the wage deduction adjustment. Form8995-A has20% QBI45250, wage limit1800, phase-in fraction.26396, reduction11469 and deduction33781. Actual additional Medicare tax331 and WOTC credit ordering reach final tax61893. Known actual SSTB business classification rejects the qualified-tip claim; it is not made into an advanced positive.

## Integrity and remaining boundaries

Negative exports cover missing tip records, changed payer amounts/SSNs, borrowed business/recipient identities, changed half-SE source, altered eligible/allocation/deduction amounts, changed actual Schedule1 income/deductions, changed Form1040 AGI/line13b, omitted generated source, modified final QBI/deduction and MFJ issued W2/owner-SE conflicts. Both native and PDF entry points reject.

This proves single owned ScheduleC sources, independently owned MFJ businesses (one per owner), mixed employee tips, cap/partial MAGI phaseout and one actual nonSSTB WOTC advanced business. Fully phased-out Schedule1A omission, several businesses within one owner with fractional SE allocations, additional multiple-C/investment tip combinations, tips combined with positive SE health/retirement deductions, farms and advanced two-business tip combinations remain separate existing boundaries. No outside issuer authentication, generic QBI completion or future-board work is claimed.

## Evidence

- Source fixture/test: `forms/f1040/2025/pdf/form8995-qualified-tips.fixture.ts` and `.test.ts`.
- Artifact directory: `/tmp/opentax-qbi-qualified-tip-exclusion-evidence`.
- Focused source/native/XSD/PDF log: `/tmp/opentax-qbi-qualified-tips-focused-v5.log`.
- Related compatibility log: `/tmp/opentax-qbi-qualified-tips-regression-v1.log`.
- Render/reopen/all-page review: `/tmp/opentax-qbi-qualified-tips-page-review.log`; script `/tmp/opentax-qbi-qualified-tips-review.py`.
- Local pre-edit compact: `/tmp/opentax-qbi-qualified-tip-learnings.md`.

The artifact manifest is `/tmp/opentax-qbi-qualified-tip-exclusion-evidence/source-xml-pdf-sha256.json` (27 source/XML/PDF hashes). All nine full-return packets passed XSD and PDF text checks; all147 pages were rendered and visually reviewed, with zero remaining form fields/widgets. Prior Medicare, zero-eligible and independent-plan snapshots retained all33 original hashes, recorded in `prior-artifact-preservation.json`.

Final test counts are appended after the gates finish. Earlier research artifacts are isolated from this checkout: only the schema `docs` cache is shared; older tests write into this checkout's own `.state/research`.

### Final gate results

- Final current source/calculation/native/PDF/XSD plus Schedule1A unit gate: **41 passed,0 failed**, 1m8s; `/tmp/opentax-qbi-qualified-tips-final-source-gate.log`.
- Existing issued NEC, NEC/MISC and NEC/MISC/K tip-source XSD replays: **3 passed,0 failed**,10s; `/tmp/opentax-qbi-qualified-tips-issued-replay.log`.
- Related25-file compatibility run: **283 passed,1 failed**,4m7s; the sole failure was an old expected error-message substring for a rejected wrong owner, not an accepted source or changed amount. That expectation was updated to the new proprietor-reconciliation message. The corrected Schedule1A suite subsequently passed27/27 standalone and is included in the final41/0 gate. All other compatibility tests passed, including actual owner-SE, farm/WOTC ordinary and advanced routes, paired health/Medicare/zero-health routes, native/PDF descriptors, capital income caps and the standalone Publication974 import path. The combined25-file run itself was not rerun or represented as green.
- Original artifact-producing nine-case run:14/0,1m12s; `/tmp/opentax-qbi-qualified-tips-focused-v5.log`. Later current-source runs did not rewrite the nine retained source/XML/PDF snapshots; all27 hashes still match.
- `git diff --check`: clean. No main, board, future section or PR changes.
