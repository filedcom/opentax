import { assertEquals, assertThrows } from "@std/assert";
import { CreditClaimed, f8867 } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8867.compute({ taxYear: 2025, formType: "f1040" }, { f8867s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8867.inputSchema: valid minimal item passes", () => {
  const parsed = f8867.inputSchema.safeParse({ f8867s: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f8867.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8867.inputSchema.safeParse({ f8867s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8867.inputSchema: valid with EITC credit claimed", () => {
  const parsed = f8867.inputSchema.safeParse({
    f8867s: [{ credits_claimed: [CreditClaimed.EITC] }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8867.inputSchema: valid with multiple credits claimed", () => {
  const parsed = f8867.inputSchema.safeParse({
    f8867s: [{
      credits_claimed: [CreditClaimed.EITC, CreditClaimed.CTC, CreditClaimed.AOTC, CreditClaimed.HOH],
      taxpayer_interview_conducted: true,
      documentation_reviewed: true,
      knowledge_questions_satisfied: true,
      records_retained: true,
    }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8867.inputSchema: invalid credit code fails", () => {
  const parsed = f8867.inputSchema.safeParse({
    f8867s: [{ credits_claimed: ["INVALID_CODE"] }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. No Tax Computation Output (Compliance Only)
// =============================================================================

Deno.test("f8867.compute: empty item produces no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8867.compute: EITC claimed — no output (compliance only)", () => {
  const result = compute([minimalItem({ credits_claimed: [CreditClaimed.EITC] })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8867.compute: CTC claimed — no output (compliance only)", () => {
  const result = compute([minimalItem({ credits_claimed: [CreditClaimed.CTC] })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8867.compute: AOTC claimed — no output (compliance only)", () => {
  const result = compute([minimalItem({ credits_claimed: [CreditClaimed.AOTC] })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8867.compute: HOH claimed — no output (compliance only)", () => {
  const result = compute([minimalItem({ credits_claimed: [CreditClaimed.HOH] })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8867.compute: all credits claimed with all diligence flags — no output", () => {
  const result = compute([minimalItem({
    credits_claimed: [CreditClaimed.EITC, CreditClaimed.CTC, CreditClaimed.AOTC, CreditClaimed.HOH],
    taxpayer_interview_conducted: true,
    documentation_reviewed: true,
    knowledge_questions_satisfied: true,
    records_retained: true,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8867.compute: multiple items — still no output", () => {
  const result = compute([
    minimalItem({ credits_claimed: [CreditClaimed.EITC] }),
    minimalItem({ credits_claimed: [CreditClaimed.CTC] }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation
// =============================================================================

Deno.test("f8867.compute: throws on invalid credit code in credits_claimed", () => {
  assertThrows(
    () => f8867.compute({ taxYear: 2025, formType: "f1040" }, { f8867s: [{ credits_claimed: ["INVALID" as CreditClaimed] }] }),
    Error,
  );
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f8867.compute: smoke test — full due diligence form", () => {
  const result = compute([
    minimalItem({
      credits_claimed: [CreditClaimed.EITC, CreditClaimed.CTC, CreditClaimed.AOTC, CreditClaimed.HOH],
      taxpayer_interview_conducted: true,
      documentation_reviewed: true,
      knowledge_questions_satisfied: false,
      records_retained: true,
    }),
  ]);
  // Compliance form only — no tax computation output ever
  assertEquals(result.outputs.length, 0);
});
