import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import { FilingStatus } from "../../../../../types.ts";
import { calculateLossBusinessPhase } from "./index.ts";
import { minimumDeductionLine40 } from "./minimum-deduction.ts";
import {
  phaseInRangeCodeElement,
  thresholdCodeElement,
} from "../../../../../../2025/mef/forms/deductions/business/f8995a/f8995a-schema-codes.ts";

const config2026 = CONFIG_BY_YEAR[2026]!;

// Draft 2026 Form 8995-A line 21: $201,750 ($201,775 MFS; $403,500 MFJ).
// Line 23: $75,000 ($150,000 MFJ). Line 24: line 22 / line 23.
test("TY2026 Part III uses the 2026 threshold and phase-in range", () => {
  const single = calculateLossBusinessPhase(
    239_250,
    10_000,
    0,
    FilingStatus.Single,
    2026,
  );
  assertEquals(
    [single?.threshold, single?.range, single?.ratio],
    [201_750, 75_000, 0.5],
  );
  const separate = calculateLossBusinessPhase(
    239_275,
    10_000,
    0,
    FilingStatus.MFS,
    2026,
  );
  assertEquals([separate?.threshold, separate?.ratio], [201_775, 0.5]);
  const joint = calculateLossBusinessPhase(
    478_500,
    10_000,
    0,
    FilingStatus.MFJ,
    2026,
  );
  assertEquals([joint?.threshold, joint?.range, joint?.ratio], [
    403_500,
    150_000,
    0.5,
  ]);
  assertEquals(
    calculateLossBusinessPhase(276_751, 10_000, 0, FilingStatus.Single, 2026),
    undefined,
  );
});

test("TY2025 Part III keeps the 2025 threshold and range", () => {
  const single = calculateLossBusinessPhase(
    222_300,
    10_000,
    0,
    FilingStatus.Single,
    2025,
  );
  assertEquals([single?.threshold, single?.range, single?.ratio], [
    197_300,
    50_000,
    0.5,
  ]);
});

// Draft 2026 Form 8995-A lines 39-41; IRC §199A(i): $400 when active QBI is
// at least $1,000.
test("TY2026 line 40 applies only to materially participating QBI", () => {
  const active = (qbi: number, participates: boolean) => ({
    qbi,
    schedule_c_qbi_businesses: [{
      qbi,
      source_schedule_c: { line_g_material_participation: participates },
    }],
  });
  assertEquals(minimumDeductionLine40(active(1_000, true), 0, config2026), 400);
  assertEquals(
    minimumDeductionLine40(active(1_000, false), 0, config2026),
    undefined,
  );
  assertEquals(
    minimumDeductionLine40(active(999, true), 0, config2026),
    undefined,
  );
  assertEquals(
    minimumDeductionLine40(active(5_000, true), 400, config2026),
    undefined,
  );
  assertEquals(
    minimumDeductionLine40(active(5_000, true), 0, CONFIG_BY_YEAR[2025]!),
    undefined,
  );
  assertThrows(
    () => minimumDeductionLine40({ qbi: 5_000 }, 0, config2026),
    Error,
    "line 40 minimum deduction needs",
  );
});

// 2026v1.0 IRS8995A FilingStatusThresholdCd enumerates 197300/394600 and
// FilingStatusPhaseInRangeCd 50000/100000 only (rules F8995A-004-06, F8995A-007).
test("MeF refuses a threshold code the 2026v1.0 schema does not enumerate", () => {
  assertEquals(
    thresholdCodeElement(197_300),
    "<FilingStatusThresholdCd>197300</FilingStatusThresholdCd>",
  );
  assertEquals(
    phaseInRangeCodeElement(100_000),
    "<FilingStatusPhaseInRangeCd>100000</FilingStatusPhaseInRangeCd>",
  );
  assertThrows(
    () => thresholdCodeElement(201_750),
    Error,
    "export waits for a schema",
  );
  assertThrows(
    () => phaseInRangeCodeElement(75_000),
    Error,
    "export waits for a schema",
  );
});
