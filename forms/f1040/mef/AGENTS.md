# forms/f1040/mef

Form 1040 MeF helpers that are not tied to one form's serializer: filer
identity, the `ReturnHeader`, XML element writers and MeF name formatting.
They are imported by every TY2025 serializer, the CLI (`cli/commands/export.ts`,
`validate.ts`) and `core/types/form-definition.ts`. Per-document serializers
and the bundle belong in `../2025/mef/`.

## Layout
- `xml.ts` — `escapeXml`, `element(tag, value, attrs?)`, `elements(tag, children, attrs?)`.
- `header.ts` — MeF enums (`FilingStatus`, `PINEnteredBy`, `AccountType`),
  `FilerIdentity` and related interfaces, `returnHeaderNameLine1`,
  `buildReturnHeader(filer, year = 2025, returnType = "1040", ...)`.
- `filer.ts` — `extractFilerIdentity(f1040)`: computed `f1040` pending (or the
  `general` input) to `FilerIdentity`; returns `undefined` without SSN and last name.
- `business_name.ts` — `mefBusinessNameLine1`: TY2025 `BusinessNameLine1Type`
  (75 characters, restricted set).
- `*.test.ts` beside each module.

## Rules
- `element` is the only number-to-XML path: it rounds to whole dollars
  (`../shared/whole_dollars.ts`) and throws on a non-finite number; `escapeXml`
  throws on characters XML 1.0 forbids instead of stripping them. Keep both
  behaviours; `../2025/mef/invalid_xml_source.test.ts` relies on the throw.
- `buildReturnHeader` throws without a real filer (nine-digit SSN/ITIN, name
  and name control, mailing address); never substitute placeholders.
- Name formatters normalise punctuation only; they must not truncate, guess an
  alias or authenticate an EIN (see the comment in `business_name.ts`).
- Changing an enum value here changes every serializer and the business-rule
  header fields in `../validation/field_registry.ts`; check both.

## Verify
- `bun test ./forms/f1040/mef/ --timeout=1800000`
- `bun test ./forms/f1040/2025/mef/invalid_xml_source.test.ts --timeout=1800000`
- `bun run test:unit` (type-checks every importer, including `cli/`).

## Read next
- [../2025/mef/AGENTS.md](../2025/mef/AGENTS.md) — serializers and bundle
- [../validation/AGENTS.md](../validation/AGENTS.md)
- [../../../docs/architecture/STRUCTURE.md](../../../docs/architecture/STRUCTURE.md)
