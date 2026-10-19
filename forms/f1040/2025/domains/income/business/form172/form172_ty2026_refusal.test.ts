import { test } from "bun:test";
import { assertRejects, assertThrows } from "@std/assert";
import { calculateForm172CurrentDeduction } from "./form172_current_deduction.ts";
import { stageForm172CurrentDeductionSource } from "./form172_current_deduction_source.ts";
import { reconcileForm172ModifiedIncome } from "./form172_modified_income.ts";
import { stageForm172ReviewedReturnCalculation } from "./form172_reviewed_return.ts";
import { stageForm172ProjectedReturn } from "./form172_projected_return.ts";

// Instructions for Form 172 (Rev. December 2024) are the newest NOL source.
const ty2026 = { taxYear: 2026, formType: "f1040" } as const;
const refusal = "Form 172 NOL workpaper for TY2026";

test("TY2026 Form 172 NOL workpapers are refused, not computed as TY2025", async () => {
  assertThrows(
    () => calculateForm172CurrentDeduction({}, {}, {}, ty2026),
    Error,
    refusal,
  );
  assertThrows(
    () => reconcileForm172ModifiedIncome({}, {}, {}, 0, ty2026),
    Error,
    refusal,
  );
  await assertRejects(
    () => stageForm172CurrentDeductionSource({}, [], ty2026),
    Error,
    refusal,
  );
  await assertRejects(
    () => stageForm172ReviewedReturnCalculation({}, {}, [], ty2026),
    Error,
    refusal,
  );
  await assertRejects(
    () => stageForm172ProjectedReturn({}, {}, [], ty2026),
    Error,
    refusal,
  );
});
