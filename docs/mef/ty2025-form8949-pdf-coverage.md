# TY2025 Form 8949 PDF projection (written, unrun)

Source-integrity follow-up (2026-09-28, unrun): a direct accrued-market-
discount transaction now needs a named interest payer and an otherwise
uncombined, positive-gain sale. It prints code D and a negative column (g)
amount, leaves column (h) equal to proceeds less basis plus that adjustment,
and routes the ordinary amount through Schedule B taxable interest. Positive
depreciation recapture from the direct `f8949.ordinary_income_portion` input
still rejects; the separate investment section 1245 Form 4797 source now
drives a bounded handoff. The intermediate node, native MeF, and PDF reject any
transaction whose column (h) fails to reconcile to columns (d), (e), and (g).
These cases are written but not run in the requested build-first phase.

The existing aggregate Form 4797 recapture fields still cannot supply that
handoff. A new property-level investment section 1245 route computes Part
III ordinary recapture and emits the linked excess-gain Form 8949 row. It is
written but unrun; business-property and other recapture classes remain open.
A direct Form 8949 recapture number is not a substitute.

The [2025 Form 4797 instructions](https://www.irs.gov/instructions/i4797)
distinguish business-property dispositions from depreciable investment
property: Part III computes the recapture; only excess gain from the latter
goes to a "From Form 4797" Form 8949 row. That row is not the original sale
with an unexplained negative adjustment. The existing direct Form 8949
`ordinary_income_portion` field therefore stays rejected; the separate
source-backed Form 4797 investment route makes the split explicitly.

The [official 2025 Form 8949](https://www.irs.gov/pub/irs-prior/f8949--2025.pdf)
has 11 eight-column transaction rows on each of two pages. The current PDF
descriptor now consumes the canonical `form8949.transaction` deposit that the
calculator also sends to Schedule D and MeF. It no longer treats raw `f8949`
intake as preformatted PDF rows. Each reporting box receives its own official
page: A/B/C/G/H/I on Part I, D/E/F/J/K/L on Part II. More than 11 rows for one
box produce another page of that same box, with page-local totals. The
descriptor maps both pages' row fields, totals, selected checkbox, taxpayer
name, and SSN. It converts three supported source-date formats to MM/DD/YYYY
and prints negative amounts in parentheses without dropping cents. Contradictory
term/box facts and unsupported date strings stop before export.

The canonical AcroForm field tree was read from the official 2025 PDF: page 1
uses `Table_Line1_Part1`, `f1_03` through `f1_90`, and `c1_1[0..5]`; page 2
uses `Table_Line1_Part2`, `f2_03` through `f2_90`, and `c2_1[0..5]`.
Header fields are `f1_01/f1_02` and `f2_01/f2_02`; page totals use
`f1_91/f1_92/f1_94/f1_95` and the corresponding `f2` fields. The mapping and
source-to-instance cases are written but unrun. No filled PDF was rendered or
visually inspected yet, as the shared full validation batch has not started.

This route remains bounded: a direct raw `f8949s` PDF request with no computed
transaction is rejected, and section 1202/code-Q rows remain closed until
their Schedule D and Form 6251 treatment is modeled. Actual IRS widget
appearances, final assembled-page visibility, and date special terms such as
`VARIOUS` still need validation or further implementation.
