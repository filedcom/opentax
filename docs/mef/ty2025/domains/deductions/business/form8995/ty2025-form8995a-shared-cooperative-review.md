# Independent farms sharing a cooperative issuer — October 6

Independent review of frozen candidate b2f0e4db1 found a source identity guard
that combined farm EIN and cooperative payerTIN in one global uniqueness set.
Two separately owned cash farms with distinct issued copies/recipient TINs were
therefore rejected solely because their cooperative payer matched.

The [2025 Form8995-A instructions](https://www.irs.gov/instructions/i8995a)
require each nonaggregated trade/business's qualified-payment QBI and wages on
ScheduleD, with its own patron reduction and shared final deduction limits.
The cooperative supplies each patron's1099-PATR information. Those rules do not
require different cooperative issuers for distinct farm businesses. This is an
inference from the per-business/per-patron structure, not a newly claimed IRS
exception. [ScheduleSE instructions](https://www.irs.gov/instructions/i1040sse)
require separate self-employment computations for spouses.

Correction80ea6d0b8 keeps distinct owned farm EINs, owners, farm references,
issued-copy/notice/payroll/allocation references and recipient matching. A shared
payerTIN alone is permitted. The existing source reconciliation still compares
each reviewed issued copy with its actual1099-PATR collection and actual owner.

## Independent frozen candidate evidence

A separate verifier executed the five actual saved sources, without fixture
factories or source writes. Terminal exit0:5returns/95pages; complete normalized
graph and native pending, prepared pending, carry, origins and PDF bytes match;
native XML differs only byReturnTs and every packet gets fresh full local XSD.
All15originalsource files and19heldcode/test/fixture hashes remain unchanged.
Separate PythonDecimal worksheets derived from saved source books/receipts/
payroll independently reproduce all five expected maps. All95pageinstances
were visually inspected, including regularphase66136, spouse-only phase-unbound
76336, both patron checkboxes, skipped wage rows, ownerSE and line38cap.

Evidence: `/tmp/opentax-independent-patron-independent-review-evidence-oct6`
contains159physicalfiles including its manifest. The original author archives
remain unchanged. This is frozenb2f evidence and predates the identity fix.

## Actual saved-source correction control

A new input copy derived from original savedphase changes only the spouse
issued cooperative payerTIN/name in both actual and reviewed copies to the
primary cooperative. Original savedphase is not rewritten. Pre-correctionb2f
reports the specific "businesses and cooperative identities must be distinct"
public error. Corrected80ea executes with two separate recipients, QBI66136,
full nativeXSD and19PDFpages. Duplicate farm EIN, duplicated issued reference,
and wrong recipient controls reject at public/native/directPDF boundaries.

The new PDF exactly equals the independently reviewed originalphase PDF:
SHA256`ee86046bace2e41c9c22f254df77504b9b84e01e0cf99f6548999a6f54164f52`.
Thus all19pageinstances transfer through exact reviewed bytes. Actual new
JSON/XML/PDF/report: `/tmp/opentax-shared-cooperative-actual-source-oct6`.

Final ordinary four-module gate reached terminalexit0: **16passed,0failed**
(8m57s), holding80ea6d0b8 and19code/test/fixture hashes. Command:
`deno task test forms/f1040/2025/domains/deductions/business/form8995a/form8995a_independent_patron.test.ts forms/f1040/2025/domains/deductions/business/form8995a/form8995a_patron_spouse.test.ts forms/f1040/2025/domains/deductions/business/form8995/form8995_two_farm_wotc.test.ts forms/f1040/nodes/intermediate/forms/taxes/self-employment/schedule_se/owner-calculation.test.ts`.
Log: `/tmp/opentax-shared-cooperative-standard-oct6.log`.
All five final-gate input/graph/prepared/carry/filer/origin/expected JSON wrappers
and PDF bytes exactly match the independently reviewed original five packets;
XML differs only byReturnTs. Their95pageinstances transfer by reviewed bytes.

Root's separate corrected six-source replay reached terminalexit0:
**6returns/114pages**, graph/prepared/carry/origins/PDF exact, nativeonlyReturnTs,
fresh fullXSD, all18sourcefiles unchanged and19updatedheld hashes unchanged.
Script/log/report: `/tmp/opentax-independent-patron-root6-corrected-oct6`.
Main integration still requires its own ordinary gate and source verification.
A duplicate worker six-source replay was stopped143 after root independently
launched the same required replay; its partial log/control remain preserved,
and it is not a passing gate. Root owns final six-source integration verification.

This bounded correction does not authenticate issuers, prove IRS acceptance,
or close the wider Forms8995/8995-A parent. Other business/deduction/aggregation
combinations retain their existing limits.


## Main integration saved-source verification

Integrated69ad0956f/00dfa9cb3/c72c52310 holds all19corrected code/test/fixture hashes. Mainactualsix-source replay59423 terminalexit0:6returns/114pages withwhole normalizedgraph andpending/prepared/carry/origins/PDFexact, nativeonlyReturnTs, fresh local2025v5.4XSD andall18originalsourceJSON/PDF/XML unchanged. Report `/tmp/opentax-independent-patron-main6-oct6/report.json`;40physicalfiles include output, originalsources, script/log andheldmanifest, copied/rehashed to main research under2026-10-06-independent-patron-main6.

Mainactualold18 replay64728 terminalexit0:18returns/272pages, graph/carryexact against unchanged prior spouseproduction, historicalPDFbyteexact andnativeonlyReturnTs against previously validated references. All54originalJSON/PDF/XML unchanged,19held filescheckedbefore/after. Historicalnativeexactness transfers priorfullXSDqualification; nofresh18XSDclaim. Report `/tmp/opentax-independent-patron-main18-oct6/report.json`;94physicalfilesretained under2026-10-06-independent-patron-main18. Mainordinaryfour-modulegate94998 is stillrunning; no boundedcompletion or fullregression passclaimed.


Main ordinary four-modulegate94998 subsequently terminalexit0: **16passed/0failed (5m35s)**. All19heldfiles unchanged;fiveactualsavedJSON/PDFbytes exactlyreviewed95pages andnativeonlyReturnTs, `/tmp/opentax-independent-patron-main-standard-source-transfer-oct6.json`. Its18source/log/transfer/heldmanifestfiles arephysicallyretainedunder2026-10-06-independent-patron-main-standard. Main40new6/94prior18proof files andcandidate258/159/23/77physicalpairs rehashed beforeledger1542. BroaderQBIparent/fullbatch/IRSacceptance remainopen.
