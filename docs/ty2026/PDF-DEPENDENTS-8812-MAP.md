# TY2026 dependent table and Schedule 8812 PDF map

Sources: pinned draft [`f1040.pdf`](corpus/draft/f1040.pdf), SHA-256
`e044e765ace334c76bda7910bd3193fc813c7789d06340124359b885c98d58d0`,
and draft [`f1040s8.pdf`](corpus/draft/f1040s8.pdf), SHA-256
`0638b2863bdaeadfd3fccee12a9145bf92a442d8de156584c5602cc7e3881422`.
Both are research drafts, not filing-ready forms. Recheck widgets and printed
instructions against the final IRS releases before TY2026 export acceptance.

## Form 1040 dependent rows

The four visible columns are stored by **printed row**, not by dependent.
`Table_Dependents.Row1.f1_31` through `f1_34` are first names across four
dependents; Row2 `f1_35` through `f1_38` are last names; Row3 `f1_39` through
`f1_42` are TINs; Row4 `f1_43` through `f1_46` are relationships. Row5 has
separate `c1_14` through `c1_21` residency boxes; Row6 has `c1_22` through
`c1_29` student/disability boxes; Row7 has `c1_30` through `c1_33`, each
with CTC and ODC widgets. `Dependents_ReadOrder.c1_13` marks more than four.

The PDF builder requires the calculated dependent count and credit-category
counts to equal the detail rows, plus an explicit U.S. residency answer for
each dependent. It prints the first four and puts remaining dependents on
numbered continuation pages with the same identity, residence, student,
disability, and credit facts. The first draft visual render caught an incorrect
column mapping; the corrected one-child and five-dependent pages were
rendered and inspected.

## Schedule 8812

The draft has two AcroForm pages. Page 1 `f1_1` and `f1_2` are filer name and
SSN; `f1_3` through `f1_19` map lines 1 through 14, with the line 6 field in
`Line6ReadOrder`. Page 2 `f2_2` through `f2_16` map lines 16a through 27;
`f2_3` is the qualifying-child count printed beside the line 16b multiplier.
The page 2 reserved line 15 field stays blank. Part II-B fields print only
when its calculated lines exist. When line 16a is zero, the remaining Part II
fields stay blank at the draft's stop instruction.

The PDF builder checks Schedule 8812 line 1 against 1040 AGI, its child counts
against the 1040 dependent rows, line 14 against 1040 line 19, and line 27
against 1040 line 28. It also checks its own credit limits. The core bundle
requires the calculated pending Schedule 8812 whenever a credit-category
dependent exists; a fully phased-out credit leaves the dependent on Form 1040
without attaching an empty Schedule 8812. One-child CTC and ACTC examples
were rendered and inspected; the flattened four-page CTC sample reopened with
zero form fields and zero page annotations.

## Remaining filing work

- Reconcile the public Credit Limit Worksheets A/B and Part II-B source facts
  with the future TY2026 Schedule 3 and other employment-tax routes.
- Bind Schedule 8812 to current TY2026 MeF elements and business rules once
  the current IMF package is available.
- Replace draft PDF hashes and field locations with final Form 1040 and
  Schedule 8812 artifacts, then rerun visual and ATS comparisons.
