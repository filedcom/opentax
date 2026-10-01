# TY2025 Form 4797 prior section 1231 loss source gap

The
[2025 Form 4797 instructions](https://www.irs.gov/pub/irs-prior/i4797--2025.pdf)
define line 8 as unrecaptured net section 1231 losses from the five preceding
tax years. A positive line 7 gain is ordinary income up to that balance; the
remainder is long-term capital gain. For example, a $10,000 current business
installment gain and $4,000 verified prior loss would put $4,000 on Form 4797
lines 12, 17, and 18b, $6,000 on line 9 and Schedule D, and $4,000 on Schedule 1
line 4.

The intermediate Form 4797 node and native serializer already calculate that
split from `nonrecaptured_1231_loss`, but there is no public prior-return input
that supplies or verifies the five-year balance. An attempted top-level
`form4797` input was silently stripped by the generated start schema. The start
schema now rejects unknown top-level claims, so this input produces an execution
diagnostic instead of a return that omits the claim. The existing public
`form4797_investment_1245` input covers a different property-level route and
does not supply prior section 1231 history.

The PDF projector now maps a linked line 4 or 5 gain with a positive prior loss
to lines 8, 9, 12, 17, and 18b. Its focused checks cover a partial and full
ordinary-income recapture, source mismatch, and unsupported overlapping ordinary
sources. This mapping is not a positive source-to-filed-return route: no filled
packet with a verified prior loss has been accepted.

The remaining implementation needs an owner-identified, five-year ledger
reconciled to the relevant filed returns and any later gains that consumed
losses, with proof of filing and source records under the release-wide evidence
standard. It must carry the oldest applicable losses forward, verify the current
line 8 balance, and bind the resulting ordinary/capital split to the finalized
Schedule 1, Schedule D, Form 1040, MeF, and PDF. Prior returns, acknowledgments,
source bytes, IRS business rules, and ATS evidence have not been supplied or
validated for this path.
