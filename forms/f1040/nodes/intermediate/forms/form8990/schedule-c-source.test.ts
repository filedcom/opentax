import { assertEquals, assertThrows } from "@std/assert";
import { scheduleC } from "../../../inputs/schedule_c/index.ts";
import { publicInputSchema } from "./index.ts";
import { stageScheduleCInterest } from "./schedule-c-source.ts";

const business = {
  business_reference: "C-1",
  line_a_principal_business: "Software consulting",
  line_b_business_code: "541510",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 200_000,
  line_12_depletion: 1_000,
  line_13_depreciation: 7_500,
  line_16a_interest_mortgage: 2_000,
  line_16b_interest_other: 6_000,
};

Deno.test("2025 Form 8990 stages interest from one identified Schedule C before profit", () => {
  assertEquals(stageScheduleCInterest({ schedule_cs: [business] }), {
    businessReference: "C-1",
    line16aMortgageInterest: 2_000,
    line16bOtherInterest: 6_000,
    currentYearBusinessInterestExpense: 8_000,
    line13DepreciationCandidate: 7_500,
    line12DepletionCandidate: 1_000,
    tentativeScheduleCAtRiskNetWithFullInterest: 183_500,
  });
});

Deno.test("2025 Form 8990 tentative Schedule C profit reuses sourced wage-credit rules", () => {
  const staged = stageScheduleCInterest({
    schedule_cs: [{ ...business, line_26_wages: 10_000 }],
    wotc_wage_reductions: [{ business_reference: "C-1", credit_amount: 500 }],
  });
  assertEquals(staged.tentativeScheduleCAtRiskNetWithFullInterest, 174_000);
});

Deno.test("2025 Form 8990 source stage rejects unlinked, unidentified, and multi-business interest", () => {
  assertThrows(
    () =>
      stageScheduleCInterest({
        schedule_cs: [business],
        line16a_interest_mortgage: 100,
      }),
    Error,
    "interest linked to the identified Schedule C business",
  );
  assertThrows(
    () =>
      stageScheduleCInterest({
        schedule_cs: [{ ...business, business_reference: undefined }],
      }),
    Error,
    "identified Schedule C business",
  );
  assertThrows(
    () =>
      stageScheduleCInterest({
        schedule_cs: [business, { ...business, business_reference: "C-2" }],
      }),
    Error,
    "exactly one Schedule C business",
  );
  assertThrows(
    () =>
      stageScheduleCInterest({
        schedule_cs: [{
          ...business,
          line_16a_interest_mortgage: 0,
          line_16b_interest_other: 0,
        }],
      }),
    Error,
    "positive Schedule C interest",
  );
});

Deno.test("2025 Form 8990 staged Schedule C interest does not activate asserted ATI filing", () => {
  const staged = stageScheduleCInterest({ schedule_cs: [business] });
  assertThrows(
    () =>
      scheduleC.compute({ taxYear: 2025, formType: "f1040" }, {
        schedule_cs: [business],
      }),
    Error,
    "documented section 163(j) exemption",
  );
  assertEquals(
    publicInputSchema.safeParse({
      direct_schedule_c: {
        business_reference: staged.businessReference,
        current_year_business_interest_expense:
          staged.currentYearBusinessInterestExpense,
      },
    }).success,
    false,
  );
});
