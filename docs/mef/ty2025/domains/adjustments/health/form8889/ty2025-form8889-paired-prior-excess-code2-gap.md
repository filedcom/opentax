# TY2025 paired HSA: prior excess and the other owner's code-2 return

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
require separate spouse forms and put a timely returned current-year excess,
including earnings, on the withdrawing owner's lines 14a and 14b. The
[2025 Form 5329 instructions](https://www.irs.gov/instructions/i5329) carry
prior-year HSA excess on the account owner's Part VII, reduce it by that owner's
unused contribution room, and require separate spouse forms.

This bounded route joins one owner's reviewed 2024 Form 5329 excess to the other
owner's full timely 2025 personal-excess withdrawal and recipient-matched code-2
Form 1099-SA. Both must have independent full-year self-only HDHP eligibility,
no employer funding, and no other HSA event. The source calculator produces two
Forms 8889 and one owner Form 5329. Native and PDF preflights replay both owner
sources, compare their printed lines, add their deductions once on Schedule 1,
add the code-2 earnings once to Schedule 1 income, and match Form 5329 tax to
Schedule 2 and Form 1040. Positive and source, identity, and final-return tamper
fixtures are authored for the bulk validation pass.

The filed 2024 return and Form 1099-SA references are reviewed source fields;
their bytes are not authenticated here. Same-owner prior excess plus code-2,
partial withdrawal, mixed HDHP months, employer excess, and a simultaneous
medical or rollover distribution remain closed.
