# Form 982 — Scratchpad

## Key decisions

### What does form982 receive from upstream?
- `f1099c` routes `line2_excluded_cod` (the total excluded COD from all excluded 1099-Cs)
- Form 982 needs to know *why* the COD is excluded (exclusion_type) to check the correct line 1a-1e
- It also needs `insolvency_amount` if insolvency is the reason (line 1b), since the exclusion
  is capped at the insolvency amount

### What does form982 produce?
Form 982 is primarily a *disclosure* form and an *election* form. On 1040, it does not produce
a direct income line (the COD exclusion already happened at the 1099-C routing stage — those
items were NOT sent to schedule1). The node's job is to:
1. Accept the excluded COD (line 2) plus the exclusion reason (enum)
2. Cap the excluded amount for insolvency (limited to insolvency margin)
3. Cap the excluded amount for QPRI ($750k/$375k for MFS cap — deferred: f1099c comment says
   cap enforcement is deferred to form982 node)
4. NOT produce downstream outputs for tax attribute reductions — those are tracked in
   carry-forward basis records, not on the 1040 return itself

### Exclusion types (lines 1a-1e)
- 1a: Title 11 (bankruptcy) — no cap
- 1b: Insolvency — capped at insolvency amount (liabilities minus FMV of assets)
- 1c: Qualified farm indebtedness
- 1d: Qualified real property business indebtedness
- 1e: Qualified principal residence indebtedness (QPRI) — cap $750k ($375k MFS), pre-2026

### Output routing
Form 982 is an intermediate node but doesn't route to f1040 or schedule1 directly.
It exists so the engine can hold the exclusion data. The actual exclusion effect already
happened at the f1099c routing decision. No downstream output needed for the basic case.

### QPRI cap
The instructions state max $750k ($375k MFS) for QPRI. We need `filing_status` to apply
the MFS cap. However, the filing_status is typically in the `general` node, not piped here.
Decision: accept optional `qpri_mfs` boolean to indicate married-filing-separately for cap.

### Taxable excess
If excluded COD exceeds the applicable cap (insolvency or QPRI), the excess becomes taxable
and must route to schedule1 line8c.
