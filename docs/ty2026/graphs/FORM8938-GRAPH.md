# TY2026 Form 8938 foreign financial asset disclosure

Snapshot: September 27, 2026. The [December 2026 draft Form
8938](../corpus/draft/f8938.pdf) is pinned at SHA-256
`39a92cb3e8c67dc507a1fd53ff031081b8070f853da8574eace54e3f0e2b8a4c`.
The currently published [November 2021 continuous-use
instructions](../corpus/authorities/i8938--2021.pdf) are pinned at
`6c6a5317c4a5f561b7b96ea48747a340b3cada7406538cbbca899d9eef83d430`.
The expected draft instruction URL still serves a 2021 document. Reconcile
the final form and instructions before filing. The [PDF field
inventory](../inventories/pdf-fields/pdf-fields-f8938.csv) has **131 widgets**, all in the field tree;
the draft cover sheet is PDF page 1 and form pages are PDF pages 2–3.
The [public TY2026 MeF inventory](../mef/MEF-V1-DRIFT.md#what-the-public-september-24-inventory-already-establishes)
lists one `IRS8938` at form level for 1040; asset/continuation cardinality
still requires the current XSD and rules.

## Filing decision before PDF or MeF

Form 8938 is attached to the annual return. A specified individual need
not file it when no income tax return is required. Determine specified-person
status, tax residency/reporting period, filing status, and the tax-home **and
presence** requirements for the higher abroad thresholds. A bare
`lives_abroad` checkbox does not establish that test. The published
instructions give the following **strictly greater than** threshold pairs
(year end / any time during year):

| Individual return | Living in U.S. | Qualifying abroad |
| --- | ---: | ---: |
| Unmarried or married filing separately | $50,000 / $75,000 | $200,000 / $300,000 |
| Married filing jointly | $100,000 / $150,000 | $400,000 / $600,000 |

These are individual-return thresholds. Form 8938 also supports specified
domestic entities, but an entity Form 1065/1120/1041 is a separate return
product; do not silently route it through a 1040 filer. Preserve household,
owner and spouse IDs. For threshold valuation, a joint-return spouse-owned
asset counts once; a jointly owned asset on separate returns may count at
one-half when both spouses are specified individuals; other joint owners
usually count the whole asset. The precise asset/reporting exceptions,
foreign trust/estate/pension valuation and possession/dual-resident rules
come from the pinned instructions.

## One asset ledger, two uses

For each account or asset keep an owner key, account/issuer/foreign-entity
identity, asset type, acquisition/disposition/open/close dates, currency,
valuation date and fair market value, year-end value, exchange rate/source,
joint-owner relationship, Part IV exception form and filed return reference.
Threshold inclusion and detailed Part V/VI reporting are separate decisions:
an individual may need to **count** an asset already reported on Forms
3520/3520-A/5471/8621/8865 for the threshold, yet report it only in Part IV
rather than duplicating its detail. An asset in a foreign financial account
is generally represented by the account, not repeated as each holding.
Keep Form 8938 distinct from FinCEN Form 114 (FBAR), which has separate
filing rules and destination.

| Form section | Derived source and reconciliation |
| --- | --- |
| Header/Part I | Filer identity, tax year, extra-statement count, deposit/custodial account count and maximum values; closure flag. |
| Part II | Other specified foreign asset/account count, maximum values and acquisition/disposition/open/close flag. |
| Part III | Amount and filed location for interest, dividends, royalties, other income, gains/losses, deductions and credits, separately for Part I and Part II assets. Reconcile to Schedule B, D/8949, E, Form 1116 and the 1040 graph; disclosure must not create taxable income or a credit a second time. |
| Part IV | Counts of Forms 3520, 3520-A, 5471, 8621 and 8865 filed for assets excepted from detailed reporting. Use actual filed attachments, not a `has_pfic` flag. |
| Part V | One detailed deposit/custodial account per form page or continuation: number, open/closed/spousal/no-tax-item flags, maximum value, currency conversion, institution name/GIIN and address. |
| Part VI | One detailed other asset/account per form page or continuation: identifier, acquisition/disposition and ownership flags, value range or amount, currency conversion, foreign entity or issuer/counterparty identity and address. Multiple counterparties require the additional statement described in the instructions. |

## Current code boundary and build order

The current shared [`f8938` node](../../../forms/f1040/nodes/inputs/general/foreign/f8938/index.ts)
has advanced beyond this plan's September snapshot: it validates required
individual-status, filing-duty, tax-home/presence, asset, ownership and FX facts.
Its helpers calculate threshold decisions and Parts I/II/IV summaries. The
node itself still returns no outputs; Part III return reconciliation and filed
PDF/MeF attachments remain absent. Retaining an input in the registry does not
satisfy the disclosure filing requirement.

1. Build the qualified filer/valuation decision from return identity,
   residency and asset facts; validate the strict threshold OR test and
   the no-return-required exception. Use actual valuation dates and an
   auditable currency conversion source, not a user-supplied aggregate as
   final authority.
2. Derive Parts I–VI and repeated page-2 statements from the asset ledger.
   Reconcile every Part III tax item to an already computed filed line and
   each Part IV count to an actually filed form. Preserve the separate
   Schedule B Part III and Form 8621/5471/trust ownership questions.
3. Map all 131 draft widgets, including continuation and any supplemental
   issuer/counterparty statement. Determine the selected v4-or-later MeF
   form/statement schema, attachment count, required fields and business
   rules before claiming electronic filing support.
4. Test threshold equality versus excess, joint/MFS and abroad qualification,
   no income-tax-return requirement, foreign pension/trust unknown values,
   closed accounts and last-day FX conversion, Part IV-only return, mixed
   Part IV and Part V/VI assets, multiple accounts/counterparties, no-income
   assets, duplicated income, PDF continuation and XSD/ATS validation.

## Current source valuation stage (October 16)

`createForm8938Schemas` now shares the existing source validation between the
2025 and 2026 calendars. Existing 2025 consumers keep their default schema and
summary behavior. The 2026 summary supplies its calendar explicitly so an asset
acquired before 2026 does not become a current-year acquisition.

`prepareForeignAssets2026` consumes actual filer identities, reviewed eligibility,
asset ownership/classification documents, year-end FX evidence and dated complete
portfolio observations. It derives asset maxima, year-end values and the
contemporaneous portfolio peak. The source claim cannot enter those aggregate
USD amounts. Each observation contains every asset once, including zero values
outside its holding period. A distinct year-end observation allows a closing-day
maximum and a zero closing balance on December 31. Referenced document copies
must have consistent hashes; duplicate account identities are rejected.

Native source cents and eight-place FX rates use integer arithmetic. Threshold
comparisons retain sub-cent converted values and half shares before printed
amounts are rounded. Category maxima are summed before rounding; separately
rounded asset lines do not determine a threshold. Spouse-only and joint ownership
are checked against the return, with separate MFS spouse-status evidence.
The threshold and summary helpers reuse the rules in the
[continuous-use instructions](https://www.irs.gov/instructions/i8938), which still
serve the November 2021 revision. The current draft form remains December 2026.

Reviewed Forms 5471/8621/8865 identify their exact asset sets and actual return
owner. Repeated assets on one reviewed form copy count that form once; form types
must match the foreign entity interest. These assets stay in threshold valuation
but leave Parts I/II detail totals. This is a source-copy workpaper, **not proof
that an exception form has been filed or included in the executed return**.

Tax-item amounts and return-source references are retained separately. No income
or credit is emitted and no filed location is invented. `valuation_input` is only
the shared valuation/summary input, with empty tax items; it is not a completed
Form 8938. `requires_tax_item_return_binding` and
`requires_exception_filing_binding` identify remaining cross-form work, and
`filing_ready` stays false even when neither binding is needed. This stage is not
registered as public claim intake or attached to a draft bundle yet.

The next required stage must bind Part III items to actual income/credit sources
and computed destinations, and Part IV to actual filing artifacts, before adding
the graph owner and PDF. Foreign trust, estate and pension interests need their
distribution/beneficial-interest valuation workpapers; the ordinary FMV route
rejects them. Grantor-trust exceptions, partial reporting years, possession and
dual-resident exceptions, child interests under Form 8814, annual account-statement
FX exceptions, and remaining source precision also remain required scope. Then
complete the 131-widget PDF/continuations and current MeF/ATS gates above.

Verification covers 16 new source cases plus eight unchanged 2025 source tests:
threshold equality and sub-cent excess, nonconcurrent account peaks, joint/MFS
shares, abroad presence and filing-duty evidence, excepted-form counts, acquisition
and closure dates, incomplete/duplicate observations, document conflicts, FX
reviews, pending tax-item binding and the separate special-valuation gate.
The 137-test repository unit gate also passes, with 3,910 graph modules in
preflight and unchanged runtime files. These checks verify the valuation stage,
not the remaining return/PDF/MeF route.
