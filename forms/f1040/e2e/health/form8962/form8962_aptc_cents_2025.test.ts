import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../2025/registry.ts";
import { buildMefXml } from "../../../2025/mef/builder.ts";
import { form8962 as form8962Mef } from "../../../2025/mef/forms/health/f8962/f8962.ts";
import { buildPdfBytes } from "../../../2025/pdf/builder.ts";
import { form8962Pdf } from "../../../2025/pdf/forms/health/f8962.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";

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
  employee_ssn: "111-22-3333",
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
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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

function file(
  policies: Record<string, unknown> | Record<string, unknown>[],
  wageSource: Record<string, unknown> = w2,
) {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [wageSource],
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

Deno.test("two successive Marketplace policies round each combined monthly line", async () => {
  const firstSix = (amount: number) => [
    ...Array(6).fill(amount),
    ...Array(6).fill(0),
  ];
  const lastSix = (amount: number) => [
    ...Array(6).fill(0),
    ...Array(6).fill(amount),
  ];
  const result = file([{
    issuer_name: "Texas Marketplace",
    policy_number: "POLICY-JAN-JUN-CENTS",
    coverage_state: "TX",
    covered_individual_ssns: ["111223333"],
    monthly_premiums: firstSix(800.51),
    monthly_slcsps: firstSix(700.49),
    monthly_aptcs: firstSix(300.51),
    annual_premium: 4_803.06,
    annual_slcsp: 4_202.94,
    annual_aptc: 1_803.06,
  }, {
    issuer_name: "Texas Marketplace",
    policy_number: "POLICY-JUL-DEC-CENTS",
    coverage_state: "TX",
    covered_individual_ssns: ["111223333"],
    monthly_premiums: lastSix(800.49),
    monthly_slcsps: lastSix(800.49),
    monthly_aptcs: lastSix(300.51),
    annual_premium: 4_802.94,
    annual_slcsp: 4_802.94,
    annual_aptc: 1_803.06,
  }], {
    ...w2,
    box1_wages: 75_300,
    box2_fed_withheld: 10_000,
    box3_ss_wages: 75_300,
    box4_ss_withheld: 4_668.60,
    box5_medicare_wages: 75_300,
    box6_medicare_withheld: 1_091.85,
  });
  assertEquals(result.diagnostics, []);
  const rows = result.pending.form8962?.monthly_ptc_rows as Array<{
    premium: number;
    slcsp: number;
    aptc: number;
  }>;
  assertEquals([rows[0].premium, rows[0].slcsp, rows[0].aptc], [801, 700, 301]);
  assertEquals([rows[6].premium, rows[6].slcsp, rows[6].aptc], [800, 800, 301]);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 2_604);
  assertEquals(result.pending.form8962?.total_advance_ptc, 3_612);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 1_008);
  assertEquals(result.pending.f1040?.line17_additional_taxes, 1_008);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
});

