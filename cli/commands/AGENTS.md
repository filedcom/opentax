# cli/commands

One module per command group; `../main.ts` owns the `COMMANDS` table, flag
parsing and printing. A command function takes plain args (return commands
take `baseDir`, which `main.ts` sets to `./.state/returns`), returns data or
throws. Parent rules (sandbox, flags, `update` guard): [../AGENTS.md](../AGENTS.md).

## Files

- `help.ts` — `ParsedArgs`, `CommandDef`, `OptionDef`, `TopLevelDef`, `printHelp`.
- `return.ts` — `return create` / `return get` (summary, soft warnings).
- `form.ts` — `form add|list|get|update|delete`. `getUserInputSchema` picks
  the item schema for array inputs and `start`'s schema; `rejectUnknownFields`
  unwraps `ZodEffects` so a misspelled field fails instead of being stripped.
- `export.ts` — `return export --type mef|pdf|form4972-paper`.
  `runReturnPipeline` executes the return and throws `ExportExecutionError` on
  any executor diagnostic unless `--draft`; `validateBusinessRules` throws
  `ExportRejectedError` on reject rules unless `--force`. Rules are scoped to
  documents actually emitted (`emittedValidationScope`); transmitter-only
  rules (`TRANSMISSION_ONLY_RULES`, IND-189…203) are skipped here.
- `validate.ts` — `return validate`; reuses `emittedValidationScope` and
  `isTransmissionOnlyRule` from `export.ts`, so keep the two in step.
- `form8839-attachments.ts` — loads the return's `attachments/` PDFs named by
  the Form 8839 public source (no symlinks, no `..`, ≤ 60 MB each).
- `form8886-otsa.ts` — `return export-otsa` / `return record-otsa-delivery`
  (no `--draft`; logic lives in `forms/f1040/2025/domains/general/filing/form8886/`).
- `graph.ts` (`node graph`), `node.ts` (`node list|inspect`), `version.ts`.

## Traps

- `--draft` labels output (XML comment, PDF watermark); it never makes it
  fileable. `--force` skips reject rules only, never executor errors, and
  `form4972-paper` refuses both. Never run `update` while developing.
- `getCatalogEntry` is copied in `export.ts`, `form.ts`, `return.ts` and
  `validate.ts`; an unsupported `"<form>:<year>"` must throw the same way.

## Verify

- `bun test --timeout=1800000 ./cli/commands/` (not in `test:unit`;
  `export-cli.test.ts` spawns `bun cli/main.ts`), then `bun run check:sandbox`.
