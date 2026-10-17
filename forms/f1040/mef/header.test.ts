import { test } from "bun:test";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
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

test("always emits ReturnType 1040", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<ReturnTypeCd>1040</ReturnTypeCd>");
});

test("always emits TaxPeriodBeginDate", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(
    result,
    "<TaxPeriodBeginDt>2025-01-01</TaxPeriodBeginDt>",
  );
});

test("always emits TaxPeriodEndDate", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt>");
});

test("always emits ReturnType 1040 even when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<ReturnTypeCd>1040</ReturnTypeCd>");
});

test("always emits TaxPeriodBeginDate when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(
    result,
    "<TaxPeriodBeginDt>2025-01-01</TaxPeriodBeginDt>",
  );
});

test("always emits TaxPeriodEndDate when filer is provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt>");
});

test("return value is a string", () => {
  assertEquals(typeof buildReturnHeader(sampleFiler()), "string");
});

// ---------------------------------------------------------------------------
// Section 2: Missing filer
// ---------------------------------------------------------------------------

test("missing filer is rejected instead of filled with placeholder identity", () => {
  assertThrows(
    () => buildReturnHeader(undefined),
    Error,
    "requires a real filer identity",
  );
});

test("header rejects placeholder SSN and incomplete filer details", () => {
  assertThrows(
    () => buildReturnHeader({ ...sampleFiler(), primarySSN: "000000000" }),
    Error,
    "nine-digit filer SSN or ITIN",
  );
  assertThrows(
    () => buildReturnHeader({ ...sampleFiler(), nameControl: "" }),
    Error,
    "name and name control",
  );
  assertThrows(
    () =>
      buildReturnHeader({
        ...sampleFiler(),
        address: { ...sampleFiler().address, line1: "" },
      }),
    Error,
    "mailing address",
  );
});

// ---------------------------------------------------------------------------
// Section 3: Filer present — SSN
// ---------------------------------------------------------------------------

test("filer SSN is output without dashes", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<PrimarySSN>123456789</PrimarySSN>");
});

test("filer SSN is raw digits — no reformatting with dashes", () => {
  const result = buildReturnHeader(sampleFiler());
  assertEquals(result.includes("123-45-6789"), false);
});

// ---------------------------------------------------------------------------
// Section 4: Filer present — name fields
// ---------------------------------------------------------------------------

test("filer NameLine1Txt is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(
    result,
    "<NameLine1Txt>SMITH&lt;JOHN&lt;A</NameLine1Txt>",
  );
});

test("filer PrimaryNameControlTxt is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(
    result,
    "<PrimaryNameControlTxt>SMIT</PrimaryNameControlTxt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Filer present — address
// ---------------------------------------------------------------------------

test("filer USAddress block is present", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<USAddress>");
});

test("filer USAddress block is closed", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "</USAddress>");
});

test("filer AddressLine1Txt is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(
    result,
    "<AddressLine1Txt>123 MAIN ST</AddressLine1Txt>",
  );
});

test("filer CityNm is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<CityNm>SPRINGFIELD</CityNm>");
});

test("filer StateAbbreviationCd is emitted", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<StateAbbreviationCd>IL</StateAbbreviationCd>");
});

test("filer ZIPCd is emitted for 5-digit zip", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<ZIPCd>62701</ZIPCd>");
});

test("filer ZIPCd is emitted for 9-digit zip with dash", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    address: { ...sampleFiler().address, zip: "94105-1234" },
  };
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

test("FilingStatus.Single: FilingStatusCd is NOT in the header (belongs in return body)", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    filingStatus: FilingStatus.Single,
  };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

test("FilingStatus.MarriedFilingJointly: FilingStatusCd is NOT in the header", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    filingStatus: FilingStatus.MarriedFilingJointly,
  };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

test("FilingStatus.MarriedFilingSeparately: FilingStatusCd is NOT in the header", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    filingStatus: FilingStatus.MarriedFilingSeparately,
  };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

test("FilingStatus.HeadOfHousehold: FilingStatusCd is NOT in the header", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    filingStatus: FilingStatus.HeadOfHousehold,
  };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

test("FilingStatus.QualifyingSurvivingSpouse: FilingStatusCd is NOT in the header", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    filingStatus: FilingStatus.QualifyingSurvivingSpouse,
  };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("<FilingStatusCd>"), false);
});

// ---------------------------------------------------------------------------
// Section 7: XML escaping
// ---------------------------------------------------------------------------

test("name with ampersand is XML-escaped in NameLine1Txt", () => {
  const filer: FilerIdentity = { ...sampleFiler(), nameLine1: "JONES & SON" };
  const result = buildReturnHeader(filer);
  assertStringIncludes(
    result,
    "<NameLine1Txt>JONES&lt;&amp;&lt;SON</NameLine1Txt>",
  );
});

test("name with ampersand: raw unescaped value is not present", () => {
  const filer: FilerIdentity = { ...sampleFiler(), nameLine1: "JONES & SON" };
  const result = buildReturnHeader(filer);
  assertEquals(result.includes("JONES & SON"), false);
});

test("address line with less-than is XML-escaped in AddressLine1Txt", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    address: { ...sampleFiler().address, line1: "123 <MAIN> ST" },
  };
  const result = buildReturnHeader(filer);
  assertStringIncludes(
    result,
    "<AddressLine1Txt>123 &lt;MAIN&gt; ST</AddressLine1Txt>",
  );
});

test("address line with less-than: raw unescaped tag is not present as text", () => {
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

test("output is wrapped in opening ReturnHeader element with binaryAttachmentCnt attribute", () => {
  // ReturnHeader1040x.xsd requires binaryAttachmentCnt attribute (value 0 for no binary attachments)
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, '<ReturnHeader binaryAttachmentCnt="0">');
});

test("output closes ReturnHeader element", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "</ReturnHeader>");
});

test("filer Filer block is present when filer provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "<Filer>");
});

test("filer Filer block is closed when filer provided", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, "</Filer>");
});

test("output with filer still wrapped in ReturnHeader with binaryAttachmentCnt attribute", () => {
  const result = buildReturnHeader(sampleFiler());
  assertStringIncludes(result, '<ReturnHeader binaryAttachmentCnt="0">');
  assertStringIncludes(result, "</ReturnHeader>");
});

test("files the Self-Select PIN authentication group before PINTypeCd, in XSD order", () => {
  const filer: FilerIdentity = {
    ...sampleFiler(),
    filingStatus: FilingStatus.MarriedFilingJointly,
    signaturePin: "12345",
    birthDate: "1980-02-03",
    priorYearAgi: 0,
    ipPin: "123456",
    spouse: {
      ssn: "987654321",
      firstName: "JANE",
      lastName: "SMITH",
      nameControl: "SMIT",
      signaturePin: "54321",
      birthDate: "1982-04-05",
      priorYearPin: "11111",
    },
  };
  const header = buildReturnHeader(filer);
  assertStringIncludes(
    header,
    "</OriginatorGrp><SelfSelectPINGrp><PrimaryBirthDt>1980-02-03</PrimaryBirthDt><SpouseBirthDt>1982-04-05</SpouseBirthDt><PrimaryPriorYearAGIAmt>0</PrimaryPriorYearAGIAmt><SpousePriorYearPIN>11111</SpousePriorYearPIN></SelfSelectPINGrp><IdentityProtectionPIN>123456</IdentityProtectionPIN><PINTypeCd>",
  );
});

test("omits the Self-Select PIN group when nothing authenticates the signer", () => {
  assertEquals(buildReturnHeader(sampleFiler()).includes("SelfSelectPINGrp"), false);
});