Deno.test("overlapping family policies combine cents across monthly, annual, and state routes", async () => {
  const sources = {
    general: {
      ...general,
      dependents: [{
        first_name: "Casey",
        last_name: "Example",
        name_control: "EXAM",
        ssn: "987654321",
        dob: "2010-06-15",
        relationship: "daughter",
        irs_relationship_code: "DAUGHTER",
        months_in_home: 12,
        months_lived_with_you_in_us: 12,
        lived_in_us_over_half_year: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        ptc_tax_return: {
          filing: "required",
          filed_form1040: {
            source_document_id: "casey-2025-1040",
            taxpayer_ssn: "987654321",
            tax_year: 2025,
            filing_status: "single",
            blind: false,
            line1z_wages: 0,
            line2a_tax_exempt_interest: 500,
            line2b_taxable_interest: 12_800,
            line3b_dividends: 0,
            line4b_ira: 0,
            line5b_pensions: 0,
            line6b_social_security: 0,
            line7a_capital_gain: 0,
            line8_additional_income: 0,
            line10_adjustments: 0,
            line11b_agi: 12_800,
          },
          interest_forms1099: [{
            source_document_id: "casey-2025-1099-int",
            recipient_ssn: "987654321",
            box1_taxable_interest: 12_800,
            box8_tax_exempt_interest: 500,
          }],
        },
      }],
    },
    w2: [{
      ...w2,
      box1_wages: 75_300,
      box2_fed_withheld: 10_000,
      box3_ss_wages: 75_300,
      box4_ss_withheld: 4_668.60,
      box5_medicare_wages: 75_300,
      box6_medicare_withheld: 1_091.85,
    }],
    f1095a: [{
      issuer_name: "Texas Marketplace",
      policy_number: "TAXPAYER-OVERLAP-CENTS",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(500.26),
      monthly_slcsps: Array(12).fill(1_000.49),
      monthly_aptcs: Array(12).fill(100.26),
      annual_premium: 6_003.12,
      annual_slcsp: 12_005.88,
      annual_aptc: 1_203.12,
    }, {
      issuer_name: "Texas Marketplace",
      policy_number: "DEPENDENT-OVERLAP-CENTS",
      coverage_state: "TX",
      covered_individual_ssns: ["987654321"],
      monthly_premiums: [...Array(11).fill(300.26), 300.49],
      monthly_slcsps: Array(12).fill(1_000.49),
      monthly_aptcs: Array(12).fill(200.26),
      annual_premium: 3_603.35,
      annual_slcsp: 12_005.88,
      annual_aptc: 2_403.12,
    }],
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    sources,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const rows = result.pending.form8962?.monthly_ptc_rows as Array<{
    premium: number;
    slcsp: number;
    aptc: number;
  }>;
  assertEquals([rows[0].premium, rows[0].slcsp, rows[0].aptc], [
    801,
    1_000,
    301,
  ]);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 4_464);
  assertEquals(result.pending.form8962?.total_advance_ptc, 3_612);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 852);
  assertEquals(result.pending.f1040?.line31_additional_payments, 852);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);

  const annualResult = execute(buildExecutionPlan(registry), registry, {
    ...sources,
    f1095a: [sources.f1095a[0], {
      ...sources.f1095a[1],
      monthly_premiums: Array(12).fill(300.26),
      annual_premium: 3_603.12,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(annualResult.diagnostics, []);
  assertEquals(annualResult.pending.form8962?.monthly_ptc_rows, undefined);
  assertEquals(annualResult.pending.form8962?.annual_premium, 9_606);
  assertEquals(annualResult.pending.form8962?.annual_slcsp, 12_006);
  assertEquals(annualResult.pending.form8962?.annual_aptc, 3_606);
  assertEquals(annualResult.pending.form8962?.annual_ptc_allowed, 4_475);
  assertEquals(annualResult.pending.schedule3?.line9_premium_tax_credit, 869);
  assertEquals(annualResult.pending.f1040?.line31_additional_payments, 869);
  const annualFiler = extractFilerIdentity(annualResult.pending.f1040);
  const annualXml = buildMefXml(annualResult.pending, annualFiler);
  await validateXml(annualXml);
  const annualPdf = await buildPdfBytes(annualResult.pending, annualFiler);
  assertEquals((await PDFDocument.load(annualPdf)).getPageCount() >= 3, true);

  const twoStateResult = execute(buildExecutionPlan(registry), registry, {
    ...sources,
    f1095a: [{
      ...sources.f1095a[0],
      monthly_slcsps: Array(12).fill(600.26),
      annual_slcsp: 7_203.12,
    }, {
      ...sources.f1095a[1],
      coverage_state: "OK",
      monthly_slcsps: Array(12).fill(400.26),
      annual_slcsp: 4_803.12,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(twoStateResult.diagnostics, []);
  const twoStateRows = twoStateResult.pending.form8962
    ?.monthly_ptc_rows as Array<{ slcsp: number }>;
  assertEquals(twoStateRows[0].slcsp, 1_001);
  assertEquals(
    twoStateResult.pending.form8962?.total_premium_tax_credit,
    4_476,
  );
  assertEquals(twoStateResult.pending.form8962?.total_advance_ptc, 3_612);
  assertEquals(twoStateResult.pending.schedule3?.line9_premium_tax_credit, 864);
  assertEquals(twoStateResult.pending.f1040?.line31_additional_payments, 864);
  const twoStateFiler = extractFilerIdentity(twoStateResult.pending.f1040);
  const twoStateXml = buildMefXml(twoStateResult.pending, twoStateFiler);
  await validateXml(twoStateXml);
  const twoStatePdf = await buildPdfBytes(
    twoStateResult.pending,
    twoStateFiler,
  );
  assertEquals((await PDFDocument.load(twoStatePdf)).getPageCount() >= 3, true);
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
