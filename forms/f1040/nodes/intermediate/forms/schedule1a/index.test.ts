import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import {
  claimInputSchema,
  qualifiedTradeBusinessTips,
  schedule1a,
} from "./index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { FilingStatus } from "../../../types.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;
const TAXPAYER_SSN = "111223333";

Deno.test("schedule1a: NEC trade tips stop at one business profit after SE deduction", () => {
  const source = {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: TAXPAYER_SSN,
    taxpayer_has_valid_ssn: true,
    qualified_tips_schedule_c_businesses: [{
      business_reference: "events",
      proprietor_recipient: "T" as const,
      line31_net_profit: 10_000,
    }],
    qualified_tips_se_deduction: 706.4775,
    qualified_trade_business_tips: [{
      source_form: "1099nec" as const,
      business_reference: "events",
      recipient_ssn: TAXPAYER_SSN,
      payer_name: "Events Payer",
      payer_tin: "123456789",
      source_amount: 18_000,
      amount: 12_000,
      occupation_code: "102",
      occupation_review_reference: "occupation record",
      tip_records_reference: "POS ledger",
      included_in_source_amount: true as const,
      no_other_allocable_deductions: true as const,
      no_other_allocable_deductions_review_reference: "Schedule 1 review",
    }],
  };
  assertEquals(qualifiedTradeBusinessTips(source), 9_294);
  assertEquals(
    qualifiedTradeBusinessTips({
      ...source,
      qualified_trade_business_tips: [
        { ...source.qualified_trade_business_tips[0], amount: 8_000 },
        {
          ...source.qualified_trade_business_tips[0],
          source_form: "1099misc",
          source_amount: 8_000,
          amount: 5_000,
        },
      ],
    }),
    9_294,
  );
  assertEquals(
    qualifiedTradeBusinessTips({
      ...source,
      qualified_trade_business_tips: [{
        ...source.qualified_trade_business_tips[0],
        amount: 5_000,
      }],
    }),
    5_000,
  );
  assertEquals(
    qualifiedTradeBusinessTips({
      ...source,
      qualified_tips_schedule_c_businesses: [{
        ...source.qualified_tips_schedule_c_businesses[0],
        line31_net_profit: -1_000,
      }],
      qualified_tips_se_deduction: 0,
    }),
    0,
  );
  assertThrows(
    () =>
      qualifiedTradeBusinessTips({
        ...source,
        qualified_tips_schedule_c_businesses: [
          ...source.qualified_tips_schedule_c_businesses,
          {
            business_reference: "other",
            proprietor_recipient: "T",
            line31_net_profit: 1_000,
          },
        ],
      }),
    Error,
    "one Schedule C business",
  );
  assertThrows(
    () =>
      qualifiedTradeBusinessTips({
        ...source,
        qualified_trade_business_tips: [{
          ...source.qualified_trade_business_tips[0],
          recipient_ssn: "999887777",
        }],
      }),
    Error,
    "do not match the owner",
  );
});

function tips(amount: number, employee_ssn = TAXPAYER_SSN) {
  return [{
    employee_ssn,
    employer_ein: "123456789",
    employer_name: "Test Restaurant",
    amount,
    source_type: "w2_box7" as const,
  }];
}

function overtime(
  amount: number,
  employee_ssn = TAXPAYER_SSN,
  employer_ein = "123456789",
) {
  return [{
    employee_ssn,
    employer_ein,
    amount,
    box1_wages: 50_000,
    covered_nonexempt_employee: true as const,
    premium_included_in_box1: true as const,
    source_reference: "Employer 2025 box 14 FLSA premium and coverage review",
  }];
}

function vehicleLoan(
  qualified_interest_paid: number,
  vin = "1HGCM82633A004352",
) {
  return {
    vin,
    borrower_ssn: TAXPAYER_SSN,
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
    qualified_interest_paid,
    interest_deducted_elsewhere: 0 as const,
    no_other_interest_deduction_review_reference: "2025 Schedule C/E/F review",
  };
}

function deduction(
  input: Parameters<typeof schedule1a.compute>[1],
): number | undefined {
  return fieldsOf(schedule1a.compute(ctx, input).outputs, f1040)
    ?.line13b_additional_deductions;
}

