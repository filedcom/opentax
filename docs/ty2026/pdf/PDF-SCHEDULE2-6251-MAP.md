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

## Schedule 2

The dedicated descriptor maps each calculated numeric line to the draft
field. The changed 2026 routes include AMT on line 2, NIIT on line 6,
Form 4137 on line 16a, W-2 uncollected FICA on line 17c, and the new Part II
totals. The filler recalculates lines 1z, 3, 14, 15, 16c, 17d, 19c, 20,
and 21 before rendering. It rejects positive lines 1e/1f when their election
boxes are missing, and lines 1y/13a/13z when their required description is
missing. These facts need to be added to the calculation record and PDF
descriptor before those branches can file.

## Form 6251

The descriptor maps the calculation node's line 1b, modeled adjustments,
Part I/II totals, and optional Part III worksheet lines. Line 1a is derived
from Form 1040 line 11b minus Form 6251 line 1b. The filler verifies the
AMTI, exemption/tax arithmetic, and Form 1040 line 16 versus Form 6251
line 10. The current calculation node groups several less common adjustments
into line 3 and has not modeled every separate printed line 2b–2t. Source
routes and print detail for those lines remain to implement.

The core PDF builder appends Schedule 2 when Form 1040 line 17 or 23 reports
tax. It requires Form 6251 whenever Schedule 2 line 2 reports AMT, and
reconciles those amounts before merging. A six-page sample (1040, Schedule 2,
Form 6251) passed text extraction and visual inspection. These are draft
renderers; the remaining supported TY2025 attachments, current MeF output,
and final-form verification remain open.
