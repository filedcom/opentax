# TY2025 Form 8889 code-2 excess return

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) put a
timely returned HSA excess contribution **and its earnings** on line 14b when
both were included in line 14a. The
[2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
say code 2 identifies a returned excess, box 2 identifies its earnings, and box
2 is already included in box 1. The earnings also go to Schedule 1 other income;
they must not be counted a second time in Form 8889 line 14c.

A bounded route now accepts one primary-owner HSA with one 2025 code-2 Form
1099-SA. The code-2 document must match the owner's SSN, the line-14a total, the
returned-excess source reference, the full line-14b amount in box 1, and the
Schedule 1 line-8z earnings amount in box 2. The current-year personal excess
must be returned in full by the return due date. The MeF and PDF builders
recompute the owner form from the pending source, compare every printed line,
and reconcile the HSA-specific Schedule 1/2 and Form 1040 amounts. Schedule 1
line 10 must also equal Form 1040 line 8, so the box-2 earnings cannot disappear
from the return's additional-income total. Focused positive, changed-box,
changed-print-line, and changed-return cases are written but **not run**.

Mixed code-2 and normal distributions, a simultaneous rollover, employer excess
return, partial personal-excess return, and
age-65/disability exception combinations remain blocked. A post-2025 withdrawal
is not a 2025 line-14a/14b distribution. Trustee documents and the
timely-withdrawal answer are entered source facts, not independently
authenticated. Full tests, typecheck, TY2025 XSD validation, filled-PDF visual
review, IRS business-rule checks, and ATS acceptance remain pending.

A paired self-only HSA route now allows either owner's full, timely personal
excess withdrawal on a code-2 Form 1099-SA while the other owner has ordinary
contributions and no distribution. Each owner retains a separate Form 8889;
the withdrawing owner's box 1 reaches lines 14a/14b, box 2 reaches Schedule 1 line
8z/10 and Form 1040 line 8 once, and both line 13 deductions total once on
Schedule 1/Form 1040. MeF and PDF recompute both owner pages and reject changed
box 2, return totals, a second owner's distribution, or a second code-2
withdrawal. Positive and rejection fixtures are authored but unrun. Mixed
distributions and source-byte checks remain open.
