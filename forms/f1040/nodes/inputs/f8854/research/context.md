# Form 8854, TY2025 status

Form 8854 is **not filing-ready** in OpenTax. The current input schema captures
only a small subset of the form, and `compute()` rejects it until asset-specific
deemed-sale reporting and the IRS8854 MeF attachment exist. Do not treat this
node as a completed Form 1040 path.

The prior implementation incorrectly sent deemed gain to Schedule 2 line 17 as
though the entire gain were tax. That route has been removed. Under the
[2025 IRS instructions](https://www.irs.gov/instructions/i8854), deemed-sale
gain or loss retains its asset character and is reported on the applicable
income form or schedule, such as Form 8949 or Form 4797. Form 8854 itself must
also be filed where required. A simple aggregate `fmv - basis - exclusion` is
insufficient to determine the tax or generate the return.

For TY2025, the covered-expatriate average annual net income tax threshold is
**more than $206,000** and the net worth threshold is **$2,000,000 or more**.
Failure to certify the preceding five years of federal tax compliance is another
covered-expatriate criterion. The 2025 mark-to-market exclusion is **$890,000**.
These amounts are from the
[2025 Form 8854 instructions](https://www.irs.gov/instructions/i8854).

The input now records the U.S. income tax less foreign tax credit for each of
2020-2024, as Part II Section A line 1 requires, and derives the five-year
average. The supplied amounts still need reconciliation to those prior-year
returns and credits.

Part I now requires mailing address, phone, citizenship and notification facts,
with a separate XML builder in 2025 schema order. Part II Section A has its own
XML builder for the five tax-year lines, net worth, and exception answers. A yes
answer to significant asset or liability changes requires an explanation and a
linked native `ChangePrePostExptrtDateStmt`. These builders are not registered
as a complete Form 8854 document.

Part II Section B now takes category-level asset values and liabilities and
derives total assets, total liabilities, and net worth. Line 5a is a checked
subset of foreign nonmarketable securities and is not added again on line 20.
Partnership, trust, other-asset, and other-liability rows have native statement
builders and required document links. The source values and valuations are still
entered assertions, and the Section B builder remains unregistered.

The current build pass allocates the $890,000 exclusion across identified gain
properties in proportion to their positive built-in gains, with a stable
cent-balancing rule. Loss properties receive no exclusion. This is only the
Section C calculation; it does not establish that a loss is deductible or that
an asset belongs in the mark-to-market class.

For an initial 2025 statement, the covered-expatriate test now takes explicit
dual-citizen-at-birth or minor facts. Either exception can remove the tax and
net-worth tests, but not the five-year certification test. U.S. residence and
the minor's age boundary are checked. Citizenship, foreign tax residence, and
U.S. residence years remain entered assertions, not independently verified
records. Annual statements for pre-2025 expatriations are not modeled by this
input. An asserted dual-citizen exception must identify the other country, which
must match Part I citizenship and foreign tax residence.

Remaining build work: model all required Form 8854 identification and
certification fields; distinguish assets subject to mark-to-market from deferred
compensation, specified tax-deferred accounts and nongrantor trusts; route gains
and losses by asset character to the proper forms and schedules; serialize the
IRS8854 MeF attachment; map the paper form; and add source, serialization and
filing tests. Until that is complete, failing closed is intentional.
