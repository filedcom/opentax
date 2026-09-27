# TY2026 Schedule 3 calculation and PDF map

Source: pinned draft [`f1040s3.pdf`](corpus/draft/f1040s3.pdf), SHA-256
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

The current active source is excess Social Security withholding from multiple
W-2s. In a two-employer example, 2026 W-2 box 4 total $18,600 less the
$11,439 annual cap yields Schedule 3 line 11 and line 15 of $7,161. The
registered graph puts that amount on Form 1040 line 31, and the three-page
PDF bundle was rendered and visually checked.

The 2026 node also sends actual Schedule 3 credit-line amounts to Schedule
8812. Its Credit Limit Worksheet A/B answers must match those amounts.
Future Form 1116, 2441, 8863, 3800, 8839, 8936, and other credit source
routes can join this node after their TY2026 tax-limit rules and attachments
are reviewed. The four source-credit-pending signals currently fail instead
of printing unfinalized gross credits.

## AcroForm fields

The draft has a cover page followed by one filed page (`pageIndices: [1]`).
`f1_01` and `f1_02` are name and SSN. `f1_03`–`f1_25` cover Part I; `f1_08`
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
