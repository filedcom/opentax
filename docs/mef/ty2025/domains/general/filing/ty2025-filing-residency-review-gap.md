# TY2025 Form 1040 A2A residency review

[Publication 519 (2025)](https://www.irs.gov/publications/p519) says a
dual-status taxpayer cannot e-file a 2025 income tax return. The existing
general input, native builder, prepared return, and PDF reject an explicitly
marked dual-status return. An omitted flag previously did not require anyone
to review the tax-residency classification before packaging the return.

The final MeF submission ZIP now requires one structured, reviewed 2025
classification for the taxpayer and, on a joint return, a separate one for the
spouse. Each review names the final return TIN, status basis, source reference,
reviewer, and date after the tax year. Dual-status and nonresident answers
reject. A full-year resident joint-election answer requires its signed
statement reference and the corresponding election on finalized Form 1040.
The A2A package rechecks the retained classifications against the same
prepared return before transmission. Missing, wrong-TIN, dual-status,
nonresident, and post-archive-tamper fixtures are authored for the deferred
validation batch.

This submission-time review is not an independent residency computation or
authentication of citizenship, immigration, day-count, treaty, or election
source bytes. Those source facts, earlier intake/export checks, and filed
election evidence still need a consistent verified route. Standalone
1040-NR, 1040-SS, and Form 4868 remain outside this Form 1040 product scope.
