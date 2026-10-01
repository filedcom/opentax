# TY2025 Form 8938 source and export gap

Authority: [IRS Form 8938](https://www.irs.gov/pub/irs-pdf/f8938.pdf) and
[continuous-use instructions](https://www.irs.gov/instructions/i8938).

The public `f8938` input now records specified-individual status, tax-return
filing obligation, filing status, qualifying-abroad evidence, and an asset
ledger with owner, account/issuer, source valuations, currency conversion, Part
IV filed-form references and attributed tax items. It computes the strict
year-end/any-time threshold decision and derives Parts I, II and IV summary
counts/values while emitting no tax amount. Values already disclosed on Forms
3520, 3520-A, 5471, 8621 or 8865 still count toward an individual's threshold.
An MFS asset jointly owned with a specified spouse counts at one-half for the
threshold, but retains its full value for Form 8938 detail.

The source contract validates USD conversions against the stated December 31
rate, year-end aggregates against ownership-adjusted assets, and contemporaneous
peak bounds. It cannot infer a precise peak by summing individual asset maxima
reached on different days. A peak amount therefore remains an independently
reviewed source value. Full tax-home/presence, trust/pension valuation and other
joint-owner evidence must still be reviewed.

**Export remains closed** for active Form 8938 inputs. The pending list blocks
both MeF and PDF because no native Form 8938 attachment or continuation
descriptor exists. Before opening it:

1. Join filer identity/status and return-required determination to the actual
   TY2025 return.
2. Build Form 8938 Parts I–VI and continuation pages from the ledger; include
   Part IV counts only when the referenced Forms 3520/3520-A/5471/8621/8865
   actually filed.
3. Reconcile Part III income, gains, deductions and credits to their filed
   form/line without computing them twice.
4. Review issuer/bank statement and FX source bytes, foreign trust/pension and
   possession/dual-resident exceptions, then validate the selected MeF schema
   and business rules and complete ATS evidence.

The authored node fixtures cover US/abroad threshold decisions, exact
boundaries, MFS joint valuation, Part IV threshold inclusion, contemporaneous
peak and tampered source fields. They are intentionally unrun until the
requested bulk test.
