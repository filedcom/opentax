# TY2025 Form 8396, mortgage interest credit

The previous node added a gross current credit and one unexplained carryforward
directly to Schedule 3. That omitted the printed tax-liability limit and
separate 2022, 2023, and 2024 carryforward lines. The current build pass
replaces it with source certificate identity, eligibility facts, identified
interest evidence, and referenced carryforward vintages. It computes line 1
from the taxpayer's paid interest times the original loan's fixed certified
indebtedness fraction, as Publication 530 directs. For a cited Form 1098, MeF
requires one entered source document with the same reference and box 1 amount;
a named lender statement is accepted as source evidence but is not authenticated.
A carryforward-only claim has no current-year interest input. It computes the
2025 printed Form 8396 lines 1-17 and
finalizes line 9 after Form 1040 line 18 and the Credit Limit Worksheet's
earlier credits are known. The allowed amount goes to Schedule 3 line 6g.
An optional structured address for the certificate home, when different from
the return address, maps to the PDF header and the native MeF address group.

The current-year line 3 reduces deductible Schedule A mortgage interest even
when tax liability allows less than the full credit. The Schedule A calculator
and MeF serializer use that amount separately from line 9. The local
`IRS8396.xsd` line sequence is in
`.state/research/docs/IMF_Series_2025v5.4/.../Common/IRS8396/IRS8396.xsd`.

The IRS permits an MCC rate from 10% through 50%. A rate over 20% caps line 3
at $2,000, prorated for a nonspouse co-owner. A reissued certificate can have
an additional original-loan annual cap and, if rates differ in the refinance
year, a linked calculation statement. The current source model explicitly
rejects a reissued certificate rather than awarding an unsupported amount.
That calculation and statement remain to be built. Other work still open:
authenticate or inspect the actual Form 1098 or lender statement;
verify the 2024 Form 8396 carryover
references; run and visually inspect the newly mapped PDF field projection;
run local XSD and IRS business-rule
checks in the requested full batch; and obtain ATS acceptance when available.

Primary source: [2025 Form 8396 and its instructions](https://www.irs.gov/pub/irs-pdf/f8396.pdf),
especially lines 1-17, the Credit Limit Worksheet, and the reissued-certificate
instructions. [Publication 530 (2025)](https://www.irs.gov/publications/p530)
gives the fixed original-loan allocation fraction and example.
