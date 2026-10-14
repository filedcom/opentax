# Form 8834, qualified electric vehicle passive-activity credit

The IRS October 2024 continuous-use Form 8834 applies to tax years beginning
in 2024 or later until a newer revision is issued. For TY2025, line 1 is a
prior-year qualified electric vehicle **passive-activity credit allowed this
year** on Form 8582-CR. New vehicle cost or placed-in-service date does not
produce a 2025 Form 8834 credit. Current clean-vehicle claims use Form 8936.

Source: https://www.irs.gov/pub/irs-prior/f8834--2024.pdf (form and page 2
instructions, especially lines 1, 3b, 5, and 7).

The input `f8834s` contains distinct Form 8582-CR activity identifiers and
their current-year allowed amounts. The graph adds those amounts for line 1,
then limits the credit by regular tax, preceding credits, and Form 6251
tentative minimum tax. Line 7 is sent to Schedule 3 line 6i. Credit unused
because of this tax limit is lost, not carried forward.

The Form 8582-CR calculation and source-document identity are not yet built.
An input amount is therefore an asserted result from that source form. Cases
combining Form 8834 with Form 8859 or Form 8936 stop explicitly until their
cross-credit ordering is resolved. XML, PDF, and local XSD cases are written
but have not run in the deferred full-batch test cycle.
