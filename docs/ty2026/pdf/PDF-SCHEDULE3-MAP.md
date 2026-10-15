# TY2026 Schedule 3 calculation and PDF map

Source: pinned draft [`f1040s3.pdf`](../corpus/draft/f1040s3.pdf), SHA-256
`5feb6f8d0f08191a2da153573d195fc354f385e26915b99b57d4588893b7cef0`,
created April 27, 2026. It is a research draft; replace the hash and recheck
line positions against the final release before filing acceptance.

## Changed lines and routes

The printed 2026 line 5b is **reserved**. The TY2025 field
`line5b_energy_efficient_home` is rejected by the 2026 node instead of being
added to Form 1040 line 20. Schedule 3 line 13e is new: the total section
1062 applicable net tax liability from Form 1062 line 14. It joins lines
13a–13z on line 14, then joins lines 9–12 on line 15. Part I line 8 reaches
Form 1040 line 20; Part II line 15 reaches Form 1040 line 31.

## Current graph (October 15, 2026)

The current-main source graph now registers `schedule3_2026`. W-2s finalize
excess Social Security withholding, including an explicit zero when absent.
Schedule 3 line 11 flows through line 15 to Form 1040 line 31, Schedule 3-A's
other-payment subtraction, and Schedule 8812 Part II-B line 24. The ACTC node
waits for Schedule 3 and reconciles the credit against W-2 before subtracting it
along with EIC; it no longer rejects positive ordinary excess-withholding credit.

Each spouse has a separate Social Security ceiling; employer/employee groups
combine box 3 wages and box 7 tips. Same-employer excess requires correction,
not a return credit. If multiple employers' wages exceed the annual base, actual
box 4 amounts are required for every employer rather than interpreting a missing
amount as zero. In the synthetic two-employer case, $18,600 withheld less the
$11,439 annual cap yields $7,161 on Schedule 3 lines 11/15 and Form 1040 line 31.
This follows [IRS Topic 608](https://www.irs.gov/taxtopics/tc608) and the pinned
2026 W-2 wage base; tier 1 RRTA reconciliation still needs a separate source route.

The annual finalizer reuses shared 2025 Schedule 3 totals, preserving the 2025
node's existing behavior. The 2026 internal contract covers all nonreserved form
lines, adds 6z detail and 13b–13e/13z, and rounds combined source amounts on each
printed line before totaling. Unsupported pending-credit signals and reserved
2025 line 5b are rejected. It is not a public input accepting caller credit totals.
Only reviewed registered producers can feed the active node; today that is W-2
excess withholding. Other source-credit and payment calculations remain pending.

The draft builder recomputes all subtotals, checks Form 1040 lines 20/31, and
replays the original identified W-2 records before printing line 11. Schedule 3
uses attachment sequence 03, before Schedule 3-A. It omits the IRS cover, leaves
reserved fields blank and adds complete paginated 6z/13z continuation statements
when descriptions exceed the form. The bundle puts statements after all forms.

## Verification

The combined 2026/shared Schedule 3/child-credit regression run passed 509 tests.
The repository unit command, targeted type checks and changed-file lint passed.
Cases cover per-spouse ceilings, reported tips, absent withholding, same-employer
errors, settlement, EIC/ACTC/Schedule 3-A coordination, source replay mismatches,
reserved fields, line 13e, whole-dollar rounding and multipage statements. Nine
synthetic QA pages were rendered and inspected. Reopened output has no fields
or page annotations. Internal all-line/PDF fixtures establish line mapping,
not source eligibility for unregistered credit forms.

## AcroForm fields

The draft has a cover page followed by one filed page (`pageIndices: [1]`).
`f1_01` and `f1_02` are name and SSN. All 38 fields and their rectangles are
in [the inventory](../inventories/pdf-fields/pdf-fields-f1040s3.csv). `f1_03`–`f1_25` cover Part I; `f1_08`
and `f1_13` are reserved lines 5b and 6e. The line 6a field lives under
`Line6a_ReadOrder`, and the line 6z description uses the nested `f2_22`
field despite being on `Page1`. `f1_26`–`f1_38` cover Part II; `f1_34` is
the new line 13e, `Line13z_ReadOrder.f1_35` is the description, `f1_36` is
the amount, and `f1_37`/`f1_38` are totals 14/15. The PDF builder verifies
the printed subtotals and matches lines 8/15 against Form 1040 lines 20/31.

## Remaining filing work

- Register each credit source only after its 2026 finalization, limit, and
  attachment behavior is checked; extend the 6z/13z statement detail where
  multiple source rows can occur.
- Reconcile Form 1062 line 14 with Schedule 3 line 13e and line 15 with Form
  1040 line 24b without double counting.
- Map the current TY2026 MeF schema and business rules when the newer IMF
  package is available, then rerun ATS and final-form PDF comparisons.
