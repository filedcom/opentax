# TY2025 Form 5471 Schedule R zero-activity boundary

**Status: Category 4/5a export remains blocked.** The one-CFC source records an
empty 2025 distribution ledger. The staged native Schedule R prints only filer
and corporation identity; its PDF prints the same identity and leaves all
distribution rows blank. Neither representation asserts a distribution that did
not occur. These descriptors are useful for source reconciliation but do not
establish that the required all-zero schedule is accepted for filing.

The
[December 2025 Form 5471 instructions](https://www.irs.gov/instructions/i5471)
say that when a required schedule has all-zero amounts, it should still be filed
**with one or more zero amounts**. The same instructions require both Category 4
and 5a filers to complete Schedule R. The official
[Schedule R PDF](https://www.irs.gov/pub/irs-pdf/f5471sr.pdf) has no standalone
zero-total line: its only amount boxes are columns (c) and (d) of 24 numbered
distribution rows, each paired with a description and distribution date. A zero
in one of those boxes with no actual event would imply a distribution row.

The local TY2025 v5.4 research copy of `IRS5471ScheduleR.xsd` has the same
structural constraint. `DistributionsFromFrgnCorpGrp` is optional, but inside
each instance `RowId`, `DistributionDesc`, `DistributionDt`,
`DistributionFuncCurAmt`, and `DistributionFromEPFuncCurAmt` are required. There
is no zero-only amount outside the group. An identity-only XML document can
satisfy this XSD; that fact does not resolve the instruction's zero-amount
requirement or an IRS MeF business rule. The available v3.0 1040 business-rule
archive includes `SR-F5471-001` (exactly one parent Form 5471 reference) and
`SR-F5471-002` (corporation EIN or reference ID). It does not establish current
v5.4 acceptance. The
[IRS v5.4 release memo](https://www.irs.gov/e-file-providers/release-memo-for-tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-version-5-point-4)
places the current business rules in the registered e-Services mailbox.

## Exact evidence needed to open this route

1. Obtain the current TY2025 1040 MeF v5.4 Schedule R business-rule text and
   confirm whether identity-only `IRS5471ScheduleR` is accepted for a required
   no-distribution Category 4/5a schedule. Verify its parent Form 5471
   `referenceDocumentId`/`referenceDocumentName` linkage under `SR-F5471-001`.
2. Obtain an IRS accepted sample, ATS acceptance, or written MeF guidance for
   this precise no-distribution case. If the IRS requires a zero amount, obtain
   an approved schema-valid location that does not require a fictitious dated
   distribution. A zero transaction row is not a valid substitute.
3. Once the representation is established, add the necessary native/PDF
   projection and test the complete one-CFC Category 4/5a packet, including
   parent links, current v5.4 business rules, local XSD, filled-PDF review, and
   ATS. Preserve the export gate until those checks pass.

The structural and no-invented-row fixtures are authored for the deferred bulk
test run. No typecheck, XSD, filled-PDF, or ATS result is claimed here.
