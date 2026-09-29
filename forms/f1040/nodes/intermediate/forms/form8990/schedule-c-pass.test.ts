import { assertEquals, assertThrows } from "@std/assert";
import { scheduleC } from "../../../inputs/schedule_c/index.ts";
import {
  finalizedScheduleCContext,
  provisionalScheduleCContext,
} from "./schedule-c-pass.ts";
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
  amt_depletion_worksheet: {
    source_reference: "2025 AMT depletion worksheet C-1",
    all_property_income_and_basis_limits_applied_verified: true as const,
    no_at_risk_or_basis_limitation_verified: true as const,
    properties: [{
      property_reference: "PROPERTY-1",
      regular_allowed_depletion: 1_000,
      amt_allowed_depletion: 1_000,
    }],
  },
  line_13_depreciation: 7_500,
  line_16b_interest_other: 8_000,
};

function schedule1Profit(result: ReturnType<typeof scheduleC.compute>): number {
  const output = result.outputs.find((entry) => entry.nodeType === "schedule1");
  return output?.fields.line3_schedule_c as number;
}

Deno.test("2025 Form 8990 internal contexts permit exact provisional and finalized Schedule C passes", () => {
  const provisional = stageProvisionalScheduleCInterest({
    schedule_cs: [business],
  });
  const first = scheduleC.compute(
    provisionalScheduleCContext(provisional),
    provisional.source,
  );
  assertEquals(schedule1Profit(first), 183_500);
  const finalized = applyCalculatedInterestAllowance(provisional, 3_000);
  const second = scheduleC.compute(
    finalizedScheduleCContext(finalized),
    finalized.source,
  );
  assertEquals(schedule1Profit(second), 188_500);
  assertThrows(
    () =>
      scheduleC.compute(
        { taxYear: 2025, formType: "f1040" },
        provisional.source,
      ),
    Error,
    "documented section 163(j) exemption",
  );
});

Deno.test("2025 Form 8990 internal context cannot approve a different Schedule C", () => {
  const provisional = stageProvisionalScheduleCInterest({
    schedule_cs: [business],
  });
  assertThrows(
    () =>
      scheduleC.compute(provisionalScheduleCContext(provisional), {
        schedule_cs: [{ ...business, line_1_gross_receipts: 250_000 }],
      }),
    Error,
    "exact internally staged business source",
  );
});
