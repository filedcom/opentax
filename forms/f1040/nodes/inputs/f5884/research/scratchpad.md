# Form 5884 Research Scratchpad

## Session: TY2025 Work Opportunity Credit

### Primary Sources Consulted
- IRS Form 5884 (Rev. March 2024) — official PDF from irs.gov
- IRS Instructions for Form 5884 (Rev. March 2024)
- IRC §51 — Amount of credit; qualifying wages
- IRC §52 — Special rules (aggregation)
- IRC §38(b) — General Business Credit component
- Rev. Proc. 2024-40 — TY2025 inflation adjustments (no WOTC-specific adjustments; all values set by statute)
- Existing codebase: forms/f1040/nodes/inputs/f5884/index.ts (implementation already present)
- Existing codebase: forms/f1040/nodes/inputs/f5884/index.test.ts

### Key Findings

#### Form Structure
Form 5884 has three parts:
- Part I — Current year credit computation (Lines 1–4)
- Part II — Allowable credit (Lines 5–7) — ties into Form 3800

#### Line-by-Line (Form 5884, Rev. March 2024)
- Line 1a: Wages for target group members working 400+ hours (multiply by 40%)
- Line 1b: Wages for target group members working 120–399 hours (multiply by 25%)
- Line 1c: Wages for summer youth employees (multiply by 40%)
- Line 1d: Wages paid to long-term family assistance recipients — first year (multiply by 40%)
- Line 1e: Wages paid to long-term family assistance recipients — second year (multiply by 50%)
- Line 2: Add lines 1a through 1e
- Line 3: Work opportunity credit from partnerships, S corps, cooperatives, estates, trusts
- Line 4: Add lines 2 and 3 — current year credit
- Lines 5–7: Allowable credit (via Form 3800)

#### Target Groups (IRC §51(d))
1. IV-A recipients (TANF) — $6,000 wage cap, first year only
2. Veterans (food stamp / SNAP recipients) — multiple wage caps depending on subcategory
3. Ex-felons — $6,000 wage cap, first year only
4. Designated community residents (SNAP, age 18–39) — $6,000 wage cap
5. Vocational rehabilitation referrals — $6,000 wage cap
6. Summer youth employees (age 16–17 in empowerment zone) — $3,000 wage cap
7. SNAP recipients (food stamps, age 18–39) — $6,000 wage cap
8. SSI recipients — $6,000 wage cap
9. Long-term family assistance recipients — $10,000/year (two years)
10. Long-term unemployment recipients (27+ consecutive weeks) — $6,000 wage cap

#### Veteran Subcategories (IRC §51(d)(3))
- Basic veteran (food stamp / SNAP): $6,000 cap
- Disabled veteran (entitled to compensation for service-connected disability, hired ≤1 year after discharge): $12,000 cap
- Disabled veteran long-term unemployed (discharged/released ≥6 months prior): $14,000 cap
- Veteran unemployed ≥4 weeks but <6 months: $6,000 cap
- Veteran unemployed ≥6 months: $14,000 cap

Note: The codebase collapses veteran types into target_group=VeteranFoodStamp with
is_disabled_veteran / is_disabled_veteran_long_term boolean flags.

#### Credit Rates
- 120–399 hours worked: 25% of qualified first-year wages (IRC §51(a))
- 400+ hours worked: 40% of qualified first-year wages (IRC §51(a))
- LTFA first year: 40% (IRC §51(e)(1))
- LTFA second year: 50% (IRC §51(e)(2))
- Summer youth: 40% (same standard rate, applied to $3,000 cap)

#### Pass-Through to General Business Credit
Form 5884, Line 4 total flows to Form 3800 (General Business Credit), which then flows to Schedule 3, Line 6z (other nonrefundable credits) on the 1040.

In the node architecture, this is modeled as:
  f5884 → schedule3.line6z_general_business_credit

The form 3800 intermediate step is collapsed because schedule3 is the actual 1040 connection point.

#### WOTC Certification Requirement
Employers must obtain certification from their State Workforce Agency (SWA) before claiming the credit. The IRS Form 8850 (Pre-Screening Notice) is submitted to the SWA. This is a pre-filing requirement, not a field on Form 5884 itself.

#### TY2025 Constants
Rev. Proc. 2024-40 does not include WOTC adjustments — all dollar amounts and percentages are set by IRC §51 directly (not inflation-indexed). The constants have not changed for TY2025.

#### No Passthrough Credit Issues
- Form 5884-A: Reserved for companies that hire Hurricane Katrina employees (expired)
- Form 5884-B: New hire retention credit (expired)
- Form 5884-C: Work opportunity credit for qualified tax-exempt organizations (separate form)
  - For TY2025 this node only covers for-profit/taxable entities (Form 5884)

### Implementation Notes
The existing index.ts correctly implements:
- All 10 target group enum values
- Standard credit rates (25%/40%)
- LTFA rates (40% first year / 50% second year)
- Wage caps per group
- Veteran subcategories via boolean flags
- Aggregation across multiple employees
- Output routing to schedule3.line6z_general_business_credit

One gap: the implementation does not separate lines 1a/1b/1c/1d/1e as individual
line items — it computes total credit directly. This is acceptable for the node
model since the IRS lines are just intermediate computation steps.
