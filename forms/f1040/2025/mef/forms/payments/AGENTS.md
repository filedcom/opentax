# mef/forms/payments

Native MeF XML for the Payments forms that are separate documents. Line
amounts from `f1040es`, `ext`, `f8288` and `f8805` have no document here: they
serialize on `IRS1040` / `IRS1040Schedule3` in
`../general/return-assembly/f1040.ts` and `schedule3.ts`. Section map:
[../../../../nodes/inputs/payments/AGENTS.md](../../../../nodes/inputs/payments/AGENTS.md).

- `investments/f2439.ts` — `form2439` (`IRS2439`, one per Form 2439 with
  box 1a > 0; re-runs `assertSourcedForm2439` from the node). Registered in
  `../index.ts`.
- `refund/f8888.ts` — `form8888` (`IRS8888`); values come from
  `reconcileForm8888` in `../../../domains/payments/refund/form8888/`.
  Registered in `../index.ts`.
- `installments/f9465_attached.ts` — `buildAttachedForm9465`, a staged builder
  (Single filer only, exact positive line 37, no refund) that is **not**
  registered; export is blocked by the `f9465` entry in
  `../../../return-processing/attachment_coverage.ts`. The PDF descriptor
  reuses it.

## Conventions here

- Both registered descriptors build XML by hand with `element`/`elements`
  and declare `FIELD_MAP: []`, so `validation/field_registry.ts` gets no XML
  names from them (see `validation/rules/payments/AGENTS.md`).
- XSD tests read `.state/research/docs/IMF_Series_2025v5.4/` and use
  `test.skipIf(!xsdAvailable)` when it is absent.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/mef/forms/payments`
- `bun test --timeout=1800000 ./forms/f1040/2025/mef/xsd_validation.test.ts`
  after a tag change (needs the private XSD).
