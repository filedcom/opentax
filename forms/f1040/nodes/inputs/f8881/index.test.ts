import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8881, f8881, PlanType } from "./index.ts";

const startup = {
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
} as const;

const contributions = {
  plan_effective_on: "2023-01-01",
  preceding_first_plan_year_qualified_employee_count: 20,
  preceding_2025_employee_count: 60,
  eligible_defined_contribution_plan_confirmed: true,
  no_substantially_same_employee_plan_in_prior_three_years_confirmed: true,
  contribution_deduction_reduced_by_credit_confirmed: true,
  employees: [{
    employee_reference: "worker-1",
    contribution_record_reference: "payroll-1",
    contributed_on: "2025-12-15",
    wages_2025: 50_000,
    qualified_employer_contribution: 1_500,
    elective_deferrals_excluded_confirmed: true,
  }],
} as const;

const autoEnrollment = {
  first_credit_year: 2024,
  preceding_first_credit_year_qualified_employee_count: 20,
  arrangement_record_reference: "plan-amendment-1",
  arrangement_first_included_on: "2024-01-01",
  eligible_automatic_contribution_arrangement_confirmed: true,
  qualified_employer_plan_confirmed: true,
  maintained_in_2025_confirmed: true,
} as const;

const militarySpouses = {
  preceding_2025_qualified_employee_count: 20,
  eligible_defined_contribution_plan_confirmed: true,
  participation_within_two_months_confirmed: true,
  immediate_equal_contribution_and_vesting_confirmed: true,
  employees: [{
    employee_reference: "worker-2",
    spouse_active_duty_certification_reference: "military-cert-1",
    contribution_record_reference: "payroll-2",
    contributed_on: "2025-11-15",
    first_eligible_participation_year: 2024,
    non_hce_confirmed: true,
    active_duty_spouse_at_hire_confirmed: true,
    participated_in_2025_confirmed: true,
    qualified_employer_contribution: 400,
    elective_deferrals_excluded_confirmed: true,
  }],
} as const;

Deno.test("Form 8881 startup cap follows eligible non-HCE count", () => {
  const three = calculateForm8881({
    plan_type: PlanType.Plan401k,
    startup,
  });
  assertEquals(three.line3, 750);
  assertEquals(three.line4, 750);
  assertEquals(three.line5, 750);
  const twenty = calculateForm8881({
    plan_type: PlanType.Plan401k,
    startup: { ...startup, eligible_non_hce_count: 20, startup_costs: 8_000 },
  });
  assertEquals(twenty.line5, 5_000);
});

Deno.test("Form 8881 larger employer startup rate and $500 floor", () => {
  const lines = calculateForm8881({
    plan_type: PlanType.Simple,
    startup: {
      ...startup,
      preceding_first_credit_year_qualified_employee_count: 75,
      eligible_non_hce_count: 1,
      startup_costs: 3_000,
    },
  });
  assertEquals(lines.line2, 1_500);
  assertEquals(lines.line4, 500);
  assertEquals(lines.line5, 500);
});

Deno.test("Form 8881 contribution, auto-enrollment, and military spouse parts stay separate", () => {
  const source = {
    plan_type: PlanType.Plan401k,
    startup,
    contributions: {
      ...contributions,
      employees: [...contributions.employees],
    },
    auto_enrollment: autoEnrollment,
    military_spouses: {
      ...militarySpouses,
      employees: [...militarySpouses.employees],
    },
  };
  const lines = calculateForm8881(source);
  assertEquals(lines.line5, 750);
  assertEquals(lines.line6c, 1_334);
  assertEquals(lines.line6e3, 267);
  assertEquals(lines.line6g, 800);
  assertEquals(lines.line8, 1_550);
  assertEquals(lines.line11, 500);
  assertEquals(lines.line12, 200);
  assertEquals(lines.line13, 300);
  assertEquals(lines.line15, 500);
  const result = f8881.compute({ taxYear: 2025, formType: "f1040" }, source);
  assertEquals(result.outputs, [{
    nodeType: "f3800",
    fields: {
      f8881_credit: {
        part_i_credit: 1_550,
        part_ii_credit: 500,
        part_iii_credit: 500,
        subject_to_passive_activity_limit: false,
      },
    },
  }]);
});

Deno.test("Form 8881 rejects unsupported or unproven source facts", () => {
  assertEquals(
    f8881.inputSchema.safeParse({
      plan_type: PlanType.Plan401k,
      non_hce_count: 3,
      employee_count: 20,
      startup_costs: 4_000,
    }).success,
    false,
  );
  assertEquals(
    f8881.inputSchema.safeParse({
      plan_type: PlanType.Plan401k,
      startup: {
        ...startup,
        startup_cost_deduction_reduced_by_credit_confirmed: false,
      },
    }).success,
    false,
  );
  assertEquals(
    f8881.inputSchema.safeParse({
      plan_type: PlanType.Plan401k,
      startup: { ...startup, first_credit_year: 2022 },
    }).success,
    false,
  );
  assertEquals(
    f8881.inputSchema.safeParse({
      plan_type: PlanType.Plan401k,
      startup: { ...startup, costs_paid_or_incurred_on: "2024-12-31" },
    }).success,
    false,
  );
  assertEquals(
    f8881.inputSchema.safeParse({
      plan_type: PlanType.Plan401k,
      auto_enrollment: {
        ...autoEnrollment,
        arrangement_first_included_on: "2023-01-01",
      },
    }).success,
    false,
  );
  assertEquals(
    f8881.inputSchema.safeParse({
      plan_type: PlanType.Plan401k,
      contributions: {
        ...contributions,
        employees: [
          contributions.employees[0],
          contributions.employees[0],
        ],
      },
    }).success,
    false,
  );
  assertThrows(() =>
    calculateForm8881({
      plan_type: PlanType.DefBenefit,
      contributions: {
        ...contributions,
        employees: [...contributions.employees],
      },
    })
  );
});
