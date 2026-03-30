import { assertEquals, assertThrows } from "@std/assert";
import { ira_deduction_worksheet, inputSchema } from "./index.ts";
import { FilingStatus } from "../../types.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

function compute(input: Record<string, unknown>) {
  return ira_deduction_worksheet.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: zero contribution → no outputs", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 50_000,
    ira_contribution: 0,
    active_participant: false,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Not active participant (fully deductible) ────────────────────────────────

Deno.test("not active participant: single → full deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 120_000,
    ira_contribution: 7_000,
    active_participant: false,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 7_000);
});

Deno.test("not active participant: MFJ spouse not participant → full deduction", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 200_000,
    ira_contribution: 7_000,
    active_participant: false,
    spouse_active_participant: false,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 7_000);
});

// ─── Active participant — below phase-out (full deduction) ────────────────────

Deno.test("active participant: single below phase-out → full deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 78_000, // below $79,000 lower bound
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 7_000);
});

Deno.test("active participant: MFJ below phase-out → full deduction", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 125_000, // below $126,000 lower bound
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 7_000);
});

// ─── Active participant — in phase-out (partial deduction) ───────────────────

Deno.test("active participant: single in phase-out → partial deduction", () => {
  // MAGI $84,000, range $79k–$89k → ratio = 5000/10000 = 0.5
  // Reduced limit = 7000 × 0.5 = 3500 → round up to $3500 (already multiple of $10)
  // Deductible = min(7000, 3500) = 3500
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 84_000,
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 3_500);
});

Deno.test("active participant: MFJ in phase-out → partial deduction", () => {
  // MAGI $136,000, range $126k–$146k → ratio = 10000/20000 = 0.5
  // Reduced limit = 7000 × 0.5 = 3500
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 136_000,
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 3_500);
});

Deno.test("active participant: HOH in phase-out → partial deduction", () => {
  // HOH uses same range as Single ($79k–$89k)
  // MAGI $84,000, ratio 0.5 → 7000 × 0.5 = 3500
  const result = compute({
    filing_status: FilingStatus.HOH,
    magi: 84_000,
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 3_500);
});

// ─── Active participant — above phase-out (no deduction) ─────────────────────

Deno.test("active participant: single above phase-out → no deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 90_000, // at or above $89,000 upper bound
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("active participant: MFJ above phase-out → no deduction", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 150_000, // above $146,000
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Non-covered MFJ spouse phase-out ─────────────────────────────────────────

Deno.test("non-covered MFJ spouse: below non-covered range → full deduction", () => {
  // Taxpayer NOT active, spouse IS. MAGI $230,000 < $236,000 lower
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 230_000,
    ira_contribution: 7_000,
    active_participant: false,
    spouse_active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 7_000);
});

Deno.test("non-covered MFJ spouse: in non-covered range → partial deduction", () => {
  // MAGI $241,000, range $236k–$246k → ratio = 5000/10000 = 0.5
  // Reduced limit = 7000 × 0.5 = 3500
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 241_000,
    ira_contribution: 7_000,
    active_participant: false,
    spouse_active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 3_500);
});

Deno.test("non-covered MFJ spouse: above non-covered range → no deduction", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 246_001,
    ira_contribution: 7_000,
    active_participant: false,
    spouse_active_participant: true,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Age 50+ catch-up contribution limit ─────────────────────────────────────

Deno.test("age 50+: contribution limit is $8,000", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 50_000,
    ira_contribution: 8_000, // catch-up limit
    active_participant: false,
    age_50_or_older: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 8_000);
});

Deno.test("age 50+: contribution exceeds $8,000 → capped at $8,000", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 50_000,
    ira_contribution: 9_000,
    active_participant: false,
    age_50_or_older: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 8_000);
});

// ─── Contribution cap (under 50) ─────────────────────────────────────────────

Deno.test("contribution exceeds $7,000 limit → capped at $7,000", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 50_000,
    ira_contribution: 9_000,
    active_participant: false,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 7_000);
});

// ─── Phase-out rounding rules ─────────────────────────────────────────────────

Deno.test("phase-out: reduced amount rounds up to nearest $10", () => {
  // MAGI $80,000, range $79k–$89k → ratio = 1000/10000 = 0.1
  // Reduced limit = 7000 × (1 - 0.1) = 6300 → already multiple of $10
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 80_000,
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 6_300);
});

Deno.test("phase-out: minimum $200 deduction floor applies", () => {
  // MAGI $88,500, range $79k–$89k → ratio = 9500/10000 = 0.95
  // Reduced limit = 7000 × 0.05 = 350 → rounded to $350
  // But wait — let's use $88,800: ratio = 9800/10000 = 0.98
  // Reduced = 7000 × 0.02 = 140 → below $200 floor → $200
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 88_800,
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 200);
});

// ─── MFS active participant ────────────────────────────────────────────────────

Deno.test("MFS active participant: phase-out $0–$10,000 → partial at MAGI $5,000", () => {
  // ratio = 5000/10000 = 0.5 → reduced = 7000 × 0.5 = 3500
  const result = compute({
    filing_status: FilingStatus.MFS,
    magi: 5_000,
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line20_ira_deduction, 3_500);
});

Deno.test("MFS active participant: above $10,000 MAGI → no deduction", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    magi: 10_001,
    ira_contribution: 7_000,
    active_participant: true,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Schema validation ─────────────────────────────────────────────────────────

Deno.test("schema: rejects negative ira_contribution", () => {
  assertThrows(() => compute({
    filing_status: FilingStatus.Single,
    magi: 50_000,
    ira_contribution: -100,
    active_participant: false,
  }));
});

Deno.test("schema: rejects negative magi", () => {
  assertThrows(() => compute({
    filing_status: FilingStatus.Single,
    magi: -1,
    ira_contribution: 7_000,
    active_participant: false,
  }));
});
