import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateQualifiedTipsSchedule1A,
  calculateSeniorOnlySchedule1A,
  calculateVehicleInterestSchedule1A,
  calculateW2OvertimeSchedule1A,
  type SeniorOnlyLines,
  seniorZeroExclusionsReviewSchema,
} from "../../../../../../nodes/intermediate/forms/deductions/additional/schedule1a/index.ts";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import { buildMefXml } from "../../../../builder.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../../../../types.ts";
import { schedule1a } from "./schedule1a.ts";
import { schedule1aPdf } from "../../../../../pdf/forms/deductions/additional/schedule1a/schedule1a.ts";

Deno.test("Schedule 1-A omits context-only input before validating fractional return AGI", () => {
  assertEquals(
    schedule1a.build(
      { filing_status: FilingStatus.Single, magi: 74_348.18 },
      { pending: { f1040: { line11_agi: 74_348.18 } } },
    ),
    "",
  );
});

Deno.test("Schedule 1-A does not silently omit a positive senior source without Part I review", () => {
  const claim = {
    filing_status: FilingStatus.Single,
    magi: 60_000,
    taxpayer_age_65_or_older: true,
    taxpayer_has_valid_ssn: true,
    taxpayer_ssn: "111223333",
  };
  assertThrows(
    () => schedule1a.build(claim, { pending: { f1040: {} } }),
    Error,
    "sourced Part I zero-exclusion review",
  );
});

const review = {
  no_section933_puerto_rico_excluded_income: true as const,
  section933_review_source_reference: "2025 residency and income review",
  no_form2555_filed: true as const,
  form2555_review_source_reference: "2025 foreign-income return review",
  no_form4563_filed: true as const,
  form4563_review_source_reference: "2025 Samoa-source income review",
};

const joint = {
  filing_status: FilingStatus.MFJ,
  magi: 160_000,
  taxpayer_age_65_or_older: true,
  taxpayer_has_valid_ssn: true,
  taxpayer_ssn: "111223333",
  spouse_age_65_or_older: true,
  spouse_has_valid_ssn: true,
  spouse_ssn: "222334444",
  senior_zero_exclusions_review: review,
};

const joint1040 = {
  filing_status: FilingStatus.MFJ,
  line11_agi: 160_000,
  line13b_additional_deductions: 10_800,
  schedule1a_line37_senior_deduction: 10_800,
  taxpayer_ssn: "111223333",
  taxpayer_age_65_or_older: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  spouse_ssn: "222334444",
  spouse_age_65_or_older: true,
  spouse_ssn_valid_for_employment: true,
  spouse_ssn_issued_before_due_date: true,
  spouse_tin_issued_by_due_date: true,
};

const singleTips = {
  filing_status: FilingStatus.Single,
  magi: 30_000,
  taxpayer_ssn: "111223333",
  taxpayer_has_valid_ssn: true,
  senior_zero_exclusions_review: review,
  qualified_employee_tips: [{
    employee_ssn: "111223333",
    employer_ein: "123456789",
    employer_name: "Test Restaurant",
    amount: 5_000,
    box5_medicare_wages: 30_000,
    occupation_code: "102",
    source_type: "w2_box7" as const,
  }],
};

const singleTips1040 = {
  filing_status: FilingStatus.Single,
  line11_agi: 30_000,
  line13b_additional_deductions: 5_000,
  schedule1a_line37_senior_deduction: 0,
  taxpayer_ssn: "111223333",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
};

const singleTipsW2 = {
  w2s: [{
    employee_ssn: "111223333",
    employer_ein: "123456789",
    employer_name: "Test Restaurant",
    box1_wages: 30_000,
    box2_fed_withheld: 2_500,
    box5_medicare_wages: 30_000,
    box7_ss_tips: 5_000,
    box14b_tipped_code: "102",
  }],
};

const overtimeEntry = {
  employee_ssn: "111223333",
  employer_ein: "123456789",
  amount: 4_000,
  box1_wages: 80_000,
  covered_nonexempt_employee: true as const,
  premium_included_in_box1: true as const,
  source_reference: "Employer box 14 FLSA premium and coverage review",
};

const singleOvertime = {
  filing_status: FilingStatus.Single,
  magi: 80_000,
  taxpayer_ssn: "111223333",
  taxpayer_has_valid_ssn: true,
  senior_zero_exclusions_review: review,
  qualified_w2_overtime: [
    { ...overtimeEntry, amount: 3_000 },
    { ...overtimeEntry, employer_ein: "987654321", amount: 1_000 },
  ],
};

const overtimeW2 = (entry: typeof overtimeEntry) => ({
  employee_ssn: entry.employee_ssn,
  employer_ein: entry.employer_ein,
  employer_name: "Test Employer",
  box1_wages: entry.box1_wages,
  box2_fed_withheld: 8_000,
  box14_entries: [{
    description: "FLSA Overtime Premium",
    amount: entry.amount,
    is_state_sdi_pfml: false,
  }],
  flsa_overtime_review: {
    covered_nonexempt_employee: true as const,
    premium_included_in_box1: true as const,
    source_reference: entry.source_reference,
  },
});
const singleOvertimeW2 = {
  w2s: singleOvertime.qualified_w2_overtime.map(overtimeW2),
};

const singleOvertime1040 = {
  filing_status: FilingStatus.Single,
  line11_agi: 80_000,
  line13b_additional_deductions: 4_000,
  schedule1a_line37_senior_deduction: 0,
  taxpayer_ssn: "111223333",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
};

