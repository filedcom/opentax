# TY2025 Schedule 1-A bounded senior-only filing path

Sources:
[2025 Schedule 1-A](https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf),
[2025 Form 1040 instructions, including Schedule 1-A](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf),
and checked-in v5.4 `Common/IRS1040Schedule1A/IRS1040Schedule1A.xsd`.

The `schedule1a` node computes a combined deduction and sends it to Form 1040
line 13b. MeF now includes a strict senior-only Schedule 1-A descriptor after
Schedule 1 and before Schedule 2. Form 1040's positive-line-13b guard opens
only when that source review is present and the second pass has exactly one
attached Schedule 1-A. The descriptor independently rejects unsupported
components and reconciles line 38 to line 13b. The same senior-only boundary
now has a two-page PDF field map, but its filled appearance is unverified.

## Source and line blockers

- Part I lines 1–3 use Form 1040 line 11b plus Puerto Rico excluded income, Form
  2555 lines 45/50, and Form 4563 line 15. The node receives `magi` from the AGI
  aggregator, and the senior-only route requires a source-referenced review that
  all those adjustments are zero. Positive exclusions still need their own
  source routes; `magi` cannot be assumed to be line 3 without this review.
- Part II lines 4a–4c distinguish W-2 box 7, Form 4137 tips, multiple employers,
  and the Social Security wage-base/special occupation cases. The node receives
  only employee-SSN/amount pairs from qualifying W-2 box 7 records, then
  computes the final tips deduction. It cannot fill or reconcile every
  applicable source line, and the IRS instructions' multi-employer and wage-base
  worksheets are not represented.
- Part III lines 14a–14c distinguish qualified overtime included in W-2 box 1
  from qualified overtime on Forms 1099-NEC/MISC. The node currently accepts
  taxpayer/spouse compensation totals as direct claims without those document
  identities, inclusion checks, or the source-line split.
- Part IV line 22 requires a VIN and per-loan interest deducted on Schedule C,
  E, or F versus interest claimed on Schedule 1-A. The node has a VIN, paid
  interest, and an asserted business-schedule amount, but no loan/purchase-date,
  new-vehicle, final-assembly, lender, or business-deduction reconciliation.
  Native v5.4 permits at most 50 vehicle groups; the node has no corresponding
  limit. Emitting line 30 from these assertions could overstate the deduction.
- Part V's senior-only descriptor now computes per-person lines 36a/36b and
  intermediate lines 32–35. Its zero-exclusion review does not establish the
  positive Part I exclusion paths or authenticate the underlying documents.

The v5.4 XSD has distinct elements for these source lines and Part VI line 38.
The registered senior-only MeF descriptor
requires an explicit source-referenced review that there was no section 933
Puerto Rico exclusion and no Form 2555 or Form 4563 filing. It uses the AGI
calculated upstream, rejects any tips, overtime, or vehicle claim, computes
the Part V phaseout and each spouse's line 36 amount, and emits Part I lines
1/3 plus Part V lines 32-37 and Part VI line 38 in native XSD order. It checks
the filing status, each claimed senior's SSN/age/timely employment-valid SSN
facts, AGI, and the senior/total deduction against the pending Form 1040 lines
11b and 13b, and rejects a conflicting Form 2555/4563 pending source. Positive Part I
exclusions remain unsupported. These references are review evidence, not
independent authentication of the underlying taxpayer documents.

The source, document, return integration, and PDF field-map cases are written
but unrun. The official 2025 two-page AcroForm was inspected: page 1 fields
`f1_03`, `f1_08`, and `f1_09` correspond to lines 1, 2e, and 3; page 2
fields `f2_15` through `f2_23` correspond to lines 31 through 38. The
registered PDF descriptor projects only the senior-only worksheet after the
same MeF source/return reconciliation, and Form 1040's PDF line 13b opens only
when that page's line 38 matches. Other Parts II-IV still cannot render.
The route remains unverified until the full batch, local XSD, IRS business
rules, and a filled-PDF visual/data check pass. No tests, typecheck, XSD,
filled-PDF rendering, or ATS acceptance ran in this build-first slice. No
compatibility layer or dual API shape was added.
