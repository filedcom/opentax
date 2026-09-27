# TY2026 Form 8915-D source and filing decision

Pinned official comparators: [2024 Form 8915-D](corpus/authorities/f8915d--2024.pdf),
SHA-256 `89681a2b779f03b8c2f7c6dbecd444ff0cc17ed5850a467e4ebf047f8e79e72d`,
and [2024 instructions](corpus/authorities/i8915d--2024.pdf), SHA-256
`2309b4e6602bd3d61d48b4fc45eb06d88722cf2b24a1961db6ee4cb98aff289a`.
The [IRS current-product page](https://www.irs.gov/forms-pubs/about-form-8915-d)
still points to 2024 as the latest Form 8915-D revision in this September
2026 research snapshot. This is an
older-year authority, not a 2026 form.

## Why it does not enter the TY2026 filing graph

The 2024 instructions say that the **only** 2019-disaster distributions
eligible for repayment in 2024 were 2021 distributions for the Puerto Rico
earthquakes (DR-4473-PR). Their three-year repayment period expired in
2024; repayments after that period cannot be treated as qualified. The
2024 form is explicitly attached to a **2024** 1040 and has only repayment
carryback lines; it does not calculate current-year 2026 income. Any
2024 repayment affecting previously taxed amounts is handled on a 2024
Form 8915-D and, if needed, amended **2021–2023** returns. Preserve those
records for historical/amendment support, but do not invent a 2026
Form 8915-D attachment or Schedule 1 adjustment.

The pinned [2026 draft Form 8915-F](corpus/draft/f8915f.pdf) begins with
2021-and-later disasters and does not replace the 2019-disaster amendment
path. Recheck the IRS Form 8915-D product page, current MeF accepted-forms
list and any superseding disaster relief before finalizing the TY2026
registry. If an official 2025/2026 revision appears, reassess this gate.

## Existing code mismatch and implementation instruction

Shared `f8915d` is registered in TY2025 and accepts an aggregate 2019
distribution, prior amounts and `repayments_in_2025`. It can derive
positive or negative **Schedule 1 line 8z** current-year income from those
facts. That does not follow the pinned 2024 form, whose lines 5 and 10 are
amounts available to carry back, nor the 2024 instruction deadline. There
is no TY2025 PDF/MeF descriptor for this source. Do not add it to the
TY2026 calculation registry, PDF catalog or MeF output without a newer
official filing-year source. Keep a historical amendment workflow keyed
to original distribution, eligible repayment date, prior reported income,
and affected return year rather than forwarding a signed amount into
2026 AGI.

Acceptance for this source decision: confirm no newer official product at
release, verify no active TY2026 MeF `IRS8915D` attachment, and keep a
fixture that rejects a claimed 2026 Form 8915-D filing while allowing
the older-year amendment data to be retained. This source-status decision
does not resolve Form 8915-F's separate 2026 implementation.