Deno.test("Schedule 1-A employer statement overtime reconciles to W-2 and finalized Form 1040", () => {
  const statement = {
    tax_year: 2025 as const,
    employee_ssn: "111223333",
    employer_ein: "123456789",
    qualified_overtime_premium: 4_000,
    statement_reference: "Furnished 2025 FLSA premium statement",
    furnished_to_employee: true as const,
  };
  const w2 = {
    w2s: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      employer_name: "Test Employer",
      box1_wages: 80_000,
      box2_fed_withheld: 8_000,
      flsa_overtime_review: {
        covered_nonexempt_employee: true as const,
        premium_included_in_box1: true as const,
        source_reference: "2025 FLSA coverage review",
        employer_statement: statement,
      },
    }],
  };
  const claim = {
    ...singleOvertime,
    qualified_w2_overtime: [{
      ...overtimeEntry,
      source_reference: "2025 FLSA coverage review",
      employer_statement_reference: statement.statement_reference,
    }],
  };
  const pending = { f1040: singleOvertime1040, w2 };
  const xml = schedule1a.build(claim, { pending });
  assertStringIncludes(
    xml,
    "<QualifiedOvertimeWagesAmt>4000</QualifiedOvertimeWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalAdditionalDeductionsAmt>4000</TotalAdditionalDeductionsAmt>",
  );
  assertThrows(
    () =>
      schedule1a.build(claim, {
        pending: {
          ...pending,
          w2: {
            w2s: [{
              ...w2.w2s[0],
              flsa_overtime_review: {
                ...w2.w2s[0].flsa_overtime_review,
                employer_statement: {
                  ...statement,
                  qualified_overtime_premium: 3_000,
                },
              },
            }],
          },
        },
      }),
    Error,
    "does not match the filed W-2",
  );
  assertThrows(
    () =>
      schedule1a.build(claim, {
        pending: { ...pending, w2: { w2s: [w2.w2s[0], w2.w2s[0]] } },
      }),
    Error,
    "does not match the filed W-2",
  );
});

Deno.test("Schedule 1-A replays aggregate overtime payroll source at native and PDF export", () => {
  const aggregate = {
    tax_year: 2025 as const,
    employee_ssn: "111223333",
    employer_ein: "123456789",
    aggregate_time_and_half_overtime_pay: 12_000,
    time_and_half_rate_confirmed: true as const,
    all_hours_exceed_forty_per_workweek_confirmed: true as const,
    covers_full_tax_year: true as const,
    premium_not_separately_stated: true as const,
    statement_reference: "Full-year employer overtime payroll summary",
    furnished_to_employee: true as const,
  };
  const w2 = {
    w2s: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      employer_name: "Test Employer",
      box1_wages: 80_000,
      box2_fed_withheld: 8_000,
      flsa_overtime_review: {
        covered_nonexempt_employee: true as const,
        premium_included_in_box1: true as const,
        source_reference: "FLSA coverage and box 1 review",
        aggregate_overtime_statement: aggregate,
      },
    }],
  };
  const claim = {
    ...singleOvertime,
    qualified_w2_overtime: [{
      ...overtimeEntry,
      source_reference: "FLSA coverage and box 1 review",
      aggregate_overtime_statement_reference: aggregate.statement_reference,
    }],
  };
  const pending = { f1040: singleOvertime1040, w2 };
  const xml = schedule1a.build(claim, { pending });
  assertStringIncludes(
    xml,
    "<QualifiedOvertimeWagesAmt>4000</QualifiedOvertimeWagesAmt>",
  );
  assertEquals(
    schedule1aPdf.projectFields?.(claim, pending).line21_overtime,
    4_000,
  );
  assertThrows(
    () =>
      schedule1a.build(claim, {
        pending: {
          ...pending,
          w2: {
            w2s: [{
              ...w2.w2s[0],
              flsa_overtime_review: {
                ...w2.w2s[0].flsa_overtime_review,
                aggregate_overtime_statement: {
                  ...aggregate,
                  aggregate_time_and_half_overtime_pay: 9_000,
                },
              },
            }],
          },
        },
      }),
    Error,
    "does not match the filed W-2",
  );
  const changed = {
    ...pending,
    w2: {
      w2s: [{
        ...w2.w2s[0],
        flsa_overtime_review: {
          ...w2.w2s[0].flsa_overtime_review,
          aggregate_overtime_statement: {
            ...aggregate,
            aggregate_time_and_half_overtime_pay: 9_000,
          },
        },
      }],
    },
  };
  assertThrows(
    () => schedule1aPdf.projectFields?.(claim, changed),
    Error,
    "does not match the filed W-2",
  );
});

Deno.test("Schedule 1-A replays double-time excess pay at native and PDF export", () => {
  const doubleTime = {
    tax_year: 2025 as const,
    employee_ssn: "111223333",
    employer_ein: "123456789",
    excess_over_regular_pay: 10_000,
    double_time_rate_confirmed: true as const,
    all_hours_exceed_forty_per_workweek_confirmed: true as const,
    covers_full_tax_year: true as const,
    statement_reference: "Full-year double-time excess statement",
    furnished_to_employee: true as const,
  };
  const w2 = {
    w2s: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      employer_name: "Test Employer",
      box1_wages: 80_000,
      box2_fed_withheld: 8_000,
      flsa_overtime_review: {
        covered_nonexempt_employee: true as const,
        premium_included_in_box1: true as const,
        source_reference: "FLSA coverage and box 1 review",
        double_time_excess_statement: doubleTime,
      },
    }],
  };
  const claim = {
    ...singleOvertime,
    qualified_w2_overtime: [{
      ...overtimeEntry,
      amount: 5_000,
      source_reference: "FLSA coverage and box 1 review",
      double_time_excess_statement_reference: doubleTime.statement_reference,
    }],
  };
  const form = { ...singleOvertime1040, line13b_additional_deductions: 5_000 };
  const pending = { f1040: form, w2 };
  assertStringIncludes(
    schedule1a.build(claim, { pending }),
    "<QualifiedOvertimeWagesAmt>5000</QualifiedOvertimeWagesAmt>",
  );
  assertEquals(
    schedule1aPdf.projectFields?.(claim, pending).line21_overtime,
    5_000,
  );
  const changed = {
    ...pending,
    w2: {
      w2s: [{
        ...w2.w2s[0],
        flsa_overtime_review: {
          ...w2.w2s[0].flsa_overtime_review,
          double_time_excess_statement: {
            ...doubleTime,
            excess_over_regular_pay: 8_000,
          },
        },
      }],
    },
  };
  assertThrows(
    () => schedule1a.build(claim, { pending: changed }),
    Error,
    "does not match the filed W-2",
  );
  assertThrows(
    () => schedule1aPdf.projectFields?.(claim, changed),
    Error,
    "does not match the filed W-2",
  );
});

