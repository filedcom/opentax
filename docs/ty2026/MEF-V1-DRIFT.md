# TY2026 MeF v1 schema drift against the September draft 1040

The user-supplied May 28, 2026 `IMF_05-28-2026_Release-2.zip` is stored under
ignored `.state/research/docs/` and has the hash recorded in
[`SOURCES.md`](SOURCES.md). Its `1040x_Schema_2026v1.0.zip` is useful for
baseline research. It is not a valid target for the current draft 1040. The
[IRS September 24 v4 release memo](https://www.irs.gov/e-file-providers/release-memo-for-tax-year-2026-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-version-4-point-0)
says the current package is distributed through the registered e-Services
mailbox. Keep raw packages and extracted XSD/rules out of this public repo.

Observed in the v1 `IRS1040.xsd` versus the pinned September draft
[`f1040.pdf`](corpus/draft/f1040.pdf):

| 2026 draft 1040 | May v1 XSD observation | Consequence |
| --- | --- | --- |
| 12f charitable deduction; 13a Schedule 1-A; 13b QBI | No 12f line; QBI still labeled 13a and Schedule 1-A labeled 13b | The old element order and line labels cannot define the 2026 serializer. |
| 24a total tax, 24b Form 1062, 24c tax including Form 1062 | One `TotalTaxAmt` labeled line 24; the package has a separate `IRS1062Payment` document | A v1 XML 1040 cannot represent the printed 24a–c topology. |
| 32a refundable credits, 32b Schedule 3-A, 32c net credits | One `RefundableCreditsAmt` labeled line 32; no Schedule 3-A schema in the package | The public-benefit offset and new attachment need the later schema. |
| Taxpayer/spouse citizenship, nationality, or work authorization answers | No corresponding 1040 elements found | Do not guess their XML names or omit the question. |
| 27b clergy, 27c EIC decline, 30 refundable adoption | Present in v1 | These are a baseline only; confirm their names and sequence in the selected release. |

## When the current package arrives

1. Record the ZIP filename, release date, SHA-256, and IRS memo. Extract into
   ignored `.state/research/docs/` and verify its internal 1040 schema/rule
   version.
2. Diff v1 to the selected version by XSD path, element order, type, required
   attribute, attachment reference, and active business-rule ID. Preserve the
   diff summary in this document; do not commit raw XSD or rules.
3. Map every TY2026 pending key in `forms/f1040/2026/nodes/f1040.ts` to an
   element in that selected schema. Resolve Schedule 3-A, Form 1062,
   dependents, and work-authorization groups before writing the 2026 builder.
4. Validate a complete wages-only and source-backed ATS XML return against
   the selected XSD, then extend the same checks to every retained form in
   [`mef-coverage.csv`](mef-coverage.csv). Keep version-specific reject-rule
   evidence beside those fixtures.

Until step 1, MeF XML can be prototyped as unverified code but cannot satisfy
the TY2026 end-to-end release gate. The calculation and draft-PDF work can
continue independently.
