# TY2026 Form 4136 and Schedule A filing contract

The pinned [2026 draft Form 4136](corpus/draft/f4136.pdf) is the current
printed-year source (SHA-256
`8b9d80bba8973a8f274b5238c428878d2e5672604913de50f8a400ad521706ba`).
The expected [2026 draft Schedule A URL](https://www.irs.gov/pub/irs-dft/f4136sa--dft.pdf)
still serves a 2025 form. The pinned [2025 Schedule A](corpus/authorities/f4136sa--2025.pdf)
(SHA-256 `86ce549a7f1e44ef9dd7a800ee12063bb2755a262a4c5cb5b2a8b322c93eb411`)
and [combined Form 4136 instructions](corpus/authorities/i4136--2025.pdf)
(SHA-256 `d3d63fc3e5af24a8d4c8466b415c3d9269233af67f24d29640a5b4581e10c9f1`)
are **prior-year comparators**, not authority to file a TY2026 Schedule A.
The current main form already requires one Schedule A for each qualifying
business activity when there is more than one.

## Source ledger and graph route

| Stage | Required record and rule |
| --- | --- |
| Claim source | Preserve the purchase/sale date, seller name and address, tax paid, fuel and quantity/unit, actual fuel cost, equipment/use, type-of-use code, CRN, and business activity. Keep the certificate, registration and export evidence for applicable lines. Reject duplicate or waived claims. |
| Eligibility | Validate qualifying business activity and usage before any credit. The combined 2025 instructions also describe the narrow home-use undyed-kerosene exception; recheck that branch against 2026 instructions. Registration, bus rates and vendor claims need line-specific evidence. |
| Calculation | Determine eligible gallons or gasoline/diesel equivalents per line and type of use, apply the 2026 printed rate (including reduced bus rates), round claim amounts, and aggregate into Form 4136 Part II column (e). Keep cost in column (d); it is evidence and PDF data, not the credit base. Reserved lines 9, 10 and 12 do not create claims. |
| Business detail | If one activity, print its Part I identity and claims on the main form. If multiple, generate one Schedule A per activity, sum each line across schedules into the main form, and put the activity generating the most credit in main Part I. Cross-check business count and schedule count. |
| Return | Main Form 4136 line 17 is the total of lines 1–16 column (e), and the 2026 draft explicitly sends an individual return to **Schedule 3 line 12**. Schedule 3 line 15 then flows to Form 1040 line 31. Reconcile these values and the attached activity totals. |

## Existing implementation and year boundary

The shared [`f4136` input node](../../forms/f1040/nodes/inputs/f4136/index.ts)
models business and home-kerosene claims, rates, records, multiple activities,
and the Schedule 3 line 12 output. The 2025 [main PDF descriptor](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/pdf/forms/f4136.ts),
[Schedule A PDF descriptor](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/pdf/forms/f4136_schedule_a.ts),
and [MeF descriptor](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/mef/forms/f4136.ts) show the
per-activity PDF/binary-attachment route. They are not registered TY2026
serializers. Their fixed rates, form widgets, binary filenames, XSD element
names, and reject rules must be checked against the 2026 authorities.

The 2025 descriptor emits a Schedule A for every activity only when there are
additional activities, and the MeF serializer requires each matching binary
document ID. Preserve that invariant for 2026; a main-form total without the
required schedules is incomplete. The 2026 draft main form includes Part I
activity count, principal business code, EIN where applicable, equipment
identity, and line-specific certification/registration questions. Audit the
shared source schema against every printed answer, not just its numeric total.

## Build order and acceptance

1. Obtain the published 2026 Schedule A and combined 2026 instructions.
   Diff printed rows, CRNs, rates, Part I fields and PDF widgets against the
   pinned 2025 comparators and update the source ledger. Confirm the narrow
   home-use exception and each credit's end date.
2. Audit the shared node's 2025 literals, rounding, activity identity,
   tax-paid/source evidence and certificates against the 2026 form. Register
   the validated node in the 2026 graph and reconcile line 17 to Schedule 3
   line 12, then Schedule 3 line 15 to 1040 line 31.
3. Build a 2026 main-form PDF field map and one Schedule A PDF instance per
   qualifying activity. Reconcile each schedule line and grand total with the
   main form. Do not fill a 2025 Schedule A into a 2026 filing packet.
4. Diff the current TY2026 MeF XSD and rules against the local May v1 package
   and TY2025 `IRS4136` route. Map the accepted 2026 `IRS4136` fields and
   Schedule A binary references, then validate the complete XML/archive and
   active reject rules.
5. Exercise one-activity, two-activity, home-kerosene-exception, bus-rate,
   registered-vendor, export and negative eligibility cases. Assert rendered
   PDF totals, Schedule 3/1040 amounts, attachment count and MeF acceptance;
   retain a TY2025 regression on reused logic.

The available May 2026 IMF v1 package supports schema research only; its
1040 structure is already out of step with the September draft. See the
[MeF drift gate](MEF-V1-DRIFT.md). This document is an implementation plan,
not a claim that TY2026 Form 4136 filing is registered or accepted.
