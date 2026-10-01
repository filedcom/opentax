# TY2025 Form 8844 direct-employer source stage

The [IRS Form 8844 instructions](https://www.irs.gov/instructions/i8844) keep
the empowerment zone employment credit available for qualified 2025 wages. A
direct employer calculates 20% of qualified wages, with a $15,000 per-employee
wage cap reduced by wages used for the work opportunity credit. The employee
must live and work in the same designated zone; excluded employees and
businesses, the 90-day rule, payroll wage definitions and other employment
credits need review. A sole proprietor reduces the Schedule C wage deduction by
the credit even when the Form 3800 tax limit prevents full use. The
[official Form 8844](https://www.irs.gov/pub/irs-pdf/f8844.pdf) sends line 4 to
Form 3800 Part III line 3.

The staged `f8844` contract records a Schedule C business and payroll ledger,
each employee and payroll row, the designated zone reference, qualified wages
and WOTC wage overlap, plus explicit eligibility reviews. Its calculation
produces Form 8844 lines 1, 2 and 4 and a source-specific credit output for
Form 3800. The native MeF and PDF descriptors use the 2025 IRS8844 XSD and the
official one-page fillable form, and reconcile the credit to the linked Schedule
C wage reduction and Form 3800 source claim.

**Export remains closed.** The Form 8844 attachment guard is still active. The
shared public input router, Form 3800 source intake, Part II tax-use allocation,
Part III line 3 and Part V, MeF/PDF registries, and final-return reconciliation
must be wired before direct-employer export can open. K-1-only recipients belong
on Form 3800 without a personal Form 8844. Estate/trust, cooperative,
controlled-group, farm, passive-credit and mixed employment-credit routes remain
outside this direct Schedule C stage. The authored positive and tamper fixtures
have not been run; the requested bulk pass will run after implementation is
complete.