const vehicleLoan = {
  vin: "1HGCM82633A004352",
  borrower_ssn: "111223333",
  loan_originated_date: "2025-02-01",
  vehicle_purchased_date: "2025-02-01",
  lender_name: "Test Credit Union",
  lender_interest_statement_reference: "2025 lender interest statement",
  purchase_and_lien_reference: "2025 purchase and first-lien agreement",
  final_assembly_reference: "vehicle information label",
  original_borrower: true as const,
  purchase_proceeds_only: true as const,
  first_lien_secured: true as const,
  original_vehicle_use: true as const,
  road_vehicle_with_two_or_more_wheels: true as const,
  vehicle_type: "car" as const,
  gross_vehicle_weight_under_14000_pounds: true as const,
  final_assembly_in_us: true as const,
  expected_personal_use_over_half: true as const,
  qualified_interest_paid: 4_000,
  interest_deducted_elsewhere: 0 as const,
  no_other_interest_deduction_review_reference: "2025 Schedule C/E/F review",
};

const singleVehicle = {
  filing_status: FilingStatus.Single,
  magi: 80_000,
  taxpayer_ssn: "111223333",
  senior_zero_exclusions_review: review,
  vehicle_loans: [vehicleLoan],
};

Deno.test("Schedule 1-A reviewed vehicle loan fills Part IV and reconciles", () => {
  const lines = calculateVehicleInterestSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    singleVehicle,
  );
  assertEquals(lines.line22_vehicles[0].vin, vehicleLoan.vin);
  assertEquals(lines.line23_total_interest, 4_000);
  assertEquals(lines.line30_vehicle_interest, 4_000);
  const xml = schedule1a.build(singleVehicle, {
    pending: { f1040: singleOvertime1040 },
  });
  assertStringIncludes(xml, `<VIN>${vehicleLoan.vin}</VIN>`);
  assertStringIncludes(
    xml,
    "<QualifiedCarLoanIntDedSchAmt>0</QualifiedCarLoanIntDedSchAmt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedCarLoanInterestAmt>4000</QualifiedCarLoanInterestAmt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedCarLoanInterestDedAmt>4000</QualifiedCarLoanInterestDedAmt>",
  );
});

Deno.test("Schedule 1-A refinanced loan keeps one VIN and its qualified interest", () => {
  const refinanced = {
    ...singleVehicle,
    vehicle_loans: [{
      ...vehicleLoan,
      refinance: {
        refinanced_date: "2025-07-01",
        lender_name: "Second Credit Union",
        interest_statement_reference: "2025 refinance lender statement",
        refinance_and_first_lien_reference:
          "2025 refinance first-lien agreement",
        outstanding_original_principal_at_refinance: 20_000,
        refinanced_principal: 20_000,
        original_loan_interest_paid_before_refinance: 1_500,
        refinanced_loan_interest_paid: 2_500,
        first_lien_secured_on_same_vehicle: true as const,
        no_cash_out_or_ineligible_debt: true as const,
      },
    }],
  };
  const xml = schedule1a.build(refinanced, {
    pending: { f1040: singleOvertime1040 },
  });
  assertStringIncludes(xml, `<VIN>${vehicleLoan.vin}</VIN>`);
  assertStringIncludes(
    xml,
    "<QualifiedCarLoanInterestAmt>4000</QualifiedCarLoanInterestAmt>",
  );
  assertEquals(xml.match(/<QlfyPassengerVehicleLoanIntGrp>/g)?.length, 1);
});

Deno.test("Schedule 1-A vehicle loan checks borrower, duplicate VIN, and phaseout", () => {
  assertThrows(
    () =>
      schedule1a.build({
        ...singleVehicle,
        vehicle_loans: [{ ...vehicleLoan, borrower_ssn: "999887777" }],
      }, { pending: { f1040: singleOvertime1040 } }),
    Error,
    "borrower must be a return filer",
  );
  assertThrows(
    () =>
      schedule1a.build({
        ...singleVehicle,
        vehicle_loans: [vehicleLoan, vehicleLoan],
      }, { pending: { f1040: singleOvertime1040 } }),
    Error,
    "one entry per VIN",
  );
  const lines = calculateVehicleInterestSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    { ...singleVehicle, magi: 101_001 },
  );
  assertEquals(lines.line28_thousands, 2);
  assertEquals(lines.line29_reduction, 400);
  assertEquals(lines.line30_vehicle_interest, 3_600);
  const twoLoans = {
    ...singleVehicle,
    vehicle_loans: [
      { ...vehicleLoan, qualified_interest_paid: 3_000 },
      {
        ...vehicleLoan,
        vin: "1HGCM82633A004353",
        qualified_interest_paid: 1_000,
      },
    ],
  };
  const twoLoanXml = schedule1a.build(twoLoans, {
    pending: { f1040: singleOvertime1040 },
  });
  assertEquals(
    (twoLoanXml.match(/<QlfyPassengerVehicleLoanIntGrp>/g) ?? []).length,
    2,
  );
  assertStringIncludes(twoLoanXml, "<VIN>1HGCM82633A004353</VIN>");
  const threeLoans = {
    ...singleVehicle,
    vehicle_loans: [
      { ...vehicleLoan, qualified_interest_paid: 1_000 },
      {
        ...vehicleLoan,
        vin: "1HGCM82633A004353",
        qualified_interest_paid: 1_000,
      },
      {
        ...vehicleLoan,
        vin: "1HGCM82633A004354",
        qualified_interest_paid: 2_000,
      },
    ],
  };
  const threeLoanXml = schedule1a.build(threeLoans, {
    pending: { f1040: singleOvertime1040 },
  });
  assertEquals(
    (threeLoanXml.match(/<QlfyPassengerVehicleLoanIntGrp>/g) ?? []).length,
    3,
  );
  assertStringIncludes(
    threeLoanXml,
    "<TotQualifiedCarLoanInterestAmt>4000</TotQualifiedCarLoanInterestAmt>",
  );
});

