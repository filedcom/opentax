# TY2025 Form 8941 source and filing boundary

Status: positive premium inputs now reject instead of producing an unbounded
Schedule 3 credit. Focused negative cases are written but unrun. No MeF, PDF,
XSD, IRS business-rule or ATS acceptance is claimed.

The [2025 IRS Form 8941 instructions](https://www.irs.gov/instructions/i8941)
give a two-consecutive-tax-year credit period, qualifying SHOP coverage and
employer-premium requirements. For 2025, average wages must be below $67,000 per
FTE and the wage reduction begins above $33,000. The prior local node used
$56,000 and $28,000, and treated an omitted `shop_enrollment` flag as eligible.
It routed a computed amount straight to Schedule 3 without Form 3800 or a native
Form 8941. An individual direct employer claimant must file Form 8941 and Form
3800; a pass-through-only individual recipient reports the allocated credit
directly on Form 3800 Part III line 4h without Form 8941. A tax-exempt employer
instead claims its permitted refundable credit through Form 990-T, not this Form
1040 Schedule 3 path.

The current `f8941` input lacks employee/rating-area premium detail, state
subsidies, controlled-group FTEs, the credit-period start, source allocation and
Form 3800 limitation facts. Until the direct and pass-through source paths are
properly modeled, any positive premium amount rejects, even if a crude
eligibility check would otherwise produce zero. Zero premiums make no credit
claim. Unmodeled fields reject rather than being stripped.

Reopen support only with source-level SHOP/employee/year facts and the 2025
$33,000/$67,000 wage thresholds, then a native Form 8941, Form 3800 Part III
line 4h/Part II tax-use join and Schedule 3 amount. For pass-through-only
credit, source a K-1 or other allocation, identify the entity and passive
status, and use Form 3800 without a self-authored Form 8941. No route here is
treated as an approved exclusion.
