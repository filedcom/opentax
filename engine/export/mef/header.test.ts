// NOTE FOR IMPLEMENTORS:
// Black-box test file generated from header-context.md only.
// Verify: buildReturnHeader export name, FilerIdentity import path
// AMBIGUITIES:
//   - <Filer> tag: tests expect exactly `<Filer>` with no attributes. If the
//     implementation emits `<Filer ...attrs>`, update the tag-presence checks.
//   - Element ordering within <ReturnHeader> is not tested (spec provides a
//     table, not a sequence). Tests check presence only.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildReturnHeader } from "./header.ts";
import type { FilerIdentity } from "./types.ts";

function sampleFiler(): FilerIdentity {
  return {
    primarySSN: "123456789",
    nameLine1: "SMITH JOHN A",
    nameControl: "SMIT",
    address: {
      line1: "123 MAIN ST",
      city: "SPRINGFIELD",
      state: "IL",
      zip: "62701",
    },
    filingStatus: 1,
  };
}

// ---------------------------------------------------------------------------
// Section 1: Always-present elements
// ---------------------------------------------------------------------------

Deno.test("always emits ReturnType 1040 with no filer", () => {
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, "<ReturnType>1040</ReturnType>");
});

Deno.test("always emits TaxPeriodBeginDate with no filer", () => {
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, "<TaxPeriodBeginDate>2025-01-01</TaxPeriodBeginDate>");
});

Deno.test("always emits TaxPeriodEndDate with no filer", () => {
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, "<TaxPeriodEndDate>2025-12-31</TaxPeriodEndDate>");
});

Deno.test("always emits ReturnType 1040 even when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<ReturnType>1040</ReturnType>");
});

Deno.test("always emits TaxPeriodBeginDate when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<TaxPeriodBeginDate>2025-01-01</TaxPeriodBeginDate>");
});

Deno.test("always emits TaxPeriodEndDate when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<TaxPeriodEndDate>2025-12-31</TaxPeriodEndDate>");
});

Deno.test("return value is a string", () => {
  assertEquals(typeof buildReturnHeader(undefined), "string");
  assertEquals(typeof buildReturnHeader(sampleFiler()), "string");
});

// ---------------------------------------------------------------------------
// Section 2: No filer — absent blocks
// ---------------------------------------------------------------------------

Deno.test("no filer: Filer block is absent", () => {
  const result = buildReturnHeader(undefined);
  assertEquals(result.includes("<Filer>"), false);
});

Deno.test("no filer: FilingStatusCd is absent", () => {
  const result = buildReturnHeader(undefined);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

Deno.test("no filer: USAddress block is absent", () => {
  const result = buildReturnHeader(undefined);
  assertEquals(result.includes("<USAddress>"), false);
});

Deno.test("no filer: PrimarySSN is absent", () => {
  const result = buildReturnHeader(undefined);
  assertEquals(result.includes("<PrimarySSN>"), false);
});

// ---------------------------------------------------------------------------
// Section 3: Filer present — SSN
// ---------------------------------------------------------------------------

Deno.test("filer SSN is output without dashes", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<PrimarySSN>123456789</PrimarySSN>");
});

Deno.test("filer SSN is raw digits — no reformatting with dashes", () => {
  const result = buildReturnHeader(sampleFiler());
  assertEquals(result.includes("123-45-6789"), false);
});

// ---------------------------------------------------------------------------
// Section 4: Filer present — name fields
// ---------------------------------------------------------------------------

Deno.test("filer NameLine1Txt is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<NameLine1Txt>SMITH JOHN A</NameLine1Txt>");
});

Deno.test("filer PrimaryNameControlTxt is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<PrimaryNameControlTxt>SMIT</PrimaryNameControlTxt>");
});

// ---------------------------------------------------------------------------
// Section 5: Filer present — address
// ---------------------------------------------------------------------------

Deno.test("filer USAddress block is present", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<USAddress>");
});

Deno.test("filer USAddress block is closed", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "</USAddress>");
});

Deno.test("filer AddressLine1Txt is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<AddressLine1Txt>123 MAIN ST</AddressLine1Txt>");
});

