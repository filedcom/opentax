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
shared node itself still returns no outputs. The 2026 terminal stage below now
reconciles supported Part III income against executed sources and completed
Form 1040. Draft PDF/MeF attachments and the remaining tax-item and Part IV
routes remain unfinished. Retaining an input in the registry does not satisfy
the disclosure filing requirement.

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

Reviewed Forms 5471/8621/8865 and non-grantor beneficiary Forms 3520 identify
their exact asset sets and actual return owner. Repeated assets on one reviewed
form copy count that form once; form types must match the foreign entity interest.
A beneficiary Form 3520 also requires review of that beneficiary's Part III.
These assets stay in threshold valuation
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
the graph owner and PDF. Foreign trust, estate, pension and deferred-compensation
interests now have separate distribution/beneficial-interest workpapers, described
below. Grantor-trust exceptions, joint beneficial interests, mixed known/unknown
annual availability, partial reporting years, possession and
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

## Beneficial-interest valuation workpapers

`prepareForeignBeneficialInterest2026` now reconciles the actual individual
beneficiary, asset classification, current-year receipts and year-end valuation
documents before the portfolio stage. It follows
[26 CFR 1.6038D-5(f)(2)-(3)](https://www.ecfr.gov/current/title-26/section-1.6038D-5),
also published in the
[IRS final regulations](https://www.irs.gov/irb/2014-53_IRB).

Trust reporting combines current cash/property distributions, valued at year end,
with the reviewed year-end section 7520 value of mandatory-distribution rights.
The workpaper retains the governing instrument and section 7520 valuation source;
it does not recompute a specialist actuarial appraisal. A separate affirmative
instrument review can establish no mandatory rights. Pension, estate and deferred-
compensation reporting uses the known year-end beneficial interest, or current
distributions valued at year end when that interest is not reasonably accessible.
The unavailable-value review requires neither knowledge nor reason to know from
readily accessible information. Lack of a current withdrawal right alone is not
used as that determination.

Known FMV observations still determine threshold peaks. Unknown annual values use
the prescribed derived fallback in active-period observations; callers must omit
an invented snapshot balance. Rows identify their valuation basis. A terminated
interest has zero year-end threshold value but can retain a positive annual
distribution reporting value. Its fallback needs an active holding-period
observation. The output separately retains `threshold_maximum_date`,
`reported_value_date`, reporting basis and reported dollars. `valuation_input`
remains a threshold workpaper, not a printable Part VI value source; the detailed
reporting values and summary use the separate reported-value workpaper.

Cash receipts and property appraisals retain native cents before the existing
exact FX conversion. Recipient, currency, receipt chronology, year-end appraisal
date, document consistency, source uniqueness and known year-end snapshot totals
must reconcile. Known and unknown annual/year-end reviews cannot contradict each
other. Joint interests need an ownership reconciliation beyond this individual-
beneficiary workpaper. Grantor ownership and paired Forms 3520/3520-A remain
separate required work; a non-grantor beneficiary's reviewed Form 3520 Part III
copy can supply a pending exception entry but is not proof of filing.

Distributions set `requires_tax_item_return_binding` even when no taxable item was
entered. This requires later income-tax treatment review, including a supported
nontaxable determination when applicable; valuation amounts never create income.
An unavailable interest with no distributions and no mandatory rights retains
zero value and remains in the asset count when another asset triggers filing.

The subsequent targeted suite passes 38 tests, including 14 new beneficial-interest
cases and all prior 2026 and 2025 valuation cases. It covers the distinct threshold
and reporting values, known/unknown pensions/estates/deferred interests, section
7520 source retention, zero-value interests, cents, terminations, availability and
owner conflicts, beneficiary Form 3520, and the remaining grantor-trust gate.
The repository unit gate passes 137 tests with 3,913 graph modules and unchanged
runtime files. Public return binding and filed-output validation remain open.

## October 16: terminal return binding and public source intake

`f8938` is now a source claim in the incremental 2026 input catalog and a
terminal node in `sourceRegistry2026`. It receives the actual retained
investment sources and the completed Form 1040 identity and income, with tax
year supplied by the executing 1040 context. Public intake accepts valuation
records and account links, not completed return lines or caller-written filed
locations. The node emits only its retained disclosure calculation; there is
no edge back to income, deductions, credits or tax.

Each Part V asset binds to the actual Schedule B account inventory by account
reference, institution, account number, ISO country identity and filer TIN.
Joint accounts appear once in the asset summary and bind both joint filers'
account relationships; signature authority alone cannot establish ownership of
a reported asset. The optional ISO country identity on Schedule B sources is
separate from the unchanged 2025 native MeF country-code list.

Part III currently binds ordinary foreign deposit receipts and ordinary issued
1099 interest/dividend copies. Bank receipt references, original document
digests, currency and availability/holding dates must agree. Issued copies
need their original document digest and matching institution; adjusted/exempt
interest, gain distributions and exempt dividends need additional tax-item
routes and fail explicitly. Qualified dividends remain part of ordinary
dividends, not an additional disclosure amount. The declared items must cover
the complete linked account income inventory exactly once. Missing items,
reused references, altered amounts or digests and stale completed-line totals
fail. Document reference/hash consistency is also checked across the source,
valuation and exclusion records.

The stage reuses the shared 2025 account classification and tax-item grouping
helpers. It derives the Schedule B line 1/5 and Form 1040 line 2b/3b locations,
adds original cents within each Part III category and rounds only the printed
category total. It reconciles the complete investment totals to Form 1040;
foreign asset income can be a subset of a line that also contains domestic
income. Receipt-date income exchange rates remain independent of year-end
asset valuation exchange rates and beneficial-interest reporting values.

Every reviewed foreign account must appear in the asset inventory or carry an
owner-specific evidenced exclusion. The bounded exclusion routes are an
account maintained by a U.S. payor under regulation 1.6049-5(c)(5), or signature
authority without a section 6038D interest or reportable income. Exclusions do
not remove income from the return or remove Schedule B/FBAR answers. Duplicate,
unknown, stale or contradictory exclusion reviews fail. Other exclusion and
ownership cases still need their own source routes.

No-income assets and below-threshold decisions remain distinct from missing
source bindings. Part IV exception forms and beneficial-interest distributions
still require actual filing identity or taxable/nontaxable treatment joins;
those public claims fail explicitly until those routes exist. No PDF or native
MeF is claimed by the new stage. When Form 8938 is required, the development
bundle retains the calculation and lists `f8938` among unfinished receivers
instead of silently treating node registration as a rendered attachment.

Validation exercises the full source graph, unchanged tax after disclosure,
mixed domestic/foreign line totals, fractional-dollar Part III aggregation,
joint accounts, issued copy digests, no-income assets, threshold decisions,
complete account/exclusion coverage, source and final-line tampering, public
computed-line rejection and explicit unfinished bundle attachment status.
The shared 2025 Form 8938 projection, reconciliation, PDF and MeF tests are
included in regression coverage.

Authority: [Form 8938 instructions, Part III and assets not required to be reported](https://www.irs.gov/instructions/i8938).
These distinguish tax items and their return locations from asset values, and
exclude qualifying U.S.-payor-maintained accounts from Form 8938 reporting.
