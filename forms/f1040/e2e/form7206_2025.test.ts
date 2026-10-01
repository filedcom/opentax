import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { schedule_se } from "../nodes/intermediate/forms/schedule_se/index.ts";
import { TS } from "../nodes/types.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

const seDeduction = schedule_se.compute(
  { taxYear: 2025, formType: "f1040" },
  { net_profit_schedule_c: 50_000 },
).outputs.find((row) => row.nodeType === "schedule1")?.fields
  .line15_se_deduction;
if (typeof seDeduction !== "number") {
  throw new Error("Form 7206 full-return fixture needs computed Schedule SE");
}

const sources = {
  general: {
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
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
  },
  schedule_c: [{
    business_reference: "HEALTH-CONSULTING",
    proprietor_recipient: TS.T,
    line_a_principal_business: "Consulting",
    line_b_business_code: "541600",
    line_c_business_name: "Alex Consulting",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_i_made_1099_payments: false,
    qbi_no_other_adjustments_confirmed: true,
    line_1_gross_receipts: 50_000,
  }],
  form7206: {
    single_schedule_c_plan: {
      business_reference: "HEALTH-CONSULTING",
      plan_identifier: "ALEX-HEALTH-2025",
      recipient: TS.T,
      taxpayer_identity: { name: "Alex Example", ssn: "111223333" },
      premium_months: Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        paid_premium: 1_000,
        policy_source_reference: "2025 taxpayer-only policy statement",
        payment_source_reference: `2025 premium receipt ${index + 1}`,
        covered_person: "taxpayer",
        eligible_for_subsidized_employer_plan: false,
        employer_plan_review_reference: "2025 employer eligibility review",
        marketplace_policy: false,
        long_term_care_policy: false,
        public_safety_officer_excluded_amount: 0,
      })),
      schedule_c_line31_net_profit: 50_000,
      schedule1_line15_se_tax_deduction: seDeduction,
      schedule1_line16_retirement_deduction: 0,
      plan_established_under_business: true,
      sole_positive_business_verified: true,
      no_form2555: true,
      no_schedule_se_optional_method: true,
      no_other_earned_income: true,
    },
    marketplace_ptc_premium_overlap: false,
  },
};

async function validateXml(xml: string) {
  const schema = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
}

Deno.test("one Schedule C health plan reaches Form 7206 and the full return", async () => {
  const result = execute(buildExecutionPlan(registry), registry, sources, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form7206?.line1, 12_000);
  assertEquals(result.pending.form7206?.line14, 12_000);
  assertEquals(result.pending.schedule1?.line3_schedule_c, 50_000);
  assertEquals(result.pending.schedule1?.line15_se_deduction, seDeduction);
  assertEquals(result.pending.schedule1?.line17_se_health_insurance, 12_000);
  assertEquals(result.pending.f1040?.line10_adjustments, seDeduction + 12_000);
  assertEquals(
    result.pending.form8995?.line1_qbi,
    Math.round(50_000 - seDeduction - 12_000),
  );
  assertEquals(result.pending.f1040?.line13_qbi_deduction, 3_744);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<IRS7206 documentId=");
  assertStringIncludes(
    xml,
    "<SelfEmploymentTaxAmt>7065</SelfEmploymentTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<DeductibleSelfEmploymentTaxAmt>3532</DeductibleSelfEmploymentTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<SelfEmpldHealthInsDedAmt>12000</SelfEmpldHealthInsDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<QlfyBusinessIncomeOrLossAmt>34468</QlfyBusinessIncomeOrLossAmt>",
  );
  await validateXml(xml);
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 12);
  await Deno.mkdir(".state/research", { recursive: true });
  await Deno.writeTextFile(
    ".state/research/ty2025-form7206-full-return.xml",
    xml,
  );
  await Deno.writeFile(".state/research/ty2025-form7206-full-return.pdf", pdf);

  const changed = structuredClone(result.pending);
  const plan = changed.form7206?.single_schedule_c_plan as {
    premium_months: Array<{ paid_premium: number }>;
  };
  plan.premium_months[0].paid_premium = 1_001;
  assertThrows(() => buildMefXml(changed, filer), Error);
  const changedQbi = structuredClone(result.pending);
  changedQbi.form8995!.se_health_insurance_deduction = 0;
  assertThrows(() => buildMefXml(changedQbi, filer), Error);
});
