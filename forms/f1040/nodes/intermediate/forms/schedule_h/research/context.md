# Schedule H, TY2025 household employment taxes

Schedule H's combined Social Security and Medicare tax, income tax withheld, and
FUTA tax route to Schedule 2 line 9. The
[IRS 2025 Schedule H instructions](https://www.irs.gov/instructions/i1040sh) are
authoritative for the employee-level thresholds and Part II branches.

The input takes the already-determined taxable Social Security and Medicare
wages from lines 1 and 3. It does not infer either amount from total payroll:
the $2,800 FICA threshold, relationship exclusions, and Social Security wage
base apply per employee. Both wage amounts must be supplied together. Line 2 is
12.4% of line 1 and line 4 is 2.9% of line 3, with form-line rounding. Employee
withholding does not reduce the employer's combined tax on those wages. Federal
income tax withheld is added on line 7.

Line 5 takes only wages above the $200,000 Additional Medicare withholding
threshold for each employee. The input supplies that per-employee excess total
separately because it cannot be inferred from aggregate Medicare wages. Line 6
is 0.9% of line 5 and joins lines 2, 4, and 7 on line 8. See the
[2025 Schedule H line 5 and 6 instructions](https://www.irs.gov/instructions/i1040sh).

MeF Schedule H also requires the household employer's filer identity, a
nine-digit employer EIN, and the explicit line A answer. The filer identity is
obtained from the return header; the EIN and line A answer come from the
Schedule H input. The serializer does not invent either one.

Part II Section A is supported when wages reached the $1,000 quarterly FUTA
threshold, all contributions were paid to one state on time, and all FUTA wages
were state-unemployment-taxable. The input records those three true answers, the
state, state contributions or an explicit 0% experience-rate code, and taxable
FUTA wages after each employee's $7,000 cap. Line 16 is 0.6% of taxable wages
and is added to line 26.

Part II Section B takes each state or rate-period row's state-taxable wages,
experience rate and dates, and contributions paid by the unextended filing due
date. For a rate below 5.4%, it computes the additional credit as the positive
difference between 5.4% of state-taxable wages and the actual state-rate amount.
The total credit is capped at 5.4% of FUTA-taxable wages. If contributions were
late, Worksheet 1 adds 90% of the smaller of late contributions and remaining
credit headroom. If California or the U.S. Virgin Islands applies, Worksheet 2
reduces the credit by 1.2% or 4.5% of FUTA-taxable wages also subject to that
state's unemployment law, respectively, under the
[2025 IRS rate table](https://www.irs.gov/instructions/i1040sh).
The resulting line 24 FUTA tax joins the Part I amount on line 26 and routes to
Schedule 2 line 9. This TY2025 rate table is not applied to other years.

The Schedule H XML is covered by v5.4 XSD checks for the TY2025 ATS Scenario 1
source facts, Section A with contributions or an explicit 0% rate, Section B
with a credit-reduction state, and a withholding-only case. These are structural
checks, not IRS ATS business-rule acceptance.
