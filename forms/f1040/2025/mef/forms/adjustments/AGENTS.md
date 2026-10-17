# Adjustments — MeF serializers

Native TY2025 v5.4 XML for the Adjustments forms that file their own
document: `IRS2106`, `IRS7206`, `IRS8853` (+ LTC and Medicare statements),
`IRS8889`. Line-only adjustments (educator, student loan, SEP, IRA,
moving) serialize on Schedule 1 in `../general/return-assembly/schedule1/`.
Section map: [../../../../nodes/inputs/adjustments/AGENTS.md](../../../../nodes/inputs/adjustments/AGENTS.md).

| File | `pendingKey` | Notes |
| --- | --- | --- |
| [employment/f2106.ts](employment/f2106.ts) | `f2106` | thin wrapper; XML from `domains/…/form2106_staged.ts` `buildStagedIRS2106`, one document per job |
| [health/f7206.ts](health/f7206.ts) | `form7206` | `FIELD_MAP` keyed by `Form7206Lines`; reconciles policy records, spouse coverage, independent owners |
| [health/f8853.ts](health/f8853.ts) | `form8853` | Archer/Medicare sections; `f8853_ltc.ts` builds Section C and exports `assertRequiredLtcSource` (called by both builders) |
| [health/f8853_ltc_statement.ts](health/f8853_ltc_statement.ts), [health/f8853_medicare_statements.ts](health/f8853_medicare_statements.ts) | `form8853` | extra descriptors on the same pending slice for supporting statements |
| [health/f8889.ts](health/f8889.ts) | `form8889` | `FIELD_MAP` in `IRS8889.xsd` order; one document per `forms[]` owner (at most two, primary then spouse); runs every `form8889_*` reconciler and checks two-owner sums against Schedule 1/2 and Form 1040 line 10 |

## Conventions verified here

- Every descriptor is registered in `../index.ts` (`ALL_MEF_FORMS`); three
  share `pendingKey: "form8853"`.
- Descriptors parse their slice with the node's exported `inputSchema` and
  throw rather than emit a partial document; source replays live in
  `../../../domains/adjustments/`, not here.
- `pdfUrl` points to `irs-prior/…--2025.pdf`, except `health/f8853.ts`
  (`irs-pdf/f8853.pdf`, the unpinned current revision).
- Form 3903 has no serializer: `attachment_coverage.ts` blocks any return
  with `f3903s`.

## Verify

- `bun test --timeout=1800000 forms/f1040/2025/mef/forms/adjustments`
  (`f8889.xsd.test.ts` skips without the private XSD).
- Rules on these elements: `../../../../validation/rules/adjustments/`.
