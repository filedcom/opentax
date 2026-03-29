import { assertEquals, assertThrows } from "@std/assert";
import { form8582, inputSchema } from "./index.ts";
import { FilingStatus } from "../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8582.compute(inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── 1. Input Validation ──────────────────────────────────────────────────────

Deno.test("valid_all_fields_pass: all valid fields present, no passive activity", () => {
  compute({
    current_income: 10_000,
    current_loss: 5_000,
    prior_unallowed: 0,
    modified_agi: 80_000,
    has_active_rental: true,
    active_participation: true,
    filing_status: FilingStatus.MFJ,
    has_other_passive: false,
  });
});

Deno.test("invalid_current_income_type: current_income is string '50000' throws", () => {
  assertThrows(() => compute({ current_income: "50000" }));
});

Deno.test("invalid_current_loss_type: current_loss is string '30000' throws", () => {
  assertThrows(() => compute({ current_loss: "30000" }));
});

Deno.test("invalid_prior_unallowed_type: prior_unallowed is string '10000' throws", () => {
  assertThrows(() => compute({ prior_unallowed: "10000" }));
});

Deno.test("invalid_modified_agi_type: modified_agi is string '100000' throws", () => {
  assertThrows(() => compute({ modified_agi: "100000" }));
});

Deno.test("invalid_has_active_rental_type: has_active_rental is string 'true' throws", () => {
  assertThrows(() => compute({ has_active_rental: "true" }));
});

Deno.test("invalid_active_participation_type: active_participation is string 'true' throws", () => {
  assertThrows(() => compute({ active_participation: "true" }));
});

Deno.test("invalid_filing_status_value: filing_status is 'invalid_status' throws", () => {
  assertThrows(() => compute({ filing_status: "invalid_status" }));
});

Deno.test("negative_current_income: current_income -10000 throws (.nonnegative())", () => {
  assertThrows(() => compute({ current_income: -10_000 }));
});

Deno.test("negative_current_loss: current_loss -10000 throws (.nonnegative())", () => {
  assertThrows(() => compute({ current_loss: -10_000 }));
});

Deno.test("negative_prior_unallowed: prior_unallowed -10000 throws (.nonnegative())", () => {
  assertThrows(() => compute({ prior_unallowed: -10_000 }));
});

Deno.test("negative_modified_agi: modified_agi -50000 throws (.nonnegative())", () => {
  assertThrows(() => compute({ modified_agi: -50_000 }));
});

// ─── 2. Per-Field Calculation ─────────────────────────────────────────────────

