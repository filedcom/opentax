import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { form8962 as form8962Mef } from "../2025/mef/forms/f8962.ts";
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
const w2 = {
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
};

async function validateXml(xml: string) {
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
}

function file(policies: Record<string, unknown> | Record<string, unknown>[]) {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2],
    f1095a: Array.isArray(policies) ? policies : [policies],
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("one-policy APTC cents use rounded monthly Form 8962 entries", async () => {
  const policy = {
    issuer_name: "Texas Marketplace",
    policy_number: "POLICY-APTC-CENTS",
    coverage_state: "TX",
    covered_individual_ssns: ["111223333"],
    monthly_premiums: Array(12).fill(800.51),
    monthly_slcsps: [...Array(6).fill(700.49), ...Array(6).fill(800.49)],
    monthly_aptcs: Array(12).fill(300.51),
    annual_premium: 9_606.12,
    annual_slcsp: 9_005.88,
    annual_aptc: 3_606.12,
  };
  const result = file(policy);
  assertEquals(result.diagnostics, []);
  const source = result.pending.f1095a?.f1095as as Array<{
    monthly_premiums: number[];
  }>;
  assertEquals(source[0].monthly_premiums[0], 800.51);
  const rows = result.pending.form8962?.monthly_ptc_rows as Array<{
    premium: number;
    slcsp: number;
    aptc: number;
  }>;
  assertEquals(rows[0].premium, 801);
  assertEquals(rows[0].slcsp, 700);
  assertEquals(rows[0].aptc, 301);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 8_400);
  assertEquals(result.pending.form8962?.total_advance_ptc, 3_612);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 4_788);
  assertEquals(result.pending.f1040?.line31_additional_payments, 4_788);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>801</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCAmt>301</MonthlyAdvancedPTCAmt>",
  );
  await validateXml(xml);
  const fields = form8962Pdf.projectFields?.(
    result.pending.form8962!,
    result.pending,
  ) ?? {};
  assertEquals(fields.pdf_month_1_premium, "801");
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
  assertThrows(
    () =>
      form8962Mef.build(result.pending.form8962!, {
        filer,
        pending: {
          ...result.pending,
          f1095a: {
            f1095as: [{
              ...policy,
              monthly_premiums: [800.49, ...Array(11).fill(800.51)],
              annual_premium: 9_606.10,
            }],
          },
        },
      }),
    Error,
    "month 1 differs from its Form 1095-A policy",
  );
});

Deno.test("one-policy APTC cents round line 33 totals once for annual line 11", async () => {
  const policy = {
    issuer_name: "Texas Marketplace",
    policy_number: "POLICY-APTC-ANNUAL-CENTS",
    coverage_state: "TX",
    covered_individual_ssns: ["111223333"],
    monthly_premiums: Array(12).fill(800.49),
    monthly_slcsps: Array(12).fill(700.49),
    monthly_aptcs: Array(12).fill(300.49),
    annual_premium: 9_605.88,
    annual_slcsp: 8_405.88,
    annual_aptc: 3_605.88,
  };
  const result = file(policy);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.monthly_ptc_rows, undefined);
  assertEquals(result.pending.form8962?.annual_premium, 9_606);
  assertEquals(result.pending.form8962?.annual_slcsp, 8_406);
  assertEquals(result.pending.form8962?.annual_aptc, 3_606);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 7_804);
  assertEquals(result.pending.form8962?.total_advance_ptc, 3_606);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 4_198);
  assertEquals(result.pending.f1040?.line31_additional_payments, 4_198);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<AnnualPremiumAmt>9606</AnnualPremiumAmt>");
  assertStringIncludes(
    xml,
    "<AnnualAdvancedPTCAmt>3606</AnnualAdvancedPTCAmt>",
  );
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
});

Deno.test("corrected 1095-A cents supersede original monthly policy amounts", async () => {
  const original = {
    issuer_name: "Texas Marketplace",
    policy_number: "POLICY-CORRECTED-CENTS",
    coverage_state: "TX",
    covered_individual_ssns: ["111223333"],
    monthly_premiums: Array(12).fill(600),
    monthly_slcsps: Array(12).fill(650),
    monthly_aptcs: Array(12).fill(500),
    annual_premium: 7_200,
    annual_slcsp: 7_800,
    annual_aptc: 6_000,
  };
  const corrected = {
    ...original,
    corrected_box_checked: true,
    monthly_premiums: Array(12).fill(800.51),
    monthly_slcsps: [...Array(6).fill(700.49), ...Array(6).fill(800.49)],
    monthly_aptcs: Array(12).fill(300.51),
    annual_premium: 9_606.12,
    annual_slcsp: 9_005.88,
    annual_aptc: 3_606.12,
  };
  const result = file([original, corrected]);
  assertEquals(result.diagnostics, []);
  const source = result.pending.f1095a?.f1095as as Array<{
    monthly_premiums: number[];
  }>;
  assertEquals(source.length, 2);
  assertEquals(source[0].monthly_premiums[0], 600);
  assertEquals(source[1].monthly_premiums[0], 800.51);
  const rows = result.pending.form8962?.monthly_ptc_rows as Array<{
    premium: number;
    slcsp: number;
    aptc: number;
  }>;
  assertEquals(rows[0].premium, 801);
  assertEquals(rows[0].slcsp, 700);
  assertEquals(rows[0].aptc, 301);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 8_400);
  assertEquals(result.pending.form8962?.total_advance_ptc, 3_612);
  assertEquals(result.pending.f1040?.line31_additional_payments, 4_788);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
});

