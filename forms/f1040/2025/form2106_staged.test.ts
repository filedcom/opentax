import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { EmployeeType, VehicleMethod } from "../nodes/inputs/f2106/index.ts";
import {
  buildStagedIRS2106,
  prepareForm2106,
  projectStagedForm2106Pdf,
  reconcileStagedForm2106Return,
  stagedForm2106PdfFields,
} from "./form2106_staged.ts";

function feeJob() {
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
      line4_other_business_expenses: 1200,
      line5_meals: 0,
      standard_50_percent_meal_limit_confirmed: true,
      expense_records_reference: "2025 county expense ledger",
      job_business_purpose: "Hearing preparation",
    },
    reimbursements: {
      line7_column_a_nonmeals: 0,
      line7_column_b_meals: 0,
      employer_reimbursement_record_reference: "2025 reimbursement ledger",
      excluded_from_w2_box1_confirmed: true,
    },
  };
}

Deno.test("staged Form 2106 XML and PDF project the same line 10", () => {
  const job = feeJob();
  const prepared = prepareForm2106(job);
  const xml = buildStagedIRS2106(job);
  const pdf = projectStagedForm2106Pdf(job);
  assertEquals(prepared.contribution.route, "schedule1_line12");
  assertEquals(prepared.contribution.amount, 1200);
  assertStringIncludes(xml, "<SSN>123456789</SSN>");
  assertStringIncludes(
    xml,
    "<UnreimEmployeeBusExpnsAmt>1200</UnreimEmployeeBusExpnsAmt>",
  );
  assertEquals(pdf.line10_deduction, 1200);
  assertEquals([pdf.ssn_first, pdf.ssn_middle, pdf.ssn_last], [
    "123",
    "45",
    "6789",
  ]);
  assertEquals(
    stagedForm2106PdfFields.find((field) =>
      field.domainKey === "line10_deduction"
    )?.pdfField,
    "topmostSubform[0].Page1[0].f1_25[0]",
  );
});

Deno.test("staged Form 2106 impairment contributes to Schedule A, never Schedule 1", () => {
  const job = feeJob();
  const impairment = {
    ...job,
    qualification: {
      kind: EmployeeType.DISABLED_IMPAIRMENT,
      physical_or_mental_disability: true,
      costs_enable_work_at_place_of_employment: true,
      impairment_work_expense_reference: "2025 attendant-care records",
    },
  };
  assertEquals(
    prepareForm2106(impairment).contribution.route,
    "schedule_a_line16",
  );
  assertStringIncludes(
    buildStagedIRS2106(impairment),
    "<BusExpnssLessMealsEntrmtAmt>1200</BusExpnssLessMealsEntrmtAmt>",
  );
});

Deno.test("staged Form 2106 standard mileage uses MeF fractional ratio and printed PDF percent", () => {
  const job = feeJob();
  const withVehicle = {
    ...job,
    vehicle: {
      method: VehicleMethod.STANDARD_MILEAGE,
      placed_in_service_date: "2025-02-03",
      total_miles: 10_000,
      business_miles: 4_000,
      average_daily_roundtrip_commuting_miles: 10,
      commuting_miles: 2_000,
      available_for_personal_use_off_duty: true,
      other_personal_vehicle_available: false,
      written_mileage_evidence_reference: "2025 mileage log",
      no_personal_to_business_conversion_during_year_confirmed: true,
      standard_mileage_eligibility: {
        ownership: "owned",
        used_standard_mileage_first_business_year: true,
        method_history_reference: "vehicle method record",
      },
    },
  };
  const xml = buildStagedIRS2106(withVehicle);
  const pdf = projectStagedForm2106Pdf(withVehicle);
  assertStringIncludes(
    xml,
    "<VehBusInvestmentUsePct>0.4</VehBusInvestmentUsePct>",
  );
  assertStringIncludes(
    xml,
    "<StandardMileageDeductionAmt>2800</StandardMileageDeductionAmt>",
  );
  assertEquals(pdf.line14_business_use_percent, "40");
  assertEquals(pdf.line22_standard_mileage_deduction, 2800);
  assertEquals([pdf.line11_month, pdf.line11_day, pdf.line11_year], [
    "02",
    "03",
    "2025",
  ]);
});

Deno.test("staged Form 2106 refuses reimbursement excess without Form 1040 line 1a reconciliation", () => {
  const job = feeJob();
  const excess = {
    ...job,
    reimbursements: { ...job.reimbursements, line7_column_a_nonmeals: 1500 },
  };
  assertThrows(() => prepareForm2106(excess), Error, "line 1a");
  assertThrows(() => buildStagedIRS2106(excess), Error, "line 1a");
  assertThrows(() => projectStagedForm2106Pdf(excess), Error, "line 1a");
});

function feePending(job = feeJob()) {
  return {
    f2106: { f2106s: [job] },
    f1040: {
      filing_status: "single",
      taxpayer_first_name: "Casey",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "123-45-6789",
      line10_adjustments: 1_200,
    },
    schedule1: {
      line12_business_expenses: 1_200,
      line26_total_adjustments: 1_200,
    },
    agi_aggregator: { line12_business_expenses: 1_200 },
  };
}

Deno.test("staged Form 2106 joins every job to finalized filer and Schedule 1 / 1040", () => {
  const pending = feePending();
  assertEquals(reconcileStagedForm2106Return(pending).schedule1Total, 1_200);
  assertThrows(
    () =>
      reconcileStagedForm2106Return({
        ...pending,
        f1040: { ...pending.f1040, taxpayer_ssn: "999-99-9999" },
      }),
    Error,
    "employee differs",
  );
  assertThrows(
    () =>
      reconcileStagedForm2106Return({
        ...pending,
        schedule1: { ...pending.schedule1, line12_business_expenses: 1_199 },
      }),
    Error,
    "Schedule 1 line 12",
  );
});

Deno.test("staged Form 2106 impairment requires exact Schedule A and itemized Form 1040 join", () => {
  const fee = feeJob();
  const impairment = {
    ...fee,
    qualification: {
      kind: EmployeeType.DISABLED_IMPAIRMENT,
      physical_or_mental_disability: true,
      costs_enable_work_at_place_of_employment: true,
      impairment_work_expense_reference: "2025 attendant-care records",
    },
  };
  const pending = {
    f2106: { f2106s: [impairment] },
    f1040: {
      filing_status: "single",
      taxpayer_first_name: "Casey",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "123-45-6789",
      line12e_itemized_deductions: 20_000,
    },
    schedule_a: { line_16_other_deductions: 1_200 },
    standard_deduction: { itemized_deductions: 20_000 },
  };
  assertEquals(reconcileStagedForm2106Return(pending).scheduleATotal, 1_200);
  assertThrows(
    () =>
      reconcileStagedForm2106Return({
        ...pending,
        schedule_a: { line_16_other_deductions: 1_300 },
      }),
    Error,
    "Schedule A line 16",
  );
  assertThrows(
    () =>
      reconcileStagedForm2106Return({
        ...pending,
        f1040: {
          ...pending.f1040,
          line12e_itemized_deductions: 19_999,
        },
      }),
    Error,
    "Form 1040 line 12e",
  );
});
