# forms/f1040/2025/mef

TY2025 native MeF output: one serializer per IRS XML document, the return
bundle that orders and links them, and submission/attachment packaging.
Calculations stay in `../../nodes/`; source checks shared with the PDF live in
`../domains/`; year-independent header and XML helpers live in `../../mef/`.
Index of serializers: [forms/README.md](./forms/README.md).

## Layout

- `form_descriptor.ts` — `MefFormDescriptor` (`pendingKey`, `FIELD_MAP`,
  `pdfUrl`, `build(fields, context)`, optional extra documents and PDF
  attachments) and `MefBuildContext`.
- `forms/<section>/<group>/f<NNNN>.ts` — serializers; `forms/index.ts` holds
  `ALL_MEF_FORMS`.
- `builder.ts` — `buildMefXml` and `buildMefBundle` over `ALL_MEF_FORMS`;
  `types.ts` derives `MefFormsPending` from the descriptors.
- `execution/pending.ts` — `buildPending`: executor pending to scalar slices.
- `identity/` document IDs; `attachments/` PDF attachment names, envelopes and
  manifest; `submissions/` A2A evidence and submission archive.
- `support/` shared test helpers (`test_filer.ts`) and review checks.
- `xsd_validation.test.ts`, `builder.test.ts`, `invalid_xml_source.test.ts` —
  whole-return XML contracts.

## Rules

- A new document: export one `MefFormDescriptor` constant plus its `FIELD_MAP`
  from its section folder and add it to `ALL_MEF_FORMS` at the position
  `ReturnData1040.xsd` sequences it; out-of-order elements fail xmllint with
  "This element is not expected".
- `FIELD_MAP` pairs `[pendingField, XmlElementName]` in XSD element order, with a
  comment naming the XSD it was checked against (see
  `forms/taxes/amt/f6251.ts`: "verified against IRS6251.xsd (2025v5.4)").
  `../../validation/field_registry.ts` reverses every `FIELD_MAP` so business
  rules can find a value by XML name; renaming an element changes rules too.
- Emit XML only through `element`/`elements` from `../../mef/xml.ts`: they
  escape text, drop `undefined`, round numbers to whole dollars and throw on
  non-finite values and invalid XML characters.
- Before serializing, call the `../domains/**` `assert*` guards for the form;
  an exporter that cannot produce a required document fails
  (`../return-processing/attachment_coverage.ts`), it never omits it silently.
- The bundle accepts only `F1040_2025_CONFIG.mefSchemaVersion` (`2025v5.4`).

## Verify

- `bun test ./forms/f1040/2025/mef/forms/<section>/<group>/<form>.test.ts --timeout=1800000`.
- `bun test ./forms/f1040/2025/mef/xsd_validation.test.ts --timeout=1800000` —
  needs `xmllint` and
  `.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd`
  (private download). Without it most cases skip (`test.skipIf(!xsdAvailable)`)
  and the completeness test and other XSD tests fail with
  `Missing verification prerequisite`; report that as unverified.
- `bun run test:unit` (type-check only for this folder).

## Read next

- [forms/README.md](./forms/README.md), [support/AGENTS.md](./support/AGENTS.md)
- [../../mef/AGENTS.md](../../mef/AGENTS.md) — header, filer and XML helpers
- [../../validation/AGENTS.md](../../validation/AGENTS.md) — rules over `FIELD_MAP` names
- [../domains/AGENTS.md](../domains/AGENTS.md)
