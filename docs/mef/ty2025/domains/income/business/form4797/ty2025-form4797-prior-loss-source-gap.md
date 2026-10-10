# TY2025 Form 4797 prior section 1231 loss source gap

The
[2025 Form 4797 instructions](https://www.irs.gov/pub/irs-prior/i4797--2025.pdf)
define line 8 as unrecaptured net section 1231 losses from the five preceding
tax years. A positive line 7 gain is ordinary income up to that balance; the
remainder is long-term capital gain. For example, a $10,000 current business
installment gain and $4,000 verified prior loss would put $4,000 on Form 4797
lines 12, 17, and 18b, $6,000 on line 9 and Schedule D, and $4,000 on Schedule 1
line 4.

The intermediate Form 4797 node and native serializer calculate the split from
`nonrecaptured_1231_loss`. The October 10 public `form4797_prior_history` input
now derives that balance from reviewed annual records; its filing export stays
blocked pending authenticated evidence, as detailed below. The unrestricted
top-level `form4797` claim remains rejected, and `form4797_investment_1245`
continues to cover a separate property-level route.

The PDF projector now maps a linked line 4 or 5 gain with a positive prior loss
to lines 8, 9, 12, 17, and 18b. Its focused checks cover a partial and full
ordinary-income recapture, source mismatch, and unsupported overlapping ordinary
sources. This mapping is not a positive source-to-filed-return route: no filled
packet with a verified prior loss has been accepted.

The remaining filing implementation needs to bind the reviewed ledger to
authenticated source bytes and filing/acceptance proof, and then reconcile its
ordinary/capital split through final tax, native XML and PDF. Prior returns,
acknowledgments, source bytes, IRS business rules and ATS evidence have not been
supplied or validated for this path. The new calculation interface is not an
approved exclusion or a complete positive filing route.

## October 10 reviewed five-year history and public calculation

The strict history identifies the current taxpayer and, for a joint return,
spouse. It requires ordered 2020–2024 source records, distinct filed-return and
source references, and a referenced opening 2020 inventory of unrecaptured
2015–2019 loss vintages. Each annual record preserves net section 1231 gain/loss
and the filed line 8/12 amounts when applicable. Each loss year separately records
`section1231_loss_taken_into_account`, because the raw Form 4797 loss may differ
from the loss used in taxable income after other limits. Owner changes across
the annual records, missing/repeated years or references, conflicting balances, fractional
amounts and unsafe totals reject. References remain reviewed transcriptions;
they do not authenticate a filing or represent IRS acceptance.

The pure replay expires each loss after its five-year window and consumes
eligible vintages oldest first. It checks the prior returns' line 8 balance and
line 12 ordinary recapture before calculating 2025. Earlier opening losses matter:
they can absorb prior gains before newer losses, even though they expire before
2025. The current net result retains ordinary and capital character, and the
2026 opening balance excludes expired 2020 amounts. A current net loss requires
its reviewed deduction amount and source reference; only the amount taken into
account creates a 2025 vintage. A year with no current gain still carries the
ledger forward.
The returned 2026 amounts are calculation evidence, not an accepted ledger or
a production 2026 return import contract.

| Public source case | Current net section 1231 | Ordinary gain/loss | Long-term gain | Eligible 2026 opening loss |
| --- | ---: | ---: | ---: | ---: |
| IRS line 8 example | 2,000 | 2,000 | 0 | 5,000 |
| Partial ordinary recapture | 10,000 | 7,000 | 3,000 | 0 |
| No current gain | 0 | 0 | 0 | 6,000 |
| New current loss | -3,000 | -3,000 | 0 | 9,000 |
| Installment gain and K-1 loss | 2,000 | 2,000 | 0 | 5,000 |
| No earlier losses | 10,000 | 0 | 10,000 | 0 |
| 2019 loss expires before 2025 | 10,000 | 0 | 10,000 | 0 |
| Joint return, unchanged owners | 2,000 | 2,000 | 0 | 5,000 |

The IRS example has losses 4,000 in 2020 and 6,000 in 2021, followed by gain 3,000
in 2024: the 2025 opening balance is 7,000. Its current 2,000 gain consumes the
remaining 1,000 from 2020 and 1,000 from 2021, leaving 5,000 from 2021. A separate
opening-vintage test verifies 2015 expiry and 2019 consumption before 2021 losses.
All eight public source scenarios reconcile the current net amount to Schedule 1
line 4, Schedule D/Form 1040 capital gain, Form 1040 additional income and AGI.
They use wages 150,000 and reviewed synthetic histories, including linked
installment gains and signed K-1 amounts. Final tax, QBI and broader mixed
limitations have not been approved for this staged route.

Native preparation and fresh-PDF building reject all eight entered histories
with the explicit authenticated-return/acceptance requirement, including zero
balances and no current gain. No new XML/PDF packet or XSD success is claimed.
Histories combined with unfinalized passive/property limitation sources remain
blocked at calculation. A current loss whose reviewed deduction is smaller than
the raw loss also rejects at public calculation, because its tax-limit addbacks
are not yet connected to this route. The pure ledger separately verifies limited
prior and current deductions. Changes in filing ownership need further source work.
Existing unrelated routes and internal aggregate arithmetic remain separate.

Validation: 386 distinct related tests pass, including 24 new ledger cases and
11 public-entry/guard cases. Earlier component and public runs overlap this
count; only the final grouped run includes every deduction-source check. The
benchmark remains 46/133 with exactly the same 87 failing IDs as
the prior contract-inventory checkpoint (deferred 96). Initial logs retain one
self-output type error, corrected without weakening types, and a new-path bug
where the no-sale early return discarded the carryforward; the final typed
public/regression runs include the fix. Independent Python replay checks all
eight source records, installment/K-1 net amounts, character splits, AGI and
closing balances. Private evidence is `.state/research/form4797-prior-history-2026-10-10/`.

All 52 main tasks remain frozen/open. The 130 future items remain deferred; no
future item was implemented here. Existing Form 6252 and Schedule D qualifications 15/127–130
are unchanged. This checkpoint implements the existing prior-history calculation
gap while keeping its authenticated filing, final-tax, native/PDF, business-rule
and ATS requirements open.
