# TY2025 Schedule 3 nonrefundable-credit return join

The [2025 Schedule 3](https://www.irs.gov/pub/irs-prior/f1040s3--2025.pdf)
directs the line 8 total of Part I nonrefundable credits to Form 1040 line
20. The source graph calculates Schedule 3 lines 1–8 and deposits line 20;
the native and PDF Schedule 3 descriptors now compare the finalized printed
amounts when the Form 1040 return is present. A changed or missing line 20
rejects, while a Part II-only payment leaves both nonrefundable lines zero.
The existing Schedule R positive PDF fixture now includes its line 8 total,
and positive and tamper fixtures cover both exporters.

Finalized native XML and PDF Schedule 3 now replay the supported printed
subtotals: line 1 from retained foreign-tax deposits, line 7 from the printed
line 6 credits, line 8 from lines 1–7, line 14 from line 13a, and line 15
from lines 9–12 and 14. Missing or changed totals reject. These checks run
when the Form 1040 return is present, including the Form 8978 line 6l PDF
projection. Direct descriptor tests without a finalized return can still
exercise individual field mapping.

This join confirms the carry to the final return. Credit-specific eligibility,
ordering, and tax-liability caps remain with each credit calculator and its
source reconciliation. It does not independently authenticate payer records
or establish IRS business-rule acceptance.

Schedule 3 line 13a now replays retained Form 2439 box 2 amounts in both the
native XML and PDF projectors. A bare or changed line 13a claim, or a positive
box 2 source omitted from Schedule 3, rejects at either boundary. The native
builder still links the credited Form 2439 documents; the Form 2439 descriptor
checks the payer-issued Copy B identity and tax period. The shared Schedule 3
check proves amount parity, not authenticity of the issued copy.

Schedule 3 line 6j now also replays the Form 8911 personal-use credit
calculation in both exporters. A positive line without Form 8911, a changed
credit, or an omitted line when the retained source allows a positive credit
rejects. The existing Form 8911 calculation supplies the property and
tax-liability limits; this shared check establishes equality with the filed
Schedule 3 amount, not authentication of property records or IRS acceptance.

Schedule 3 line 12 now replays the retained Form 4136 calculation in both
exporters. A bare or changed fuel credit, or an omitted positive Form 4136
credit, rejects. The Form 4136 source validator remains responsible for its
claim details; this check proves only that the filed Schedule 3 amount equals
the retained calculated total.