Deno.test("Schedule 1-A two-employer W-2 overtime fills Part III and reconciles", () => {
  const lines = calculateW2OvertimeSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    singleOvertime,
  );
  assertEquals(lines.line14a_w2_overtime, 4_000);
  assertEquals(lines.line21_overtime, 4_000);
  const xml = schedule1a.build(singleOvertime, {
    pending: { f1040: singleOvertime1040, w2: singleOvertimeW2 },
  });
  assertStringIncludes(
    xml,
    "<QualifiedOvertimeWagesAmt>4000</QualifiedOvertimeWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedOvertimeForm1099Amt>0</QualifiedOvertimeForm1099Amt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedOvertimeCompDedAmt>4000</QualifiedOvertimeCompDedAmt>",
  );
  assertThrows(
    () =>
      schedule1a.build(singleOvertime, {
        pending: {
          f1040: singleOvertime1040,
          w2: {
            w2s: [
              {
                ...singleOvertimeW2.w2s[0],
                box14_entries: [{
                  description: "FLSA Overtime Premium",
                  amount: 2_000,
                  is_state_sdi_pfml: false,
                }],
              },
              singleOvertimeW2.w2s[1],
            ],
          },
        },
      }),
    Error,
    "box 14 overtime does not match",
  );
  assertThrows(
    () =>
      schedule1aPdf.projectFields!(singleOvertime, {
        f1040: singleOvertime1040,
        w2: {
          w2s: [
            {
              ...singleOvertimeW2.w2s[0],
              flsa_overtime_review: {
                ...singleOvertimeW2.w2s[0].flsa_overtime_review,
                source_reference: "different review",
              },
            },
            singleOvertimeW2.w2s[1],
          ],
        },
      }),
    Error,
    "box 14 overtime does not match",
  );
});

Deno.test("Schedule 1-A joint W-2 overtime caps both owners and applies whole-thousand phaseout", () => {
  const jointOvertime = {
    ...singleOvertime,
    filing_status: FilingStatus.MFJ,
    magi: 301_999,
    spouse_ssn: "444556666",
    spouse_has_valid_ssn: true,
    qualified_w2_overtime: [
      { ...overtimeEntry, amount: 15_000 },
      {
        ...overtimeEntry,
        employee_ssn: "444556666",
        employer_ein: "987654321",
        amount: 12_000,
      },
    ],
  };
  const lines = calculateW2OvertimeSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    jointOvertime,
  );
  assertEquals(lines.line14a_w2_overtime, 27_000);
  assertEquals(lines.line15_capped_overtime, 25_000);
  assertEquals(lines.line18_excess_magi, 1_999);
  assertEquals(lines.line19_thousands, 1);
  assertEquals(lines.line20_reduction, 100);
  assertEquals(lines.line21_overtime, 24_900);
  const xml = schedule1a.build(jointOvertime, {
    pending: {
      f1040: {
        ...singleOvertime1040,
        filing_status: FilingStatus.MFJ,
        line11_agi: 301_999,
        line13b_additional_deductions: 24_900,
        spouse_ssn: "444556666",
        spouse_ssn_valid_for_employment: true,
        spouse_ssn_issued_before_due_date: true,
        spouse_tin_issued_by_due_date: true,
      },
      w2: { w2s: jointOvertime.qualified_w2_overtime.map(overtimeW2) },
    },
  });
  assertStringIncludes(
    xml,
    "<OtMAGILessThrshldDivideNum>1</OtMAGILessThrshldDivideNum>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedOvertimeCompDedAmt>24900</QualifiedOvertimeCompDedAmt>",
  );
});

Deno.test("Schedule 1-A W-2 overtime enforces source ownership and duplicate employer", () => {
  assertThrows(
    () =>
      schedule1a.build({
        ...singleOvertime,
        qualified_w2_overtime: [
          overtimeEntry,
          { ...overtimeEntry, amount: 500 },
        ],
      }, { pending: { f1040: singleOvertime1040, w2: singleOvertimeW2 } }),
    Error,
    "one W-2 premium per employee and employer",
  );
  assertThrows(
    () =>
      schedule1a.build(singleOvertime, {
        pending: {
          f1040: {
            ...singleOvertime1040,
            taxpayer_ssn_issued_before_due_date: false,
          },
          w2: singleOvertimeW2,
        },
      }),
    Error,
    "do not reconcile",
  );
});

Deno.test("Schedule 1-A single-employer W-2 tips source fills Part II and reconciles", () => {
  const lines = calculateQualifiedTipsSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    singleTips,
  );
  assertEquals(lines.line4a_w2_tips, 5_000);
  assertEquals(lines.line4c_employee_tips, 5_000);
  assertEquals(lines.line13_tips, 5_000);
  const xml = schedule1a.build(singleTips, {
    pending: { f1040: singleTips1040, w2: singleTipsW2 },
  });
  assertStringIncludes(
    xml,
    "<QualifiedTipsWagesAmt>5000</QualifiedTipsWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedTipsForm4137Amt>0</QualifiedTipsForm4137Amt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedTipsDeductionAmt>5000</QualifiedTipsDeductionAmt>",
  );
  assertEquals(xml.includes("EnhancedSeniorDeductionAmt"), false);
});

