# Form 8824 — Like-Kind Exchanges (IRC §1031)

## Purpose
Computes deferred gain, recognized gain (boot), and basis of replacement property for §1031 like-kind exchanges. After TCJA 2017, only **real property** qualifies. Routes recognized gain to Schedule D or Form 4797.

## IRS References
- Form 8824 and Instructions (TY2025)
- IRC §1031 — Exchange of Real Property Held for Productive Use or Investment
- IRC §1031(b) — Receipt of Boot
- IRC §1031(d) — Basis of Property Received

## Input Schema
- `relinquished_fmv` — FMV of property given up
- `relinquished_basis` — adjusted basis of relinquished property
- `received_fmv` — FMV of like-kind property received
- `cash_received` — cash boot received
- `other_property_fmv` — FMV of non-like-kind property received
- `liabilities_assumed_by_buyer` — liabilities buyer takes on (increases amount realized)
- `liabilities_taxpayer_assumed` — liabilities taxpayer takes on for received property (decreases amount realized)
- `gain_type` — `"section_1231"` (→ form4797) or `"capital"` (→ schedule_d; default)

## Compute Logic
1. Early exit if all FMV/basis fields are 0
2. `amountRealized = received_fmv + cash_received + other_property_fmv + liabilities_buyer_assumed - liabilities_taxpayer_assumed`
3. `gainRealized = amountRealized - relinquished_basis`
4. `boot = cash_received + other_property_fmv + max(0, liabilities_buyer_assumed - liabilities_taxpayer_assumed)`
5. `gainRecognized = max(0, min(gainRealized, boot))` — cannot be negative
6. Route recognized gain:
   - `section_1231` → `form4797.section_1231_gain`
   - `capital` → `schedule_d.line_11_form2439` (long-term)

## Output Nodes
- `schedule_d` (line 11 — capital gain)
- `form4797` (§1231 gain)

## Key Design Notes
- Losses from like-kind exchanges are deferred (not recognized) — `gainRecognized` is always ≥ 0.
- `boot` treats net liabilities separately from cash/other-property boot: only the excess of buyer-assumed liabilities over taxpayer-assumed liabilities adds to boot.
- `gain_type` defaults to `"capital"` when not provided.
- Deferred gain and replacement basis are not output fields (informational; not needed for tax computation flow).
