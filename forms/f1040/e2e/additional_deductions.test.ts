import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";

const plan = buildExecutionPlan(registry);

function finalNumber(value: unknown): number | undefined {
  const resolved = Array.isArray(value) ? value.at(-1) : value;
  return typeof resolved === "number" ? resolved : undefined;
}

Deno.test("Schedule 1-A: DOB-derived senior deduction matches issue #36 reproduction", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_dob: "1955-06-01",
      taxpayer_ssn: "111-22-3333",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
    },
    w2: [{
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
      box3_ss_wages: 50_000,
      box4_ss_withheld: 3_100,
      box5_medicare_wages: 50_000,
      box6_medicare_withheld: 725,
    }],
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a?.taxpayer_age_65_or_older, true);
  assertEquals(result.pending.f1040?.line13b_additional_deductions, 6_000);
  assertEquals(
    finalNumber(result.pending.f1040?.line15_taxable_income),
    26_250,
  );
});

Deno.test("Schedule 1-A: overtime and vehicle interest flow from public input to taxable income", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_dob: "1985-06-01",
      taxpayer_ssn: "111-22-3333",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
    },
    w2: [{
      employer_ein: "12-3456789",
      employee_ssn: "111-22-3333",
      box1_wages: 80_000,
      box2_fed_withheld: 8_000,
      box14_entries: [{
        description: "FLSA Overtime Premium",
        amount: 5_000,
        is_state_sdi_pfml: false,
      }],
      flsa_overtime_review: {
        covered_nonexempt_employee: true,
        premium_included_in_box1: true,
        source_reference: "Employer 2025 payroll statement",
      },
    }],
    schedule1a: {
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        borrower_ssn: "111223333",
        loan_originated_date: "2025-02-01",
        vehicle_purchased_date: "2025-02-01",
        lender_name: "Test Credit Union",
        lender_interest_statement_reference: "2025 lender interest statement",
        purchase_and_lien_reference: "2025 purchase and first-lien agreement",
        final_assembly_reference: "vehicle information label",
        original_borrower: true,
        purchase_proceeds_only: true,
        first_lien_secured: true,
        original_vehicle_use: true,
        road_vehicle_with_two_or_more_wheels: true,
        vehicle_type: "car",
        gross_vehicle_weight_under_14000_pounds: true,
        final_assembly_in_us: true,
        expected_personal_use_over_half: true,
        qualified_interest_paid: 2_000,
        interest_deducted_elsewhere: 0,
        no_other_interest_deduction_review_reference:
          "2025 Schedule C/E/F review",
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line13b_additional_deductions, 7_000);
  assertEquals(
    finalNumber(result.pending.f1040?.line15_taxable_income),
    57_250,
  );
});