Deno.test("Schedule 1-A Form 4070 replaces capped W-2 box 7 for the same employer", () => {
  const report = {
    employee_ssn: "111223333",
    employer_ein: "123456789",
    employer_name: "Test Restaurant",
    occupation_code: "102",
    occupation_review_reference: "2025 employer occupation record",
    monthly_reports: [
      {
        month: 1,
        cash_tips: 12_000,
        charged_tips: 0,
        tips_paid_out: 0,
        source_reference: "January employer report",
      },
      {
        month: 2,
        cash_tips: 8_000,
        charged_tips: 0,
        tips_paid_out: 0,
        source_reference: "February employer report",
      },
    ],
  };
  const source = {
    ...singleTips,
    magi: 200_000,
    qualified_employee_tips: [{
      ...singleTips.qualified_employee_tips[0],
      amount: 15_000,
      box5_medicare_wages: 200_000,
    }],
    form4070_reports: [report],
  };
  const pending = {
    f1040: {
      ...singleTips1040,
      line11_agi: 200_000,
      line13b_additional_deductions: 15_000,
    },
    w2: {
      w2s: [{
        ...singleTipsW2.w2s[0],
        box5_medicare_wages: 200_000,
        box7_ss_tips: 15_000,
      }],
    },
  };
  const lines = calculateQualifiedTipsSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  assertEquals(lines.line4a_w2_tips, 20_000);
  assertEquals(lines.line4c_employee_tips, 20_000);
  assertEquals(lines.line13_tips, 15_000);
  const xml = schedule1a.build(source, { pending });
  assertStringIncludes(
    xml,
    "<QualifiedTipsWagesAmt>20000</QualifiedTipsWagesAmt>",
  );
  const noW2Code = {
    ...source,
    qualified_employee_tips: [],
  };
  const noW2CodePending = {
    ...pending,
    w2: {
      w2s: [{
        ...pending.w2.w2s[0],
        box14b_tipped_code: undefined,
      }],
    },
  };
  assertStringIncludes(
    schedule1a.build(noW2Code, { pending: noW2CodePending }),
    "<QualifiedTipsWagesAmt>20000</QualifiedTipsWagesAmt>",
  );
  assertThrows(
    () =>
      schedule1a.build(noW2Code, {
        pending: {
          ...noW2CodePending,
          w2: {
            w2s: [{ ...noW2CodePending.w2.w2s[0], box14b_tipped_code: "103" }],
          },
        },
      }),
    Error,
    "W-2 tips do not match the employer sources",
  );
  assertThrows(
    () =>
      schedule1a.build({
        ...source,
        qualified_employee_tips: [],
        form4070_reports: [{ ...report, employer_ein: "987654321" }],
      }, {
        pending: {
          ...pending,
          w2: { w2s: [{ ...pending.w2.w2s[0], box7_ss_tips: 0 }] },
        },
      }),
    Error,
    "matching filed W-2",
  );
  assertThrows(
    () =>
      calculateQualifiedTipsSchedule1A(
        { taxYear: 2025, formType: "f1040" },
        {
          ...source,
          form4070_reports: [{
            ...report,
            monthly_reports: [
              report.monthly_reports[0],
              report.monthly_reports[0],
            ],
          }],
        },
      ),
    Error,
    "repeated report month",
  );
});

Deno.test("Schedule 1-A W-2 box 14 tips reconcile to the reviewed employer entry", () => {
  const review = {
    box14_description: "Employer reported tips",
    occupation_code: "102",
    occupation_review_reference: "2025 employer occupation record",
    tips_included_in_box1: true as const,
    source_reference: "2025 W-2 box 14 tip accounting",
  };
  const source = {
    ...singleTips,
    magi: 200_000,
    qualified_employee_tips: [{
      ...singleTips.qualified_employee_tips[0],
      amount: 20_000,
      box5_medicare_wages: 200_000,
      source_type: "w2_box14" as const,
    }],
  };
  const pending = {
    f1040: {
      ...singleTips1040,
      line11_agi: 200_000,
      line13b_additional_deductions: 15_000,
    },
    w2: {
      w2s: [{
        ...singleTipsW2.w2s[0],
        box1_wages: 200_000,
        box5_medicare_wages: 200_000,
        box7_ss_tips: 15_000,
        box14b_tipped_code: undefined,
        box14_entries: [{
          description: "Employer reported tips",
          amount: 20_000,
          is_state_sdi_pfml: false,
        }],
        qualified_tips_box14_review: review,
      }],
    },
  };
  const xml = schedule1a.build(source, { pending });
  assertStringIncludes(
    xml,
    "<QualifiedTipsWagesAmt>20000</QualifiedTipsWagesAmt>",
  );
  assertThrows(
    () =>
      schedule1a.build(source, {
        pending: {
          ...pending,
          w2: {
            w2s: [{
              ...pending.w2.w2s[0],
              box14_entries: [{
                ...pending.w2.w2s[0].box14_entries[0],
                amount: 19_999,
              }],
            }],
          },
        },
      }),
    Error,
    "W-2 tips do not match",
  );
});

Deno.test("Schedule 1-A employer statement replaces W-2 box 7 and rejects competing reports", () => {
  const statement = {
    employee_ssn: "111223333",
    employer_ein: "123456789",
    employer_name: "Test Restaurant",
    amount: 20_000,
    occupation_code: "102",
    occupation_review_reference: "2025 employer occupation record",
    statement_reference: "2025 employer tip statement",
    furnished_to_employee: true as const,
    included_in_w2_box1: true as const,
  };
  const source = {
    ...singleTips,
    magi: 200_000,
    qualified_employee_tips: [],
    employer_tip_statements: [statement],
  };
  const pending = {
    f1040: {
      ...singleTips1040,
      line11_agi: 200_000,
      line13b_additional_deductions: 15_000,
    },
    w2: {
      w2s: [{
        ...singleTipsW2.w2s[0],
        box1_wages: 200_000,
        box5_medicare_wages: 200_000,
        box7_ss_tips: 15_000,
        box14b_tipped_code: undefined,
      }],
    },
  };
  const lines = calculateQualifiedTipsSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  assertEquals(lines.line4a_w2_tips, 20_000);
  assertEquals(lines.line13_tips, 15_000);
  assertStringIncludes(
    schedule1a.build(source, { pending }),
    "<QualifiedTipsWagesAmt>20000</QualifiedTipsWagesAmt>",
  );
  assertThrows(
    () =>
      schedule1a.build(source, {
        pending: {
          ...pending,
          w2: { w2s: [{ ...pending.w2.w2s[0], employer_ein: "987654321" }] },
        },
      }),
    Error,
    "matching filed W-2",
  );
  assertThrows(
    () =>
      calculateQualifiedTipsSchedule1A(
        { taxYear: 2025, formType: "f1040" },
        { ...source, employer_tip_statements: [statement, statement] },
      ),
    Error,
    "one selected alternative employer report",
  );
  assertThrows(
    () =>
      calculateQualifiedTipsSchedule1A(
        { taxYear: 2025, formType: "f1040" },
        {
          ...source,
          form4070_reports: [{
            employee_ssn: statement.employee_ssn,
            employer_ein: statement.employer_ein,
            employer_name: statement.employer_name,
            occupation_code: statement.occupation_code,
            occupation_review_reference: statement.occupation_review_reference,
            monthly_reports: [{
              month: 1,
              cash_tips: 20_000,
              charged_tips: 0,
              tips_paid_out: 0,
              source_reference: "January employer report",
            }],
          }],
        },
      ),
    Error,
    "one selected alternative employer report",
  );
});

