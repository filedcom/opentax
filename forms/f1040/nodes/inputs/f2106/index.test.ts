import { assertEquals, assertThrows } from "@std/assert";
import type { z } from "zod";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { scheduleA } from "../schedule_a/index.ts";
import {
  calculateForm2106Lines,
  EmployeeType,
  f2106,
  itemSchema,
  VehicleMethod,
} from "./index.ts";

type Item = z.infer<typeof itemSchema>;

function feeJob(): Item {
  return {
    job: {
      tax_year: 2025,
      owner: "taxpayer",
      employee_name: "Casey Rivera",
      employee_ssn: "123-45-6789",
      occupation: "County hearing officer",
      employer_name: "Sample County",
      employer_ein: "12-3456789",
      employment_record_reference: "2025 county appointment and W-2",
    },
    qualification: {
      kind: EmployeeType.FEE_BASIS_OFFICIAL,
      state_or_local_government_employer: true,
      compensated_on_fee_basis: true,
      qualifying_service_reference: "2025 county fee schedule",
    },
    vehicle: { method: VehicleMethod.NONE },
    expenses: {
      line2_parking_tolls_local_transportation: 0,
      line3_overnight_travel_excluding_meals: 0,
      line4_other_business_expenses: 1_200,
      line5_meals: 0,
      standard_50_percent_meal_limit_confirmed: true,
      expense_records_reference: "2025 county expense ledger",
      job_business_purpose: "Hearing preparation",
    },
    reimbursements: {
      line7_column_a_nonmeals: 0,
      line7_column_b_meals: 0,
      employer_reimbursement_record_reference:
        "2025 county reimbursement ledger",
      excluded_from_w2_box1_confirmed: true,
    },
  };
}

function compute(items: Item[]) {
  return f2106.compute(
    { taxYear: 2025, formType: "f1040" },
    { f2106s: items },
  );
}

Deno.test("Form 2106 rejects old category-only and unallocated-reimbursement shapes", () => {
  assertEquals(
    itemSchema.safeParse({ employee_type: EmployeeType.RESERVIST }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...feeJob(),
      employer_reimbursements: 100,
    }).success,
    false,
  );
});

Deno.test("Form 2106 fee-basis job calculates Part I line 4 and Schedule 1 only", () => {
  const item = feeJob();
  assertEquals(calculateForm2106Lines(item).line10_deduction, 1_200);
  const result = compute([item]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line12_business_expenses,
    1_200,
  );
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.line12_business_expenses,
    1_200,
  );
  assertEquals(fieldsOf(result.outputs, scheduleA), undefined);
});

Deno.test("Form 2106 impairment line 4 routes to Schedule A, not Schedule 1 or AGI", () => {
  const item: Item = {
    ...feeJob(),
    qualification: {
      kind: EmployeeType.DISABLED_IMPAIRMENT,
      physical_or_mental_disability: true,
      costs_enable_work_at_place_of_employment: true,
      impairment_work_expense_reference:
        "2025 workplace attendant-care records",
    },
  };
  const result = compute([item]);
  assertEquals(
    fieldsOf(result.outputs, scheduleA)?.line_16_other_deductions,
    1_200,
  );
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
  assertEquals(fieldsOf(result.outputs, agi_aggregator), undefined);
});

Deno.test("Form 2106 mixed jobs keep Schedule A and Schedule 1 amounts separate", () => {
  const impairment: Item = {
    ...feeJob(),
    job: {
      ...feeJob().job,
      employment_record_reference: "2025 separate workplace job record",
    },
    qualification: {
      kind: EmployeeType.DISABLED_IMPAIRMENT,
      physical_or_mental_disability: true,
      costs_enable_work_at_place_of_employment: true,
      impairment_work_expense_reference: "2025 workplace service invoice",
    },
    expenses: { ...feeJob().expenses, line4_other_business_expenses: 600 },
  };
  const result = compute([feeJob(), impairment]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line12_business_expenses,
    1_200,
  );
  assertEquals(
    fieldsOf(result.outputs, scheduleA)?.line_16_other_deductions,
    600,
  );
});

Deno.test("Form 2106 requires distinct job records and consistent owner SSN", () => {
  const first = feeJob();
  assertEquals(
    f2106.inputSchema.safeParse({ f2106s: [first, first] }).success,
    false,
  );
  assertEquals(
    f2106.inputSchema.safeParse({
      f2106s: [first, {
        ...first,
        job: {
          ...first.job,
          employee_ssn: "987-65-4321",
          employment_record_reference: "2025 second job",
        },
      }],
    }).success,
    false,
  );
});

Deno.test("Form 2106 reimbursement columns are applied before the 50% meals limit", () => {
  const item: Item = {
    ...feeJob(),
    expenses: {
      ...feeJob().expenses,
      line4_other_business_expenses: 500,
      line5_meals: 300,
    },
    reimbursements: {
      ...feeJob().reimbursements,
      line7_column_a_nonmeals: 100,
      line7_column_b_meals: 100,
    },
  };
  const lines = calculateForm2106Lines(item);
  assertEquals(lines.line8_column_a, 400);
  assertEquals(lines.line8_column_b, 200);
  assertEquals(lines.line9_column_b, 100);
  assertEquals(lines.line10_deduction, 500);
});

