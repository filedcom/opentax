# TY2025 PDF field-presence boundary

The packet builder resolves each mapped AcroForm field when its domain value is
present, including an unselected `checkboxWhen` value and a numeric text value
that prints blank under the IRS zero convention. It also resolves every mapped
extra text field for that present zero. A missing or wrongly typed field stops
PDF export instead of producing a packet with a hidden omission.

Absent optional domain values do not trigger field lookup. They do not carry a
value or source fact that requires a printed field on the applicable page.
This check therefore does not certify every dormant descriptor mapping or the
visual placement of values on the canonical 2025 IRS PDFs. Those require the
deferred filled-packet review.
