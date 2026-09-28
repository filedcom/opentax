# TY2025 Form 4952 portfolio royalty boundary

Sources:
[2025 Form 4952 and its instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf),
especially line 4a (royalties from property held for investment, outside the
ordinary course of business) and line 8 (royalty-attributable interest goes to
Schedule E), plus checked-in v5.4 `Common/IRS4952/IRS4952.xsd`.

An affirmatively classified Form 1099-MISC box 2 portfolio royalty now sends the
same amount to Schedule E income and Form 4952 line 4a. It cannot be classified
to Schedule C or have an empty box 2. Omitting box 2 routing defaults to
Schedule E; zero or unspecified box 2 income produces no royalty output unless
the Form 4952 affirmation is present, in which case it is rejected. If manually
entered investment property gross income coexists with sourced royalties, the
manual figure must explicitly exclude those royalties. Schedule E now rejects an
overlapping 1099-MISC royalty passthrough and property item rather than silently
dropping the passthrough. If line 1 interest is also present, the source must
confirm it excludes royalty-attributable interest, because line 8 for that share
belongs on Schedule E rather than Schedule A. Focused cases are written, not
run.

This is not general royalty or broker coverage. The affirmation does not
independently authenticate investment-purpose ownership or rule out a passive
activity. The current direct Form 4952 source fields are not reconciled to the
underlying information returns by the MeF descriptor, and the reported royalty
may have deductible Schedule E expenses not yet linked to Form 4952 line 5.
Royalty-attributable investment interest on Form 4952 line 8 requires a separate
Schedule E allocation; the current node routes all line 8 to Schedule A, so that
interest source is not supported by this addition. Disposition gains require
netting all investment-property gains, losses, and capital-loss carryovers
before lines 4d/4e; a positive per-broker-transaction shortcut would overstate
the deduction. The AMT refigure also still relies on asserted source adjustments
rather than a full AMT-basis reconstruction. No local tests, typecheck, XSD,
PDF, or IRS ATS validation has run in the build-first pass.

No compatibility layer, fallback, or dual API was added.
