import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

Deno.test("Form 8936 qualified commercial clean vehicle reaches Form 3800 line 1aa", () => {
  const result = execute(plan, registry, {
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
    f8936: {
      current_year_magi: { adjusted_gross_income: 120_000 },
      prior_year_magi: { adjusted_gross_income: 50_000 },
      filing_status: FilingStatus.Single,
      prior_year_filing_status: FilingStatus.Single,
      f8936s: [{
        credit_kind: "qualified_commercial_clean_vehicle",
        vin: "1HGCM82633A004352",
        vehicle_year: 2025,
        vehicle_make: "Example",
        vehicle_model: "Electric Van",
        acquisition_date: "2025-09-30",
        placed_in_service_date: "2025-09-30",
        seller_report_received: true,
        transferred_to_dealer: false,
        resold_within_30_days: false,
        acquired_for_use_not_resale: true,
        business_credit_subject_to_passive_activity_limit: false,
        commercial: {
          owned_by_taxpayer: true,
          qualified_manufacturer: true,
          original_use_begins_with_taxpayer: true,
          claimed_new_clean_credit_for_vin: false,
          primarily_used_in_us: true,
          subject_to_depreciation: true,
          vehicle_design: "street_vehicle",
          powered_partly_by_gas_or_diesel: false,
          gvwr_pounds: 10_000,
          cost_or_other_basis: 60_000,
          section179_expense_deduction: 0,
          incremental_cost: {
            kind: "2025_light_street_safe_harbor",
            is_compact_car_phev: false,
          },
          propulsion: {
            kind: "plug_in_electric",
            battery_capacity_kwh: 80,
            externally_rechargeable: true,
          },
        },
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f3800?.f8936_commercial_vehicle_credit, {
    credit_amount: 7_500,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.pending.f3800?.allowed_credit, 7_500);
  assertEquals(result.pending.schedule3?.line6a_total, 7_500);
});
