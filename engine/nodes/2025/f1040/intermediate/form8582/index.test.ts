import { assertEquals, assertThrows } from "@std/assert";
import { form8582 } from "./index.ts";

// deno-lint-ignore no-explicit-any
function compute(input: Record<string, unknown>) {
  return form8582.compute(input as any);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Input Validation ────────────────────────────────────────────────────────

Deno.test("validation: rejects negative current_income", () => {
  assertThrows(() => compute({ current_income: -1 }));
});

Deno.test("validation: rejects negative current_loss", () => {
  assertThrows(() => compute({ current_loss: -1 }));
});

Deno.test("validation: rejects negative prior_unallowed", () => {
  assertThrows(() => compute({ prior_unallowed: -1 }));
});

Deno.test("validation: rejects negative modified_agi", () => {
  assertThrows(() => compute({ current_loss: 10_000, modified_agi: -1 }));
});

Deno.test("validation: rejects invalid filing_status", () => {
  assertThrows(() =>
    compute({ current_loss: 10_000, filing_status: "invalid" })
  );
});

// ─── Zero Passive Activity — No Output ───────────────────────────────────────

Deno.test("zero_activity: no inputs → no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero_activity: only income, no loss → no outputs", () => {
  const result = compute({ current_income: 5_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero_activity: income equals loss → no PAL → no outputs", () => {
  // current_income offsets current_loss fully → overall PAL = 0
  const result = compute({ current_income: 10_000, current_loss: 10_000 });
  assertEquals(result.outputs.length, 0);
});

// ─── Passive Income Offsets Passive Loss ─────────────────────────────────────

Deno.test("offset: passive income fully offsets passive loss → no output", () => {
  // income=15k, loss=10k → net gain=5k → no PAL restriction
  const result = compute({ current_income: 15_000, current_loss: 10_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("offset: passive income partially offsets loss → allowed = income only", () => {
  // income=3k, loss=10k → net PAL=-7k. No special allowance (no active rental).
  // allowed = income only = 3k; disallowed = 7k
  const result = compute({
    current_income: 3_000,
    current_loss: 10_000,
    has_active_rental: false,
    has_other_passive: true,
  });
  const s1 = findOutput(result, "schedule1");
  // allowed loss = income = 3_000 (negative on schedule1)
  assertEquals(s1?.input.line17_schedule_e, -3_000);
});

// ─── Net Passive Loss Fully Disallowed ───────────────────────────────────────

Deno.test("disallowed: net passive loss, no income, no allowance → $0 allowed", () => {
  // No income, no special allowance (other passive B type), entire loss disallowed
  const result = compute({
    current_loss: 20_000,
    has_other_passive: true,
    has_active_rental: false,
  });
  // Zero passive income + zero special allowance → allowed = 0 → no output
  assertEquals(result.outputs.length, 0);
});

// ─── Rental $25k Allowance — Full (MAGI ≤ $100k) ────────────────────────────

Deno.test("rental_allowance: full $25k when MAGI <= $100k", () => {
  // Rental loss = $20k, MAGI = $80k → full allowance up to $20k
  const result = compute({
    current_loss: 20_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
  });
  const s1 = findOutput(result, "schedule1");
  // allowed = min(20k, 25k) = 20k
  assertEquals(s1?.input.line17_schedule_e, -20_000);
});

Deno.test("rental_allowance: loss > $25k, MAGI <= $100k → capped at $25k", () => {
  // Rental loss = $40k, MAGI = $60k → allowance = $25k
  const result = compute({
    current_loss: 40_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 60_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -25_000);
});

Deno.test("rental_allowance: exactly at $100k MAGI → full $25k allowance", () => {
  const result = compute({
    current_loss: 30_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 100_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -25_000);
});

// ─── Rental Allowance Phase-Out ($100k–$150k MAGI) ───────────────────────────

Deno.test("phase_out: MAGI $110k → $25k - 50%×$10k = $20k allowance", () => {
  // allowance = $25k - 50% × ($110k - $100k) = $25k - $5k = $20k
  const result = compute({
    current_loss: 30_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 110_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -20_000);
});

Deno.test("phase_out: MAGI $130k → $25k - 50%×$30k = $10k allowance", () => {
  // allowance = $25k - 50% × ($130k - $100k) = $25k - $15k = $10k
  const result = compute({
    current_loss: 30_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 130_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -10_000);
});

Deno.test("phase_out: loss < phased-out allowance → full loss allowed", () => {
  // loss = $8k, MAGI = $130k → allowance = $10k → allowed = min(8k, 10k) = $8k
  const result = compute({
    current_loss: 8_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 130_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -8_000);
});

// ─── Rental Allowance Fully Phased Out (MAGI ≥ $150k) ────────────────────────

Deno.test("fully_phased_out: MAGI exactly $150k → $0 allowance", () => {
  const result = compute({
    current_loss: 20_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 150_000,
  });
  // $0 special allowance + no passive income → allowed = 0 → no output
  assertEquals(result.outputs.length, 0);
});

Deno.test("fully_phased_out: MAGI $200k → $0 allowance, loss fully disallowed", () => {
  const result = compute({
    current_loss: 15_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 200_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── No Active Participation — Allowance Denied ───────────────────────────────

Deno.test("no_active_participation: active_rental but no active_participation → no allowance", () => {
  const result = compute({
    current_loss: 20_000,
    has_active_rental: true,
    active_participation: false,
    modified_agi: 80_000,
  });
  // No allowance without active participation
  assertEquals(result.outputs.length, 0);
});

// ─── Prior Unallowed Losses ──────────────────────────────────────────────────

Deno.test("prior_unallowed: prior losses increase total PAL, partial offset by income", () => {
  // current_income=5k, prior_unallowed=8k → total loss=8k, income=5k
  // net PAL = 8k - 5k = 3k. No special allowance (no active rental).
  // allowed = min(3k, income=5k) = 3k
  const result = compute({
    current_income: 5_000,
    prior_unallowed: 8_000,
    has_other_passive: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -3_000);
});

Deno.test("prior_unallowed: prior losses with rental allowance", () => {
  // current_loss=10k, prior_unallowed=5k → total PAL=15k. MAGI=80k → allowance=min(15k,25k)=15k
  const result = compute({
    current_loss: 10_000,
    prior_unallowed: 5_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -15_000);
});

// ─── Output Routing ──────────────────────────────────────────────────────────

Deno.test("routing: allowed loss routes to schedule1 line17_schedule_e as negative", () => {
  const result = compute({
    current_loss: 10_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule1");
  const amount = result.outputs[0].input.line17_schedule_e as number;
  assertEquals(amount < 0, true);
  assertEquals(amount, -10_000);
});

Deno.test("routing: exactly 1 output when loss is allowed", () => {
  const result = compute({
    current_loss: 5_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 50_000,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule1");
});

// ─── Mixed Rental + Other Passive ────────────────────────────────────────────

Deno.test("mixed: rental income offsets other passive loss", () => {
  // rental income=8k, other passive loss=5k → net PAL = 8k - 5k = +3k (overall gain) → no restriction
  const result = compute({
    current_income: 8_000,
    current_loss: 5_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("mixed: combined income+allowance covers loss partially", () => {
  // current_income=2k (passive income), current_loss=30k, MAGI=80k
  // overall PAL = 30k - 2k = 28k. Allowance = min(28k, 25k) = 25k (capped)
  // But wait: income=2k helps separately. allowed = income + allowance = 2k + 25k = 27k
  // Total PAL = 28k, allowed = 27k, disallowed = 1k
  const result = compute({
    current_income: 2_000,
    current_loss: 30_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -27_000);
});

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke: typical rental property, single filer, MAGI $70k, $12k loss", () => {
  // Active rental, MAGI well below $100k → full $12k allowed
  const result = compute({
    current_loss: 12_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 70_000,
  });
  assertEquals(result.outputs.length, 1);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.nodeType, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -12_000);
});

Deno.test("smoke: high-income taxpayer (MAGI $200k), rental loss fully disallowed", () => {
  const result = compute({
    current_loss: 25_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 200_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke: other passive activity loss, no special allowance, fully disallowed", () => {
  const result = compute({
    current_loss: 8_000,
    has_other_passive: true,
    has_active_rental: false,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke: prior unallowed + current loss, MAGI $120k, phase-out applies", () => {
  // total PAL = 10k + 8k = 18k. MAGI=$120k → phase-out reduction=50%×20k=10k
  // allowance = 25k - 10k = 15k. allowed = min(18k, 15k) = 15k
  const result = compute({
    current_loss: 10_000,
    prior_unallowed: 8_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 120_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line17_schedule_e, -15_000);
});
