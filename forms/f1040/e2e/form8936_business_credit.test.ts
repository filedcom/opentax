import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

Deno.test("Form 8936 mixed-use new vehicle routes its business share through Form 3800", () => {
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
        vin: "1HGCM82633A004352",
        vehicle_year: 2025,
        vehicle_make: "Example",
        vehicle_model: "EV",
        placed_in_service_date: "2025-09-30",
        acquisition_date: "2025-09-30",
        seller_report_received: true,
        transferred_to_dealer: false,
        resold_within_30_days: false,
        acquired_for_use_not_resale: true,
        is_new_vehicle: true,
        credit_amount: 7_500,
        msrp: 45_000,
        vehicle_type: "other",
        business_credit_subject_to_passive_activity_limit: false,
        business_use: {
          kind: "mileage",
          business_miles: 250,
          commuting_miles: 0,
          total_miles: 1_000,
          months_in_business_use: 12,
        },
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f3800?.f8936_new_vehicle_credit, {
    credit_amount: 1_875,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.pending.f3800?.allowed_credit, 1_875);
  assertEquals(result.pending.schedule3?.line6f_total, 5_625);
  assertEquals(result.pending.schedule3?.line6a_total, 1_875);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, 7_500);
});
