# TY2025 Form 1116 Schedule B: filed source for every supported vintage

All ten supported 2015–2024 carryover vintages now use one structured filed 2024
Form 1040 and Schedule B source at full-return native and PDF export. The filed
Schedule B line 8 amount for each retained vintage must equal its corresponding
2015–2024 column, including the **current-year** column for a 2024-origin
credit. A filed column cannot appear without the matching retained vintage. The
filed line 8 total, income category, taxpayer SSN, distinct Form 1040 and
Schedule B document IDs, and the source embedded in the 2025 attachment must all
reconcile. The two filed IDs must appear in the retained source references.

The [Schedule B line 1 instructions](https://www.irs.gov/instructions/i1116sb)
direct each prior-year line 8 column to the appropriate current-year line 1
column. The
[2025 Form 1116 line 10 instructions](https://www.irs.gov/instructions/i1116)
allow a 10-year carryforward, require earliest-year use, and require Schedule B
when a prior-year carryover enters Form 1116. The existing calculation and
native/PDF projection already perform that age shift and oldest-first use; this
change closes the missing filed-year evidence join for 2018–2024.

One positive fixture covers all seven 2018–2024 passive vintages together
through Form 1116, Schedule 3, Form 1040, native Form 1116/Schedule B, and both
PDFs. Each filed vintage column has a separate tamper case, with an extra
unmatched column rejection. Existing 2021–2024, 2023–2024, and 2024 positive
fixtures now provide the same structured filed source. These checks verify
reviewed transcriptions and document IDs; they do not authenticate filed return
bytes. Pre-2018 general-category allocations, carrybacks, foreign-tax
redeterminations, and special intervening-year histories remain guarded. Full
tests, typecheck, XSD, filled-PDF appearance, and IRS acceptance await the
shared bulk validation pass.