Deno.test("Schedule 1-A W-2 tips applies the $25,000 cap and whole-thousand phaseout", () => {
  const lines = calculateQualifiedTipsSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    {
      ...singleTips,
      magi: 151_999,
      qualified_employee_tips: [{
        ...singleTips.qualified_employee_tips[0],
        amount: 30_000,
      }],
    },
  );
  assertEquals(lines.line7_capped_tips, 25_000);
  assertEquals(lines.line10_excess_magi, 1_999);
  assertEquals(lines.line11_thousands, 1);
  assertEquals(lines.line12_reduction, 100);
  assertEquals(lines.line13_tips, 24_900);
});

Deno.test("Schedule 1-A combines two identified W-2 tip employers on line 4c", () => {
  const second = {
    ...singleTips.qualified_employee_tips[0],
    employer_ein: "987654321",
    employer_name: "Second Restaurant",
    amount: 2_000,
    box5_medicare_wages: 20_000,
    occupation_code: "103",
  };
  const source = {
    ...singleTips,
    magi: 50_000,
    qualified_employee_tips: [
      { ...singleTips.qualified_employee_tips[0], amount: 3_000 },
      second,
    ],
  };
  const pending = {
    f1040: { ...singleTips1040, line11_agi: 50_000 },
    w2: {
      w2s: [
        { ...singleTipsW2.w2s[0], box7_ss_tips: 3_000 },
        {
          ...singleTipsW2.w2s[0],
          employer_ein: "987654321",
          employer_name: "Second Restaurant",
          box1_wages: 20_000,
          box5_medicare_wages: 20_000,
          box7_ss_tips: 2_000,
          box14b_tipped_code: "103",
        },
      ],
    },
  };
  const lines = calculateQualifiedTipsSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  assertEquals(lines.line4a_w2_tips, 0);
  assertEquals(lines.line4c_employee_tips, 5_000);
  const xml = schedule1a.build(source, { pending });
  assertStringIncludes(xml, "<QualifiedTipsWagesAmt>0</QualifiedTipsWagesAmt>");
  assertStringIncludes(
    xml,
    "<QualifiedTipsEmployeeAmt>5000</QualifiedTipsEmployeeAmt>",
  );
  assertThrows(
    () =>
      schedule1a.build(source, {
        pending: {
          ...pending,
          w2: {
            w2s: [
              pending.w2.w2s[0],
              { ...pending.w2.w2s[1], box7_ss_tips: 2_001 },
            ],
          },
        },
      }),
    Error,
    "do not match the employer sources",
  );
});

Deno.test("Schedule 1-A tips filing rejects unsupported or unsourced Part II evidence", () => {
  const pending = { f1040: singleTips1040, w2: singleTipsW2 };
  assertThrows(
    () =>
      schedule1a.build({
        ...singleTips,
        qualified_employee_tips: [
          ...singleTips.qualified_employee_tips,
          { ...singleTips.qualified_employee_tips[0], amount: 1_000 },
        ],
      }, { pending }),
    Error,
    "one row per employee, employer, and source",
  );
  assertThrows(
    () =>
      schedule1a.build({
        ...singleTips,
        qualified_employee_tips: [{
          ...singleTips.qualified_employee_tips[0],
          occupation_code: "999",
        }],
      }, { pending }),
    Error,
    "qualifying occupation code",
  );
  assertThrows(
    () =>
      schedule1a.build({
        ...singleTips,
        qualified_employee_tips: [{
          ...singleTips.qualified_employee_tips[0],
          box5_medicare_wages: 176_101,
        }],
      }, { pending }),
    Error,
    "Medicare wages at or below",
  );
  assertThrows(
    () =>
      schedule1a.build(singleTips, {
        pending: {
          f1040: { ...singleTips1040, line13b_additional_deductions: 4_999 },
          w2: singleTipsW2,
        },
      }),
    Error,
    "do not reconcile",
  );
});

Deno.test("Schedule 1-A uses the greater of W-2 and Form 4137 tips for one employer", () => {
  const input = {
    ...singleTips,
    qualified_form4137_tips: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      employer_name: "Test Restaurant",
      amount: 6_500,
      occupation_code: "102",
    }],
  };
  const pending = {
    f1040: { ...singleTips1040, line13b_additional_deductions: 6_500 },
    w2: singleTipsW2,
    form4137: {
      taxpayer_ssn: "111223333",
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "Test Restaurant",
          ein: "123456789",
          tips_received: 6_500,
          tips_reported: 5_000,
        }],
      }],
    },
  };
  const lines = calculateQualifiedTipsSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    input,
  );
  assertEquals(lines.line4a_w2_tips, 5_000);
  assertEquals(lines.line4b_form4137_tips, 6_500);
  assertEquals(lines.line4c_employee_tips, 6_500);
  const xml = schedule1a.build(input, { pending });
  assertStringIncludes(
    xml,
    "<QualifiedTipsWagesAmt>5000</QualifiedTipsWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedTipsForm4137Amt>6500</QualifiedTipsForm4137Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalAdditionalDeductionsAmt>6500</TotalAdditionalDeductionsAmt>",
  );
  assertThrows(
    () =>
      schedule1a.build(input, {
        pending: {
          ...pending,
          form4137: {
            ...pending.form4137,
            forms: [{
              ...pending.form4137.forms[0],
              employers: [{
                ...pending.form4137.forms[0].employers[0],
                tips_received: 6_499,
              }],
            }],
          },
        },
      }),
    Error,
    "do not match the filed employer",
  );
});

