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
const lawfulGeneral = {
  ...general,
  ptc_below_100_fpl_status: {
    basis: "lawfully_present",
    no_one_can_claim_taxpayer: true,
    marketplace_coverage: true,
    enrolled_individual_lawfully_present: true,
    medicaid_ineligible_due_to_immigration_status: true,
    otherwise_applicable_taxpayer: true,
  },
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
    premium_payment: {
      status: "paid_in_full",
      amount: 800,
      paid_on: "2026-04-01",
      reference: `Premium payment ${index + 1}`,
      record_sha256: "b".repeat(64),
    },
  })),
};

function w2(wages: number, withheld: number) {
  return {
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: wages,
    box4_ss_withheld: Math.round(wages * 0.062 * 100) / 100,
    box5_medicare_wages: wages,
    box6_medicare_withheld: Math.round(wages * 0.0145 * 100) / 100,
    employer_ein: "12-3456789",
    employer_name: "Example Employer",
    employer_address_line1: "2 Payroll Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78702",
    box12_entries: [],
  };
}

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

Deno.test("200% FPL no-APTC 1095-A reaches full return, MeF, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2(30_120, 3_000)],
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
  await validateXml(xml);
});

Deno.test("no-APTC 1095-A cents are rounded before Form 8962 credit and e-file", async () => {
  const centsPolicy = {
    ...policy,
    monthly_premiums: Array(12).fill(800.51),
    annual_premium: 9_606.12,
    annual_slcsp: 0,
    annual_aptc: 0,
    slcsp_corrections: policy.slcsp_corrections.map((item, index) => ({
      ...item,
      corrected_slcsp: index < 6 ? 700.49 : 800.49,
    })),
    no_aptc_monthly_evidence: policy.no_aptc_monthly_evidence.map((
      item,
      index,
    ) => ({
      ...item,
      marketplace_slcsp: index < 6 ? 700.49 : 800.49,
      premium_payment: { ...item.premium_payment, amount: 800.51 },
    })),
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2(30_120, 3_000)],
    f1095a: [centsPolicy],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const source = result.pending.f1095a?.f1095as as Array<{
    monthly_premiums: number[];
  }>;
  const rows = result.pending.form8962?.monthly_ptc_rows as Array<{
    premium: number;
    slcsp: number;
    allowed_credit: number;
  }>;
  assertEquals(source[0].monthly_premiums[0], 800.51);
  assertEquals(rows[0].premium, 801);
  assertEquals(rows[0].slcsp, 700);
  assertEquals(rows[0].allowed_credit, 650);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 8_400);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 8_400);
  assertEquals(result.pending.f1040?.line31_additional_payments, 8_400);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>801</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>700</MonthlyPremiumSLCSPAmt>",
  );
  const pdfFields =
    form8962Pdf.projectFields?.(result.pending.form8962!, result.pending) ?? {};
  assertEquals(pdfFields.pdf_month_1_premium, "801");
  assertEquals(pdfFields.pdf_month_1_slcsp, "700");
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
});

Deno.test("unchanged no-APTC policy rounds annual 1095-A totals for line 11", async () => {
  const annualCentsPolicy = {
    ...policy,
    monthly_premiums: Array(12).fill(800.49),
    annual_premium: 9_605.88,
    annual_slcsp: 0,
    annual_aptc: 0,
    slcsp_corrections: policy.slcsp_corrections.map((item) => ({
      ...item,
      corrected_slcsp: 700.49,
    })),
    no_aptc_monthly_evidence: policy.no_aptc_monthly_evidence.map((item) => ({
      ...item,
      marketplace_slcsp: 700.49,
      premium_payment: { ...item.premium_payment, amount: 800.49 },
    })),
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    general: lawfulGeneral,
    w2: [w2(10_000, 0)],
    f1095a: [annualCentsPolicy],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.monthly_ptc_rows, undefined);
  assertEquals(result.pending.form8962?.annual_premium, 9_606);
  assertEquals(result.pending.form8962?.annual_slcsp, 8_406);
  assertEquals(result.pending.form8962?.annual_ptc_allowed, 8_406);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 8_406);
  assertEquals(result.pending.f1040?.line31_additional_payments, 8_406);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<AnnualPremiumAmt>9606</AnnualPremiumAmt>");
  assertStringIncludes(
    xml,
    "<AnnualPremiumSLCSPAmt>8406</AnnualPremiumSLCSPAmt>",
  );
  await validateXml(xml);
  const pdfFields =
    form8962Pdf.projectFields?.(result.pending.form8962!, result.pending) ?? {};
  assertEquals(pdfFields.pdf_annual_premium, "9606");
  assertEquals(pdfFields.pdf_annual_slcsp, "8406");
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
});

