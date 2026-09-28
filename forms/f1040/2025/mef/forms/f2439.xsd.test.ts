import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { TS } from "../../../nodes/types.ts";
import { form2439 } from "./f2439.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  firstName: "Alex",
  lastName: "Taxpayer",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const item = {
  box1a: 10_000,
  box1b: 1_000,
  box2: 1_500,
  shareholder: TS.T,
  shareholder_name: "Alex Taxpayer",
  shareholder_ssn_last4: "6789",
  payer_name: "Example Growth Fund",
  payer_ein: "12-3456789",
  payer_address_line1: "1 Fund Way",
  payer_address_city: "Boston",
  payer_address_state: "MA",
  payer_address_zip: "02110",
  tax_period_begin: "2025-01-01",
  tax_period_end: "2025-12-31",
};

Deno.test("Form 2439 native document retains payer, shareholder, and box 2 source", () => {
  const [xml] = form2439.build(
    { f2439s: [item] },
    {
      filer,
      pending: {
        schedule3: { line13a_total: 1_500, line15_total: 1_500 },
        f1040: { line31_additional_payments: 1_500 },
      },
    },
  );
  assertStringIncludes(xml, "<RICOrREITEIN>123456789</RICOrREITEIN>");
  assertStringIncludes(xml, "<ShareholderSSN>123456789</ShareholderSSN>");
  assertStringIncludes(
    xml,
    "<TaxPaidByRICOrREITAmt>1500</TaxPaidByRICOrREITAmt>",
  );
});

Deno.test("Form 2439 gain-only Copy B is included without Schedule 3 credit", () => {
  const [xml] = form2439.build(
    { f2439s: [{ ...item, box2: undefined }] },
    { filer },
  );
  assertStringIncludes(xml, "<TotalUndistributedLTCapGainAmt>10000</TotalUndistributedLTCapGainAmt>");
  assertEquals(xml.includes("TaxPaidByRICOrREITAmt"), false);
});

Deno.test("Form 2439 gain-only Copy B still needs complete source facts", () => {
  assertThrows(
    () => form2439.build({ f2439s: [{ box1a: 2_000 }] }, { filer }),
    Error,
    "needs payer-issued Copy B identity and tax period",
  );
});

Deno.test("Form 2439 native export rejects source/shareholder or Schedule 3 mismatches", () => {
  assertThrows(
    () =>
      form2439.build(
        { f2439s: [{ ...item, shareholder_ssn_last4: "0000" }] },
        {
          filer,
          pending: {
            schedule3: { line13a_total: 1_500, line15_total: 1_500 },
            f1040: { line31_additional_payments: 1_500 },
          },
        },
      ),
    Error,
    "shareholder does not match",
  );
  assertThrows(
    () =>
      form2439.build(
        { f2439s: [item] },
        {
          filer,
          pending: {
            schedule3: { line13a_total: 1_499, line15_total: 1_500 },
            f1040: { line31_additional_payments: 1_500 },
          },
        },
      ),
    Error,
    "reconcile to Schedule 3 line 13a",
  );
});

Deno.test("Form 2439 direct export also rejects unsupported box 1c", () => {
  assertThrows(
    () => form2439.build({ f2439s: [{ box1a: 2_000, box1c: 500 }] }),
    Error,
    "box 1c section 1202 gain cannot be filed",
  );
});

Deno.test("Form 2439 spouse credit uses the spouse SSN and rejects an unverified payer copy", () => {
  const jointFiler: FilerIdentity = {
    ...filer,
    fullName: "Alex and Sam Taxpayer",
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "987654321",
      firstName: "Sam",
      lastName: "Taxpayer",
      nameControl: "TAXP",
    },
  };
  const [primaryXml] = form2439.build(
    { f2439s: [item] },
    {
      filer: jointFiler,
      pending: {
        schedule3: { line13a_total: 1_500, line15_total: 1_500 },
        f1040: { line31_additional_payments: 1_500 },
      },
    },
  );
  assertStringIncludes(
    primaryXml,
    "<ShareholderPersonNm>Alex Taxpayer</ShareholderPersonNm>",
  );
  const [xml] = form2439.build(
    {
      f2439s: [{
        ...item,
        shareholder: TS.S,
        shareholder_name: "Sam Taxpayer",
        shareholder_ssn_last4: "4321",
      }],
    },
    {
      filer: jointFiler,
      pending: {
        schedule3: { line13a_total: 1_500, line15_total: 1_500 },
        f1040: { line31_additional_payments: 1_500 },
      },
    },
  );
  assertStringIncludes(xml, "<ShareholderSSN>987654321</ShareholderSSN>");
  assertThrows(
    () =>
      form2439.build(
        { f2439s: [{ ...item, payer_ein: undefined }] },
        {
          filer,
          pending: {
            schedule3: { line13a_total: 1_500, line15_total: 1_500 },
            f1040: { line31_additional_payments: 1_500 },
          },
        },
      ),
    Error,
    "payer-issued Copy B",
  );
});

Deno.test({
  name: "XSD: Form 2439 box 2 links Schedule 3 line 13a and Form 1040 line 31",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single", line31_additional_payments: 1_500 },
    schedule3: { line13a_total: 1_500, line15_total: 1_500 },
    schedule_d: { line_11_form2439: 10_000 },
    f2439: { f2439s: [item] },
  }, filer);
  assertStringIncludes(xml, "<IRS2439 documentId=");
  assertStringIncludes(xml, "<TaxPaidByRICOrREITAmt referenceDocumentId=");
  assertStringIncludes(xml, 'referenceDocumentName="IRS2439"');
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
