import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";

// 2025 Instructions for Form 1040, Standard Deduction Worksheet for
// Dependents (line 12e): line 1 is earned income plus $450; line 2 is $1,350;
// line 3 the larger; line 4 the basic standard deduction ($15,750 single); the
// deduction is the smaller of lines 3 and 4. Earned income is generally Form
// 1040 line 1z plus Schedule 1 lines 3, 6 and 8r, minus Schedule 1 line 15.

const plan = buildExecutionPlan(registry);
const ctx = { taxYear: 2025, formType: "f1040" };
const SSN = "123456789";
const general = {
  filing_status: "single",
  taxpayer_ssn: SSN,
  taxpayer_dob: "2004-03-01",
  digital_assets: false,
  taxpayer_can_be_claimed_as_dependent: true,
};

test("dependent with W-2 wages gets the full basic standard deduction", () => {
  const result = execute(plan, registry, {
    general,
    w2: [{
      box1_wages: 65_630,
      box2_fed_withheld: 6_000,
      box3_ss_wages: 65_630,
      box5_medicare_wages: 65_630,
      employee_ssn: SSN,
      employer_ein: "223456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  // min(15,750, max(1,350, 65,630 + 450)) = 15,750.
  assertEquals(result.pending.f1040?.line12a_standard_deduction, 15_750);
  assertEquals(result.pending.f1040?.line15_taxable_income, 49_880);
  // 2025 Tax Table, single, 49,850–49,900: 5,887.
  assertEquals(result.pending.f1040?.line16_income_tax, 5_887);
});

test("dependent with only self-employment earns income net of half SE tax", () => {
  const result = execute(plan, registry, {
    general,
    f1099nec: [{
      payer_name: "Client One",
      payer_tin: "223456789",
      recipient_ssn: SSN,
      box1_nec: 4_356,
      for_routing: "schedule_c",
      schedule_c_business_reference: "tutoring",
    }],
    schedule_c: [{
      business_reference: "tutoring",
      proprietor_recipient: "T",
      line_a_principal_business: "TUTORING",
      line_b_business_code: "611000",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 4_356,
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  // Schedule SE: 4,356 × 92.35% = 4,023; 499 + 117 = 616; half = 308.
  assertEquals(result.pending.schedule2?.line4_se_tax, 616);
  // Earned income 4,356 − 308 = 4,048; + 450 = 4,498.
  assertEquals(result.pending.f1040?.line12a_standard_deduction, 4_498);
  assertEquals(result.pending.f1040?.line15_taxable_income, 0);
  assertEquals(result.pending.f1040?.line24_total_tax, 616);
});