function twoNoAptcPolicies(benchmarks: number[]) {
  return [500.26, 300.26].map((premium, policyIndex) => ({
    issuer_name: "Texas Marketplace",
    policy_number: `NO-APTC-CENTS-${policyIndex + 1}`,
    coverage_state: "TX",
    covered_individual_ssns: ["111223333"],
    monthly_premiums: Array(12).fill(premium),
    monthly_slcsps: Array(12).fill(0),
    monthly_aptcs: Array(12).fill(0),
    annual_premium: Math.round(premium * 1_200) / 100,
    annual_slcsp: 0,
    annual_aptc: 0,
    slcsp_corrections: benchmarks.map((slcsp, index) => ({
      month: index + 1,
      basis: "no_aptc",
      corrected_slcsp: slcsp,
      determination_source: "marketplace_tool",
    })),
    no_aptc_monthly_evidence: benchmarks.map((slcsp, index) => ({
      month: index + 1,
      marketplace_slcsp: slcsp,
      marketplace_method: "marketplace_tool",
      marketplace_reference: `Policy ${policyIndex + 1} determination ${
        index + 1
      }`,
      marketplace_determined_on: "2026-02-01",
      marketplace_record_sha256: "a".repeat(64),
      premium_payment: {
        status: "paid_in_full",
        amount: premium,
        paid_on: "2026-04-01",
        reference: `Policy ${policyIndex + 1} payment ${index + 1}`,
        record_sha256: "b".repeat(64),
      },
    })),
  }));
}

Deno.test("two no-APTC policy premiums combine cents before monthly filing", async () => {
  const policies = twoNoAptcPolicies([
    ...Array(6).fill(700.49),
    ...Array(6).fill(800.49),
  ]);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2(30_120, 3_000)],
    f1095a: policies,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const sourcePolicies = result.pending.f1095a?.f1095as as Array<{
    monthly_premiums: number[];
  }>;
  assertEquals(sourcePolicies[0].monthly_premiums[0], 500.26);
  assertEquals(sourcePolicies[1].monthly_premiums[0], 300.26);
  const rows = result.pending.form8962?.monthly_ptc_rows as Array<{
    premium: number;
    slcsp: number;
  }>;
  assertEquals(rows?.[0].premium, 801);
  assertEquals(rows?.[0].slcsp, 700);
  assertEquals(rows?.[6].slcsp, 800);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 8_400);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 8_400);
  assertEquals(result.pending.f1040?.line31_additional_payments, 8_400);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>801</MonthlyPremiumAmt>");
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
  const changedSLCSP = structuredClone(result.pending);
  const changedPolicies = changedSLCSP.f1095a?.f1095as as Array<{
    slcsp_corrections: Array<{ corrected_slcsp: number }>;
  }>;
  changedPolicies[1].slcsp_corrections[0].corrected_slcsp = 701.49;
  assertThrows(
    () => buildMefXml(changedSLCSP, filer),
    Error,
    "one same-state SLCSP",
  );
});

Deno.test("two no-APTC policies round combined annual premiums once", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2(30_120, 3_000)],
    f1095a: twoNoAptcPolicies(Array(12).fill(700.49)),
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.monthly_ptc_rows, undefined);
  assertEquals(result.pending.form8962?.annual_premium, 9_606);
  assertEquals(result.pending.form8962?.annual_slcsp, 8_406);
  assertEquals(result.pending.form8962?.annual_ptc_allowed, 7_804);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 7_804);
  assertEquals(result.pending.f1040?.line31_additional_payments, 7_804);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<AnnualPremiumAmt>9606</AnnualPremiumAmt>");
  assertStringIncludes(
    xml,
    "<AnnualPremiumSLCSPAmt>8406</AnnualPremiumSLCSPAmt>",
  );
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
  const changedPremium = structuredClone(result.pending);
  const changedPolicies = changedPremium.f1095a?.f1095as as Array<{
    annual_premium: number;
  }>;
  changedPolicies[1].annual_premium += 0.01;
  assertThrows(() => buildMefXml(changedPremium, filer));
});

