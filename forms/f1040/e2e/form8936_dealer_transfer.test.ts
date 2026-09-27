import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

Deno.test("E2E: ineligible dealer-transferred new clean vehicle reaches Schedule 2, not Schedule 3", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
    },
    w2: [{
      box1_wages: 200_000,
      box2_fed_withheld: 30_000,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.20,
      box5_medicare_wages: 200_000,
      box6_medicare_withheld: 2_900,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      box12_entries: [],
    }],
    f8936: {
      current_year_magi: { adjusted_gross_income: 200_000 },
      prior_year_magi: { adjusted_gross_income: 200_000 },
      filing_status: FilingStatus.Single,
      prior_year_filing_status: FilingStatus.Single,
      f8936s: [{
        vin: "1HGCM82633A004352",
        vehicle_year: 2025,
        vehicle_make: "Example",
        vehicle_model: "EV",
        placed_in_service_date: "2025-09-30",
        acquisition_date: "2025-09-30",
        seller_report_received: true,
        transferred_to_dealer: true,
        transferred_amount: 7_500,
        resold_within_30_days: false,
        acquired_for_use_not_resale: true,
        credit_kind: "new_clean_vehicle",
        credit_amount: 7_500,
        msrp: 45_000,
        vehicle_type: "other",
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.schedule2?.line1b_new_clean_vehicle_repayment,
    7_500,
  );
  assertEquals(result.pending.schedule3?.line6f_total ?? 0, 0);
  assertEquals(result.pending.f1040?.line17_additional_taxes, 7_500);
  assertEquals(
    result.pending.f1040?.line18_total_tax_before_credits,
    Number(result.pending.f1040?.line16_income_tax) + 7_500,
  );
});