Deno.test("Schedule 1-A combines Form 4137 and W-2 employers without double counting", () => {
  const input = {
    ...singleTips,
    qualified_employee_tips: [
      ...singleTips.qualified_employee_tips,
      {
        employee_ssn: "111223333",
        employer_ein: "987654321",
        employer_name: "Second Restaurant",
        amount: 2_000,
        box5_medicare_wages: 20_000,
        occupation_code: "103",
        source_type: "w2_box7" as const,
      },
    ],
    qualified_form4137_tips: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      employer_name: "Test Restaurant",
      amount: 6_500,
      occupation_code: "102",
    }],
  };
  const lines = calculateQualifiedTipsSchedule1A(
    { taxYear: 2025, formType: "f1040" },
    input,
  );
  assertEquals(lines.line4a_w2_tips, 0);
  assertEquals(lines.line4b_form4137_tips, 0);
  assertEquals(lines.line4c_employee_tips, 8_500);
  const xml = schedule1a.build(input, {
    pending: {
      f1040: {
        ...singleTips1040,
        line13b_additional_deductions: 8_500,
      },
      w2: {
        w2s: [
          singleTipsW2.w2s[0],
          {
            ...singleTipsW2.w2s[0],
            employer_ein: "987654321",
            employer_name: "Second Restaurant",
            box1_wages: 20_000,
            box5_medicare_wages: 20_000,
            box7_ss_tips: 2_000,
            box14b_tipped_code: "103",
          },
        ],
      },
      form4137: {
        taxpayer_ssn: "111223333",
        forms: [{
          recipient: "taxpayer",
          employers: [{
            name: "Test Restaurant",
            ein: "123456789",
            tips_received: 6_500,
            tips_reported: 5_000,
          }],
        }],
      },
    },
  });
  assertStringIncludes(xml, "<QualifiedTipsWagesAmt>0</QualifiedTipsWagesAmt>");
  assertStringIncludes(
    xml,
    "<QualifiedTipsForm4137Amt>0</QualifiedTipsForm4137Amt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedTipsEmployeeAmt>8500</QualifiedTipsEmployeeAmt>",
  );
});

Deno.test("Schedule 1-A native and PDF require every qualifying Form 4137 employer", () => {
  const secondW2 = {
    ...singleTipsW2.w2s[0],
    employer_ein: "987654321",
    employer_name: "Second Restaurant",
    box1_wages: 20_000,
    box5_medicare_wages: 20_000,
    box7_ss_tips: 2_000,
    box14b_tipped_code: "103",
  };
  const source = {
    ...singleTips,
    qualified_employee_tips: [
      ...singleTips.qualified_employee_tips,
      {
        employee_ssn: "111223333",
        employer_ein: "987654321",
        employer_name: "Second Restaurant",
        amount: 2_000,
        box5_medicare_wages: 20_000,
        occupation_code: "103",
        source_type: "w2_box7" as const,
      },
    ],
    qualified_form4137_tips: [
      {
        employee_ssn: "111223333",
        employer_ein: "123456789",
        employer_name: "Test Restaurant",
        amount: 6_500,
        occupation_code: "102",
      },
      {
        employee_ssn: "111223333",
        employer_ein: "987654321",
        employer_name: "Second Restaurant",
        amount: 3_000,
        occupation_code: "103",
      },
    ],
  };
  const pending = {
    f1040: { ...singleTips1040, line13b_additional_deductions: 9_500 },
    w2: { w2s: [singleTipsW2.w2s[0], secondW2] },
    form4137: {
      taxpayer_ssn: "111223333",
      forms: [{
        recipient: "taxpayer",
        employers: [
          {
            name: "Test Restaurant",
            ein: "123456789",
            tips_received: 6_500,
            tips_reported: 5_000,
          },
          {
            name: "Second Restaurant",
            ein: "987654321",
            tips_received: 3_000,
            tips_reported: 2_000,
          },
        ],
      }],
    },
  };
  assertStringIncludes(
    schedule1a.build(source, { pending }),
    "<QualifiedTipsEmployeeAmt>9500</QualifiedTipsEmployeeAmt>",
  );
  assertEquals(
    schedule1aPdf.projectFields?.(source, pending)?.line38_total,
    9_500,
  );

  const missingEmployer = {
    ...source,
    qualified_form4137_tips: [source.qualified_form4137_tips[0]],
  };
  const reducedReturn = {
    ...pending,
    f1040: { ...pending.f1040, line13b_additional_deductions: 8_500 },
  };
  assertThrows(
    () => schedule1a.build(missingEmployer, { pending: reducedReturn }),
    Error,
    "do not match the filed employer",
  );
  assertThrows(
    () => schedule1aPdf.projectFields?.(missingEmployer, reducedReturn),
    Error,
    "do not match the filed employer",
  );
});

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "SENIOR TAXPAYER",
  nameControl: "SENI",
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: MefFilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "222334444",
    firstName: "Spouse",
    lastName: "Senior",
    nameControl: "SENI",
  },
};

Deno.test("Schedule 1-A senior-only source calculates each spouse and line 38", () => {
  const lines: SeniorOnlyLines = calculateSeniorOnlySchedule1A(
    { taxYear: 2025, formType: "f1040" },
    joint,
  );
  assertEquals(lines, {
    line1_agi: 160_000,
    line3_magi: 160_000,
    line32_threshold: 150_000,
    line33_excess_magi: 10_000,
    line34_reduction: 600,
    line35_per_person: 5_400,
    line36a_taxpayer: 5_400,
    line36b_spouse: 5_400,
    line37_senior: 10_800,
    line38_total: 10_800,
  });
  const xml = schedule1a.build(joint, { pending: { f1040: joint1040 } });
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>160000</AdjustedGrossIncomeAmt>",
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>160000</ModifiedAGIAmt>");
  assertStringIncludes(
    xml,
    "<PrimaryEnhancedSeniorDedAmt>5400</PrimaryEnhancedSeniorDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<SpouseEnhancedSeniorDedAmt>5400</SpouseEnhancedSeniorDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<EnhancedSeniorDeductionAmt>10800</EnhancedSeniorDeductionAmt><TotalAdditionalDeductionsAmt>10800</TotalAdditionalDeductionsAmt>",
  );
  assertEquals(xml.includes("QualifiedTipsDeductionAmt"), false);
});

