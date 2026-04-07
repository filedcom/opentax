import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildReturnHeader, FilingStatus } from "./header.ts";
import type { FilerIdentity } from "./header.ts";

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
    filingStatus: FilingStatus.Single,
  };
}

// ---------------------------------------------------------------------------
// Section 1: Always-present elements
// ---------------------------------------------------------------------------

Deno.test("always emits ReturnType 1040 with no filer", () => {
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, "<ReturnTypeCd>1040</ReturnTypeCd>");
});

Deno.test("always emits TaxPeriodBeginDate with no filer", () => {
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, "<TaxPeriodBeginDt>2025-01-01</TaxPeriodBeginDt>");
});

Deno.test("always emits TaxPeriodEndDate with no filer", () => {
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, "<TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt>");
});

Deno.test("always emits ReturnType 1040 even when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<ReturnTypeCd>1040</ReturnTypeCd>");
});

Deno.test("always emits TaxPeriodBeginDate when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<TaxPeriodBeginDt>2025-01-01</TaxPeriodBeginDt>");
});

Deno.test("always emits TaxPeriodEndDate when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt>");
});

Deno.test("return value is a string", () => {
  assertEquals(typeof buildReturnHeader(undefined), "string");
  assertEquals(typeof buildReturnHeader(sampleFiler()), "string");
});

// ---------------------------------------------------------------------------
// Section 2: No filer — absent blocks
// ---------------------------------------------------------------------------

Deno.test("no filer: placeholder Filer block is emitted (XSD requires Filer)", () => {
  // ReturnHeader1040x.xsd §338 requires a Filer element.
  // When no filer identity is provided, a placeholder is emitted so the schema
  // validator accepts the document (test/preview use case).
  const result = buildReturnHeader(undefined);
  assertEquals(result.includes("<Filer>"), true);
});

Deno.test("no filer: FilingStatusCd is absent", () => {
  const result = buildReturnHeader(undefined);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

Deno.test("no filer: placeholder USAddress is emitted (required by XSD)", () => {
  // XSD requires USAddress or ForeignAddress inside Filer.
  // Placeholder address is emitted when no filer identity is provided.
  const result = buildReturnHeader(undefined);
  assertEquals(result.includes("<USAddress>"), true);
});

Deno.test("no filer: placeholder PrimarySSN is emitted (required by XSD)", () => {
  // XSD requires PrimarySSN inside Filer.
  // Placeholder SSN 000000000 is emitted when no filer identity is provided.
  const result = buildReturnHeader(undefined);
  assertEquals(result.includes("<PrimarySSN>"), true);
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
// Section 6: Filer present — FilingStatusCd
// ---------------------------------------------------------------------------
// Per ReturnHeader1040x.xsd, FilingStatusCd is NOT part of the Filer block in
// the header. It belongs in the return body (IRS1040.xsd). The header Filer
// block contains: PrimarySSN, NameLine1Txt, PrimaryNameControlTxt, USAddress.
// These tests verify FilingStatusCd is absent from the header output.

Deno.test("FilingStatus.Single: FilingStatusCd is NOT in the header (belongs in return body)", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: FilingStatus.Single };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

Deno.test("FilingStatus.MarriedFilingJointly: FilingStatusCd is NOT in the header", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: FilingStatus.MarriedFilingJointly };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

Deno.test("FilingStatus.MarriedFilingSeparately: FilingStatusCd is NOT in the header", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: FilingStatus.MarriedFilingSeparately };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

Deno.test("FilingStatus.HeadOfHousehold: FilingStatusCd is NOT in the header", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: FilingStatus.HeadOfHousehold };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

Deno.test("FilingStatus.QualifyingSurvivingSpouse: FilingStatusCd is NOT in the header", () => {
  const filer: FilerIdentity = { ...sampleFiler(), filingStatus: FilingStatus.QualifyingSurvivingSpouse };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
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
  assertEquals(result.includes(">123 <MAIN> ST<"), false);
});

// ---------------------------------------------------------------------------
// Section 8: Output structure
// ---------------------------------------------------------------------------

Deno.test("output is wrapped in opening ReturnHeader element with binaryAttachmentCnt attribute", () => {
  // ReturnHeader1040x.xsd requires binaryAttachmentCnt attribute (value 0 for no binary attachments)
  const result = buildReturnHeader(undefined);
  assertStringIncludes(result, '<ReturnHeader binaryAttachmentCnt="0">');
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

Deno.test("output with filer still wrapped in ReturnHeader with binaryAttachmentCnt attribute", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, '<ReturnHeader binaryAttachmentCnt="0">');
  assertStringIncludes(result, "</ReturnHeader>");
});
