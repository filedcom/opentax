# TY2026 Form 1040 product assembly handoff

Snapshot: 2026-09-27. The specialist plans specify calculations and filed
forms. This plan names the repository seams that turn those pieces into one
`f1040:2026` product. Follow it after the [parity queue](PARITY-QUEUE.md)
routes are implemented; catalog registration by itself does not make a
complete return.

## Current code and required 2026 result

| Seam | Current implementation | TY2026 work and evidence |
| --- | --- | --- |
| Product definition | `forms/f1040/2025/index.ts` supplies `FormDefinition`; `catalog.ts` registers only `f1040:2025`. | Add a 2026 `config.ts` and `index.ts`, wiring **2026** input nodes, registry, validation, pending normalization, XML and PDF builders. Register `f1040:2026` after the complete route meets the gates below. The `mefSchemaVersion` must be read from the selected current 1040 XSD, not copied from `2025v5.4` or inferred from the May v1 ZIP. |
| Input surface | `forms/f1040/2026/inputs.ts` and `registry.ts` exist; the registry currently has 35 keys, compared with 191 TY2025 node types in the [node ledger](node-coverage.csv). `cli/commands/form.ts` accepts only `def.inputNodes` or `start`. | Reconcile each retained input with the 2026 registry and `inputNodes` in the same change. Verify CLI add/list and executor output for both singleton and repeated records; a registered calculator with no input entry is not user reachable. Complete the [route gaps](GRAPH-ROUTES.md) and owner-keyed source reconciliation before filing. |
| Return summary | `cli/commands/return.ts` reads `line11_agi` and `line24_total_tax` and several TY2025-shaped warning fields. The 2026 1040 node instead emits `line11a_agi`, `line11b_agi`, and `line24a_total_tax`/`line24c_total_tax`; its test rejects the old `line24_total_tax` key. | Make summary and warning extraction year-correct: 2026 AGI is line 11b and settlement tax is line 24c. Check the actual 2026 EIC, deduction, payment and Schedule A pending keys before retaining each warning. Exercise `opentax return get` with a calculated 2026 case and keep a TY2025 regression. Do not silently report zero for a populated 2026 return. |
| Local and MeF validation | `forms/f1040/2026/validation.ts` has ten local calculation rules and an empty XML field registry. The shared `forms/f1040/validation/field-registry.ts` derives its element map from **TY2025** `ALL_MEF_FORMS`; the shared rule index contains the TY2025 MeF rules. `cli/commands/validate.ts` consumes whatever `def.validation` supplies. | Keep the local 2026 arithmetic/attachment rules, then build a separate 2026 field registry and active business-rule set from the selected TY2026 package. Include the new 1040 lines, Schedule 1-A, Schedule 3-A and Form 1062. Verify rule IDs, severity, document scope and `tax validate` report for a complete return. Neither the 2025 registry nor an empty map is filing validation. |
| Export validation scope | `cli/commands/export.ts` determines applicable rule prefixes from emitted XML document tags and form counts. Its parser has special cases for 1040, W-2, EIC, Schedule SE, Schedules 1–3 and letter schedules. | Confirm the selected 2026 XML document names and add scope handling for every new document and statement, particularly `IRS1040Schedule1A`, `IRS1040Schedule3A`, and `IRS1062`. Test that reject rules run for emitted forms, including repeats, and that `--force` never masks executor failures. Final export must not depend on `--draft` or a forced reject override. |
| PDF bundle | `forms/f1040/2026/pdf/builder.ts` currently selects 18 implemented attachment slots; `core.ts` fills the pinned draft PDFs. | Extend the attachment selector and fill maps to every retained [PDF ledger](pdf-coverage.csv) row plus 2026-only schedules and forms. Use a filing condition based on the form's complete result, not merely a nonzero tax amount; required zero-amount elections, answers, continuation pages and disclosures must remain printable. Check page count and rendered fields against each pinned PDF, then refresh final revisions. |
| MeF documents | `forms/f1040/2025/mef/forms/index.ts` fixes XSD sequence in `ALL_MEF_FORMS`; `builder.ts` defaults to `2025v5.4`/2025. There is no 2026 MeF directory. | Build the TY2026 document list in selected XSD order, using the [84-module public crosswalk](MEF-PUBLIC-CROSSWALK.md), [85-descriptor runtime ledger](mef-descriptor-coverage.csv), [binary attachment handoff](MEF-BINARY-ATTACHMENTS.md) and new 2026 forms. Map pending keys and repeat counts, header facts, statements and allowed binary attachments. Validate every emitted document and full return against the selected XSD and active rules; the public workbook is only an availability guide. |
| Submission ZIP | `forms/f1040/2025/mef/submission-archive.ts` hardcodes `TaxYr` **2025** and tax-period dates **2025-01-01/2025-12-31** in `manifest.xml`. It packages XML and PDF binaries, then builds an A2A transmission container. | Build a 2026 submission archive with 2026 manifest year/period and the selected return version. Verify EFIN/software ID, the **processing-year** Julian-day submission ID, ZIP entry names, PDF location references, document count and returned manifest before ATS. Do not reuse the 2025 archive unchanged. Inspect the current MeF package for any changed manifest or transport rules. |
| CLI and acceptance | `cli/commands/{return,form,validate,export}.ts` resolve definitions through `catalog.ts`; `tax export mef` returns XML, while the submission archive is a separate internal API. | Run create → add/update → calculate/get → validate → XML export → PDF export → submission ZIP for each applicable [ATS scenario](ATS.md). Use the scenario's printed source facts, independently calculated expectation, output lines, attachments, rule results and IRS acknowledgment as separate evidence. Keep the 2025 path in the same regression run. |

## Integration order

1. Finish the 2026 graph and input surface. A wages-only return should produce
   all 1040 answer fields, line 11b, line 24c and the settlement fields with
   no executor diagnostics. Add the remaining source/form routes from the
   [parity queue](PARITY-QUEUE.md), including 2026-only forms.
2. Finish PDF selectors and maps from the pinned forms. A return with a
   required attachment must yield that attachment even when its tax line is
   zero. Resolve final-publication changes before a filed PDF is accepted.
3. Acquire the current SOR 1040 XSD/rules. Record ZIP hash and release, diff
   the May v1 baseline, then implement 2026 MeF documents, header, binary
   rules, field registry and reject rules from the selected version. See
   [MeF drift](MEF-V1-DRIFT.md).
4. Wire the 2026 `FormDefinition`, summary/CLI, validation and submission ZIP.
   Confirm a complete return through the public CLI and the archive API.
5. Validate XML against the selected XSD, reconcile a rendered PDF and
   submission ZIP, and run source-backed boundary cases plus all applicable
   1040 ATS packets. Record IRS rejects/acknowledgments rather than treating
   local schema success as ATS acceptance.

The current research corpus reduces source lookup, but final 2026
instructions, the current restricted MeF package and live ATS outcomes remain
release evidence to obtain when available. The [source manifest](corpus/manifest.json)
and [instruction ledger](instruction-coverage.csv) identify their current
snapshot state.
