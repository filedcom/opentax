# TY2025 Schedule J elected-income source boundary

Status: build-first, unrun. A bounded Schedule F-only positive election is
now wired through the graph. No MeF/XSD, filled-PDF, IRS-rule, or ATS
acceptance is claimed.

The [2025 Schedule J instructions](https://www.irs.gov/instructions/i1040sj)
say line 2a is elected taxable income attributable to farming or fishing,
including gains, losses, and deductions from several possible forms. It cannot
exceed current taxable income. Farm income can come from wages, Schedules C,
D, E, or F, Forms 4797, 4835, and 8949, and other adjustments. Schedule F net
profit alone does not establish the full upper bound for a mixed return.

`forms/f1040/2025/schedule_j_farm_source.ts` now provides a bounded Schedule
F-only source guard. It recomputes the at-risk Schedule F profit from the
validated activity inputs and employment-credit reductions; compares it to
Schedule 1 line 6 and finalized Form 1040 income; requires the only adjustment
to be the Schedule SE deduction on Schedule 1 line 15; and caps the election
at both farm income after that deduction and Form 1040 taxable income. It
rejects positive wages, interest, dividends, retirement, Social Security,
capital gain, QBI deduction, and selected other Schedule 1 activity. Its
focused positive and mismatch cases are written but unrun.

The separate guard remains an isolated research helper. The live bounded
route instead receives computed Schedule F profit, the Schedule SE deduction,
and finalized AGI/taxable income through declared graph edges. It rejects
other AGI components and caps the election after attributable QBI. This does
not establish a broader source ledger or authenticate the underlying farm
records. Wages, fishing, dispositions, share-rent, pass-throughs and mixed
returns still need source work. The deferred full validation batch, XSD,
filled-PDF review, IRS business rules, and ATS acceptance remain open.