Deno.test("schedule1a: unsupported direct overtime totals are rejected at public input", () => {
  assertEquals(
    claimInputSchema.safeParse({
      taxpayer_qualified_overtime_compensation: 5_000,
    }).success,
    false,
  );
});

Deno.test("schedule1a: deducts qualified employee tips", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(5_000),
      magi: 30_000,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    5_000,
  );
});

Deno.test("schedule1a: caps qualified tips at $25,000", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(40_000),
      magi: 100_000,
      filing_status: FilingStatus.HOH,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    25_000,
  );
});

Deno.test("schedule1a: phases out $100 per full $1,000 over threshold", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(5_000),
      magi: 150_999,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    5_000,
  );
  assertEquals(
    deduction({
      qualified_employee_tips: tips(5_000),
      magi: 151_000,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    4_900,
  );
});

Deno.test("schedule1a: uses $300,000 phaseout threshold for joint returns", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(25_000),
      magi: 301_000,
      filing_status: FilingStatus.MFJ,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    24_900,
  );
});

Deno.test("schedule1a: married filing separately is ineligible", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(5_000),
      magi: 30_000,
      filing_status: FilingStatus.MFS,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    undefined,
  );
});

Deno.test("schedule1a: valid SSN is required", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(5_000),
      magi: 30_000,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: false,
    }),
    undefined,
  );
});

Deno.test("schedule1a: joint tips belong to the spouse with the valid SSN", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: [
        ...tips(2_000),
        ...tips(3_000, "444556666"),
      ],
      magi: 50_000,
      filing_status: FilingStatus.MFJ,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: false,
      spouse_ssn: "444-55-6666",
      spouse_has_valid_ssn: true,
    }),
    3_000,
  );
});

Deno.test("schedule1a: tips from an unmatched employee SSN are not deducted", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(5_000, "999887777"),
      magi: 30_000,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    undefined,
  );
});

Deno.test("schedule1a: incomplete eligibility context emits no deduction", () => {
  assertEquals(deduction({ qualified_employee_tips: tips(5_000) }), undefined);
  assertEquals(
    deduction({
      magi: 30_000,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    undefined,
  );
});

Deno.test("schedule1a: phaseout never produces a negative deduction", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(5_000),
      magi: 250_000,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
    }),
    undefined,
  );
});

Deno.test("schedule1a: caps qualified overtime and applies the whole-$1,000 phaseout", () => {
  assertEquals(
    deduction({
      qualified_w2_overtime: overtime(20_000),
      taxpayer_has_valid_ssn: true,
      taxpayer_ssn: TAXPAYER_SSN,
      magi: 152_999,
      filing_status: FilingStatus.Single,
    }),
    12_300,
  );
});

Deno.test("schedule1a: joint overtime includes only spouses with valid SSNs", () => {
  assertEquals(
    deduction({
      qualified_w2_overtime: [
        ...overtime(10_000),
        ...overtime(8_000, "444556666", "987654321"),
      ],
      taxpayer_has_valid_ssn: true,
      spouse_has_valid_ssn: false,
      taxpayer_ssn: TAXPAYER_SSN,
      spouse_ssn: "444556666",
      magi: 200_000,
      filing_status: FilingStatus.MFJ,
    }),
    10_000,
  );
});

Deno.test("schedule1a: married filing separately cannot deduct overtime", () => {
  assertEquals(
    deduction({
      qualified_w2_overtime: overtime(5_000),
      taxpayer_has_valid_ssn: true,
      taxpayer_ssn: TAXPAYER_SSN,
      magi: 50_000,
      filing_status: FilingStatus.MFS,
    }),
    undefined,
  );
});

Deno.test("schedule1a: reviewed vehicle interest allows MFS", () => {
  assertEquals(
    deduction({
      vehicle_loans: [vehicleLoan(4_000)],
      taxpayer_ssn: TAXPAYER_SSN,
      magi: 80_000,
      filing_status: FilingStatus.MFS,
    }),
    4_000,
  );
});

Deno.test("schedule1a: passes computed line 30 vehicle interest separately", () => {
  const result = schedule1a.compute(ctx, {
    vehicle_loans: [vehicleLoan(4_000)],
    taxpayer_ssn: TAXPAYER_SSN,
    magi: 80_000,
    filing_status: FilingStatus.MFS,
  });
  assertEquals(
    fieldsOf(result.outputs, standard_deduction)
      ?.qualified_vehicle_loan_interest_deduction,
    4_000,
  );
});