Deno.test("no_activity_returns_empty: current_income 0, current_loss 0, prior_unallowed 0 → 0 outputs", () => {
  const result = compute({ current_income: 0, current_loss: 0, prior_unallowed: 0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("net_income_exceeds_loss: pal=(30000+20000)-60000=-10000 → no PAL → does not route to schedule1", () => {
  // pal = (30000 + 20000) - 60000 = -10000 → no PAL, no output
  const result = compute({
    current_income: 60_000,
    current_loss: 30_000,
    prior_unallowed: 20_000,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("net_income_equals_loss: pal=0 → does not route to schedule1", () => {
  // pal = (30000 + 20000) - 50000 = 0 → no output
  const result = compute({
    current_income: 50_000,
    current_loss: 30_000,
    prior_unallowed: 20_000,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("passive_loss_exceeds_income: pal=40000, active rental MAGI=90000 → allowed=35000 → schedule1=-35000", () => {
  // pal = 50000 - 10000 = 40000. allowance = min(40000, 25000) = 25000
  // allowed = min(40000, 10000 + 25000) = 35000
  const result = compute({
    current_income: 10_000,
    current_loss: 50_000,
    prior_unallowed: 0,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 90_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(s1?.input.line17_schedule_e, -35_000);
});

Deno.test("zero_income_full_pal: pal=40000, no active rental → allowed=0 → does not route to schedule1", () => {
  // pal = 30000 + 10000 = 40000, no active rental → allowance = 0
  // allowed = min(40000, 0 + 0) = 0 → no output
  const result = compute({
    current_income: 0,
    current_loss: 30_000,
    prior_unallowed: 10_000,
    has_active_rental: false,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("prior_unallowed_adds_to_loss: pal=25000, no active rental → allowed=5000 → schedule1=-5000", () => {
  // pal = (10000 + 20000) - 5000 = 25000, no active rental → allowance = 0
  // allowed = min(25000, 5000 + 0) = 5000
  const result = compute({
    current_income: 5_000,
    current_loss: 10_000,
    prior_unallowed: 20_000,
    has_active_rental: false,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(s1?.input.line17_schedule_e, -5_000);
});

// ─── 3. Thresholds ────────────────────────────────────────────────────────────

Deno.test("magi_below_lower_full_allowance: MAGI=80000, loss=30000 → allowed=25000 → schedule1=-25000", () => {
  // pal = 30000, allowance = min(30000, 25000) = 25000, allowed = min(30000, 0 + 25000) = 25000
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
    current_loss: 30_000,
    prior_unallowed: 0,
    current_income: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -25_000);
});

Deno.test("magi_at_lower_threshold: MAGI=100000, loss=30000 → full $25k allowance → schedule1=-25000", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 100_000,
    current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -25_000);
});

Deno.test("magi_above_lower_partial_allowance: MAGI=125000 → phase_out=12500, phasedAllowance=12500 → schedule1=-12500", () => {
  // phase_out = 0.5 * (125000 - 100000) = 12500, phasedAllowance = max(0, 25000 - 12500) = 12500
  // allowed = min(30000, 0 + 12500) = 12500
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 125_000,
    current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -12_500);
});

Deno.test("magi_at_upper_threshold: MAGI=150000 → allowance=0 → does not route to schedule1", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 150_000,
    current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("magi_above_upper_threshold: MAGI=160000 → allowance=0 → does not route to schedule1", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 160_000,
    current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("rental_loss_caps_allowance: loss=15000, MAGI=50000 → allowed=15000 → schedule1=-15000", () => {
  // allowance = min(15000, 25000) = 15000 (capped by actual loss)
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 50_000,
    current_loss: 15_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -15_000);
});

Deno.test("allowance_max_25000: loss=40000, MAGI=50000 → allowance capped at 25000 → schedule1=-25000", () => {
  // allowance = min(40000, 25000) = 25000
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 50_000,
    current_loss: 40_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -25_000);
});

Deno.test("mfs_gets_zero_allowance: MFS, active rental, MAGI=40000, loss=20000 → allowance=0 → does not route to schedule1", () => {
  // MFS ineligible for Part II → allowance = 0, allowed = min(20000, 0 + 0) = 0
  const result = compute({
    filing_status: FilingStatus.MFS,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 40_000,
    current_loss: 20_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// ─── 4. Hard Validation Rules ─────────────────────────────────────────────────

Deno.test("mfs_ineligible_for_special_allowance: MFS gets $0 allowance, only income offsets → schedule1=-5000", () => {
  // MFS → allowance = 0. pal = 20000 - 5000 = 15000. allowed = min(15000, 5000 + 0) = 5000
  const result = compute({
    filing_status: FilingStatus.MFS,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 0,
    current_loss: 20_000,
    current_income: 5_000,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(s1?.input.line17_schedule_e, -5_000);
});

Deno.test("no_active_rental_skips_part_ii: has_active_rental=false, pal=25000, income=5000 → allowed=5000 → schedule1=-5000", () => {
  // allowance = 0 (no active rental). allowed = min(25000, 5000 + 0) = 5000
  const result = compute({
    has_active_rental: false,
    active_participation: true,
    modified_agi: 80_000,
    current_loss: 30_000,
    current_income: 5_000,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -5_000);
});

Deno.test("no_active_participation_skips_allowance: active_rental but no active_participation → allowance=0 → does not route", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: false,
    modified_agi: 80_000,
    current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("missing_modified_agi_skips_allowance: modified_agi omitted → allowance=0 → allowed=income → schedule1=-5000", () => {
  // allowance = 0 (no magi). allowed = min(25000, 5000 + 0) = 5000
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    current_loss: 30_000,
    current_income: 5_000,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -5_000);
});

// ─── 5. Output Routing ────────────────────────────────────────────────────────

Deno.test("routes_allowed_loss_to_schedule1: overall PAL exists, allowance covers part → schedule1 output exists", () => {
  const result = compute({
    current_loss: 30_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
  });
  assertEquals(findOutput(result, "schedule1") !== undefined, true);
});

Deno.test("schedule1_line17_is_negative: schedule1.line17_schedule_e is negative", () => {
  const result = compute({
    current_loss: 10_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -10_000);
});

Deno.test("no_output_when_pal_zero: income=50000, loss=30000, prior=20000 → pal=0 → does not route to schedule1", () => {
  // pal = (30000 + 20000) - 50000 = 0
  const result = compute({
    current_income: 50_000,
    current_loss: 30_000,
    prior_unallowed: 20_000,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("no_output_when_no_activity: all zero inputs → does not route to schedule1", () => {
  const result = compute({ current_income: 0, current_loss: 0, prior_unallowed: 0 });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("no_output_when_allowed_loss_zero: pal>0 but income=0 and no allowance → does not route to schedule1", () => {
  const result = compute({
    current_income: 0,
    current_loss: 20_000,
    has_active_rental: false,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// ─── 6. Edge Cases ────────────────────────────────────────────────────────────

Deno.test("positive_pal_no_restriction: income=80000, loss=30000, prior=20000 → pal=-30000 → does not route to schedule1", () => {
  // pal = (30000 + 20000) - 80000 = -30000 → pal <= 0 → no output
  const result = compute({
    current_income: 80_000,
    current_loss: 30_000,
    prior_unallowed: 20_000,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("mfs_disqualifies_special_allowance: MFS, active rental, MAGI=40000, loss=20000 → allowance=0 → does not route", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 40_000,
    current_loss: 20_000,
    current_income: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("magi_150k_eliminates_allowance: modified_agi=150000 with active rental → allowance=0 → does not route", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 150_000,
    current_loss: 30_000,
    current_income: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("prior_unallowed_increases_pal: income=5000, loss=5000, prior=10000 → pal=10000, allowed=5000 → schedule1=-5000", () => {
  // pal = (5000 + 10000) - 5000 = 10000. no active rental → allowance = 0
  // allowed = min(10000, 5000 + 0) = 5000
  const result = compute({
    current_income: 5_000,
    current_loss: 5_000,
    prior_unallowed: 10_000,
    has_active_rental: false,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -5_000);
});

Deno.test("disallowed_loss_not_routed: pal=30000, income+allowance=10000 → exactly 1 output, no second output for disallowed", () => {
  // pal = 30000, no active rental → allowance = 0
  // income = 10000, allowed = min(30000, 10000) = 10000, disallowed = 20000
  const result = compute({
    current_income: 10_000,
    current_loss: 30_000,
    has_active_rental: false,
  });
  assertEquals(result.outputs.length, 1);
});

// ─── 7. Smoke Tests ───────────────────────────────────────────────────────────

Deno.test("smoke_full_scenario: complex scenario → pal=45000, phasedAllowance=15000 → schedule1.line17=-45000", () => {
  // pal = (80000 + 15000) - 50000 = 45000
  // phase_out = 0.5 * (120000 - 100000) = 10000, phasedAllowance = max(0, 25000 - 10000) = 15000
  // allowance = min(45000, 15000) = 15000
  // allowed = min(45000, 50000 + 15000) = 45000
  const result = compute({
    current_income: 50_000,
    current_loss: 80_000,
    prior_unallowed: 15_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 120_000,
    filing_status: FilingStatus.MFJ,
    has_other_passive: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(s1?.input.line17_schedule_e, -45_000);
});

Deno.test("smoke_phase_out_correct: same smoke input → schedule1.line17_schedule_e = -45000", () => {
  const result = compute({
    current_income: 50_000,
    current_loss: 80_000,
    prior_unallowed: 15_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 120_000,
    filing_status: FilingStatus.MFJ,
    has_other_passive: true,
  });
  assertEquals(findOutput(result, "schedule1")?.input.line17_schedule_e, -45_000);
});

Deno.test("smoke_does_not_throw: smoke input does not throw", () => {
  compute({
    current_income: 50_000,
    current_loss: 80_000,
    prior_unallowed: 15_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 120_000,
    filing_status: FilingStatus.MFJ,
    has_other_passive: true,
  });
});
