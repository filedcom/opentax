import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { registry } from "../../registry.ts";
import {
  form3800,
  prepareForm3800DocumentParts,
} from "../../mef/forms/f3800.ts";
import { form8881 } from "../../mef/forms/f8881.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { form3800PartIIIFields } from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";
import { form8881Pdf } from "./f8881.ts";

const source = {
  schedule_c_business_reference: "PLAN-BUSINESS-1",
  plan_type: "401k",
  startup: {
    plan_effective_on: "2025-01-01",
    first_credit_year: 2025,
    preceding_first_credit_year_qualified_employee_count: 20,
    eligible_non_hce_count: 3,
    startup_costs: 4_000,
    cost_record_reference: "plan-invoice-1",
    costs_paid_or_incurred_on: "2025-02-15",
    eligible_plan_confirmed: true,
    no_substantially_same_employee_plan_in_prior_three_years_confirmed: true,
    startup_cost_deduction_reduced_by_credit_confirmed: true,
  },
  auto_enrollment: {
    first_credit_year: 2025,
    preceding_first_credit_year_qualified_employee_count: 20,
    arrangement_record_reference: "plan-amendment-1",
    arrangement_first_included_on: "2025-01-01",
    eligible_automatic_contribution_arrangement_confirmed: true,
    qualified_employer_plan_confirmed: true,
    maintained_in_2025_confirmed: true,
  },
};
const f3800 = {
  f8881_credit: {
    schedule_c_business_reference: "PLAN-BUSINESS-1",
    part_i_credit: 750,
    part_ii_credit: 500,
    part_iii_credit: 0,
    subject_to_passive_activity_limit: false as const,
  },
  tax_context: {
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 1_250,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  },
  allowed_credit: 1_250,
};
const pending = {
  f8881: source,
  f3800,
  schedule_c: {
    schedule_cs: [{
      business_reference: "PLAN-BUSINESS-1",
      line_a_principal_business: "Consulting",
      line_b_business_code: "541611",
      line_f_accounting_method: "cash" as const,
      line_g_material_participation: true,
      line_1_gross_receipts: 10_000,
    }],
  },
  f1040: { line16_income_tax: 40_000, line20_nonrefundable_credits: 1_250 },
  form6251: { line11_amt: 0, net_tmt: 20_000 },
  schedule3: { line6a_total: 1_250, line7_total: 1_250, line8_total: 1_250 },
};
const ids = { f8881: ["IRS8881_1"], form6251: ["IRS6251_1"], f8835: [] };

Deno.test("Form 8881 startup and enrollment credit reaches Form 3800, Schedule 3 and Form 1040", () => {
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
    f8881: source,
    schedule_c: [{
      business_reference: "PLAN-BUSINESS-1",
      line_a_principal_business: "Consulting",
      line_b_business_code: "541611",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 10_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f3800?.f8881_credit, f3800.f8881_credit);
  assertEquals(result.pending.f3800?.allowed_credit, 1_250);
  assertEquals(result.pending.schedule3?.line6a_total, 1_250);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, 1_250);
});

Deno.test("Form 8881 Part I and II bind separate native and printable Form 3800 rows", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  const xml = form3800.build(f3800, { pending, documentIdsByPendingKey: ids });
  assertStringIncludes(xml, "<Form8881PartICYCreditsGrp");
  assertStringIncludes(xml, "<Form8881PartIICYCreditsGrp");
  assertStringIncludes(xml, 'referenceDocumentId="IRS8881_1"');
  assertStringIncludes(
    form8881.build(source, {
      pending,
      documentIdsByPendingKey: { ...ids, f3800: ["IRS3800_1"] },
    }),
    "<PensionPlanStartupCostsCrAmt>750</PensionPlanStartupCostsCrAmt>",
  );
  const [pdf] = form3800Pdf.instances!(f3800, testFiler(), pending, prepared);
  assertEquals(pdf[form3800PartIIIFields("1j").e], 750);
  assertEquals(pdf[form3800PartIIIFields("1dd").e], 500);
  assertEquals(pdf[form3800PartIIIFields("1j").i], 750);
  assertEquals(pdf[form3800PartIIIFields("1dd").i], 500);
  assertEquals(form8881Pdf.projectFields!(source, pending).line11, 500);
});

