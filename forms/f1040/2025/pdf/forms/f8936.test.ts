import { assertEquals } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { form8936Pdf } from "./f8936.ts";
import { form8936ScheduleAPdf } from "./f8936_schedule_a.ts";

const vehicle = {
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
};

const source = {
  current_year_magi: { adjusted_gross_income: 50_000 },
  prior_year_magi: { adjusted_gross_income: 48_000 },
  filing_status: FilingStatus.Single,
  prior_year_filing_status: FilingStatus.Single,
  f8936s: [vehicle],
};

const pending = {
  f1040: { line11_agi: 50_000, line18_total_tax_before_credits: 5_000 },
  schedule3: { line6f_total: 5_000, line6m_total: 0 },
};

Deno.test("Form 8936 PDF: printed lines distinguish tentative and allowed credit", () => {
  const fields = form8936Pdf.projectFields!(source, pending);
  assertEquals(fields.line1a, 50_000);
  assertEquals(fields.line5, "S");
  assertEquals(fields.line9, 7_500);
  assertEquals(fields.line12, 5_000);
  assertEquals(fields.line13, 5_000);
});

Deno.test("Form 8936 Schedule A PDF: one personal-use vehicle fills its Part II and III facts", () => {
  const projected = form8936ScheduleAPdf.projectFields!(source, pending);
  const instances = form8936ScheduleAPdf.instances!(projected);
  assertEquals(instances.length, 1);
  assertEquals(instances[0].vin, vehicle.vin);
  assertEquals(instances[0].service_date, "09/30/2025");
  assertEquals(instances[0].new_tentative_credit, 7_500);
  assertEquals(instances[0].new_personal_credit, 7_500);
  assertEquals(instances[0].new_current_magi_over_limit, false);
});

Deno.test("Form 8936 Schedule A PDF: one page per vehicle, with previously owned Part IV", () => {
  const used = {
    ...vehicle,
    vin: "5YJSA1E26HF000337",
    vehicle_year: 2022,
    is_new_vehicle: false,
    credit_amount: undefined,
    sale_price: 15_000,
    claimed_as_dependent: false,
    claimed_prev_owned_credit_last_3_years: false,
    purchased_from_dealer: true,
    previously_owned_first_eligible_transfer: true,
  };
  const both = { ...source, f8936s: [vehicle, used] };
  const finalized = {
    f1040: { line11_agi: 50_000, line18_total_tax_before_credits: 9_000 },
    schedule3: { line6f_total: 5_000, line6m_total: 4_000 },
  };
  const projected = form8936ScheduleAPdf.projectFields!(both, finalized);
  const instances = form8936ScheduleAPdf.instances!(projected);
  assertEquals(instances.length, 2);
  assertEquals(instances[1].is_used_vehicle, true);
  assertEquals(instances[1].used_sale_price, 15_000);
  assertEquals(instances[1].used_sale_price_30pct, 4_500);
  assertEquals(instances[1].used_personal_credit, 4_000);
});

Deno.test("Form 8936 PDF: ineligible dealer transfer prints MAGI and Schedule A repayment facts, not a claimed credit", () => {
  const transfer = {
    ...source,
    current_year_magi: { adjusted_gross_income: 200_000 },
    prior_year_magi: { adjusted_gross_income: 200_000 },
    f8936s: [{
      ...vehicle,
      transferred_to_dealer: true,
      transferred_amount: 7_500,
    }],
  };
  const finalized = {
    f1040: { line11_agi: 200_000, line18_total_tax_before_credits: 7_500 },
    schedule2: { line1b_new_clean_vehicle_repayment: 7_500 },
  };
  const parent = form8936Pdf.projectFields!(transfer, finalized);
  assertEquals(parent.line1a, 200_000);
  assertEquals(parent.line9, undefined);
  const projected = form8936ScheduleAPdf.projectFields!(transfer, finalized);
  const instances = form8936ScheduleAPdf.instances!(projected);
  assertEquals(instances.length, 1);
  assertEquals(instances[0].transferred_to_dealer, true);
  assertEquals(instances[0].transferred_amount, 7_500);
  assertEquals(instances[0].dealer_transfer_repayment, true);
  assertEquals(instances[0].new_current_magi_over_limit, true);
  assertEquals(instances[0].new_prior_magi_over_limit, true);
  assertEquals(instances[0].new_personal_credit, undefined);
});
