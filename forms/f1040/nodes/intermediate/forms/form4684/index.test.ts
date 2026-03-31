import { assertEquals } from "@std/assert";
import { form4684 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form4684.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Personal Loss — Federal Disaster Requirement ────────────────────────────

Deno.test("personal loss — not federal disaster → no deduction", () => {
  const result = compute({
    personal_fmv_before: 50_000,
    personal_fmv_after: 30_000,
    personal_basis: 60_000,
    personal_insurance: 0,
    is_federal_disaster: false,
    agi: 50_000,
  });
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("personal loss — is_federal_disaster=undefined → no deduction", () => {
  const result = compute({
    personal_fmv_before: 50_000,
    personal_fmv_after: 30_000,
    personal_basis: 60_000,
    personal_insurance: 0,
    agi: 50_000,
  });
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("personal loss — federal disaster qualifies", () => {
  // FMV decline: $20,000, basis: $60,000, loss = min($20,000, $60,000) = $20,000
  // After $100 floor: $19,900
  // AGI = $50,000 → 10% = $5,000
  // Net: $19,900 - $5,000 = $14,900
  const result = compute({
    personal_fmv_before: 50_000,
    personal_fmv_after: 30_000,
    personal_basis: 60_000,
    personal_insurance: 0,
    is_federal_disaster: true,
    agi: 50_000,
  });
  const sa = findOutput(result, "schedule_a");
  assertEquals(sa !== undefined, true);
  assertEquals(sa?.fields.line_15_casualty_theft_loss, 14_900);
});

// ─── $100 Per-Event Floor ─────────────────────────────────────────────────────

Deno.test("$100 per-event floor applies before 10% AGI floor", () => {
  // FMV decline: $500, basis: $1,000, insurance $0
  // Loss = min($500, $1,000) = $500
  // After $100 floor: $400
  // AGI = $1,000, 10% = $100
  // Net: $400 - $100 = $300
  const result = compute({
    personal_fmv_before: 1_000,
    personal_fmv_after: 500,
    personal_basis: 1_000,
    personal_insurance: 0,
    is_federal_disaster: true,
    agi: 1_000,
  });
  const sa = findOutput(result, "schedule_a");
  assertEquals(sa?.fields.line_15_casualty_theft_loss, 300);
});

Deno.test("loss of exactly $100 → eliminated by per-event floor", () => {
  // FMV decline: $100, loss = min($100, $1000) = $100
  // After $100 floor: $0
  const result = compute({
    personal_fmv_before: 1_000,
    personal_fmv_after: 900,
    personal_basis: 1_000,
    personal_insurance: 0,
    is_federal_disaster: true,
    agi: 0,
  });
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

// ─── 10% AGI Floor ───────────────────────────────────────────────────────────

Deno.test("10% AGI floor eliminates small loss", () => {
  // Loss after $100 floor: $400
  // AGI = $5,000, 10% = $500
  // Net: $400 - $500 = -$100 → $0
  const result = compute({
    personal_fmv_before: 1_000,
    personal_fmv_after: 500,
    personal_basis: 1_000,
    personal_insurance: 0,
    is_federal_disaster: true,
    agi: 5_000,
  });
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

// ─── Insurance Reimbursement ─────────────────────────────────────────────────

Deno.test("insurance reimbursement reduces loss", () => {
  // FMV decline: $20,000, basis: $60,000, insurance $15,000
  // Loss = min($20,000, $60,000) - $15,000 = $5,000
  // After $100 floor: $4,900
  // AGI = $10,000, 10% = $1,000
  // Net: $4,900 - $1,000 = $3,900
  const result = compute({
    personal_fmv_before: 50_000,
    personal_fmv_after: 30_000,
    personal_basis: 60_000,
    personal_insurance: 15_000,
    is_federal_disaster: true,
    agi: 10_000,
  });
  const sa = findOutput(result, "schedule_a");
  assertEquals(sa?.fields.line_15_casualty_theft_loss, 3_900);
});

Deno.test("insurance fully covers loss → no deduction", () => {
  // Loss $20,000, insurance $20,000 → net loss = $0
  const result = compute({
    personal_fmv_before: 50_000,
    personal_fmv_after: 30_000,
    personal_basis: 60_000,
    personal_insurance: 20_000,
    is_federal_disaster: true,
    agi: 10_000,
  });
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

// ─── Loss Capped at Lesser of FMV Decline or Basis ───────────────────────────

Deno.test("loss capped at FMV decline when less than basis", () => {
  // FMV decline: $10,000, basis: $100,000
  // Deductible loss = $10,000 (FMV decline < basis)
  const result = compute({
    personal_fmv_before: 100_000,
    personal_fmv_after: 90_000,
    personal_basis: 100_000,
    personal_insurance: 0,
    is_federal_disaster: true,
    agi: 0,
  });
  const sa = findOutput(result, "schedule_a");
  // After $100 floor: $9,900; AGI 10% = $0; net = $9,900
  assertEquals(sa?.fields.line_15_casualty_theft_loss, 9_900);
});

Deno.test("loss capped at basis when less than FMV decline", () => {
  // FMV decline: $60,000 (total loss), basis: $40,000
  // Deductible = min($60,000, $40,000) = $40,000
  const result = compute({
    personal_fmv_before: 80_000,
    personal_fmv_after: 20_000,
    personal_basis: 40_000,
    personal_insurance: 0,
    is_federal_disaster: true,
    agi: 0,
  });
  const sa = findOutput(result, "schedule_a");
  // After $100 floor: $39,900; no AGI floor (agi=0)
  assertEquals(sa?.fields.line_15_casualty_theft_loss, 39_900);
});

// ─── Business Property Losses ────────────────────────────────────────────────

Deno.test("business §1231 property loss routes to form4797", () => {
  // Business property FMV decline: $30,000, basis: $50,000, no insurance
  // Loss = min($30,000, $50,000) = $30,000
  const result = compute({
    business_fmv_before: 80_000,
    business_fmv_after: 50_000,
    business_basis: 50_000,
    business_insurance: 0,
    business_is_section_1231: true,
  });
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797 !== undefined, true);
  assertEquals(f4797?.fields.ordinary_gain, -30_000);
  assertEquals(findOutput(result, "schedule_a"), undefined);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

Deno.test("business investment property loss routes to schedule_d", () => {
  const result = compute({
    business_fmv_before: 50_000,
    business_fmv_after: 30_000,
    business_basis: 45_000,
    business_insurance: 0,
    business_is_section_1231: false,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd !== undefined, true);
  assertEquals(sd?.fields.line_11_form2439, -20_000);
  assertEquals(findOutput(result, "form4797"), undefined);
});

Deno.test("business loss reduced by insurance", () => {
  // Decline: $30,000, basis: $50,000, insurance: $10,000
  // Net loss = $30,000 - $10,000 = $20,000
  const result = compute({
    business_fmv_before: 80_000,
    business_fmv_after: 50_000,
    business_basis: 50_000,
    business_insurance: 10_000,
    business_is_section_1231: true,
  });
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797?.fields.ordinary_gain, -20_000);
});

// ─── Personal + Business Combined ────────────────────────────────────────────

Deno.test("personal federal disaster loss + business §1231 loss combined", () => {
  const result = compute({
    // Personal
    personal_fmv_before: 50_000,
    personal_fmv_after: 30_000,
    personal_basis: 60_000,
    personal_insurance: 0,
    is_federal_disaster: true,
    agi: 50_000,
    // Business
    business_fmv_before: 80_000,
    business_fmv_after: 50_000,
    business_basis: 50_000,
    business_insurance: 0,
    business_is_section_1231: true,
  });
  const sa = findOutput(result, "schedule_a");
  const f4797 = findOutput(result, "form4797");
  assertEquals(sa !== undefined, true);
  assertEquals(f4797 !== undefined, true);
});

// ─── Output Field Routing ─────────────────────────────────────────────────────

Deno.test("personal loss routes to schedule_a line_15_casualty_theft_loss", () => {
  const result = compute({
    personal_fmv_before: 50_000,
    personal_fmv_after: 30_000,
    personal_basis: 60_000,
    personal_insurance: 0,
    is_federal_disaster: true,
    agi: 10_000,
  });
  const sa = findOutput(result, "schedule_a");
  assertEquals(sa !== undefined, true);
  assertEquals("line_15_casualty_theft_loss" in (sa?.fields ?? {}), true);
});
