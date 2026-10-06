# Spouse-owned patron source — October 6, 2026

Current candidate: production/test75ae18c95 plus contract-test98521c758. Final ordinary focused3/0, supplemental contract2/0, actual8new returns/121pages exact and10prior returns/151pages qualified preservation are verified below. The corrected private three-module run and main integration gates remain pending; the existing parent remains open. Earlier exploratory failures are retained as chronological, superseded evidence.

## Compacted learnings before implementation

Read the complete frozen product board at base 2fef4f068: 52 existing open tasks and one future PFIC task remain untouched. The existing Forms8995/8995-A parent includes owned patron source and return-wide QBI joins. Existing joint patron proof covers primary C/F with spouse wages, despite broader owner SE and one-plan7206 already supporting spouse ownership. Historical WOTC, controlled C/F and fractional-parent proofs do not establish spouse patron coverage. The concrete guard is `patronSourceAmounts` requiring proprietor T and export reconciliation matching primary PATR recipient and spouse W2 copies.

The correction retains issued cooperative recipient, actual business proprietor, nonproprietor W2 copies, independently calculated owner SE and attributable health deduction. Old spouse_w2_sources retains its primary-business meaning; primary_w2_sources identifies the other spouse's wages for a spouse business. Conflicting source copies and owner identities must reject both native and PDF export.

