# TY2025 Form 9465 filing-route decision

Static source/schema/PDF-field audit, updated 2026-10-07. Nine dedicated
source/native/PDF tests passed within the completed full typed regression;
full-return XSD, filled-PDF visual review, IRS business-rule and ATS acceptance
remain unproved. Historical “unrun” statements below are superseded only for
those executed tests.

## Filing alternatives and native applicability

The [IRS Form 9465 instructions](https://www.irs.gov/instructions/i9465) allow
an installment-agreement request with a balance-due return, separately after a
return or notice, or through the IRS online payment-agreement channel. They
explicitly say not to use Form 9465 when choosing the online request or when
able to pay in full within 180 days. A proposed agreement is not payment or IRS
approval. The checked-in TY2025 v5.4 `ReturnData1040.xsd` includes one optional
`IRS9465` root in the 1040 document sequence, and its Form 9465 XSD requires
return-type code, filer name/name control/SSN, tax due, total balance due, and
payment due day. Thus **a return-attached native 1040 MeF route is possible and
conditionally applicable**. Online and later standalone requests are different
administrative workflows; the existence of those channels does not exclude the
attached route from the Form 1040 product.

The instructions distinguish Form 9465 line 5 (amount on return(s) or
notice(s)), line 6 (other balances), line 8 (payment with this request), line 9
(remaining amount), lines 10–12 (monthly payment and proposed terms), and line
13 direct debit or line 14 signed payroll deduction. More than $50,000 generally
requires Form 433-F; certain $25,000–$50,000 cases require direct debit or
signed Form 2159, and a payment below the minimum can require Form 433-F. Prior
default can require Part II. A current Form 1040 line 37 balance alone therefore
cannot populate the form or establish eligibility.

## Local boundary

The old optional `amount_owed`/`monthly_payment`/bank-instruction input has been
replaced directly. `nodes/inputs/f9465/index.ts` now accepts only an explicit
`attached_2025_1040` mode for one single-filer TY2025 Form 1040 balance no more
than $25,000, with a reviewed final-return and IRS-account source reference,
confirmations that no prior debt, payment with the request, existing plan,
recent default, bankruptcy/offer in compromise, changed address, or 180-day
full-payment route changes the claim, and a manual monthly payment at least the
line-9/72 amount. It emits no tax or payment output. The staged
`mef/forms/f9465_attached.ts` builder requires the exact final Form 1040 line 37
and filer identity, then constructs the native required line-5/7/9/10/11a/12
fields. Focused source, native and rejection cases are written but unrun. This
is a direct replacement, not a legacy alias or fallback.

The strict request now also requires a ten-digit home phone and a call-time
description of at most ten characters. The staged native output includes
`HomePhoneGrp/PhoneNum` and `BestTimeToCallAtHomeTxt` in schema order; the
staged page-1 PDF maps them to inspected fields `f1_17` and `f1_18` on line 3.
The checked-in TY2025 MeF rule `F9465-018-01` requires a home or work phone, and
the [official Form 9465](https://www.irs.gov/pub/irs-pdf/f9465.pdf) prints both
line-3 fields. Missing/malformed phone, overlong call-time, and changed
native/PDF pending-source fixtures are authored but unrun. This closes a
source-to-output prerequisite; it does not answer the attached electronic
authorization question or enable export.

The staged native builder is **not registered** in `ALL_MEF_FORMS`. The
unregistered `pdf/forms/f9465_attached.ts` descriptor maps only page 1 of the
[current official Form 9465 PDF](https://www.irs.gov/pub/irs-pdf/f9465.pdf),
which is still the September 2020 revision used with the 2025 return. A static
AcroForm field inspection found the following exact page-1 mapping:

| Form field                           | Canonical AcroForm field  | Source                                                                |
| ------------------------------------ | ------------------------- | --------------------------------------------------------------------- |
| Return type, year; 1a name and SSN   | `f1_1`–`f1_5`             | 1040/2025 and identified single filer                                 |
| 1a street, apartment, city/state/ZIP | `f1_9`–`f1_11`            | same domestic filer address; reviewed as unchanged since prior return |
| 3 home phone and call time           | `f1_17`–`f1_18`           | direct request contact fields                                         |
| 5, 7, 9 balance                      | `f1_22`, `f1_24`, `f1_26` | final 1040 line 37, with no other debt or current payment             |
| 10, 11a, 12 terms                    | `f1_27`, `f1_28`, `f1_30` | upward whole-dollar line 9 / 72, proposed payment, due day            |

The page's signature/date lines have **no AcroForm fields** and are left blank;
the descriptor does not represent a signed form. The
[IRS Publication 4164, §8.14.3](https://www.irs.gov/pub/irs-pdf/p4164.pdf)
states a signature is required for a _standalone_ electronic 9465 and describes
its disclosure and direct-debit consent. The checked-in TY2025 attached
`IRS9465` content schema has no signature element. Neither fact alone
establishes how the paper-form signature block should be represented for an
attached, non-direct-debit 1040 request. The existing reviewed authorization
assertion is provenance metadata, not a signature.

### Electronic authorization evidence, 2026-10-01

| Primary IRS source                                                                 | What it establishes                                                                                                                                                                                                                                              | Limit for this attached, non-direct-debit request                                                                                                                               |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Publication 1345, pp. 17–18](https://www.irs.gov/pub/irs-pdf/p1345.pdf)           | A provider may transmit Form 9465 with electronic return data. The taxpayer signs the electronic return declaration, whose disclosure consent concerns the provider's receipt of return acknowledgments and processing information.                              | It does not say the return declaration authorizes Form 9465's distinct third-party contacts/disclosures.                                                                        |
| [Publication 4164, §§8.13.1 and 8.14.3](https://www.irs.gov/pub/irs-pdf/p4164.pdf) | The Form 1040 PIN jurat covers the return and accompanying schedules/statements; its consent permits provider transmission and receipt of IRS processing information. Section 8.14.3 separately prescribes a signature for **standalone** Form 9465 submissions. | The standalone rule cannot be applied to or waived for an attached Form 9465 by inference. The Form 1040 jurat does not expressly mention Form 9465's collection authorization. |
| [Form 9465, p. 1](https://www.irs.gov/pub/irs-pdf/f9465.pdf)                       | The printed signature block authorizes IRS contact with and disclosure to third parties for processing and administration of the proposed agreement, and agrees to its terms if approved.                                                                        | Those are not the provider disclosure terms in the Form 1040 MeF jurat. An unsigned page-1 projection does not prove this authorization occurred.                               |
| Checked-in TY2025 v5.4 `IRS9465.xsd` and `ReturnData1040.xsd`                      | The 1040 may contain native `IRS9465`; the attached form type contains no signature/jurat element.                                                                                                                                                               | Schema validity cannot establish taxpayer authorization or specify a separate accepted signature channel.                                                                       |

The open decision is whether the taxpayer's electronic Form 1040 signature,
after presentation of the attached Form 9465 terms, is itself accepted for the
third-party disclosure authorization printed on Form 9465, or whether the IRS
requires a separately retained/sent signed Form 9465. This needs an explicit IRS
MeF rule or written program guidance for **attached non-direct-debit**
requests. A standalone Form 9465 jurat, an authenticated Form 1040 PIN, an
XSD-valid `IRS9465`, or a reviewer checkbox alone is insufficient evidence. If a
separate signature is required, the accepted channel and its PDF representation
must be specified before export can open. An ATS accepted case is a further
release gate, not a substitute for that authorization rule.

The PDF descriptor is **not registered** in `ALL_PDF_FORMS`; there is no
completed/signature-reviewed Form 9465 page or linked-pass/ATS acceptance. The
shared `attachment-coverage.ts` guard still rejects every nonempty `f9465`
payload at **both** exports. Thus the new source, XML constructor, and PDF
projection cannot be mistaken for a live filing route. The guard now names the
distinct third-party disclosure authorization, and a source-only fixture asserts
both native and PDF rejection even with a reviewed taxpayer authorization
assertion.

The
[IRS TY2025 individual MeF release page](https://www.irs.gov/tax-professionals/tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
lists Form 9465 CUv28.0 for ATS and production, so electronic availability is
not the blocker. The unresolved question for IRS MeF support is specific: **when
a non-direct-debit Form 9465 is included as `IRS9465` in a signed 2025 Form 1040
MeF return, does the return's electronic signature authorize the installment
request, or is a separate signed authorization required and, if so, by what
accepted channel?** The standalone jurat in Publication 4164 and the attached
XML type do not answer that by themselves. Keep both export guards until an
authoritative answer and an accepted ATS case establish the representation; do
not fabricate a PDF signature field.

## TY2025 filing decision: fail closed

The current TY2025 Form 1040 product keeps Form 9465 requests **fail closed at
both MeF and PDF export**. The native constructor and PDF projection are staged
implementation, not filing support. The export guard now names the unresolved
electronic authorization and linked native/PDF review directly. This decision
does not classify a proposed installment payment as a tax payment or an IRS
approved agreement.

The implementation direction remains a bounded return-attached request; the
separate IRS online/later workflows are **not** silently emitted or excluded.
Before enabling attached export, resolve the attached-return
signature/authorization treatment, visually verify a filled canonical PDF,
reconcile PDF/native/1040 in both passes, register the native and PDF
descriptors, and only then narrow the both-export guard. Prior tax years, older
notices, payments made with the request, direct debit, payroll deduction,
spouse/joint requests, balances over $25,000, Form 2159, Form 433-F and Part II
remain unsupported and must continue to reject. The source-review assertions and
current XML projection do not authenticate an IRS account transcript or
establish that the IRS will grant an agreement.

This is an explicit release boundary rather than an indefinitely ambiguous
request state: any populated `f9465` input stops both exports with the same Form
9465 authorization/review error. A taxpayer who seeks an online or later
standalone agreement must use that separate IRS workflow; this Form 1040 export
does not submit it. The
[IRS Form 9465 instructions](https://www.irs.gov/instructions/i9465) describe
the attached and standalone routes, while
[Publication 4164 §8.14.3](https://www.irs.gov/pub/irs-pdf/p4164.pdf) specifies
the standalone electronic jurat. Neither resolves the attached non-direct-debit
authorization question identified above.

## October 7 current IRS guidance and terminal test evidence

The current [IRM 5.19.1.6.4.13(6), dated December 5, 2025](https://www.irs.gov/irm/part5/irm_05-019-001r)
recognizes electronically signed Form 9465 requests accompanying electronic
returns and identifies the IRS printout by its TRPRT marker. This passage sits
within **direct-debit installment agreement** procedures. It establishes that
an attached electronic-signature workflow exists; it does not specify our
non-direct-debit software's consent presentation, signature binding or PDF
representation. Treating this as authority to use a bare reviewer assertion
would be an inference the source does not establish. The existing attached
non-direct-debit authorization question remains open, now with this additional
primary source for the operator's clarification.

The terminal normal typed full regression contains **9 dedicated passes**:
4 staged native tests, 2 PDF projection tests and 3 public-source tests. Separate
shared tests also retain both-export rejection. Native tests cover return/owner/
source tampering and deliberately confirm the current authorization guard;
PDF tests are field projections, not generated complete filing packets. These
results supersede the historical claim that all those cases are unrun; they do
not authorize registration or positive filing.

Private `form9465-current-boundary-20261007.json` under the October 7 execution
research root retains every dedicated terminal test name and the full-run
metadata. Current code `5cccc456f` independently matches all 2,590 runtime
hashes from the green full-run launch manifest. Full test commit
`ecdccee1e5959be5dd11df8d7c7138187b47a7e9`, terminal exit 0 at 17:29:15 UTC,
12,255 passed / 0 failed; log SHA-256
`b3f7dc4a482426a133e75cf16dd69031a015d5dbf367b609e7520217a3e70219`.
No redundant test rerun, runtime/guard change, fake signature, future task,
main checkoff, packet-count increase or IRS acceptance is claimed.
