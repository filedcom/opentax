# MeF ReturnHeader Builder — Spec

## Purpose
Builds the `<ReturnHeader>` XML element for a MeF 1040 submission.

## Function Signature
```ts
buildReturnHeader(filer?: FilerIdentity): string
```

## FilerIdentity Type
```ts
interface FilerIdentity {
  primarySSN: string       // 9 digits, no dashes, no spaces (e.g. "123456789")
  nameLine1: string        // Full name, uppercase (e.g. "SMITH JOHN A")
  nameControl: string      // First 4 chars of last name, uppercase (e.g. "SMIT")
  address: {
    line1: string          // Street address
    city: string
    state: string          // 2-letter abbreviation (e.g. "CA")
    zip: string            // 5-digit or 9-digit (e.g. "94105" or "94105-1234")
  }
  filingStatus: 1 | 2 | 3 | 4 | 5   // 1=Single, 2=MFJ, 3=MFS, 4=HOH, 5=QW
}
```

## Output Structure
Always produces a `<ReturnHeader>` element. Mandatory children are always present. Filer-specific children are only present when `filer` is provided.

### Always-present elements
| Element | Value |
|---------|-------|
| `ReturnType` | `"1040"` |
| `TaxPeriodBeginDate` | `"2025-01-01"` |
| `TaxPeriodEndDate` | `"2025-12-31"` |

### Filer-conditional elements (only when `filer` is provided)
| Element | Source |
|---------|--------|
| `Filer/PrimarySSN` | `filer.primarySSN` |
| `Filer/NameLine1Txt` | `filer.nameLine1` |
| `Filer/PrimaryNameControlTxt` | `filer.nameControl` |
| `Filer/USAddress/AddressLine1Txt` | `filer.address.line1` |
| `Filer/USAddress/CityNm` | `filer.address.city` |
| `Filer/USAddress/StateAbbreviationCd` | `filer.address.state` |
| `Filer/USAddress/ZIPCd` | `filer.address.zip` |
| `FilingStatusCd` | `String(filer.filingStatus)` — `"1"` through `"5"` |

## Rules

1. **ReturnType is always `"1040"`** — hard-coded, no input controls this.
2. **Tax period is always 2025** — hard-coded for tax year 2025. `TaxPeriodBeginDate` = `"2025-01-01"`, `TaxPeriodEndDate` = `"2025-12-31"`.
3. **No filer argument → no `<Filer>` block, no `<FilingStatusCd>`** — the three mandatory elements above are still present.
4. **SSN is output as-is** — no formatting, no dashes added. Caller provides 9 raw digits.
5. **Name values are XML-escaped** — `NameLine1Txt` and address fields pass through `escapeXml`.
6. **USAddress is only present if filer is present** — never emitted partially.
7. **All filer fields are required when filer object is provided** — there is no partial filer; the type has no optional fields.
8. **FilingStatusCd is a string digit** — `"1"` for Single, `"2"` for MFJ, etc.

## Edge Cases

| Scenario | Expected |
|----------|----------|
| `filer` is `undefined` | Output contains `ReturnType`, `TaxPeriodBeginDate`, `TaxPeriodEndDate` only. No `Filer` block, no `FilingStatusCd`. |
| `filer.nameLine1` contains `&` | XML-escaped in output |
| `filer.address.line1` contains `<` | XML-escaped in output |
| `filer.filingStatus = 1` | `<FilingStatusCd>1</FilingStatusCd>` |
| `filer.filingStatus = 5` | `<FilingStatusCd>5</FilingStatusCd>` |
| `filer.address.zip = "94105-1234"` | `<ZIPCd>94105-1234</ZIPCd>` |
