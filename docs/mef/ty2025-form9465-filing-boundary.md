# TY2025 Form 9465 filing-route decision

Static source/schema/PDF-field audit, 2026-09-28; no tests, XSD validation,
filled-PDF render, IRS business-rule run, or ATS acceptance is claimed.

## Filing alternatives and native applicability

The [IRS Form 9465 instructions](https://www.irs.gov/instructions/i9465)
allow an installment-agreement request with a balance-due return, separately
after a return or notice, or through the IRS online payment-agreement channel.
They explicitly say not to use Form 9465 when choosing the online request or
when able to pay in full within 180 days. A proposed agreement is not payment
or IRS approval. The checked-in TY2025 v5.4 `ReturnData1040.xsd` includes one
optional `IRS9465` root in the 1040 document sequence, and its Form 9465 XSD
requires return-type code, filer name/name control/SSN, tax due, total balance
due, and payment due day. Thus **a return-attached native 1040 MeF route is
possible and conditionally applicable**. Online and later standalone requests
are different administrative workflows; the existence of those channels does
not exclude the attached route from the Form 1040 product.

The instructions distinguish Form 9465 line 5 (amount on return(s) or
notice(s)), line 6 (other balances), line 8 (payment with this request), line
9 (remaining amount), lines 10–12 (monthly payment and proposed terms), and
line 13 direct debit or line 14 signed payroll deduction. More than $50,000
generally requires Form 433-F; certain $25,000–$50,000 cases require direct
debit or signed Form 2159, and a payment below the minimum can require Form
433-F. Prior default can require Part II. A current Form 1040 line 37 balance
alone therefore cannot populate the form or establish eligibility.

## Local boundary

The old optional `amount_owed`/`monthly_payment`/bank-instruction input has
been replaced directly. `nodes/inputs/f9465/index.ts` now accepts only an
explicit `attached_2025_1040` mode for one single-filer TY2025 Form 1040
balance no more than $25,000, with a reviewed final-return and IRS-account
source reference, confirmations that no prior debt, payment with the request,
existing plan, recent default, bankruptcy/offer in compromise, changed address, or 180-day full-payment route
changes the claim, and a manual monthly payment at least the line-9/72 amount. It emits no
tax or payment output. The staged `mef/forms/f9465_attached.ts` builder
requires the exact final Form 1040 line 37 and filer identity, then constructs
the native required line-5/7/9/10/11a/12 fields. Focused source, native and
rejection cases are written but unrun. This is a direct replacement, not a
legacy alias or fallback.

The staged native builder is **not registered** in `ALL_MEF_FORMS`. The
unregistered `pdf/forms/f9465_attached.ts` descriptor maps only page 1 of the
[current official Form 9465 PDF](https://www.irs.gov/pub/irs-pdf/f9465.pdf),
which is still the September 2020 revision used with the 2025 return. A
static AcroForm field inspection found the following exact page-1 mapping:

| Form field | Canonical AcroForm field | Source |
| --- | --- | --- |
| Return type, year; 1a name and SSN | `f1_1`–`f1_5` | 1040/2025 and identified single filer |
| 1a street, apartment, city/state/ZIP | `f1_9`–`f1_11` | same domestic filer address; reviewed as unchanged since prior return |
| 5, 7, 9 balance | `f1_22`, `f1_24`, `f1_26` | final 1040 line 37, with no other debt or current payment |
| 10, 11a, 12 terms | `f1_27`, `f1_28`, `f1_30` | upward whole-dollar line 9 / 72, proposed payment, due day |

The page's signature/date lines have **no AcroForm fields** and are left blank;
the descriptor does not represent a signed form. The [IRS Publication 4164,
§8.14.3](https://www.irs.gov/pub/irs-pdf/p4164.pdf) states a signature is
required for a *standalone* electronic 9465 and describes its disclosure and
direct-debit consent. The checked-in TY2025 attached `IRS9465` content schema
has no signature element. Neither fact alone establishes how the paper-form
signature block should be represented for an attached, non-direct-debit 1040
request. The existing reviewed authorization assertion is provenance metadata,
not a signature.

The PDF descriptor is **not registered** in `ALL_PDF_FORMS`; there is no
completed/signature-reviewed Form 9465 page or linked-pass/ATS acceptance.
The shared `attachment-coverage.ts` guard
still rejects every nonempty `f9465` payload at **both** exports. Thus the
new source, XML constructor, and PDF projection cannot be mistaken for a live filing route.

The [IRS TY2025 individual MeF release page](https://www.irs.gov/tax-professionals/tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
lists Form 9465 CUv28.0 for ATS and production, so electronic availability is
not the blocker. The unresolved question for IRS MeF support is specific:
**when a non-direct-debit Form 9465 is included as `IRS9465` in a signed 2025
Form 1040 MeF return, does the return's electronic signature authorize the
installment request, or is a separate signed authorization required and, if
so, by what accepted channel?** The standalone jurat in Publication 4164 and
the attached XML type do not answer that by themselves. Keep both export
guards until an authoritative answer and an accepted ATS case establish the
representation; do not fabricate a PDF signature field.

## Decision owed before changing export

The current implementation direction is a bounded return-attached request;
the separate IRS online/later workflows are **not** silently emitted or
excluded. Before enabling attached export, resolve the attached-return
signature/authorization treatment, visually verify a filled canonical PDF,
reconcile PDF/native/1040 in both passes, register the
native and PDF descriptors, and only then narrow the both-export guard.
Prior tax years, older notices, payments made with the request, direct debit,
payroll deduction, spouse/joint requests, balances over $25,000, Form 2159,
Form 433-F and Part II remain unsupported and must continue to reject. The
source-review assertions and current XML projection do not authenticate an
IRS account transcript or establish that the IRS will grant an agreement.
