import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { form8962Pdf } from "../2025/pdf/forms/f8962.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  taxpayer_can_be_claimed_as_dependent: false,
};
const premiums = Array(12).fill(800);
const slcsps = [...Array(6).fill(700), ...Array(6).fill(800)];
const policy = {
  issuer_name: "Texas Marketplace",
  policy_number: "POLICY-NO-APTC",
  coverage_state: "TX",
  covered_individual_ssns: ["111223333"],
  monthly_premiums: premiums,
  monthly_slcsps: Array(12).fill(0),
  monthly_aptcs: Array(12).fill(0),
  slcsp_corrections: slcsps.map((slcsp, index) => ({
    month: index + 1,
    basis: "no_aptc",
    corrected_slcsp: slcsp,
    determination_source: "marketplace_tool",
  })),
  no_aptc_monthly_evidence: slcsps.map((slcsp, index) => ({
    month: index + 1,
    marketplace_slcsp: slcsp,
    marketplace_method: "marketplace_tool",
    marketplace_reference: `Marketplace determination ${index + 1}`,
    marketplace_determined_on: "2026-02-01",
    marketplace_record_sha256: "a".repeat(64),
    premium_paid: 800,
    premium_paid_in_full_on: "2026-04-01",
    premium_payment_reference: `Premium payment ${index + 1}`,
    premium_payment_record_sha256: "b".repeat(64),
  })),
};

Deno.test("200% FPL no-APTC 1095-A reaches full return, MeF, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [{
      box1_wages: 30_120,
      box2_fed_withheld: 3_000,
      box3_ss_wages: 30_120,
      box4_ss_withheld: 1_867.44,
      box5_medicare_wages: 30_120,
      box6_medicare_withheld: 436.74,
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "2 Payroll Road",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78702",
      box12_entries: [],
    }],
    f1095a: [policy],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.federal_poverty_pct, 200);
  assertEquals(result.pending.form8962?.applicable_figure, 0.02);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 8_400);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 8_400);
  assertEquals(result.pending.f1040?.line31_additional_payments, 8_400);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertEquals(xml.match(/<MonthlyPTCCalculationGrp>/g)?.length, 12);
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>8400</TotalPremiumTaxCreditAmt>",
  );
  const fields =
    form8962Pdf.projectFields?.(result.pending.form8962!, result.pending) ?? {};
  assertEquals(fields.pdf_month_1_allowed_credit, "650");
  assertEquals(fields.pdf_month_7_allowed_credit, "750");
  assertEquals(fields.total_premium_tax_credit, 8_400);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
  const schema = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
});
