import { assertEquals, assertGreater } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { TargetGroup } from "../nodes/inputs/f5884/index.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);
const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "123-45-6789",
  taxpayer_dob: "1985-06-15",
};
const source = {
  subject_to_passive_activity_limit: false,
  f5884s: [{
    employee_reference: "EMP-001",
    target_group: TargetGroup.TanfRecipient,
    hired_on: "2025-01-15",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    wage_records: [{
      payroll_record_reference: "PAY-001",
      deduction_location: {
        kind: "schedule_c",
        business_reference: "BUSINESS-1",
      },
      service_period_start_on: "2025-02-01",
      service_period_end_on: "2025-02-28",
      paid_or_incurred_on: "2025-02-28",
      qualified_wages: 6_000,
    }],
    hours_worked: 400,
  }],
};
const business = {
  schedule_cs: [{
    business_reference: "BUSINESS-1",
    line_a_principal_business: "Retail store",
    line_b_business_code: "459999",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 6_000,
    line_26_wages: 6_000,
  }],
};

Deno.test("Form 5884 source reaches Form 3800 but posts no credit without tax", () => {
  const result = execute(plan, registry, {
    general,
    f5884: source,
    schedule_c: business.schedule_cs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.pending.f3800?.f5884_credit, {
    credit_amount: 2_400,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.pending.f3800?.allowed_credit, 0);
  assertEquals(result.pending.schedule1?.line3_schedule_c, 2_400);
  assertEquals(result.pending.schedule_c?.wotc_wage_reductions, [{
    business_reference: "BUSINESS-1",
    credit_amount: 2_400,
  }]);
  assertEquals(
    result.pending.schedule3?.line6a_general_business_credit,
    undefined,
  );
  assertEquals(result.diagnostics, []);
});

Deno.test("Form 5884 allowed credit reaches Schedule 3 after Form 3800 Part II", () => {
  const result = execute(plan, registry, {
    general,
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
    f5884: source,
    schedule_c: business.schedule_cs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const allowed = Number(result.pending.f3800?.allowed_credit);
  assertGreater(allowed, 0);
  assertEquals(result.pending.schedule3?.line6a_total, allowed);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, allowed);
  assertEquals(result.pending.f3800?.standard_credit_allowed, 0);
  assertEquals(result.pending.f3800?.specified_credit_allowed, allowed);
});

Deno.test("pass-through-only work opportunity credit reaches Form 3800 without employer wages", () => {
  const result = execute(plan, registry, {
    general,
    f5884: {
      f5884s: [],
      subject_to_passive_activity_limit: false,
      pass_through_credits: [{
        source_type: "partnership",
        entity_ein: "123456789",
        source_document_reference: "2025 K-1 box 15 code J",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    (result.pending.f3800?.f5884_credit as
      | { credit_amount: number }
      | undefined)?.credit_amount,
    1_250,
  );
  assertEquals(result.pending.f3800?.allowed_credit, 0);
  assertEquals(result.diagnostics, []);
});

Deno.test("Form 5884 line 2 reduces Schedule F labor even when credit is tax-limited", () => {
  const result = execute(plan, registry, {
    general,
    f5884: {
      ...source,
      f5884s: [{
        ...source.f5884s[0],
        wage_records: [{
          ...source.f5884s[0].wage_records[0],
          deduction_location: { kind: "schedule_f", farm_id: "FARM-1" },
        }],
      }],
    },
    schedule_f: {
      schedule_fs: [{
        farm_id: "FARM-1",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 6_000,
        line22_labor_hired: 6_000,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line6_schedule_f, 2_400);
  assertEquals(result.pending.schedule_f?.wotc_wage_reductions, [{
    farm_id: "FARM-1",
    credit_amount: 2_400,
  }]);
  assertEquals(result.pending.f3800?.allowed_credit, 0);
});