Authorities: [2025 Form8995-A instructions](https://www.irs.gov/instructions/i8995a) identify attributable deductible SE and health deductions as QBI adjustments and specified-cooperative ScheduleD reduction. [ScheduleSE instructions](https://www.irs.gov/instructions/i1040sse) require separate individual calculations on joint returns. [Form7206 instructions](https://www.irs.gov/instructions/i7206) require a plan established under the business and the appropriate individual's earned-income limit.

Initial candidate gates were pending. No source authenticity, IRS business-rule or acceptance claim is made. Broader multi-business/cooperative, retirement, aggregation, loss, property and filing-status combinations remain open.

## Retained candidate source packets

Candidate production and reusable tests/fixtures: `75ae18c95`. The graph and all four parent/ScheduleD native/PDF recipient guards select the actual owned business recipient. Unsourced direct legacy projections retain their primary-recipient guard. A spouse business requires the actual MFJ spouse identity; the same source must join1099-PATR recipient and199A(g) written designation, C/F proprietor, SE owner, applicable7206 plan and final1040 totals. Legacy primary patron inputs retain spouse_w2_sources unchanged. Primary_w2_sources is the reviewed nonproprietor payroll copy for a spouse business, and asserting both copy collections rejects.

| Actual case | Pre-QBI taxable | Half-SE | Attributable health | Filed QBI deduction |1040 total tax|Pages|
|---|---:|---:|---:|---:|---:|---:|
|Spouse farm|424367|14132|0|37105|108716|15|
|Spouse C health|443031|14467|6000|34030|115962|16|
|Spouse farm income cap|439165|14333|0|439165|30604|15|
|MFJ boundary394600|394600|14132|0|41621|100220|15|
|MFJ boundary394601|394601|14132|0|41621|100220|15|
|MFJ boundary494599|494599|14132|0|26449|134645|15|
|MFJ boundary494600|494600|14132|0|26449|134645|15|
|MFJ boundary494601|494601|14132|0|26449|134646|15|

The actual first three archives are `/tmp/opentax-qbi-spouse-patron-source-v2-oct6/{farm,c-health,income-cap}.{json,pdf,xml}`; five boundary originals are `/tmp/opentax-qbi-spouse-patron-boundaries-oct6/{394600,394601,494599,494600,494601}.{json,pdf,xml}`. All JSON records include actual input, pending, prepared pending, carryforwards, filer and page origins. Synthetic payroll/provenance declarations are reviewed facts rather than authenticated issued bytes.

Supplementary runtime positives passed all8 fullXSD packets. The same run retained a2/1 failure caused by a test assigning a primary W2's unchanged111223333 SSN; it is not a successful conflict proof. The corrected mutation substitutes444556666, and the filtered runtime conflict test passes1/0 in32seconds. Ordinary typed final and compatibility gates remain running and must be recorded before integration. Exploratory initial typed failure from using nonexistent `carry` is retained and repaired to `carryforwards`; initial fixture-shape and hard-coded recipient failures are also qualified in their logs.

All121 pages were rendered and visually reviewed for actual spouse C/F/SE/7206 identity, joint return headers, phase-in percentages and filled amounts, required zero versus blank fields, cap/tax/refund, page order, and legible layout. All8 PDFs reopen with zeroWidget annotations and zeroAcroForm fields. Review `/tmp/opentax-qbi-spouse-patron-review-oct6.json`; images `/tmp/opentax-qbi-spouse-patron-render-oct6`. The existing static product packet is not a newly delivered interactive form.

Actual8 saved-source replay is terminal success: `/tmp/opentax-qbi-spouse-patron-exact8-oct6.{ts,log}`, with report in the sibling directory. All121 pages, whole pending/prepared/carry/origin values, deterministic PDF bytes, native XML exceptReturnTs, full local TY2025v5.4 XSD and original source hashes agree. All9 production hashes match the held manifest after replay. The private preservation manifest now includes179 physically copied/hash-verified files, including actual replay outputs and terminal log. Prior10 actual primary/Single/phase-in archives are being replayed separately; no factories or original-source rewriting are used.

### Final ordinary focused gate

Final corrected ordinary command `deno task test forms/f1040/2025/form8995a_patron_spouse.test.ts` is terminal success **3/0 (2m41s)**, with normal type checking and permitted xmllint/Poppler subprocesses. Log `/tmp/opentax-qbi-spouse-patron-focused-final-oct6.log`. It covers8 fullXSD positive source packets, meaningful proprietor/nonproprietor/PATR/health/SE/1040 native and direct PDF conflicts, and both actual MFJ phase-in boundaries. The final8 generated PDFs are byte-identical to the already reviewed121-page originals, transferring that visual proof without rewriting any earlier source packet. Its25 files are physically copied/hash-verified; preservation now204files. The earlier three-module run retained the old unchanged-SSN test failure while its independent legacy joint/phase tests continue; the final focused result supersedes only that new-test defect. Actual prior10 preservation replay remains pending.

### Contract boundary and actual prior-source preservation

Final test-only commit `98521c758` explicitly requires the actual qbi_patron **severity:error** and both-collections diagnostic when both reviewed wage collections are presented. Single/MFS spouse patron sources are checked at the named public patron status guard or at both native and direct PDF export, as the actual contract permits. Supplemental filtered runtime passes **2/0,2filtered (18s)**; `/tmp/opentax-qbi-spouse-patron-contract-debug-oct6.log`. This does not claim every unsupported status fails during public intake: valid graph inputs can be refused at their export boundary. Main integration must typecheck this final test text.

Actual prior10 source replay is terminal success: MFJ primary3, Single phase-in4, and original Single3, totaling **151 pages**. It reads original JSON archives in `/tmp/opentax-qbi-patron-joint-oct6`, `/tmp/opentax-qbi-patron-phasein-oct6`, and `/tmp/opentax-qbi-patron-source-oct6`; no fixture factory or source rewrite is involved. Immutable base2fef public graph/carry agrees exactly with candidate. All10 candidate filled PDFs are byte-identical to the existing reviewed originals. Seven Single native returns differ onlyReturnTs and terminal file newline; three older MFJ native returns also acquire the already established base ScheduleSE zero farm/nonfarm and SocialSecurity wage fields. All other historical native elements agree. Historical pending string-comparison flags remain qualified; these are not claimed as whole historic graph equality. Every original JSON/PDF/XML hash remains unchanged. Full local v5.4 XSD passes all10 current returns.

Replay scripts/log/report `/tmp/opentax-qbi-spouse-patron-prior10-oct6`; initial30 source hashes `/tmp/opentax-qbi-spouse-patron-prior10-original-hashes-oct6.json`; precise qualification `/tmp/opentax-qbi-spouse-patron-prior10-qualified-oct6.json`. Prior baseline PDF/native comparisons rebuild the immutable baseline graph through candidate export preparation; historical original byte/element agreement is recorded independently. The earlier known-failed obsolete three-module gate was stopped at parent direction because it loaded the already corrected negative-test typo; termination evidence names the reason and actual PIDs. This was not an elapsed-time restart or stop. The corrected three-module run remains live, and the broader parent remains open.

Private preservation now contains262 physically copied/hash-verified files, with all9 production hashes held unchanged. Original prior PDFs transfer their existing151-page visual proof by exact bytes; candidate8 packets retain their independent121-page review. No issuer authenticity, prior accepted return, IRS business-rule or ATS acceptance conclusion follows from these local checks.

### Corrected private compatibility gate terminal result

The corrected ordinary three-module gate is terminal exit0: **10 passed /0 failed (13m15s)**, session35884, log `/tmp/opentax-qbi-spouse-patron-final-v2-oct6.log`. Its loaded snapshot contains3 spouse tests,4 joint tests and3 Single phase tests; the final test-only contract strengthening was committed during this run, so the root main gate owns typing/executing the final4-test spouse contract text and W2 input module. No duplicate candidate gate was launched. The 8 generated source packets are preserved separately with the terminal log and schema/template provenance: **26 physically copied/hash-verified files**, `/tmp/opentax-qbi-spouse-patron-final-gate-preservation-oct6.json`. All8 filled PDFs are byte-identical to the independently reviewed121-page originals; all9 production hashes remain held. The earlier262-file manifest is frozen unchanged. The broader parent remains open until its required main integration gates and board reconciliation finish.
