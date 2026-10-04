# TY2025 Form 4852 substitute-source filing gap

The current input node calculates wages, retirement income, withholding, and
related FICA fields from typed Form 4852 substitutes. Before this audit, those
amounts could reach Form 1040 and final native MeF/PDF export even though the
return packet had no completed Form 4852 route. A source item also lacked the
substitute recipient's SSN, source workpaper, and the explanations of amount
derivation and attempts to obtain the issued or corrected form. Therefore a
typed amount alone did not establish the completed substitute form or its
ownership.

Both final exporters now reject any Form 4852 W-2 or 1099-R source with the same
explicit filing-route diagnostic. This does not discard the calculation node or
assert that a valid substitute can never be filed. The
[IRS Form 4852 and instructions](https://www.irs.gov/pub/irs-pdf/f4852.pdf)
identify filer name and SSN, tax year, payer, substitute amounts, how those
amounts were determined, and efforts to obtain the original or corrected
statement; the form says to attach it to the return.
[IRS Publication 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf) permits
electronic filing after a taxpayer completes Form 4852 when a correct W-2,
W-2G, or 1099-R cannot be secured. It specifically requires the nonstandard
W-2 indicator in the electronic record and ERO retention of Form 4852. The
locally cached TY2025 v5.4 W-2 and 1099-R schemas have an `N`/`S`
`StandardOrNonStandardCd`. An ordinary issued W-2 now emits `N` when its
altered, handwritten, or typed status has a matching reviewed source-copy
reference. An ordinary issued 1099-R now also emits `N` for an identified
altered, handwritten, or typed payer copy; the Form 4852 input still produces neither
source document. The [IRS TY2025
accepted-form and attachment listings](https://www.irs.gov/tax-professionals/tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
do not list a separate Form 4852 MeF root or recommended PDF name. That
absence suggests a retained-form workflow, but does not by itself establish
the allowed electronic representation. Confirm the effective version's
business rules and ERO process before opening a positive route.

To open a positive route, retain a complete substitute form for each owner and
payer, authenticate the source workpaper or available incorrect issued copy,
reconcile original-versus-substitute amounts without double counting, bind the
recipient to the taxpayer or joint spouse, and emit the required nonstandard
W-2 indicator and any applicable 1099-R coding with a reviewed retained Form
4852 and printable copy.
Verify source-to-Form-1040, withholding, FICA, XML, PDF, any required
attachment/reference, local XSD, IRS business rules, and ATS cases. The current
guard has focused native/PDF rejection cases for both substitute types; it is
not a filing-ready positive route.

The separate issued-W-2 nonstandard branch has a complete synthetic
source-to-Form-1040/native/PDF case: a reviewed handwritten copy emits `N`,
the TY2025 v5.4 XML passes local XSD validation, and the filled Form 1040
prints its $75,000 wages. Native and PDF export reject a changed copy
reference. This does not establish authentic issuer bytes or open the
substitute Form 4852 route. A separate altered 1099-R case emitted `N`,
validated against the local TY2025 v5.4 XSD, printed its $20,000 gross
pension on Form 1040, and rejected an unidentified copy in both exporters.
It likewise does not authenticate payer-issued bytes or open Form 4852.
A reviewed typed 1099-R also emits `N` only when its review names the same
retained payer-copy reference. A $20,000 typed direct pension rollover reached
Form 1040, TY2025 v5.4 XSD-valid XML, and a filled PDF; changed references
reject. Form 8915-F's ordinary-source matcher excludes this nonstandard copy
until that source route is separately reviewed.

A separate, unregistered retained-copy projector now fills page 1 of the
official Form 4852 from a reviewed item. The item can carry the recipient SSN,
tax year, missing/incorrect status, payer address, amount-determination and
contact explanations, source-workpaper reference, and completed-form review
reference. The projector requires an identified taxpayer or joint spouse,
checks the recipient SSN against the filed identity, and prints the distinct
W-2 or 1099-R amounts and withholding in their actual AcroForm fields. It
rejects missing review facts and a 1099-R without a distribution code. An
explicit line 8b taxable amount is already net of basis and is no longer
reduced again by line 8i employee contributions; when line 8b is absent, the
bounded estimate subtracts those contributions once from gross. The same
calculation prints on the retained PDF. Official PDF tests extract the W-2
owner, payer, wages, withholding, and explanations and the 1099-R gross,
taxable, and contribution amounts. These references
are typed identifiers, not authenticated retained bytes. The projector is not
registered in final packet export; the existing Form 4852 native/PDF guards
remain in force pending the source record, retention, basis, and MeF route.

## October 4 undetermined-taxable-amount correction

The [official Form 4852 instructions](https://www.irs.gov/pub/irs-pdf/f4852.pdf)
say line 8c is checked when the taxpayer cannot compute the taxable
distribution and line 8b must then be blank. The calculation node previously
estimated gross less employee contributions and deposited that amount into
Form 1040 and AGI even when line 8c was checked. A focused regression first
proved that mismatch. The shared taxable-amount projector now throws before
any return output for an undetermined item. The typed source and unregistered
retained-copy projector still allow the marked, blank-line-8b paper record;
they do not create a calculated filing route. The 24 node tests, one retained
projection guard test, and both native/PDF final-export guard tests pass. A
positive substitute route remains closed pending the source, packet, MeF
business-rule, and ATS evidence above.

## October 4 substitute-type field correction

The official form separates substitute W-2 amounts on line 7 from substitute
1099-R amounts on line 8. The typed input previously accepted both groups in
one item, while calculation and the retained-copy projector selected only the
declared `form_type` and silently discarded the other group's fields. The
shared item schema now rejects every W-2-only field on a 1099-R item and every
1099-R-only field on a W-2 item, including false checkbox values and zero
amounts. Shared withholding and state/local fields remain available to either
type. A red regression preceded the fix; all 25 node tests and the 28 focused
native withholding/export tests pass. This guards classification but does not
open the retained Form 4852 export route. A wider seven-file run passed 93
tests and could not run one PDF text-extraction case because this host lacks
`pdftotext`; it did not provide a full green PDF-source replay result.