Deno.test("Schedule 1-A senior-only source supports one qualifying joint spouse", () => {
  const lines = calculateSeniorOnlySchedule1A(
    { taxYear: 2025, formType: "f1040" },
    { ...joint, spouse_age_65_or_older: false },
  );
  assertEquals(lines.line36a_taxpayer, 5_400);
  assertEquals(lines.line36b_spouse, 0);
  assertEquals(lines.line38_total, 5_400);
});

Deno.test("Schedule 1-A senior-only document accompanies reconciled Form 1040 line 13b", () => {
  const xml = buildMefXml({ f1040: joint1040, schedule1a: joint }, filer);
  assertStringIncludes(xml, '<IRS1040Schedule1A documentId="');
  assertStringIncludes(
    xml,
    "<TotalAdditionalDeductionsAmt>10800</TotalAdditionalDeductionsAmt>",
  );
  assertStringIncludes(xml, 'documentCnt="2"');
  assertEquals(
    xml.indexOf("<IRS1040 ") < xml.indexOf("<IRS1040Schedule1A "),
    true,
  );
});

Deno.test("Schedule 1-A emits all four deductions in schema order with one total", async () => {
  const mixed = {
    ...joint,
    qualified_employee_tips: singleTips.qualified_employee_tips,
    qualified_w2_overtime: [overtimeEntry],
    vehicle_loans: [vehicleLoan],
  };
  const mixedW2 = {
    w2s: [{
      ...singleTipsW2.w2s[0],
      box1_wages: overtimeEntry.box1_wages,
      box14_entries: overtimeW2(overtimeEntry).box14_entries,
      flsa_overtime_review: overtimeW2(overtimeEntry).flsa_overtime_review,
    }],
  };
  const xml = schedule1a.build(mixed, {
    pending: {
      f1040: { ...joint1040, line13b_additional_deductions: 23_800 },
      w2: mixedW2,
    },
  });
  const tags = [
    "QualifiedTipsDeductionAmt>5000",
    "QualifiedOvertimeCompDedAmt>4000",
    "QualifiedCarLoanInterestDedAmt>4000",
    "EnhancedSeniorDeductionAmt>10800",
    "TotalAdditionalDeductionsAmt>23800",
  ];
  let previous = -1;
  for (const tag of tags) {
    const position = xml.indexOf(tag);
    assertEquals(position > previous, true, tag);
    previous = position;
  }
  const xsd = new URL(
    "../../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS1040Schedule1A/IRS1040Schedule1A.xsd",
    import.meta.url,
  );
  try {
    await Deno.stat(xsd);
    const xmlFile = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(
        xmlFile,
        xml.replace(
          "<IRS1040Schedule1A>",
          '<IRS1040Schedule1A xmlns="http://www.irs.gov/efile" documentId="SCHEDULE1A1">',
        ),
      );
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd.pathname, xmlFile],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(
        checked.code,
        0,
        new TextDecoder().decode(checked.stderr),
      );
    } finally {
      await Deno.remove(xmlFile);
    }
  } catch (error) {
    throw error;
  }
  assertThrows(
    () =>
      schedule1a.build(mixed, {
        pending: { f1040: joint1040, w2: mixedW2 },
      }),
    Error,
    "do not reconcile",
  );
});

Deno.test("Schedule 1-A integration rejects incomplete and mismatched line 13b", () => {
  assertThrows(
    () => buildMefXml({ f1040: joint1040 }, filer),
    Error,
    "attached reviewed Schedule 1-A",
  );
  assertThrows(
    () =>
      schedule1a.build({
        ...joint,
        qualified_w2_overtime: [overtimeEntry],
      }, {
        pending: {
          f1040: joint1040,
          w2: { w2s: [overtimeW2(overtimeEntry)] },
        },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      buildMefXml({
        f1040: { ...joint1040, line13b_additional_deductions: 11_000 },
        schedule1a: joint,
      }, filer),
    Error,
    "do not reconcile",
  );
});

Deno.test("Schedule 1-A senior MeF rejects missing review and mismatched return", () => {
  assertEquals(
    seniorZeroExclusionsReviewSchema.safeParse({
      ...review,
      no_form2555_filed: false,
    }).success,
    false,
  );
  assertEquals(
    seniorZeroExclusionsReviewSchema.safeParse({
      ...review,
      section933_review_source_reference: "   ",
    }).success,
    false,
  );
  assertThrows(
    () =>
      schedule1a.build({ ...joint, senior_zero_exclusions_review: undefined }, {
        pending: { f1040: joint1040 },
      }),
    Error,
    "sourced Part I zero-exclusion review",
  );
  assertThrows(
    () =>
      schedule1a.build({
        ...joint,
        qualified_w2_overtime: [overtimeEntry],
      }, {
        pending: {
          f1040: joint1040,
          w2: { w2s: [overtimeW2(overtimeEntry)] },
        },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      schedule1a.build(joint, {
        pending: {
          f1040: { ...joint1040, line13b_additional_deductions: 11_000 },
        },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      schedule1a.build(joint, {
        pending: { f1040: { ...joint1040, spouse_ssn: "999887777" } },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      schedule1a.build(joint, {
        pending: { f1040: joint1040, form2555: { line45: 1_000 } },
      }),
    Error,
    "conflicts with a Form 2555",
  );
  assertThrows(
    () =>
      schedule1a.build(joint, {
        pending: { f1040: joint1040, form4563: { line15: 500 } },
      }),
    Error,
    "conflicts with a Form 2555 or Form 4563",
  );
});
