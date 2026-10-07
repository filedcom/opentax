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
import { form7206Pdf } from "../2025/pdf/forms/f7206.ts";
import { form7206 as form7206Mef } from "../2025/mef/forms/f7206.ts";
import { scheduleSePdf } from "../2025/pdf/forms/schedule_se.ts";

Deno.test("Form 7206 export rejects retained identity without computed lines", () => {
  assertEquals(form7206Mef.build({}), "");
  assertEquals(form7206Pdf.projectFields?.({}, {}), {});
  const ambient = { schedule_se_source: { line13_deduction: 0 } };
  assertEquals(form7206Mef.build(ambient), "");
  assertEquals(form7206Pdf.projectFields?.(ambient, {}), {});
  const partial = {
    recipient_name: "Alex Example",
    recipient_ssn: "111223333",
  };
  assertThrows(
    () => form7206Mef.build(partial),
    Error,
    "needs computed lines",
  );
  assertThrows(
    () => form7206Pdf.projectFields?.(partial, {}),
    Error,
    "needs computed lines",
  );
});

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
  assertEquals(result.pending.f1040?.line13_qbi_deduction, 3_743);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<IRS7206 documentId=");
  assertStringIncludes(
    xml,
    "<SelfEmploymentTaxAmt>7065</SelfEmploymentTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<DeductibleSelfEmploymentTaxAmt>3533</DeductibleSelfEmploymentTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<SelfEmpldHealthInsDedAmt>12000</SelfEmpldHealthInsDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<QlfyBusinessIncomeOrLossAmt>34467</QlfyBusinessIncomeOrLossAmt>",
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

Deno.test("one Schedule C spouse policy reaches joint Form 7206 and rejects identity changes", () => {
  const spouseSources = {
    ...sources,
    general: {
      ...sources.general,
      filing_status: "mfj",
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "222-33-4444",
      spouse_dob: "1986-05-01",
    },
    form7206: {
      ...sources.form7206,
      single_schedule_c_plan: {
        ...sources.form7206.single_schedule_c_plan,
        spouse_identity: { name: "Casey Example", ssn: "222334444" },
        premium_months: sources.form7206.single_schedule_c_plan.premium_months
          .map(
            (month) => ({
              ...month,
              policy_source_reference: "2025 spouse-only policy statement",
              covered_person: "spouse",
              employer_plan_review_reference:
                "2025 spouse employer eligibility review",
            }),
          ),
      },
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    spouseSources,
    {
      taxYear: 2025,
      formType: "f1040",
    },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form7206?.line14, 12_000);
  assertEquals(result.pending.schedule1?.line17_se_health_insurance, 12_000);
  assertEquals(result.pending.f1040?.line10_adjustments, seDeduction + 12_000);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<IRS7206 documentId=");
  assertStringIncludes(
    xml,
    "<SelfEmpldHealthInsDedAmt>12000</SelfEmpldHealthInsDedAmt>",
  );
  const projected = form7206Pdf.projectFields!(
    result.pending.form7206!,
    result.pending,
  );
  assertEquals(projected.line14, 12_000);
  assertEquals(projected.recipient_name, "Alex Example");

  const changedGeneral = structuredClone(result.pending);
  changedGeneral.general!.spouse_ssn = "999-88-7777";
  assertThrows(() => buildMefXml(changedGeneral, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedGeneral.form7206!, changedGeneral),
    Error,
  );
  const changedReturn = structuredClone(result.pending);
  changedReturn.f1040!.spouse_first_name = "Other";
  assertThrows(() => buildMefXml(changedReturn, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedReturn.form7206!, changedReturn),
    Error,
  );
  const changedStatus = structuredClone(result.pending);
  changedStatus.general!.filing_status = "single";
  assertThrows(() => buildMefXml(changedStatus, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedStatus.form7206!, changedStatus),
    Error,
  );
  const changedPlan = structuredClone(result.pending);
  const plan = changedPlan.form7206!.single_schedule_c_plan as {
    spouse_identity: { ssn: string };
    premium_months: Array<{ covered_person: string }>;
  };
  plan.spouse_identity.ssn = "999887777";
  assertThrows(() => buildMefXml(changedPlan, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedPlan.form7206!, changedPlan),
    Error,
  );
  plan.spouse_identity.ssn = "222334444";
  for (const month of plan.premium_months) {
    month.covered_person = "taxpayer";
  }
  assertThrows(() => buildMefXml(changedPlan, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedPlan.form7206!, changedPlan),
    Error,
  );
});

Deno.test("spouse-owned Schedule C Medicare Part B premiums retain spouse owner through Form 7206 and QBI", () => {
  const spouseSources = {
    ...sources,
    general: {
      ...sources.general,
      filing_status: "mfj",
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "222-33-4444",
      spouse_dob: "1986-05-01",
    },
    schedule_c: [{
      ...sources.schedule_c[0],
      proprietor_recipient: TS.S,
      line_c_business_name: "Casey Consulting",
    }],
    form7206: {
      ...sources.form7206,
      single_schedule_c_plan: {
        ...sources.form7206.single_schedule_c_plan,
        recipient: TS.S,
        spouse_identity: { name: "Casey Example", ssn: "222334444" },
        plan_identifier: "CASEY-MEDICARE-B-2025",
        premium_months: sources.form7206.single_schedule_c_plan
          .premium_months.map((month) => ({
            ...month,
            paid_premium: 185,
            covered_person: "spouse",
            policy_source_reference: "2025 Casey Medicare Part B statement",
            payment_source_reference:
              `2025 Casey Medicare Part B payment ${month.month}`,
            employer_plan_review_reference:
              "2025 Casey and Alex employer plan eligibility review",
          })),
      },
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    spouseSources,
    {
      taxYear: 2025,
      formType: "f1040",
    },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form7206?.recipient_name, "Casey Example");
  assertEquals(result.pending.form7206?.recipient_ssn, "222334444");
  assertEquals(result.pending.form7206?.line14, 2_220);
  assertEquals(result.pending.schedule1?.line17_se_health_insurance, 2_220);
  assertEquals(result.pending.f1040?.line10_adjustments, seDeduction + 2_220);
  assertEquals(
    (result.pending.form8995?.joint_owner_filing_rows as Array<
      { tin: { value: string } }
    >)[0].tin.value,
    "222334444",
  );
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<IRS7206 documentId=");
  assertStringIncludes(
    xml,
    "<SelfEmpldHealthInsDedAmt>2220</SelfEmpldHealthInsDedAmt>",
  );
  const scheduleSEXml = xml.slice(
    xml.indexOf("<IRS1040ScheduleSE"),
    xml.indexOf("</IRS1040ScheduleSE>") + "</IRS1040ScheduleSE>".length,
  );
  assertStringIncludes(scheduleSEXml, "<SSN>222334444</SSN>");
  const projected = form7206Pdf.projectFields!(
    result.pending.form7206!,
    result.pending,
  );
  assertEquals(projected.recipient_name, "Casey Example");
  assertEquals(projected.line14, 2_220);
  const projectedSE = scheduleSePdf.instances!(
    result.pending.schedule_se!,
    filer,
    result.pending,
  )[0];
  assertEquals(projectedSE.owner_name, "Casey Example");
  assertEquals(projectedSE.owner_ssn, "222334444");

  const changedOwner = structuredClone(result.pending);
  const changedBusinesses = changedOwner.schedule_c!.schedule_cs as Array<{
    proprietor_recipient: TS;
  }>;
  changedBusinesses[0].proprietor_recipient = TS.T;
  assertThrows(() => buildMefXml(changedOwner, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedOwner.form7206!, changedOwner),
    Error,
  );
  const changedSpouse = structuredClone(result.pending);
  changedSpouse.general!.spouse_ssn = "999-88-7777";
  assertThrows(() => buildMefXml(changedSpouse, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedSpouse.form7206!, changedSpouse),
    Error,
  );
  const changedPremium = structuredClone(result.pending);
  const plan = changedPremium.form7206!.single_schedule_c_plan as {
    premium_months: Array<{ paid_premium: number }>;
  };
  plan.premium_months[0].paid_premium = 186;
  assertThrows(() => buildMefXml(changedPremium, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedPremium.form7206!, changedPremium),
    Error,
  );
  const changedQbiOwner = structuredClone(result.pending);
  (changedQbiOwner.form8995!.joint_owner_filing_rows as Array<
    { tin: { value: string } }
  >)[0].tin.value = "111223333";
  assertThrows(() => buildMefXml(changedQbiOwner, filer), Error);
});

Deno.test("one Schedule C policy with taxpayer and spouse months reaches the joint return", () => {
  const mixedSources = {
    ...sources,
    general: {
      ...sources.general,
      filing_status: "mfj",
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "222-33-4444",
      spouse_dob: "1986-05-01",
    },
    form7206: {
      ...sources.form7206,
      single_schedule_c_plan: {
        ...sources.form7206.single_schedule_c_plan,
        spouse_identity: { name: "Casey Example", ssn: "222334444" },
        premium_months: sources.form7206.single_schedule_c_plan.premium_months
          .map((month) => ({
            ...month,
            policy_source_reference: "2025 joint policy statement",
            covered_person: month.month <= 6 ? "taxpayer" : "spouse",
            employer_plan_review_reference: month.month <= 6
              ? "2025 taxpayer employer eligibility review"
              : "2025 spouse employer eligibility review",
          })),
      },
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    mixedSources,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form7206?.line1, 12_000);
  assertEquals(result.pending.form7206?.line14, 12_000);
  assertEquals(result.pending.schedule1?.line17_se_health_insurance, 12_000);
  assertEquals(result.pending.f1040?.line10_adjustments, seDeduction + 12_000);
  assertEquals(
    (result.pending.form8995?.joint_owner_filing_rows as Array<
      { qbi: number }
    >)[0].qbi,
    34_467,
  );
  const filer = extractFilerIdentity(result.pending.f1040);
  assertStringIncludes(
    buildMefXml(result.pending, filer),
    "<IRS7206 documentId=",
  );
  assertEquals(
    form7206Pdf.projectFields!(result.pending.form7206!, result.pending)
      .line14,
    12_000,
  );

  const changedSpouse = structuredClone(result.pending);
  changedSpouse.general!.spouse_ssn = "999-88-7777";
  assertThrows(() => buildMefXml(changedSpouse, filer), Error);
  assertThrows(
    () =>
      form7206Pdf.projectFields!(
        changedSpouse.form7206!,
        changedSpouse,
      ),
    Error,
  );
  const missingSpouseIdentity = structuredClone(result.pending);
  const plan = missingSpouseIdentity.form7206!.single_schedule_c_plan as {
    spouse_identity?: { name: string; ssn: string };
    premium_months: Array<{ paid_premium: number }>;
  };
  delete plan.spouse_identity;
  assertThrows(() => buildMefXml(missingSpouseIdentity, filer), Error);
  assertThrows(
    () =>
      form7206Pdf.projectFields!(
        missingSpouseIdentity.form7206!,
        missingSpouseIdentity,
      ),
    Error,
  );
  const changedMonth = structuredClone(result.pending);
  const changedPlan = changedMonth.form7206!.single_schedule_c_plan as {
    premium_months: Array<{ paid_premium: number }>;
  };
  changedPlan.premium_months[6].paid_premium = 1_001;
  assertThrows(() => buildMefXml(changedMonth, filer), Error);
  assertThrows(
    () => form7206Pdf.projectFields!(changedMonth.form7206!, changedMonth),
    Error,
  );
});