Deno.test("Form 2106 excess nonmeal reimbursement refuses tax routing until W-2/1040 line 1a joins", () => {
  const item: Item = {
    ...feeJob(),
    reimbursements: {
      ...feeJob().reimbursements,
      line7_column_a_nonmeals: 1_500,
    },
  };
  assertEquals(
    calculateForm2106Lines(item).excess_nonmeal_reimbursement_to_1040_line1a,
    300,
  );
  assertThrows(() => compute([item]), Error, "line 1a");
});

Deno.test("Form 2106 standard-mileage source calculates line 22 and rejects inconsistent Part II miles", () => {
  const vehicle: Item["vehicle"] = {
    method: VehicleMethod.STANDARD_MILEAGE,
    placed_in_service_date: "2025-02-01",
    total_miles: 10_000,
    business_miles: 1_000,
    average_daily_roundtrip_commuting_miles: 20,
    commuting_miles: 4_000,
    available_for_personal_use_off_duty: true,
    other_personal_vehicle_available: false,
    written_mileage_evidence_reference: "2025 mileage log",
    no_personal_to_business_conversion_during_year_confirmed: true,
    standard_mileage_eligibility: {
      ownership: "owned",
      used_standard_mileage_first_business_year: true,
      method_history_reference: "2025 vehicle election record",
    },
  };
  const lines = calculateForm2106Lines({ ...feeJob(), vehicle });
  assertEquals(lines.line1_vehicle, 700);
  assertEquals(lines.vehicle_part_ii?.line14_business_use_percent, 10);
  assertEquals(lines.vehicle_part_ii?.line17_other_personal_miles, 5_000);
  assertEquals(lines.vehicle_part_ii?.line22_standard_mileage_deduction, 700);
  assertEquals(
    itemSchema.safeParse({
      ...feeJob(),
      vehicle: { ...vehicle, business_miles: 7_000 },
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...feeJob(),
      vehicle: { ...vehicle, placed_in_service_date: "2025-02-30" },
    }).success,
    false,
  );
});

Deno.test("Form 2106 actual vehicle and reservist branches fail closed", () => {
  assertThrows(
    () =>
      calculateForm2106Lines({
        ...feeJob(),
        vehicle: {
          method: VehicleMethod.ACTUAL_EXPENSE,
          placed_in_service_date: "2025-02-01",
          total_miles: 10_000,
          business_miles: 1_000,
          average_daily_roundtrip_commuting_miles: 20,
          commuting_miles: 4_000,
          available_for_personal_use_off_duty: true,
          other_personal_vehicle_available: false,
          written_mileage_evidence_reference: "2025 mileage log",
          operating_costs_line23: 1_000,
          rentals_line24a: 0,
          inclusion_amount_line24b: 0,
          employer_vehicle_value_line25: 0,
          depreciation_line28: 0,
          depreciation_workpaper_reference: "2025 depreciation worksheet",
        },
      }),
    Error,
    "actual vehicle",
  );
  assertThrows(
    () =>
      calculateForm2106Lines({
        ...feeJob(),
        qualification: {
          kind: EmployeeType.RESERVIST,
          reserve_component_reference: "2025 reserve orders",
          travel_more_than_100_miles_from_home: true,
          federal_per_diem_limit_workpaper_reference:
            "2025 travel cap worksheet",
        },
      }),
    Error,
    "reservist",
  );
});

Deno.test("Form 2106 impairment source refuses unrelated travel and meals", () => {
  const item = feeJob();
  assertEquals(
    itemSchema.safeParse({
      ...item,
      qualification: {
        kind: EmployeeType.DISABLED_IMPAIRMENT,
        physical_or_mental_disability: true,
        costs_enable_work_at_place_of_employment: true,
        impairment_work_expense_reference: "2025 workplace invoice",
      },
      expenses: {
        ...item.expenses,
        line3_overnight_travel_excluding_meals: 100,
      },
    }).success,
    false,
  );
});

Deno.test("Form 2106 performing-artist source remains fail-closed until owner-wide qualification", () => {
  const item = feeJob();
  const artist: Item = {
    ...item,
    qualification: {
      kind: EmployeeType.PERFORMING_ARTIST,
      employers: [
        { employer_ein: "12-3456789", wages: 500, w2_reference: "2025 W-2 A" },
        { employer_ein: "98-7654321", wages: 500, w2_reference: "2025 W-2 B" },
      ],
      performing_arts_gross_income: 5_000,
      adjusted_gross_income_before_artist_deduction: 15_000,
      filing_status: "single",
      married_at_year_end: false,
      lived_apart_from_spouse_all_year: false,
    },
  };
  if (artist.qualification.kind !== EmployeeType.PERFORMING_ARTIST) {
    throw new Error("Expected performing-artist test source");
  }
  assertEquals(itemSchema.safeParse(artist).success, true);
  assertThrows(() => calculateForm2106Lines(artist), Error, "owner-wide");
  assertEquals(
    itemSchema.safeParse({
      ...artist,
      qualification: {
        ...artist.qualification,
        employers: [
          artist.qualification.employers[0],
          artist.qualification.employers[0],
        ],
      },
    }).success,
    false,
  );
});
