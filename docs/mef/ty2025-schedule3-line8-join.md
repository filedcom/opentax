# TY2025 Schedule 3 nonrefundable-credit return join

The [2025 Schedule 3](https://www.irs.gov/pub/irs-prior/f1040s3--2025.pdf)
directs the line 8 total of Part I nonrefundable credits to Form 1040 line
20. The source graph calculates Schedule 3 lines 1–8 and deposits line 20;
the native and PDF Schedule 3 descriptors now compare the finalized printed
amounts when the Form 1040 return is present. A changed or missing line 20
rejects, while a Part II-only payment leaves both nonrefundable lines zero.
The existing Schedule R positive PDF fixture now includes its line 8 total,
and new positive and tamper fixtures cover both exporters. These fixtures are
authored but await the bulk test gate.

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
