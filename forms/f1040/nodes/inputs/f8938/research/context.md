# Form 8938 — TY2025 specified foreign financial assets

Authority:
[continuous-use Form 8938 (Rev. November 2021)](https://www.irs.gov/pub/irs-pdf/f8938.pdf)
and [IRS instructions](https://www.irs.gov/instructions/i8938). A specified
individual attaches Form 8938 to a required annual return when the value of
specified foreign financial assets exceeds a threshold. FinCEN Form 114 is a
separate filing.

## Public source contract

`f8938` now requires a specified-individual class, whether an annual tax return
is required, filing status, U.S. or qualifying-abroad residence, both
asset-value aggregates, and an asset ledger. Qualifying-abroad residence
requires a foreign tax home and either a bona fide residence period covering all
of TY2025 or at least 330 full foreign days in an identified 12-month period
ending in TY2025; a bare `lives_abroad` flag is insufficient.

Each ledger row identifies the account/asset and taxpayer/spouse/joint
ownership; institution or issuer and country; year-end and maximum values in
original currency and USD; the December 31 exchange rate and its source; a Part
IV exception with an actual filed-form reference, if applicable; and tax items
with their filed form and line. The source contract rejects valuation
mismatches, duplicate identities, missing MFS spouse status for joint assets,
and an aggregate outside the possible peak range. The maximum contemporaneous
aggregate remains sourced separately because summing the maximum values of
several assets can overstate the value held at any one time.

For the **threshold**, an MFS asset jointly owned by two specified spouses is
counted at half value, whereas its complete value remains in the asset ledger
for Form 8938 detail. Other joint assets count in full. Assets reported on Forms
3520, 3520-A, 5471, 8621 or 8865 still count toward a specified individual's
threshold even where they are identified only in Form 8938 Part IV.

| Individual return                      |      U.S. year end / any time | Qualifying abroad year end / any time |
| -------------------------------------- | ----------------------------: | ------------------------------------: |
| Single, MFS, HOH, qualifying widow(er) |   More than $50,000 / $75,000 |         More than $200,000 / $300,000 |
| MFJ                                    | More than $100,000 / $150,000 |         More than $400,000 / $600,000 |

`form8938ThresholdDecision` evaluates the strict OR test and the
no-required-return exception. The node remains disclosure-only and emits no tax
output.

## Filing boundary

**MeF and PDF export remain guarded** for nonempty asset lists or positive
aggregate values. The new source contract does not produce a native Form 8938.
Before opening export, build Parts I–VI and continuation pages, join return
identity/status and tax-item lines, reconcile Part IV forms to actually filed
attachments, and verify statement/FX source bytes and selected MeF/XSD/business
rules. Asset inclusion, exceptions, foreign trusts/pensions, possession
residents and partial-year dual-resident scenarios need full rules. A positive
threshold decision alone is not a filed Form 8938.
