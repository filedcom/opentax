# TY2025 Form3115 public adjustment and export boundary

## October 10 grouped source and recapture verification

The existing Form3115 source-to-ScheduleC task is verified through public
return execution for six current-year cases. Each preserves a20,000 ScheduleC
business and75,000 of unrelated W2 wages.

| Case | Source adjustment / change year | Current inclusion | ScheduleC profit | Total income |
| --- | ---: | ---: | ---: | ---: |
| first positive installment | 12,000 / 2025 | 3,000 | 23,000 | 98,000 |
| final installment remainder | 10,001 / 2022 | 2,501 | 22,501 | 97,501 |
| expired positive installment | 12,000 / 2021 | 0 | 20,000 | 95,000 |
| current negative adjustment | -6,000 / 2025 | -6,000 | 14,000 | 89,000 |
| prior negative adjustment | -6,000 / 2024 | 0 | 20,000 | 95,000 |
| declared one-year positive election | 49,999 / 2025 | 49,999 | 69,999 | 144,999 |

All six calculations have no diagnostics. Both final exporters reject each
return because an entered Form3115 requires its native attachment, including
cases with no current inclusion. The twelve rejection assertions establish
that the public calculator does not silently convert these into supported
filings. The existing projection test additionally checks ScheduleC native
other-income/net-profit and PDF line6/31 for the3,000 inclusion.

The grouped source/native/PDF tests for Forms3115,4255 and8611 pass **32/32**;
the new public module adds **10/10**, with zero failures or ignored cases.
The latter includes the six method-change cases and four Form4255 tax routes.
These are bounded calculation/projection and export-boundary checks. No new
full-return XSD, rendered-page, attachment, source-authenticity or IRS
acceptance count is claimed. Existing Form8611 issued-K1 packet evidence
remains separate and retains its presentation qualifications.

Evidence: `.state/research/method-recapture-routes-2026-10-10/components.log`
and `public.log`, on production runtime `d65263134`. The public tests live in
`forms/f1040/2025/domains/general/return-assembly/method-recapture.test.ts`.
The component batch comprises Form3115 input and ScheduleC e2e, plus input,
native and PDF modules for each of Forms4255 and8611.

The main Form3115 task remains open: entered method/election claims are not
an authenticated, signed application or consent record; the required
attachment and wider schedules/special periods remain unresolved. No new
exclusion approval or deferred repair is inferred from a passing rejection.
