import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { Form8978Source } from "../nodes/inputs/f8978/index.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

Deno.test("E2E: Form 8978 positive line 14 increases Form 1040 line 16", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    f8978: {
      filings: [{
        source: Form8978Source.BbaAudit,
        columns: [{
          tax_year_end: "2022-12-31",
          original_income: 20_000,
          income_adjustments: [{
            description: "Form 8986 income",
            amount: 2_000,
          }],
          original_deductions: 5_000,
          deduction_adjustments: [],
          corrected_income_tax: 1_500,
          corrected_amt: 0,
          original_credits: 0,
          credit_adjustments: [],
          original_tax_liability: 1_000,
          tax_calculation_explanation:
            "Affected-year recomputation using 2022 tax rules.",
        }],
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f8978?.line14, 500);
  assertEquals(result.pending.f1040?.line16_income_tax, 500);
  assertEquals(result.pending.f1040?.line24_total_tax, 500);
  assertEquals(
    result.pending.schedule2?.line17z_other_additional_taxes,
    undefined,
  );
});

Deno.test("E2E: negative Form 8978 line 14 reaches capped Schedule 3 line 6l", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    w2: [{
      box1_wages: 75_000,
      box2_fed_withheld: 11_000,
      box3_ss_wages: 75_000,
      box4_ss_withheld: 4_650,
      box5_medicare_wages: 75_000,
      box6_medicare_withheld: 1_087.50,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      box12_entries: [],
    }],
    f8978: {
      filings: [{
        source: Form8978Source.BbaAudit,
        columns: [{
          tax_year_end: "2022-12-31",
          original_income: 20_000,
          income_adjustments: [{ description: "Form 8986 income", amount: -2_000 }],
          original_deductions: 5_000,
          deduction_adjustments: [],
          corrected_income_tax: 1_000,
          corrected_amt: 0,
          original_credits: 0,
          credit_adjustments: [],
          original_tax_liability: 1_500,
          tax_calculation_explanation: "Affected-year recomputation using 2022 tax rules.",
        }],
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f8978?.line14, -500);
  assertEquals(result.pending.f1040?.line16_income_tax, 7_949);
  assertEquals(result.pending.schedule3?.line6l_form8978_credit, 500);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, 500);
  assertEquals(result.pending.f1040?.line24_total_tax, 7_449);
});