Deno.test("Form 3800 PDF rejects a second Form 8881 part claiming another document ID", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  const altered = {
    ...prepared,
    currentRows: prepared.currentRows.map((row) =>
      row.line === "1dd"
        ? {
          ...row,
          metadata: {
            ...row.metadata,
            referenceDocumentId: "IRS8881_2",
          },
        }
        : row
    ),
    currentDetails: prepared.currentDetails.map((row) =>
      row.line === "1dd" ? { ...row, sourceDocumentId: "IRS8881_2" } : row
    ),
  };
  assertThrows(
    () => form3800Pdf.instances!(f3800, testFiler(), pending, altered),
    Error,
    "must reference one filed IRS8881 document",
  );
});

Deno.test("Form 8881 military-spouse Part III binds Form 3800 line 1ee", () => {
  const military = {
    ...source,
    military_spouses: {
      preceding_2025_qualified_employee_count: 20,
      eligible_defined_contribution_plan_confirmed: true,
      participation_within_two_months_confirmed: true,
      immediate_equal_contribution_and_vesting_confirmed: true,
      employees: [{
        employee_reference: "EMP-MS-1",
        spouse_active_duty_certification_reference: "ORDERS-1",
        contribution_record_reference: "PAYROLL-MS-1",
        contributed_on: "2025-09-15",
        first_eligible_participation_year: 2025,
        non_hce_confirmed: true,
        active_duty_spouse_at_hire_confirmed: true,
        participated_in_2025_confirmed: true,
        qualified_employer_contribution: 300,
        elective_deferrals_excluded_confirmed: true,
      }],
    },
  };
  const claim = {
    ...f3800,
    f8881_credit: { ...f3800.f8881_credit, part_iii_credit: 500 },
    tax_context: { ...f3800.tax_context, standardCredit: 1_750 },
    allowed_credit: 1_750,
  };
  const filed = {
    ...pending,
    f8881: military,
    f3800: claim,
    f1040: { ...pending.f1040, line20_nonrefundable_credits: 1_750 },
    schedule3: { line6a_total: 1_750, line7_total: 1_750, line8_total: 1_750 },
  };
  const prepared = prepareForm3800DocumentParts(claim, {
    pending: filed,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  assertStringIncludes(
    form3800.build(claim, { pending: filed, documentIdsByPendingKey: ids }),
    "<Form8881PartIIICYCreditsGrp",
  );
  const [pdf] = form3800Pdf.instances!(claim, testFiler(), filed, prepared);
  assertEquals(pdf[form3800PartIIIFields("1ee").e], 500);
  assertEquals(pdf[form3800PartIIIFields("1ee").i], 500);
});

Deno.test("Form 8881 export rejects altered source, document link and prepared row", () => {
  assertThrows(
    () =>
      prepareForm3800DocumentParts(f3800, {
        pending: {
          ...pending,
          schedule_c: {
            schedule_cs: [{
              ...pending.schedule_c.schedule_cs[0],
              business_reference: "OTHER-BUSINESS",
            }],
          },
        },
        documentIdsByPendingKey: ids,
      }),
    Error,
    "participating Schedule C business",
  );
  assertThrows(
    () =>
      prepareForm3800DocumentParts(f3800, {
        pending: {
          ...pending,
          f8881: {
            ...source,
            startup: { ...source.startup, eligible_non_hce_count: 2 },
          },
        },
        documentIdsByPendingKey: ids,
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      prepareForm3800DocumentParts(f3800, {
        pending,
        documentIdsByPendingKey: { ...ids, f8881: [] },
      }),
    Error,
    "document count",
  );
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), pending, {
        ...prepared,
        currentDetails: prepared.currentDetails.map((row) =>
          row.line === "1j" ? { ...row, credit: 749 } : row
        ),
      }),
    Error,
    "differs from Form 8881 source",
  );
});
