# TY2025 Form 8938 source and export gap

Authority: [IRS Form 8938](https://www.irs.gov/pub/irs-pdf/f8938.pdf) and
[continuous-use instructions](https://www.irs.gov/instructions/i8938).

The public `f8938` input now records specified-individual status, tax-return
filing obligation, filing status, qualifying-abroad evidence, and an asset
ledger with owner, account/issuer, structured foreign address, source
valuations, currency conversion, Part VI entity and issuer/counterparty
classification, Part IV filed-form references and attributed tax items. It
computes the strict year-end/any-time threshold decision and derives Parts I, II
and IV summary counts/values while emitting no tax amount. Values already
disclosed on Forms 3520, 3520-A, 5471, 8621 or 8865 still count toward an
individual's threshold. An MFS asset jointly owned with a specified spouse
counts at one-half for the threshold, but retains its full value for Form 8938
detail.

The eligibility source now requires separately reviewed legal-status,
return-requirement and residence records with subject SSN, reviewer reference,
document reference and SHA-256 digest. A U.S.-residence claim needs its own
residence record. The higher abroad threshold needs distinct foreign tax-home
and presence records; the latter must identify the same qualifying period as the
claim. Citizenship/residency document kind must match the claimed
specified-individual type, and the filing workpaper basis must agree with the
claimed required-return status. The final staged join binds the evidence SSN to
both the prepared filer and finalized Form 1040 taxpayer SSN, and requires a
prepared spouse identity for joint-return spouse assets. These records are
source metadata; the app does not yet verify the referenced document bytes or
the reviewer determination.

The source contract validates USD conversions against the stated December 31
rate, year-end aggregates against ownership-adjusted assets, and contemporaneous
peak bounds. It cannot infer a precise peak by summing individual asset maxima
reached on different days. A peak amount therefore remains an independently
reviewed source value. Full tax-home/presence, trust/pension valuation and other
joint-owner evidence must still be reviewed.

An **unregistered staged projection** now maps the ledger to the locally cached
TY2025 IMF v5.4 `IRS8938.xsd` names for Parts I–VI and inspected fields in the
official Rev. 11/2021 fillable PDF. It derives Part III category totals and
filed-line locations from detailed assets and Part IV counts from distinct
filed-form references. The PDF stage repeats the official second page for
additional Part V and Part VI assets, records the added-page count on page 1,
and retains the one-page Part IV-only route. The MeF stage emits repeated detail
groups, structured foreign addresses and Part VI classification indicators. In
the final MeF pass after document discovery, a staged reconciliation checks
filed Schedule B payer rows and Form 1040 totals for the interest and ordinary
dividend Part III routes. It also matches a Part IV Form 8621 asset to the
prepared IRS8621 document ID, issuer name and foreign entity identifier. The
bounded Category 5a CFC route joins a Part IV stock asset to the prepared
IRS5471 document, shareholder TIN, corporation identifier, jurisdiction and
foreign address. Other Part III destinations and Part IV forms fail closed in
that helper.

**Public export remains closed** for active Form 8938 inputs. Both projections
are absent from the shared registries and the existing MeF/PDF guard remains in
place. Before opening export:

1. Authenticate the referenced status, residence, tax-home, presence and
   filing-requirement documents and independently review the legal
   determinations. A prepared Form 1040 and a stored digest cannot alone prove
   citizenship, tax residence or that filing was legally required. The
   possession-resident and treaty dual-resident exceptions need separate source
   routes and remain unsupported.
2. Review any supplementary issuer statement and build prepared-document
   identity joins for Forms 3520, 3520-A and 8865, and other Form 5471 filing
   categories beyond the bounded Category 5a route. The TY2025 return graph has
   no Form 8865, 3520 or 3520-A source node, MeF descriptor or stable prepared
   document ID. Its Form 8865 validation-rule file does not prepare an
   attachment. A generic binary PDF filename/description cannot prove the
   asset's owner or foreign entity identity.
   [Form 3520](https://www.irs.gov/instructions/i3520) is filed separately from
   the income return; [Form 3520-A](https://www.irs.gov/instructions/i3520a)
   requires its own filing evidence or a substitute attached to Form 3520. The
   staged Part IV helper rejects these categories until the source and filing
   evidence exist.
3. Extend Part III filed-line joins beyond Schedule B interest and ordinary
   dividends to gains, other income, deductions and credits without computing
   them twice.
4. Review issuer/bank statement and FX source bytes, foreign trust/pension and
   possession/dual-resident exceptions, then validate the selected MeF schema
   and business rules and complete ATS evidence.

The authored node fixtures cover US/abroad threshold decisions, exact
boundaries, MFS joint valuation, Part IV threshold inclusion, contemporaneous
peak and tampered source fields. They are intentionally unrun until the
requested bulk test.
