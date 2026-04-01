# Clergy — Scratchpad

## Purpose
Captures ministerial/clergy income fields. Ministers have unique dual-status tax treatment: employee for income tax but self-employed for SE tax on ministerial services. Housing allowance excluded from gross income (IRC §107) but NOT from SE tax base (IRC §1402(a)(8)). Form 4361 opt-out exempts from SE tax.

## Fields identified
- ministerial_wages: wages earned as minister (employee relationship)
- housing_allowance_designated: amount designated by church as housing allowance
- actual_housing_expenses: actual expenses incurred for housing
- fair_market_rental_value: FMV of the home furnished (or FMV of rented equivalent)
- parsonage_value: FMV of church-provided housing
- has_4361_exemption: boolean — Form 4361 approved, exempts from SE tax
- is_ordained_minister: boolean — must be ordained/licensed/commissioned

## Resolved Questions
- [x] What fields does this node capture? — See fields above
- [x] Where does each field flow? — schedule_se for SE tax; schedule1 (line8z) for housing exclusion amount tracking (not taxable); schedule_c for SE treatment
- [x] TY2025 constants? — No dollar-amount caps; housing exclusion = min(designated, FMV rental, actual)
- [x] Edge cases? — Form 4361 exempts from SE; parsonage vs cash allowance; SE tax base includes housing allowance
- [x] Upstream nodes? — INPUT node, no upstream

## Sources checked
- [x] Drake KB article — Drake CLGY screen covers clergy income
- [x] IRS Pub 517 — Social Security and Other Information for Members of the Clergy
- [x] IRC §107 — exclusion of housing allowance
- [x] IRC §1402(a)(8), §1402(c)(4) — SE tax inclusion of housing allowance
- [x] IRC §1401 — SE tax rates
