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

Remaining build work: model all required Form 8854 identification and
certification fields; distinguish assets subject to mark-to-market from deferred
compensation, specified tax-deferred accounts and nongrantor trusts; compute and
allocate the exclusion under the instructions; route gains and losses by asset
character to the proper forms and schedules; serialize the IRS8854 MeF
attachment; map the paper form; and add source, calculation, serialization and
filing tests. Until that is complete, failing closed is intentional.
