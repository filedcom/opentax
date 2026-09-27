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
    swa_certification_reference: "SWA-001",
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    first_year_wages: 6_000,
    hours_worked: 400,
  }],
};

Deno.test("Form 5884 source reaches Form 3800 but posts no credit without tax", () => {
  const result = execute(plan, registry, {
    general,
    f5884: source,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.pending.f3800?.f5884_credit, {
    credit_amount: 2_400,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.pending.f3800?.allowed_credit, 0);
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
  assertEquals(result.pending.f3800?.f5884_credit?.credit_amount, 1_250);
  assertEquals(result.pending.f3800?.allowed_credit, 0);
  assertEquals(result.diagnostics, []);
});
