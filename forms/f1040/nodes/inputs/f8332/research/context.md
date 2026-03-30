# Form 8332 — Release/Revocation of Release of Claim to Exemption for Child by Custodial Parent

## Purpose
Form 8332 is used by the custodial parent to release their claim to a dependency exemption for a child to the noncustodial parent. It can also be used to revoke a prior release.

## Key Fields
- **Part I**: Release of claim to exemption for current year — custodial parent name/SSN, child name(s)/SSN(s), noncustodial parent name/SSN, tax year(s)
- **Part II**: Release for future years — same fields, with option for "all future years" or specific years
- **Part III**: Revocation of prior release

## Tax Treatment
Administrative form only. Does not affect tax liability calculations. Used to support dependency exemption claims by the noncustodial parent.

## Drake KB Notes
- Screen code: 8332
- Used when custodial parent agrees to release exemption
- `tax_years_released` can be "all_future" or an array of specific years
- `is_revocation` true = Part III (revocation of prior release)

## IRS Reference
- https://www.irs.gov/forms-pubs/about-form-8332