Deno.test("filer CityNm is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<CityNm>SPRINGFIELD</CityNm>");
});

Deno.test("filer StateAbbreviationCd is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<StateAbbreviationCd>IL</StateAbbreviationCd>");
});

Deno.test("filer ZIPCd is emitted for 5-digit zip", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<ZIPCd>62701</ZIPCd>");
});

Deno.test("filer ZIPCd is emitted for 9-digit zip with dash", () => {
  const filer: FilerIdentity = { ...sampleFiler(), address: { ...sampleFiler().address, zip: "94105-1234" } };
  const result = buildReturnHeader(filer);
  assertStringIncludes(result, "<ZIPCd>94105-1234</ZIPCd>");
});

// ---------------------------------------------------------------------------
// Section 6: Filer present — FilingStatusCd (all 5 values)
// ---------------------------------------------------------------------------

Deno.test("filingStatus 1 emits FilingStatusCd 1", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: 1 };
  const result = buildReturnHeader(filer);
  assertStringIncludes(result, "<FilingStatusCd>1</FilingStatusCd>");
});

Deno.test("filingStatus 2 emits FilingStatusCd 2", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: 2 };
  const result = buildReturnHeader(filer);
  assertStringIncludes(result, "<FilingStatusCd>2</FilingStatusCd>");
});

Deno.test("filingStatus 3 emits FilingStatusCd 3", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: 3 };
  const result = buildReturnHeader(filer);
  assertStringIncludes(result, "<FilingStatusCd>3</FilingStatusCd>");
});

Deno.test("filingStatus 4 emits FilingStatusCd 4", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: 4 };
  const result = buildReturnHeader(filer);
  assertStringIncludes(result, "<FilingStatusCd>4</FilingStatusCd>");
});

Deno.test("filingStatus 5 emits FilingStatusCd 5", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: 5 };
  const result = buildReturnHeader(filer);
  assertStringIncludes(result, "<FilingStatusCd>5</FilingStatusCd>");
});

// ---------------------------------------------------------------------------
// Section 7: XML escaping
// ---------------------------------------------------------------------------

Deno.test("name with ampersand is XML-escaped in NameLine1Txt", () => {
  const filer: FilerIdentity = { ...sampleFiler(), nameLine1: "JONES & SON" };
  const result = buildReturnHeader(filer);
  assertStringIncludes(result, "<NameLine1Txt>JONES &amp; SON</NameLine1Txt>");
});

Deno.test("name with ampersand: raw unescaped value is not present", () => {
  const filer: FilerIdentity = { ...sampleFiler(), nameLine1: "JONES & SON" };
  const result = buildReturnHeader(filer);
  // The raw & must not appear — only &amp; should be present
  assertEquals(result.includes("JONES & SON"), false);
});

Deno.test("address line with less-than is XML-escaped in AddressLine1Txt", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    address: { ...sampleFiler().address, line1: "123 <MAIN> ST" },
  };
  const result = buildReturnHeader(filer);
  assertStringIncludes(result, "<AddressLine1Txt>123 &lt;MAIN&gt; ST</AddressLine1Txt>");
});

Deno.test("address line with less-than: raw unescaped tag is not present as text", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    address: { ...sampleFiler().address, line1: "123 <MAIN> ST" },
  };
  const result = buildReturnHeader(filer);
  // The literal string <MAIN> must not appear unescaped as a value
  assertEquals(result.includes(">123 <MAIN> ST<"), false);
});

// ---------------------------------------------------------------------------
// Section 8: Output structure
// ---------------------------------------------------------------------------

Deno.test("output is wrapped in opening ReturnHeader element", () => {
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, "<ReturnHeader>");
});

Deno.test("output closes ReturnHeader element", () => {
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, "</ReturnHeader>");
});

Deno.test("filer Filer block is present when filer provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<Filer>");
});

Deno.test("filer Filer block is closed when filer provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "</Filer>");
});

Deno.test("output with filer still wrapped in ReturnHeader", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<ReturnHeader>");
  assertStringIncludes(result, "</ReturnHeader>");
});
