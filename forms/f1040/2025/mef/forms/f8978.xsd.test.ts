import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefBundle, buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import {
  calculateFiling,
  type Form8978Input,
  Form8978Source,
} from "../../../nodes/inputs/f8978/index.ts";

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
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const input: Form8978Input = {
  filings: [{
    source: Form8978Source.BbaAudit,
    columns: [{
      tax_year_end: "2022-12-31",
      original_income: 20_000,
      income_adjustments: [{
        description: "Schedule K-1 ordinary income",
        amount: 2_000,
        tracking_number: "20240101-000001",
      }],
      original_deductions: 5_000,
      deduction_adjustments: [],
      corrected_income_tax: 1_500,
      corrected_amt: 0,
      original_credits: 0,
      credit_adjustments: [],
      original_tax_liability: 1_000,
      tax_calculation_explanation:
        "2022 corrected taxable income and tax recomputation.",
    }],
  }],
};

Deno.test("Form 8978 XML-only export rejects a missing tax-computation PDF", () => {
  assertThrows(
    () =>
      buildMefXml({
        f1040: {
          filing_status: "single",
          line16_income_tax: 500,
          form8978_tax: 500,
        },
        f8978: {
          ...input,
          calculated_filings: input.filings.map(calculateFiling),
          line14: 500,
        },
      }, filer),
    Error,
    "tax-computation statement PDF",
  );
});

Deno.test("Form 8978 MeF export rejects calculated values that disagree with source facts", () => {
  assertThrows(
    () =>
      buildMefXml({
        f8978: {
          ...input,
          calculated_filings: [{
            ...calculateFiling(input.filings[0]),
            line14: 900,
          }],
          line14: 900,
        },
      }, filer),
    Error,
    "disagree with affected-year source facts",
  );
});

Deno.test({
  name: "XSD: Form 8978 and Schedule A link to Form 1040 line 16",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const bundle = await buildMefBundle({
    f1040: {
      filing_status: "single",
      line16_income_tax: 500,
      form8978_tax: 500,
    },
    f8978: {
      ...input,
      calculated_filings: input.filings.map(calculateFiling),
      line14: 500,
    },
  }, { filer, attachments: [] });
  const { xml } = bundle;
  assertEquals(bundle.attachments.length, 1);
  assertEquals(bundle.attachments[0].fileName, "Form8978TaxCalculation1.pdf");
  assertStringIncludes(xml, "<OtherTaxAmtCd>FORM 8978</OtherTaxAmtCd>");
  assertStringIncludes(xml, "<OtherTaxAmt>500</OtherTaxAmt>");
  assertStringIncludes(xml, "<IRS8978 documentId=");
  assertStringIncludes(xml, "<IRS8978ScheduleA documentId=");
  assertStringIncludes(
    xml,
    'referenceDocumentName="BinaryAttachment IRS8978ScheduleA"',
  );
  assertStringIncludes(
    xml,
    "<AttachmentLocationTxt>Form8978TaxCalculation1.pdf</AttachmentLocationTxt>",
  );
  assertStringIncludes(xml, "<TrackingNum>20240101-000001</TrackingNum>");
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
