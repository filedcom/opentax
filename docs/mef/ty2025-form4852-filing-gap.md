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
electronic filing after a taxpayer completes Form 4852 when a correct W-2, W-2G,
or 1099-R cannot be secured. The exact TY2025 MeF representation or permitted
attachment method still needs confirmation from the effective IRS package.

To open a positive route, retain a complete substitute form for each owner and
payer, authenticate the source workpaper or available incorrect issued copy,
reconcile original-versus-substitute amounts without double counting, bind the
recipient to the taxpayer or joint spouse, and implement the required MeF and
printable packet path. Verify source-to-Form-1040, withholding, FICA, XML, PDF,
attachment/reference, local XSD, IRS business rules, and ATS cases. The current
guard has focused native/PDF rejection cases for both substitute types; it is
not a filing-ready positive route.
