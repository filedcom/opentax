import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  calculateForm3800Nonpassive,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { registry } from "../../registry.ts";
import {
  form3800,
  prepareForm3800DocumentParts,
} from "../../mef/forms/f3800.ts";
import { form8844 } from "../../mef/forms/f8844.ts";
import { testFiler } from "../../mef/test-filer.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
} from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";
import { form8844Pdf } from "./f8844.ts";

const empowerment = {
  schedule_c_business_reference: "SHOP-1",
  payroll_ledger_reference: "PAYROLL-2025-SHOP-1",
  f8844s: [{
    employee_reference: "EMP-1",
    payroll_record_reference: "PAY-2025-1",
    zone_designation_reference: "EZ-LOS-ANGELES-2025",
    residence_zone_reference: "EZ-LOS-ANGELES-2025",
    work_zone_reference: "EZ-LOS-ANGELES-2025",
    qualified_zone_wages: 10_000,
    wages_used_for_work_opportunity_credit: 0,
    zone_designation_active_in_2025_confirmed: true,
    substantially_all_services_in_zone_confirmed: true,
    principal_residence_in_zone_confirmed: true,
    ninety_day_employment_or_exception_confirmed: true,
    no_excluded_employee_or_business_confirmed: true,
    futa_wage_and_other_credit_exclusions_reviewed_confirmed: true,
  }],
};
const business = {
  business_reference: "SHOP-1",
  line_a_principal_business: "Retail shop",
  line_b_business_code: "459999",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 30_000,
  line_26_wages: 10_000,
  line_26_other_employment_credits: 2_000,
};
const f3800 = {
  f8844_direct_employer_credit: {
    credit_amount: 2_000,
    schedule_c_business_reference: "SHOP-1",
    payroll_ledger_reference: "PAYROLL-2025-SHOP-1",
    subject_to_passive_activity_limit: false as const,
  },
  tax_context: {
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 0,
    empowermentCredit: 2_000,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  },
  allowed_credit: 2_000,
};
const pending = {
  f8844: empowerment,
  f3800,
  schedule_c: { schedule_cs: [business] },
  f1040: { line16_income_tax: 40_000, line20_nonrefundable_credits: 2_000 },
  form6251: { line11_amt: 0, net_tmt: 20_000 },
  schedule3: { line6a_total: 2_000, line7_total: 2_000, line8_total: 2_000 },
};
const ids = {
  f8844: ["IRS8844_1"],
  f8835: [],
  form6251: ["IRS6251_1"],
};

Deno.test("Form 8844 uses Form 3800 Section B tax limit separately from ordinary credits", () => {
  const lines = calculateForm3800Nonpassive({
    filingStatus: FilingStatus.Single,
    regularTax: 6_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 6_000,
    standardCredit: 0,
    empowermentCredit: 2_000,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  }, ZERO_FORM3800_PASSIVE_ACTIVITY);
  assertEquals(lines.line1, 0);
  assertEquals(lines.line17, 0);
  assertEquals(lines.line22, 2_000);
  assertEquals(lines.line26, 1_500);
  assertEquals(lines.line38, 1_500);
});

Deno.test("Form 8844 direct employer reaches Form 3800, Schedule 3 and Form 1040", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    w2: [{
      box1_wages: 120_000,
      box2_fed_withheld: 20_000,
      box3_ss_wages: 120_000,
      box4_ss_withheld: 7_440,
      box5_medicare_wages: 120_000,
      box6_medicare_withheld: 1_740,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      box12_entries: [],
    }],
    f8844: empowerment,
    schedule_c: [business],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.f3800?.f8844_direct_employer_credit,
    f3800.f8844_direct_employer_credit,
  );
  assertEquals(
    (result.pending.f3800?.tax_context as { empowermentCredit?: number })
      ?.empowermentCredit,
    2_000,
  );
  assertEquals(result.pending.f3800?.allowed_credit, 2_000);
  assertEquals(result.pending.schedule3?.line6a_total, 2_000);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, 2_000);
});

Deno.test("Form 8844 source binds native Form 3800 line 3 and filled PDF fields", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  const xml = form3800.build(f3800, { pending, documentIdsByPendingKey: ids });
  assertStringIncludes(
    xml,
    "<TotEmpwrZoneGenBusCreditsAmt>2000</TotEmpwrZoneGenBusCreditsAmt>",
  );
  assertStringIncludes(xml, "<Form8844CYCreditsGrp");
  assertStringIncludes(xml, 'referenceDocumentId="IRS8844_1"');
  assertStringIncludes(
    form8844.build(empowerment, {
      pending,
      documentIdsByPendingKey: { ...ids, f3800: ["IRS3800_1"] },
    }),
    "<CurrentYearCreditAmt>2000</CurrentYearCreditAmt>",
  );
  const [pdf] = form3800Pdf.instances!(f3800, testFiler(), pending, prepared);
  assertEquals(pdf[form3800PartIIIFields("3").e], 2_000);
  assertEquals(pdf[form3800PartIIIFields("3").i], 2_000);
  assertEquals(pdf[form3800PartIAndIIFields.line22], 2_000);
  assertEquals(pdf[form3800PartIAndIIFields.line26], 2_000);
  assertEquals(pdf[form3800PartIAndIIFields.line38], 2_000);
  assertEquals(form8844Pdf.projectFields!(empowerment, pending).line2, 2_000);
});

Deno.test("Form 8844 printable copy binds Form 3800 line 3 document and final credit", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  const fields = form8844Pdf.projectFields!(empowerment, pending);
  assertEquals(
    form8844Pdf.instances!(fields, testFiler(), pending, prepared),
    [fields],
  );
  assertThrows(() => form8844Pdf.instances!(fields, testFiler(), pending));
  assertThrows(() =>
    form8844Pdf.instances!(fields, testFiler(), pending, {
      ...prepared,
      currentRows: prepared.currentRows.map((row) => ({
        ...row,
        metadata: { ...row.metadata, referenceDocumentId: "IRS8844_OTHER" },
      })),
    })
  );
  assertThrows(() =>
    form8844Pdf.instances!(fields, testFiler(), pending, {
      ...prepared,
      currentAmounts: prepared.currentAmounts.map((row) => ({
        ...row,
        nonpassiveCredit: 1_999,
      })),
    })
  );
  assertThrows(() =>
    form8844Pdf.instances!(fields, testFiler(), {
      ...pending,
      f1040: { ...pending.f1040, line20_nonrefundable_credits: 1_999 },
    }, prepared)
  );
});

Deno.test("Form 8844 export rejects changed payroll, tax use and final return", () => {
  assertThrows(
    () =>
      prepareForm3800DocumentParts(f3800, {
        pending: {
          ...pending,
          f8844: {
            ...empowerment,
            f8844s: [{ ...empowerment.f8844s[0], qualified_zone_wages: 9_000 }],
          },
        },
        documentIdsByPendingKey: ids,
      }),
    Error,
    "differs from Form 3800",
  );
  assertThrows(() =>
    prepareForm3800DocumentParts({
      ...f3800,
      tax_context: { ...f3800.tax_context, empowermentCredit: 1_999 },
    }, { pending, documentIdsByPendingKey: ids }), Error);
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), {
        ...pending,
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 1_999 },
      }, prepared),
    Error,
    "Form 1040 line 20",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), pending, {
        ...prepared,
        currentDetails: prepared.currentDetails.map((row) =>
          row.line === "3" ? { ...row, credit: 1_999 } : row
        ),
      }),
    Error,
    "line 3 differs",
  );
});