Deno.test("protected partial premium reduces one no-APTC month and full-return credit", async () => {
  const protectedPayment = {
    status: "protected_partial" as const,
    amount: 500.51,
    paid_on: "2026-04-01",
    reference: "January premium payment ledger",
    record_sha256: "c".repeat(64),
    protection_basis: "premium_payment_threshold" as const,
    minimum_payment_to_avoid_termination: 450.25,
    issuer_coverage_provided: true as const,
    issuer_confirmation_reference:
      "Issuer January threshold and coverage confirmation",
    issuer_confirmation_sha256: "d".repeat(64),
  };
  const partialPolicy = {
    ...policy,
    no_aptc_monthly_evidence: policy.no_aptc_monthly_evidence.map((
      item,
      index,
    ) => index === 0 ? { ...item, premium_payment: protectedPayment } : item),
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2(30_120, 3_000)],
    f1095a: [partialPolicy],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const sourcePolicies = result.pending.f1095a?.f1095as as Array<{
    monthly_premiums: number[];
  }>;
  const creditRows = result.pending.form8962?.monthly_ptc_rows as Array<{
    premium: number;
    allowed_credit: number;
  }>;
  assertEquals(sourcePolicies[0].monthly_premiums[0], 800);
  assertEquals(creditRows[0].premium, 501);
  assertEquals(creditRows[0].allowed_credit, 501);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 8_251);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 8_251);
  assertEquals(result.pending.f1040?.line31_additional_payments, 8_251);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>501</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>8251</TotalPremiumTaxCreditAmt>",
  );
  await validateXml(xml);
  const fields =
    form8962Pdf.projectFields?.(result.pending.form8962!, result.pending) ?? {};
  assertEquals(fields.pdf_month_1_premium, "501");
  assertEquals(fields.pdf_month_1_allowed_credit, "501");
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
              ...partialPolicy,
              no_aptc_monthly_evidence: [{
                ...partialPolicy.no_aptc_monthly_evidence[0],
                premium_payment: {
                  ...protectedPayment,
                  minimum_payment_to_avoid_termination: 600,
                },
              }, ...partialPolicy.no_aptc_monthly_evidence.slice(1)],
            }],
          },
        },
      }),
    Error,
    "month 1 lacks matching Marketplace SLCSP",
  );
});

Deno.test("state emergency order protects a partially paid no-APTC month", async () => {
  const emergencyPayment = {
    status: "emergency_order_partial" as const,
    amount: 400,
    paid_on: "2026-04-01",
    reference: "January premium payment ledger",
    record_sha256: "e".repeat(64),
    order_state: "TX",
    emergency_state: "TX",
    emergency_declaration_reference: "Texas emergency declaration",
    emergency_declaration_sha256: "b".repeat(64),
    emergency_declared_on: "2024-12-20",
    emergency_expires_on: "2025-02-01",
    order_identifier: "TX-2025-01",
    order_issuing_authority: "state_insurance_department" as const,
    order_issued_on: "2025-01-10",
    order_effective_start: "2025-01-10",
    order_effective_end: "2025-01-31",
    order_prohibits_termination: true as const,
    order_protected_month: 1,
    order_reference: "Texas insurance order",
    order_record_sha256: "f".repeat(64),
    issuer_coverage_provided: true as const,
    issuer_confirmation_reference: "Issuer January coverage record",
    issuer_confirmation_sha256: "a".repeat(64),
  };
  const emergencyPolicy = {
    ...policy,
    no_aptc_monthly_evidence: policy.no_aptc_monthly_evidence.map((
      item,
      index,
    ) => index === 0 ? { ...item, premium_payment: emergencyPayment } : item),
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2(30_120, 3_000)],
    f1095a: [emergencyPolicy],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const creditRows = result.pending.form8962?.monthly_ptc_rows as Array<{
    premium: number;
    allowed_credit: number;
  }>;
  assertEquals(creditRows[0].premium, 400);
  assertEquals(creditRows[0].allowed_credit, 400);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 8_150);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 8_150);
  assertEquals(result.pending.f1040?.line31_additional_payments, 8_150);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>400</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>8150</TotalPremiumTaxCreditAmt>",
  );
  await validateXml(xml);
  const fields =
    form8962Pdf.projectFields?.(result.pending.form8962!, result.pending) ?? {};
  assertEquals(fields.pdf_month_1_premium, "400");
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
  for (
    const changedPayment of [
      { ...emergencyPayment, order_state: "CA" },
      { ...emergencyPayment, emergency_state: "CA" },
      { ...emergencyPayment, order_protected_month: 2 },
      { ...emergencyPayment, order_issued_on: "2025-02-02" },
      {
        ...emergencyPayment,
        order_effective_start: "2025-01-30",
        order_effective_end: "2025-01-20",
      },
      {
        ...emergencyPayment,
        order_effective_start: "2025-02-01",
        order_effective_end: "2025-02-28",
      },
    ]
  ) {
    assertThrows(
      () =>
        form8962Mef.build(result.pending.form8962!, {
          filer,
          pending: {
            ...result.pending,
            f1095a: {
              f1095as: [{
                ...emergencyPolicy,
                no_aptc_monthly_evidence: [{
                  ...emergencyPolicy.no_aptc_monthly_evidence[0],
                  premium_payment: changedPayment,
                }, ...emergencyPolicy.no_aptc_monthly_evidence.slice(1)],
              }],
            },
          },
        }),
      Error,
      "month 1 lacks matching Marketplace SLCSP",
    );
  }
});

