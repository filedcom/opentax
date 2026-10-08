# TY2025 Form 4972: partial beneficiary death benefit and estate tax

The
[2025 IRS Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
direct a multiple recipient who does not elect Part II to put the **full**
allowable death-benefit exclusion on Part III line 9. The multiple-recipient
calculation later applies the recipient's Form 1099-R box 9a share to the
special tax. Line 18 takes federal estate tax attributable to the lump-sum
distribution from the estate administrator.

A bounded Part-III-only route now combines those two adjustments for one
beneficiary with a partial box 9a share. The existing source shape must show a
complete participant-wide death-benefit allocation with the elected recipient,
and a separate administrator/estate-return allocation of the total federal
estate tax and the recipient's share. It requires a wholly taxable source Form
1099-R, participant/plan and recipient identity, exact percentages and
whole-dollar amounts, and distinct death and estate source references. The
calculator enters the full exclusion on line 9 and the full attributable tax on
line 18 before prorating the Part III special tax. Native and PDF preflights
recompute the printed lines, match the source copy, and require the Form 1040
special tax to agree. Positive and allocation, source, identity, and final-tax
tamper fixtures are authored for the bulk validation pass.

Part II, NUA, annuity, multiple Form 1099-R copies, trust-only recipients, and
other death/estate combinations remain closed. Reviewed administrator and
estate-return references do not authenticate the underlying document bytes.
