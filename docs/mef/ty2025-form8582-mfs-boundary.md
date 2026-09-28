# TY2025 Form 8582 MFS lived-apart boundary

Sources: [2025 Form 8582](https://www.irs.gov/pub/irs-prior/f8582--2025.pdf) and
[2025 instructions](https://www.irs.gov/pub/irs-prior/i8582--2025.pdf), Part II
lines 5 and 8.

The existing general input records whether an MFS taxpayer lived with their
spouse at any time during 2025. That fact now reaches Form 8582. A taxpayer who
affirmatively lived apart all year may use the $12,500 active-rental special
allowance, with the $50,000 to $75,000 MAGI phaseout. The MeF form prints
$75,000 on Part II line 5 and reconciles the lived-apart assertion to the
general input. Missing or positive lived-with facts still provide no special
allowance. Focused source, phaseout, and XML cases are written but have not been
run.

The storage-ready single active-rental ledger now also accepts MFS only when
`mfs_lived_apart_all_year` is explicitly true. It passes that fact to the
existing Part II calculation and records the resulting allowed and suspended
Schedule E operating loss. For a $40,000 rental loss, whole-dollar MAGI of
$50,000, $60,000, and $75,000 produces $12,500, $7,500, and $0 allowed,
respectively. Missing or false lived-apart facts still reject ledger creation;
the stored ledger read recomputes against the original source. Focused ledger
cases are written but unrun. This covers one identified Schedule E active
rental with no prior PAL or sale.

This does not complete GAP-8582. Per-activity source allocation, prior passive
loss character, dispositions, complex Part IX rows, filled PDF inspection, local
XSD, and IRS ATS acceptance remain their separate gates. The PDF descriptor
still lacks a complete computed Part II mapping for this case.
