import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import { form2441CreditRate, form2441Rules } from "./year-rules.ts";
import {
  calculateForm2441,
  type Form2441FilingDetails,
} from "./calculation.ts";
import { form2441 } from "./index.ts";
import { f2441 } from "../../../inputs/f2441/index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";

Deno.test("2026 Form 2441 exclusion and expense limits are explicit", () => {
  assertEquals(form2441Rules(2026), {
    expenseCapOne: 3_000,
    expenseCapTwoPlus: 6_000,
    employerExclusion: 7_500,
    employerExclusionMfs: 3_750,
  });
  assertThrows(() => form2441Rules(2027), Error, "No Form 2441 rules");
});

Deno.test("2026 Form 2441 rate follows both statutory phaseouts", () => {
  const rate = (agi: number, status = FilingStatus.Single) =>
    form2441CreditRate(2026, agi, status);
  assertEquals(rate(15_000), 0.50);
  assertEquals(rate(15_001), 0.49);
  assertEquals(rate(45_000), 0.35);
  assertEquals(rate(75_000), 0.35);
  assertEquals(rate(75_001), 0.34);
  assertEquals(rate(105_000), 0.20);
  assertEquals(rate(150_000, FilingStatus.MFJ), 0.35);
  assertEquals(rate(150_001, FilingStatus.MFJ), 0.34);
  assertEquals(rate(210_000, FilingStatus.MFJ), 0.20);
  assertEquals(form2441CreditRate(2025, 15_000, FilingStatus.Single), 0.35);
  assertThrows(
    () => form2441CreditRate(2027, 15_000, FilingStatus.Single),
    Error,
    "No Form 2441 credit rate",
  );
});

Deno.test("2026 intermediate Form 2441 routes only benefits above $7,500", () => {
  const result = form2441.compute(
    { taxYear: 2026, formType: "f1040" },
    { dep_care_benefits: 7_501 },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line1e_taxable_dep_care, 1);
});

Deno.test("2026 input Form 2441 uses the 50% credit and new exclusion", () => {
  const result = f2441.compute(
    { taxYear: 2026, formType: "f1040" },
    {
      f2441s: [{
        filing_status: FilingStatus.Single,
        qualifying_person_count: 2,
        qualifying_expenses_paid: 6_000,
        employer_dep_care_benefits: 7_501,
        agi: 15_000,
      }],
    },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line1e_taxable_dep_care, 1);
  // Excluded benefits exhaust the $6,000 expense cap.
  assertEquals(fieldsOf(result.outputs, schedule3), undefined);

  const credit = f2441.compute(
    { taxYear: 2026, formType: "f1040" },
    {
      f2441s: [{
        filing_status: FilingStatus.Single,
        qualifying_person_count: 1,
        qualifying_expenses_paid: 3_000,
        agi: 15_000,
      }],
    },
  );
  assertEquals(
    fieldsOf(credit.outputs, schedule3)?.line2_childcare_credit,
    1_500,
  );
});

Deno.test("2026 detailed Form 2441 uses line 21 and line 8 rules", () => {
  const details: Form2441FilingDetails = {
    filing_status: FilingStatus.Single,
    care_providers: [{
      kind: "business",
      name: "Care Center",
      name_control: "CARE",
      ein: "123456789",
      us_address: {
        line1: "100 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      household_employee: false,
      amount_paid: 3_000,
    }],
    qualifying_people: [{
      first_name: "Child",
      last_name: "Smith",
      name_control: "SMIT",
      ssn: "123456789",
      credit_expenses_paid: 3_000,
    }],
    taxpayer_earned_income: 50_000,
    tax_liability_limit: 2_000,
  };
  const lines = calculateForm2441(details, 15_000, 0, 2026);
  assertEquals(lines.line8, 0.50);
  assertEquals(lines.line11, 1_500);

  const mfs = calculateForm2441(
    {
      ...details,
      filing_status: FilingStatus.MFS,
      mfs_eligibility_met: false,
      mfs_line19_income: 50_000,
      dependent_care_plan_limit: 8_000,
      total_qualified_expenses_incurred: 8_000,
      qualifying_people: [{
        ...details.qualifying_people[0],
        credit_expenses_paid: 0,
      }],
    },
    75_000,
    8_000,
    2026,
  );
  assertEquals(mfs.line21, 3_750);
  assertEquals(mfs.line26, 4_250);

  const eligibleMfs = calculateForm2441(
    {
      ...details,
      filing_status: FilingStatus.MFS,
      mfs_eligibility_met: true,
      dependent_care_plan_limit: 8_000,
      total_qualified_expenses_incurred: 8_000,
      qualifying_people: [{
        ...details.qualifying_people[0],
        credit_expenses_paid: 0,
      }],
    },
    75_000,
    8_000,
    2026,
  );
  assertEquals(eligibleMfs.line21, 7_500);
  assertEquals(eligibleMfs.line26, 500);
});