Deno.test("lawfully present filer below 100% FPL claims no-APTC monthly credit", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: lawfulGeneral,
    w2: [w2(10_000, 0)],
    f1095a: [policy],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.federal_poverty_pct, 66);
  assertEquals(result.pending.form8962?.applicable_figure, 0);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 9_000);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 9_000);
  assertEquals(result.pending.f1040?.line31_additional_payments, 9_000);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertEquals(xml.match(/<MonthlyPTCCalculationGrp>/g)?.length, 12);
  assertStringIncludes(
    xml,
    "<FederalPovertyLevelPct>66</FederalPovertyLevelPct>",
  );
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>9000</TotalPremiumTaxCreditAmt>",
  );
  await validateXml(xml);
  const fields =
    form8962Pdf.projectFields?.(result.pending.form8962!, result.pending) ?? {};
  assertEquals(fields.pdf_month_1_allowed_credit, "700");
  assertEquals(fields.pdf_month_7_allowed_credit, "800");
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
  assertThrows(
    () =>
      form8962Mef.build(result.pending.form8962!, {
        filer,
        pending: {
          ...result.pending,
          general: {
            ...result.pending.general,
            ptc_below_100_fpl_status: undefined,
          },
        },
      }),
    Error,
    "below-400%-FPL filing needs a verified one-person or family-policy route",
  );
});

Deno.test("lawfully present filer below 100% FPL claims no-APTC annual credit", async () => {
  const annualPolicy = {
    ...policy,
    monthly_slcsps: Array(12).fill(0),
    slcsp_corrections: policy.slcsp_corrections.map((item) => ({
      ...item,
      corrected_slcsp: 700,
    })),
    no_aptc_monthly_evidence: policy.no_aptc_monthly_evidence.map((item) => ({
      ...item,
      marketplace_slcsp: 700,
    })),
    annual_premium: 9_600,
    annual_slcsp: 0,
    annual_aptc: 0,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    general: lawfulGeneral,
    w2: [w2(10_000, 0)],
    f1095a: [annualPolicy],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.federal_poverty_pct, 66);
  assertEquals(result.pending.form8962?.monthly_ptc_rows, undefined);
  assertEquals(result.pending.form8962?.annual_ptc_allowed, 8_400);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 8_400);
  assertEquals(result.pending.f1040?.line31_additional_payments, 8_400);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<AnnualPTCCalculationGrp>");
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>8400</TotalPremiumTaxCreditAmt>",
  );
  await validateXml(xml);
  const fields =
    form8962Pdf.projectFields?.(result.pending.form8962!, result.pending) ?? {};
  assertEquals(fields.pdf_annual_allowed_credit, "8400");
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 3, true);
  assertThrows(
    () =>
      form8962Mef.build(result.pending.form8962!, {
        filer,
        pending: {
          ...result.pending,
          general: {
            ...result.pending.general,
            ptc_below_100_fpl_status: undefined,
          },
        },
      }),
    Error,
    "below-400%-FPL filing needs a verified one-person or family-policy route",
  );
});
