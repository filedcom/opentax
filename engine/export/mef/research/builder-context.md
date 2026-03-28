# MeF XML Builder (Top-Level) — Spec

## Purpose
Top-level function that assembles a complete MeF `<Return>` XML document from the engine's computed output.

## Function Signature
```ts
buildMefXml(
  pending: Record<string, Record<string, unknown>>,
  filer?: FilerIdentity
): string
```

## Output Structure
Always returns a complete XML string starting with the `<Return>` root element.

```xml
<Return returnVersion="2025v5.2" xmlns="http://www.irs.gov/efile">
  <ReturnHeader>...</ReturnHeader>
  <ReturnData documentCnt="N">
    <IRS1040>...</IRS1040>
    <IRS1040Schedule1>...</IRS1040Schedule1>
  </ReturnData>
</Return>
```

## Rules

### Root element
1. Root is always `<Return>` with attributes `returnVersion="2025v5.2"` and `xmlns="http://www.irs.gov/efile"`.
2. Attribute order: `returnVersion` before `xmlns`.

### ReturnHeader
3. Always present. Delegates to `buildReturnHeader(filer)`.
4. If `filer` is `undefined`, `ReturnHeader` contains only `ReturnType`, `TaxPeriodBeginDate`, `TaxPeriodEndDate`.

### ReturnData
5. Always present (even if all forms are empty — `documentCnt="0"`).
6. `documentCnt` attribute equals the number of non-empty form elements emitted (i.e. forms for which the form builder returned a non-empty string).
7. Forms included: `IRS1040` and `IRS1040Schedule1` — in that order.
8. A form is included only if its builder returns a non-empty string.

### Form data sourcing
9. `buildIRS1040` is called with `pending["f1040"] ?? {}`.
10. `buildIRS1040Schedule1` is called with `pending["schedule1"] ?? {}`.
11. If `pending["f1040"]` is missing entirely, `buildIRS1040` receives `{}` and returns `""` → not included.
12. If `pending["schedule1"]` is missing entirely, `buildIRS1040Schedule1` receives `{}` and returns `""` → not included.

### documentCnt accounting
13. `documentCnt` counts only forms that produced non-empty XML. If both forms are empty, `documentCnt="0"`. If only f1040 has data, `documentCnt="1"`. If both have data, `documentCnt="2"`.

## Edge Cases

| Scenario | Expected |
|----------|----------|
| `pending = {}` | Valid XML with ReturnHeader, `<ReturnData documentCnt="0"/>` (or empty ReturnData) |
| `pending = { f1040: { line1a_wages: 50000 } }` | `documentCnt="1"`, IRS1040 present, no IRS1040Schedule1 |
| `pending = { schedule1: { line7_unemployment: 4800 } }` | `documentCnt="1"`, IRS1040Schedule1 present, no IRS1040 |
| Both f1040 and schedule1 have data | `documentCnt="2"`, both forms present in order: IRS1040 first |
| `filer` provided | ReturnHeader contains `<Filer>` block |
| `filer` omitted | ReturnHeader has no `<Filer>` block |
| Return always starts with `<Return` | True regardless of pending/filer content |
| `pending["f1040"]` has only unknown keys | `buildIRS1040` returns `""` → not counted in documentCnt |

## Output always valid XML
- The output is always a syntactically valid XML string.
- There is no XML declaration (`<?xml ...?>`) — MeF submissions do not include it.
