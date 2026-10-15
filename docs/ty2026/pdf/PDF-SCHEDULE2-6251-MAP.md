# TY2026 draft Schedule 2 and Form 6251 PDF map

Sources: pinned `corpus/draft/f1040s2.pdf` (SHA-256
`0e3d4faa4b96f692bc31119d2c86189c3d8b9263e8f3aaaf7c3da371887ebc56`)
and `corpus/draft/f6251.pdf` (SHA-256
`a547fc9d629e1f04bdc30e088214c716667b88cb1b45447c580c0ae33095b5cc`).
Both PDFs start with a draft cover. The two printed pages are physical PDF
pages 2 and 3. `pdf-fields-f1040s2.csv` inventories 68 widgets and
`pdf-fields-f6251.csv` inventories 62; all are in their AcroForm trees.
Regenerate both inventories with `build_pdf_fields.py` and recheck against
the final 2026 forms.

## Schedule 2 (current October 15 component)

The [2026 Schedule 2 builder](../../../forms/f1040/2026/pdf/schedule2.ts)
recalculates lines 1z, 3, 14, 15, 16c, 17d, 19c, 20 and 21 from finalized
source-owner amounts. It verifies line 3 against Form 1040 line 17, line 21
against Form 1040 line 23, and line 20 against the employment/other-tax amount
used by Schedule 3-A. Its typed map covers every numeric input and total; the
pinned template has 68 fields across the two printed pages.

Changed destinations include Form 4137 on 16a, Form 8919 on 16b, Form 8959
SE tax on 11 and wage/RRTA tax on 17b, plus W-2 uncollected FICA on 17c.
The source graph currently accepts only its reviewed payroll/golden-parachute
routes. The PDF's broader finalized-amount interface does not implement missing
source calculators or establish taxpayer eligibility.

Separate print details retain Form 4255 line selections for 1e/1f, SE exemption
checkboxes and text, and the Form 5329 attachment-exception checkbox. Positive
1e/1f require matching selections. Itemized descriptions and amounts for
1y/13a/13z must reproduce their printed total; credit recaptures also retain
form numbers. Descriptions that do not fit inline generate statements with
filer identity, calendar year, item amounts, pagination and a reconciled total.
Amounts and labels are not silently clipped to fit.

Output is static, includes both printed pages and any generated statements,
removes cover/widgets and preserves draft markings. Positive section 965
installments remain held because line 15's printed addition excludes line 12.
Final instructions must resolve that conflict before enabling the branch.

The focused integration case links Forms 4137, 8919 and 8959 with Schedule 2:
$184,000 of W-2 Social Security wages leave $500 for Form 4137 and none for
Form 8919. Their taxes are $60 and $145. Additional Medicare Tax is $558;
$30 of W-2 uncollected FICA makes line 20 $793. A separate $100 golden-parachute
tax makes line 21 $893. This verifies component reconciliation, not complete
return eligibility, all attachments or IRS acceptance.

## Form 6251 and complete bundle (remaining work)

The September historical prototype mapped Form 6251 line 1b, modeled
adjustments, Part I/II totals and optional Part III worksheet lines, with
cross-checks against Form 1040. That prototype's descriptor, six-page sample
and bundle are not implemented in this current main-based checkout.

The current deduction resolver emits the Form 6251 basis and senior-deduction
adjustment handoffs. Full AMT source limits, separate printed 2b–2t adjustments,
Part III calculations, draft PDF, current MeF and attachment selection remain
unfinished. Build the 2026 calculator from audited shared 2025 logic and current
sources before treating the existing handoffs as completed AMT.

The future complete PDF bundle must select and reconcile Schedule 2 when Form
1040 line 17/23 requires it, require Form 6251 for AMT, and include all other
source-triggered forms and statements. Current component tests and rendered QA
do not establish that bundle, final-form approval or current-version MeF parity.
