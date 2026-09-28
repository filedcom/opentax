import { assertEquals, assertThrows } from "@std/assert";
import { scheduleC } from "../../../inputs/schedule_c/index.ts";
import {
  applyCalculatedInterestAllowance,
  stageProvisionalScheduleCInterest,
} from "./two-stage.ts";

const business = {
  business_reference: "C-1",
  line_a_principal_business: "Software consulting",
  line_b_business_code: "541510",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 200_000,
  line_12_depletion: 1_000,
  line_13_depreciation: 7_500,
  line_16b_interest_other: 8_000,
};

Deno.test("2025 Form 8990 two-stage Schedule C feedback changes only sourced line 16b", () => {
  const provisional = stageProvisionalScheduleCInterest({
    schedule_cs: [business],
  });
  const finalized = applyCalculatedInterestAllowance(provisional, 3_000);
  assertEquals(provisional.phase, "provisional");
  assertEquals(
    provisional.interest.tentativeScheduleCAtRiskNetWithFullInterest,
    183_500,
  );
  assertEquals(
    provisional.source.schedule_cs[0].line_16b_interest_other,
    8_000,
  );
  assertEquals(finalized.phase, "finalized");
  assertEquals(finalized.businessReference, "C-1");
  assertEquals(finalized.originalInterestExpense, 8_000);
  assertEquals(finalized.allowedInterestExpense, 3_000);
  assertEquals(finalized.disallowedInterestExpense, 5_000);
  assertEquals(finalized.provisionalAtRiskNet, 183_500);
  assertEquals(finalized.finalizedAtRiskNet, 188_500);
  assertEquals(finalized.source.schedule_cs[0].line_16b_interest_other, 3_000);
  assertEquals(finalized.source.schedule_cs[0].line_13_depreciation, 7_500);
  assertThrows(
    () =>
      scheduleC.compute({ taxYear: 2025, formType: "f1040" }, finalized.source),
    Error,
    "documented section 163(j) exemption",
  );
});

Deno.test("2025 Form 8990 two-stage source rejects mixed interest and unmodeled injections", () => {
  assertThrows(
    () =>
      stageProvisionalScheduleCInterest({
        schedule_cs: [{ ...business, line_16a_interest_mortgage: 1_000 }],
      }),
    Error,
    "line 16b interest only",
  );
  assertThrows(
    () =>
      stageProvisionalScheduleCInterest({
        schedule_cs: [business],
        line1_gross_receipts: 100,
      }),
    Error,
    "unmodeled top-level fields",
  );
  assertThrows(
    () =>
      stageProvisionalScheduleCInterest({
        schedule_cs: [business],
        unsupported_interest_income: 100,
      }),
    Error,
    "unmodeled top-level fields",
  );
  assertThrows(
    () =>
      stageProvisionalScheduleCInterest({
        schedule_cs: [{ ...business, unsupported_business_income: 100 }],
      }),
    Error,
    "unmodeled fields",
  );
  assertThrows(
    () =>
      stageProvisionalScheduleCInterest({
        schedule_cs: [{ ...business, line_16b_interest_other: 8_000.5 }],
      }),
    Error,
    "whole-dollar source amounts",
  );
});

Deno.test("2025 Form 8990 two-stage feedback rejects out-of-range allowance", () => {
  const provisional = stageProvisionalScheduleCInterest({
    schedule_cs: [business],
  });
  for (const allowance of [-1, 8_001, 1.5]) {
    assertThrows(
      () => applyCalculatedInterestAllowance(provisional, allowance),
      Error,
      "outside source-backed expense",
    );
  }
});