Deno.test("schedule1a: vehicle phaseout rounds excess MAGI up to $1,000", () => {
  assertEquals(
    deduction({
      vehicle_loans: [vehicleLoan(10_000)],
      taxpayer_ssn: TAXPAYER_SSN,
      magi: 100_001,
      filing_status: FilingStatus.Single,
    }),
    9_800,
  );
});

Deno.test("schedule1a: rejects invalid VINs and interest deducted elsewhere", () => {
  assertEquals(
    schedule1a.inputSchema.safeParse({
      vehicle_loans: [vehicleLoan(1_000, "not-a-vin")],
    }).success,
    false,
  );
  assertEquals(
    schedule1a.inputSchema.safeParse({
      vehicle_loans: [{
        ...vehicleLoan(1_000),
        interest_deducted_elsewhere: 1,
      }],
    }).success,
    false,
  );
  assertEquals(
    schedule1a.inputSchema.safeParse({
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        qualified_interest_paid: 1_000,
      }],
    }).success,
    false,
  );
  assertEquals(
    schedule1a.inputSchema.safeParse({
      vehicle_loans: [{
        ...vehicleLoan(1_000),
        loan_originated_date: "2025-02-30",
      }],
    }).success,
    false,
  );
  assertEquals(
    schedule1a.inputSchema.safeParse({
      vehicle_loans: [{ ...vehicleLoan(1_000), final_assembly_in_us: false }],
    }).success,
    false,
  );
  assertEquals(
    schedule1a.inputSchema.safeParse({
      vehicle_loans: Array.from(
        { length: 51 },
        (_, index) =>
          vehicleLoan(1_000, `1HGCM82633A${String(index).padStart(6, "0")}`),
      ),
    }).success,
    false,
  );
});

Deno.test("schedule1a: senior deduction is $6,000 per eligible joint filer", () => {
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      spouse_age_65_or_older: true,
      taxpayer_has_valid_ssn: true,
      spouse_has_valid_ssn: true,
      magi: 100_000,
      filing_status: FilingStatus.MFJ,
    }),
    12_000,
  );
});

Deno.test("schedule1a: routes the enhanced senior amount separately for AMT", () => {
  const result = schedule1a.compute(ctx, {
    taxpayer_age_65_or_older: true,
    taxpayer_has_valid_ssn: true,
    qualified_w2_overtime: overtime(2_000),
    taxpayer_ssn: TAXPAYER_SSN,
    magi: 50_000,
    filing_status: FilingStatus.Single,
  });
  const deductionFields = fieldsOf(result.outputs, standard_deduction);
  assertEquals(deductionFields?.additional_deductions, 8_000);
  assertEquals(deductionFields?.enhanced_senior_deduction, 6_000);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.schedule1a_line37_senior_deduction,
    6_000,
  );
});

Deno.test("schedule1a: senior phaseout is calculated per eligible person", () => {
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      spouse_age_65_or_older: true,
      taxpayer_has_valid_ssn: true,
      spouse_has_valid_ssn: true,
      magi: 200_000,
      filing_status: FilingStatus.MFJ,
    }),
    6_000,
  );
});

Deno.test("schedule1a: senior phaseout rounds the printed 6 percent amount once", () => {
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      taxpayer_has_valid_ssn: true,
      magi: 75_010,
      filing_status: FilingStatus.Single,
    }),
    5_999,
  );
});

Deno.test("schedule1a: senior deduction requires a valid SSN and a joint return when married", () => {
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      taxpayer_has_valid_ssn: false,
      magi: 50_000,
      filing_status: FilingStatus.Single,
    }),
    undefined,
  );
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      taxpayer_has_valid_ssn: true,
      magi: 50_000,
      filing_status: FilingStatus.MFS,
    }),
    undefined,
  );
});

Deno.test("schedule1a: total combines tips, overtime, vehicle interest, and senior deduction", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: tips(2_000),
      qualified_w2_overtime: overtime(3_000),
      vehicle_loans: [vehicleLoan(1_000)],
      taxpayer_age_65_or_older: true,
      taxpayer_ssn: TAXPAYER_SSN,
      taxpayer_has_valid_ssn: true,
      magi: 50_000,
      filing_status: FilingStatus.Single,
    }),
    12_000,
  );
});
