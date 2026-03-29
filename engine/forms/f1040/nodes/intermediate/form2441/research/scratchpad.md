# Form 2441 — Scratchpad

## Purpose
Calculates the Child and Dependent Care Credit (and employer-provided dependent care benefits exclusion) for taxpayers who paid care expenses for qualifying persons while they (and their spouse) worked or looked for work.

## Inputs received (from upstream nodes)
- `dep_care_benefits` (number, nonneg) — W-2 Box 10 total from all W-2s, sent by w2 input node

## Fields / lines identified
- Form 2441 Part III Line 12: employer-provided benefits
- Form 2441 Part III Line 21: maximum exclusion = $5,000 (or $2,500 MFS)
- Form 2441 Part III Line 26: excess reportable as income on Form 1040 line 1e

## Open Questions
- [x] Q: What upstream nodes feed into this form? → w2 node only (Box 10 dep_care)
- [x] Q: What calculations does this form perform? → apply §129 exclusion; route taxable excess
- [x] Q: What does this form output to downstream nodes? → f1040 line1e (taxable excess only)
- [x] Q: What are the TY2025 constants? → $5,000 exclusion limit (IRC §129(a)(2))
- [x] Q: What edge cases exist? → zero benefits (no output), exactly at limit (no output), MFS (handled by f2441 input node)
- [x] Q: What is the earned income limit? → N/A for this intermediate node (only handles employer benefits)
- [x] Q: How does employer-dependent care benefits (Box 10 W-2) interact with the credit? → The f2441 input node handles the interaction; this node only routes taxable excess
- [x] Q: What are the AGI-based credit percentage thresholds? → N/A for this intermediate node
- [x] Q: What are qualifying person rules? → N/A for this intermediate node

## Sources to check
- [x] Drake KB article (screen 2441) — homepage only, no specific article
- [x] IRS Form 2441 instructions (2025) — fetched from irs.gov/instructions/i2441
- [x] Rev Proc 2024-40 for TY2025 constants — PDF couldn't be parsed; $5,000 limit confirmed from instructions
- [x] IRS Publication 503 (Child and Dependent Care Expenses) — cached at .research/docs/p503.pdf
