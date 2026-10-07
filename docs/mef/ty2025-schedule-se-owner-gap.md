# TY2025 Schedule SE owner reconciliation

The [2025 Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) require separate computations for spouses with self-employment income, each with that spouse’s Social Security wages, and net each proprietor’s businesses before testing the $400 minimum.

Public MFJ Schedule C/F intake now retains owner identities, activity references and regular issued W2 recipient/reference records. Each owner’s net earnings, wage cap, tax and half-SE deduction are calculated independently. Native and PDF exports replay the retained actual C/F/W2 sources, reject inconsistent owner instances and totals, and emit separate owner copies. Ordinary Form8995 allocates each owner’s actual half-SE deduction among that owner’s positive business profits and preserves signed business rows. Neither spouse’s wages or loss suppresses the other’s SE tax.

## Retained proof

Four complete public synthetic ScheduleC/W2 returns cover primary-only business with spouse cap wages, spouse-only business with primary cap wages, both proprietors with spouse cap wages, and a primary loss alongside a spouse’s $500 business. They produce11/11/17/13 pages,52 in total; complete local TY2025v5.4 XSD validates all four. Every page was rendered with real Poppler and visually inspected in13 contact sheets; owner names/TINs, Schedule1/2 joins, attributable8995 rows, SE copies and attachment order were checked. Final PDF hashes are in `.state/research/2026-10-06-owned-schedule-se/visual-manifest.json`; packets have no retained fields/widgets.

Separate full export conflicts change business owners, owner wages, individual tax, source profits, half-SE, QBI source/rows/lines, no-prior-loss facts and1040 totals; both native/prepared and direct PDF gates reject them. Pure owner calculations also cover combined subthreshold C/F and farm optional method. Raw cents are preserved through the graph; taxable income is reconciled before export rounding rather than compared to an already rounded worksheet line.

Initial compatibility337/339 exposed two MFJ Form461 fixtures without proprietor/activity source facts; source facts were added, and all104 ScheduleC checks passed. Earlier79 owner/node/start/patron/SSTB checks passed. Exact final focused results are retained in the validation record after integration; these checks do not establish a whole-repository pass.

## Remaining scope

The complete public packet evidence here covers ordinary materially participating ScheduleC sources, regular W2 wages, no other QBI adjustments or prior losses, and taxable income below the Form8995 threshold. Pure C/F and optional-method checks do not prove all public farm filing combinations. Broader high-income multiple-owner8995A, health/retirement deductions, capital components, unreported-tip/8919 owner allocations, source authentication and IRS business rules/acceptance remain open. The broad board parents remain open.
