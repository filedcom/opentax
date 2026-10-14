# TY2025 external-evidence boundary across complex Form 1040 routes

Static audit, updated 2026-10-03. This describes current export gates and the
route-specific working rule; it does **not** establish filing readiness. “Reviewed”
means the input asserts a human-reviewed fact. A supplied SHA-256 string alone
does not prove that the application saw the document. Exact-byte binding proves
that the submitted/retained bytes match the recorded digest; it does not prove
who issued, signed, filed, or accepted the document. The prepared MeF manifest
also hashes XML and every included PDF for archive integrity, independently of
whether a particular source document is legally required as an attachment.

| Route and external record | Current evidence accepted at the export boundary | Exact bytes / packet treatment | Unproved fact or closed branch |
| --- | --- | --- | --- |
| Ordinary W-2 and 1099-R income | Typed payer facts can calculate and project wages/distributions; source IDs and return totals are checked. | No general issued-copy byte requirement for these ordinary source paths. Native W-2/1099-R output, where applicable, is built from facts. | Payer origin, corrections and completeness of all issued copies remain external review. See [supporting inventory](../domains/general/return-assembly/form1040/ty2025-form1040-form-audit.md#supporting-descriptor-case-and-packet-disposition). |
| W-2G with federal withholding | Payer/winner fields, issued-copy reference and Form 1040 line 25c must reconcile. | Prepared MeF requires a distinct payer-issued Copy B PDF, hashes its exact bytes and reads modeled AcroForm fields; generated Copy B is separate print output. | Issuer origin, visual/flattened content, and any required signature are unverified; no-withholding winnings can remain source-only. See [W-2G boundary](../domains/payments/withholding/ty2025-w2g-withholding-attachment-gap.md). |
| Form 8962 and 1095-A/Marketplace determinations | Reviewed monthly policy, allocation and determination facts, references, and entered digests can drive bounded native/PDF routes. | Underlying Marketplace, agreement and dependent-return bytes are not independently compared to the entered digests; no general BinaryAttachment requirement. | Issuer/determination authenticity and other household/policy cases remain open. See [monthly source audit](../domains/credits/health/form8962/ty2025-form8962-policy-month-gap.md). |
| Form 1116 foreign tax and carryover | Identified income/tax records and reviewed prior filed-Form-1116/Schedule-B transcriptions support bounded current credit/carryover calculations. | Issued payer and prior-return bytes are not authenticated for those bounded routes. Schedule C redetermination remains staged and export guarded pending affected-year filing evidence. | Prior filing, foreign assessment/payment and later-year adjustment provenance remain open. See [parent gap](../domains/credits/foreign/form1116/ty2025-form1116-main-pdf-gap.md) and [Schedule C boundary](../domains/general/return-assembly/form1040/ty2025-form1040-coverage-decisions.md#evidence-that-code-cannot-infer). |
| Schedule J farm-income averaging | Reviewed 2022–24 base-year return/workpaper values can feed the bounded Schedule F-only current tax calculation. | No accepted prior-return byte or IRS acknowledgment join. | The claimed earlier taxable income/tax and elections are transcriptions, not authenticated filed returns. See [Schedule J audit](../domains/taxes/income-averaging/ty2025-schedule-j-integration-gap.md). |
| Form 8582 activity and prior PAL | Current first-year activity/acquisition/disposition facts and stable activity IDs support bounded routes. | Current closing/acquisition records are reviewed references, not authenticated bytes. Positive imported prior-year PAL remains guarded where a reviewed prior record cannot establish acceptance. | Accepted prior return, durable cross-year ledger and disposition-document origin remain open. See [activity audit](../domains/income/business/form8582/ty2025-form8582-activity-id-gap.md). |
| Form 3800 carryforward | Structured vintage/history statement and parent links are staged. | No authenticated accepted prior-return sequence or complete history attachment in the active parent route. | Positive carryforward filing is guarded; source-vintage arithmetic is not proof of an available filed credit. See [Form 3800 gap](../domains/credits/business/form3800/ty2025-form3800-pdf-gap.md). |
| K-1 recipient and Form 7203 stock loss | Reviewed K-1 box/basis/workpaper facts can support a bounded Schedule E/7203 loss; other K-1 credit/expense routes have their own guards. | The issued K-1 and basis records are not generally bound to exact bytes. Trust K-1 box 13 code B would require a filed copy but has no typed claim/attachment route. | Entity-issued copy origin, basis history, and conditional copy-attachment exceptions remain open. See [entity-issued roots](../inventory/ty2025-entity-issued-root-disposition.md) and [coverage queue](../domains/general/return-assembly/form1040/ty2025-form1040-coverage-decisions.md#evidence-that-code-cannot-infer). |
| Form 8283 prior Section A securities carryover | Reviewed gift/owner/2024-form facts and current Schedule A amounts support a bounded current filing. | Exact prior Form 8283 PDF bytes must match a digest and BinaryAttachment ID. The PDF's canonical fields and actual 2024 filing are not authenticated. | Section B prior artwork requires more retained files and checks but remains export closed because an accepted acknowledgment is not cryptographically tied to the claimed return XML. See [carryover evidence](../domains/deductions/charitable/form8283/ty2025-form8283-carryover-source-gap.md). |
| Current Form 8283 Section B signed gift/appraisal | Reviewed donor, donee, appraisal and signature assertions are joined to the current claim. | Applicable signed form/appraisal PDFs are separately attached and byte-hashed; a generated preview is not the signed source. | Signer identity, actual signature and appraiser/donee provenance remain unverified. See [PDF/attachment audit](../domains/deductions/charitable/form8283/ty2025-form8283-pdf-gap.md). |
| Form 8839 one domestic adoption | Reviewed decree/birth/expense/reimbursement facts and one strict public source shape calculate the bounded credit. | Prepared MeF and PDF require every named source PDF byte, distinct filename and matching digest; synchronous XML/standalone PDF without bytes reject. | Visible PDF contents, reviewer identity, decree issuer and wider adoption claims remain unverified/closed. See [adoption gap](../domains/credits/individual/form8839/ty2025-form8839-gap.md#bounded-programmatic-one-child-route-written-bulk-validation-pending). |
| Form 8994 direct employer leave credit | Reviewed policy/payroll/employee packet drives one direct Schedule C claim. | Each named policy, wage ledger and payroll PDF is distinct, submitted, byte-hashed and rechecked by prepared PDF; direct XML/standalone PDF reject. | Employer/issuer origin, signatures, leave purpose and wage-overlap assertions remain external review. See [Form 8994 gap](../domains/credits/business/form8994/ty2025-form8994-gap.md). |
| Form 8908 increased PWA credit / Form 7220 | Staged per-home wage/apprenticeship review and Form 7220/source identity checks exist. | Separate exact-byte Form 7220 and no-alterations statement PDF contracts are staged. | Signature authenticity, payroll provenance and required PWA evidence keep public export guarded. See [Form 8908 gap](../domains/credits/business/form8908/ty2025-form8908-source-gap.md). |
| ATS scenario packets | Checked-in IRS scenario PDFs and partial extracted facts are research/expected-output fixtures. | They are neither taxpayer-uploaded source documents nor prepared filing attachments. No scenario has an accepted IRS ATS acknowledgment. | Scenarios 1 and 8 have source contradictions; ATS certificate, endpoint, complete scenario and response evidence are absent. See [ATS preparation](../../../ats/ty2025.md). |

## Concrete differences needing an explicit standard

1. **Reviewed prior return versus actual filing:** Schedule J and bounded Form
   1116 carryover use reviewed transcriptions; Form 8582 prior PAL and Form
   3800 carryforward retain guards; Form 8283 Section A requires a prior-form
   PDF but still cannot prove it was filed. The Section B Form 8283 work asks
   for return XML and acknowledgment and still closes because the two are not
   tied by a trusted transmitter record. A single “prior return reviewed”
   label would hide four materially different acceptance claims.
2. **Issued source versus required transmitted copy:** ordinary W-2/1099-R and
   many K-1, 1095-A and foreign-tax facts can be transcribed, whereas withheld
   W-2G and certain Form 8283/adoption records require submitted bytes.
   The trust K-1 code-B exception needs an issued copy but cannot yet be
   identified by intake. These are distinct IRS attachment triggers, not
   interchangeable preferences for PDF storage.
3. **Digest metadata versus verified bytes:** Form 8962 reviewed hashes name
   Marketplace/agreement evidence that is not loaded; Forms 8839 and 8994
   compare the submitted bytes to their manifests. Form 8283 prior Section A
   binds bytes but relies on a human assertion for the PDF's visible content.
   W-2G reads modeled AcroForm fields, yet cannot authenticate its issuer.
4. **Signed records:** a signed Form 8283 or Form 7220 statement cannot be
   made authentic by a checked signature box, a byte hash or a generated
   facsimile. Form 8332 release/revocation is still guarded where signed
   evidence and dependent-role joins are missing. The product needs to say
   which human review or external verification is sufficient for each signed
   source; this audit makes no such choice.
5. **Test evidence versus taxpayer evidence:** a synthetic source fixture,
   local XSD pass and filled-PDF inspection test software projections. The IRS
   ATS packet is a test source with its own contradictions, and only an
   accepted ATS acknowledgment can establish ATS acceptance. None of those
   artifacts authenticates a customer's payer, Marketplace, K-1 or prior
   filing record.

**Working rule from the 2026-10-03 direction to follow existing practice:**
keep reviewed structured facts for ordinary source calculations; require
retained, digest-verified bytes when the route requires an issued copy, signed
document, or other attachment; and require trusted filed/accepted-year
evidence before asserting that a prior return was accepted. A digest does not
authenticate an issuer, signature, or IRS acceptance. Apply the appropriate
human or external review to those claims, and keep a route closed when its
required evidence cannot yet be checked. The table above identifies the
implementation gaps; this working rule does not open any guarded route.
