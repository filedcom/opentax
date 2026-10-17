# forms/f1040/2025/pdf/support

Helpers shared by PDF descriptors and the builder, the all-descriptor
contract, and source-bound current-loss review PDFs. Parent:
[../AGENTS.md](../AGENTS.md).

## Files

- `template_cache.ts` — `loadPdfTemplate(url, cacheDir, sha256?)`: reads
  `<cacheDir>/<url slug>.pdf` or fetches it once; a digest mismatch throws and
  is never refetched. Product code: `../builder.ts` calls it, so in the binary
  the fetch goes through `cli/network.ts` (irs.gov only).
- `irs_country_name.ts` — `ty2025IrsCountryName`: IRS country codes from
  TY2025 `efileTypes.xsd` (not ISO: `GM` is Germany); throws on unknown codes.
- `expense_statement.ts` — `appendExpenseStatement`: wrapped "other
  expenses" statement page for Schedule C and F PDFs.
- `current_loss_{4797,operating,return}_review.ts` — review-only PDFs over
  `../../mef/support/current_loss_original_form_review.ts`; not used by any
  filing route, only by their tests.
- `all_descriptors.test.ts` — every `ALL_PDF_FORMS` descriptor: archived
  revision URL (`ARCHIVED_REVISIONS` lists forms whose applicable revision is
  not 2025), field kinds, full AcroForm paths, no duplicates, `{row}`
  patterns; then fetches each IRS PDF and checks names, types and widgets.
- `supporting_tax_lines.test.ts`, `main_schedule_owner_headers.test.ts` —
  cross-form line and header contracts.

## Traps

- The review test files and `main_schedule_owner_headers.test.ts` shell out
  to `pdftotext` and use `.pdf-cache`; `all_descriptors.test.ts` needs network
  to irs.gov (its header still says `--allow-net`, a Deno leftover).
- Review modules take `Record<string, Record<string, any>>`; don't spread that.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/support/template_cache.test.ts`
- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/support/` (network,
  `pdftotext`).
