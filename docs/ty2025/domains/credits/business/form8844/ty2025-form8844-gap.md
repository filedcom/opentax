# TY2025 Form 8844 direct-employer route

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

The `f8844` contract records a Schedule C business and payroll ledger, each
employee and payroll row, the designated zone reference, qualified wages and
WOTC wage overlap, plus explicit eligibility reviews. Its calculation produces
Form 8844 lines 1, 2 and 4 and a source-specific credit output for Form 3800.
The native MeF and PDF descriptors use the 2025 IRS8844 XSD and the official
one-page fillable form, and reconcile the credit to the linked Schedule C wage
reduction and Form 3800 source claim. The public input router takes this full
source contract. Form 3800 classifies the line 3 credit in its separate
empowerment-zone Section B limit, carries that amount through Part II line 22,
line 26, Schedule 3 line 6a and Form 1040 line 20, and projects the same current
row into native MeF and the printable Form 3800. The attachment guard opens only
for a valid, positive direct Schedule C source; export remains fail-closed when
the Form 8844, Form 3800, Schedule C or final return amounts disagree.

K-1-only recipients belong on Form 3800 without a personal Form 8844.
Estate/trust, cooperative, controlled-group, farm, passive-credit, carryover and
mixed employment-credit routes remain outside this direct Schedule C route.
Payroll, zone, employment and other-credit evidence is recorded by reviewed
references and assertions, rather than verified source bytes. The authored
positive and tamper fixtures have not been run; the requested bulk pass will run
after implementation is complete.
