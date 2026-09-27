import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import {
  charitableDeductionAfterFloor2026,
  overallItemizedLimit2026,
} from "./itemized-deductions.ts";

Deno.test("2026 charitable floor starts at 0.5% of AGI", () => {
  assertEquals(charitableDeductionAfterFloor2026(499, 100_000), 0);
  assertEquals(charitableDeductionAfterFloor2026(500, 100_000), 0);
  assertEquals(charitableDeductionAfterFloor2026(750, 100_000), 250);
  assertThrows(() => charitableDeductionAfterFloor2026(-1, 100_000), RangeError);
});

Deno.test("2026 overall itemized limit begins above the top bracket threshold", () => {
  const atThreshold = overallItemizedLimit2026({
    filingStatus: FilingStatus.Single,
    adjustedGrossIncome: 640_600,
    schedule1aDeduction: 0,
    qbiDeduction: 0,
    itemizedBeforeOverallLimit: 100_000,
  });
  assertEquals(atThreshold.topBracketThreshold, 640_600);
  assertEquals(atThreshold.reduction, 0);
  const above = overallItemizedLimit2026({
    filingStatus: FilingStatus.Single,
    adjustedGrossIncome: 650_600,
    schedule1aDeduction: 0,
    qbiDeduction: 0,
    itemizedBeforeOverallLimit: 100_000,
  });
  assertEquals(above.reduction, 540);
  assertEquals(above.allowedItemizedDeductions, 99_460);
});

Deno.test("2026 overall limit caps its base at itemized deductions", () => {
  const result = overallItemizedLimit2026({
    filingStatus: FilingStatus.MFJ,
    adjustedGrossIncome: 1_000_000,
    schedule1aDeduction: 0,
    qbiDeduction: 0,
    itemizedBeforeOverallLimit: 10_000,
  });
  assertEquals(result.topBracketThreshold, 768_700);
  assertEquals(result.reduction, 540);
  assertEquals(result.allowedItemizedDeductions, 9_460);
});

Deno.test("2026 Schedule 1-A and QBI amounts reduce the overall-limit base", () => {
  const result = overallItemizedLimit2026({
    filingStatus: FilingStatus.MFS,
    adjustedGrossIncome: 400_000,
    schedule1aDeduction: 10_000,
    qbiDeduction: 5_650,
    itemizedBeforeOverallLimit: 50_000,
  });
  assertEquals(result.topBracketThreshold, 384_350);
  assertEquals(result.incomeAboveThreshold, 0);
  assertEquals(result.allowedItemizedDeductions, 50_000);
});