Deno.test("corrected 1095-A annual cents use corrected line 33 totals", async () => {
  const original = {
    issuer_name: "Texas Marketplace",
    policy_number: "POLICY-CORRECTED-ANNUAL-CENTS",
    coverage_state: "TX",
    covered_individual_ssns: ["111223333"],
    monthly_premiums: Array(12).fill(600),
    monthly_slcsps: Array(12).fill(650),
    monthly_aptcs: Array(12).fill(500),
    annual_premium: 7_200,
    annual_slcsp: 7_800,
    annual_aptc: 6_000,
  };
  const corrected = {
    ...original,
    corrected_box_checked: true,
    monthly_premiums: Array(12).fill(800.49),
    monthly_slcsps: Array(12).fill(700.49),
    monthly_aptcs: Array(12).fill(300.49),
    annual_premium: 9_605.88,
    annual_slcsp: 8_405.88,
    annual_aptc: 3_605.88,
  };
  const result = file([original, corrected]);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.monthly_ptc_rows, undefined);
  assertEquals(result.pending.form8962?.annual_premium, 9_606);
  assertEquals(result.pending.form8962?.annual_slcsp, 8_406);
  assertEquals(result.pending.form8962?.annual_aptc, 3_606);
  assertEquals(result.pending.f1040?.line31_additional_payments, 4_198);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<AnnualAdvancedPTCAmt>3606</AnnualAdvancedPTCAmt>",
  );
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
});

Deno.test("rounded monthly APTC repayment reaches Schedule 2 and Form 1040", async () => {
  const policy = {
    issuer_name: "Texas Marketplace",
    policy_number: "POLICY-APTC-REPAY-CENTS",
    coverage_state: "TX",
    covered_individual_ssns: ["111223333"],
    monthly_premiums: Array(12).fill(800.51),
    monthly_slcsps: [...Array(6).fill(700.49), ...Array(6).fill(800.49)],
    monthly_aptcs: Array(12).fill(750.51),
    annual_premium: 9_606.12,
    annual_slcsp: 9_005.88,
    annual_aptc: 9_006.12,
  };
  const result = file(policy);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 8_400);
  assertEquals(result.pending.form8962?.total_advance_ptc, 9_012);
  assertEquals(result.pending.form8962?.excess_advance_premium, 612);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 612);
  assertEquals(result.pending.f1040?.line17_additional_taxes, 612);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCAmt>751</MonthlyAdvancedPTCAmt>",
  );
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
});

Deno.test("below-100% APTC-only repayment rounds each monthly advance", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      ...general,
      ptc_below_100_fpl_status: {
        basis: "not_applicable",
        exception_routes_reviewed: true,
        no_one_can_claim_taxpayer: true,
        all_covered_individuals_lawfully_present: true,
        no_shared_policy: true,
        no_self_employed_health_insurance_deduction: true,
        no_alternative_marriage_calculation: true,
      },
    },
    w2: [{
      ...w2,
      box1_wages: 10_000,
      box2_fed_withheld: 0,
      box3_ss_wages: 10_000,
      box4_ss_withheld: 620,
      box5_medicare_wages: 10_000,
      box6_medicare_withheld: 145,
    }],
    f1095a: [{
      issuer_name: "Texas Marketplace",
      policy_number: "POLICY-BELOW100-APTC-CENTS",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(250.49),
      monthly_slcsps: [...Array(11).fill(350.49), 400.49],
      monthly_aptcs: Array(12).fill(200.51),
      annual_premium: 3_005.88,
      annual_slcsp: 4_255.88,
      annual_aptc: 2_406.12,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_advance_ptc, 2_412);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 375);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCAmt>201</MonthlyAdvancedPTCAmt>",
  );
  await validateXml(xml);
});

Deno.test("MFS APTC-only annual repayment rounds line 33 totals", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      ...general,
      filing_status: "mfs",
      spouse_first_name: "Other",
      spouse_last_name: "Taxpayer",
      spouse_ssn: "222-33-4444",
      mfs_spouse_itemizing: false,
      ptc_mfs_status: {
        basis: "no_exception",
        exception_reviewed: true,
        no_one_can_claim_taxpayer: true,
        policy_scope: "family_only",
        all_covered_individuals_lawfully_present: true,
        no_self_employed_health_insurance_deduction: true,
      },
    },
    w2: [{
      ...w2,
      box1_wages: 30_000,
      box3_ss_wages: 30_000,
      box4_ss_withheld: 1_860,
      box5_medicare_wages: 30_000,
      box6_medicare_withheld: 435,
    }],
    f1095a: [{
      issuer_name: "Texas Marketplace",
      policy_number: "POLICY-MFS-APTC-CENTS",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(250.49),
      monthly_slcsps: Array(12).fill(350.49),
      monthly_aptcs: Array(12).fill(200.49),
      annual_premium: 3_005.88,
      annual_slcsp: 4_205.88,
      annual_aptc: 2_405.88,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.annual_aptc, 2_406);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 750);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<AnnualAdvancedPTCAmt>2406</AnnualAdvancedPTCAmt>",
  );
  await validateXml(xml);
});
