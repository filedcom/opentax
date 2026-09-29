import { assert, assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";
import { ordinaryTax2025 } from "../nodes/intermediate/worksheets/tax_table_2025.ts";

const ordinary = {
  has_qualified_dividends: false,
  has_net_capital_gain: false,
  has_unrecaptured_section1250_gain: false,
  has_28_percent_rate_gain: false,
  filed_form2555: false,
} as const;

function baseReturn(year: number) {
  return {
    filing_status: FilingStatus.Single,
    taxable_income_line15: 10_000,
    filed_line16_tax: 1_000,
    section1_tax_from_line16: 1_000,
    filed_return_reference: `Filed ${year} Form 1040`,
    section1_tax_workpaper_reference: `${year} section 1 tax`,
  };
}

function inputs() {
  return {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Farmer",
      taxpayer_ssn: "123-45-6789",
    },
    schedule_f: {
      schedule_fs: [{
        farm_id: "grain",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line2_sales_products_raised: 100_000,
      }],
    },
    schedule_j: {
      elected_farm_income: 15_000,
      elected_farm_income_net_capital_gain: 0,
      base_year_source: {
        latest_averaging_year: "none",
        base_returns: {
          year2022: baseReturn(2022),
          year2023: baseReturn(2023),
          year2024: baseReturn(2024),
        },
      },
      tax_treatment: {
        year2025: ordinary,
        year2022: ordinary,
        year2023: ordinary,
        year2024: ordinary,
      },
    },
  };
}

Deno.test("Schedule J farm-only route computes and files its own line 23", () => {
  const result = execute(buildExecutionPlan(registry), registry, inputs(), {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_j?.line2a, 15_000);
  assertEquals(
    result.pending.income_tax_calculation?.schedule_j_calculated_tax,
    result.pending.schedule_j?.line23,
  );
  assertEquals(
    result.pending.f1040?.line16_income_tax,
    result.pending.schedule_j?.line23,
  );
  const taxableIncome = result.pending.f1040?.line15_taxable_income;
  assert(typeof taxableIncome === "number");
  assertEquals(
    result.pending.form6251?.regular_tax,
    ordinaryTax2025(taxableIncome, FilingStatus.Single),
  );
});

Deno.test("Schedule J rejects nonfarm income rather than treating offsetting AGI as farm-only", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    ...inputs(),
    f1099int: [{
      payer_name: "Bank",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box1: 100,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "schedule_j_calculation" &&
      entry.message.includes("Schedule F-only")
    ),
    true,
  );
});
