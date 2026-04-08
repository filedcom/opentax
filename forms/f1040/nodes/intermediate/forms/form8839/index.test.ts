import { assertEquals, assertThrows } from "@std/assert";
import { form8839 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8839.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: empty children array produces no outputs", () => {
  const result = compute({
    children: [],
    magi: 100000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Full credit — MAGI below phase-out ───────────────────────────────────────
// The adoption credit is entirely nonrefundable since TY2013 (ATRA §104).
// All credit goes to Schedule 3 line 6c; line30_refundable_adoption does not exist.

Deno.test("credit: full credit when MAGI below phase-out threshold", () => {
  // MAGI $200,000 — below $259,190 phase-out start → no reduction
  // Expenses $15,000, max $17,280 → credit $15,000
  // Nonrefundable: min($15,000, tax_liability $12,000) = $12,000
  const result = compute({
    children: [{ qualified_expenses: 15000, special_needs: false }],
    magi: 200000,
    income_tax_liability: 12000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 12000);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("credit: expenses above max are capped at $17,280 per child", () => {
  // Expenses $20,000 > $17,280 → capped at $17,280
  // Nonrefundable: min($17,280, tax_liability $15,000) = $15,000
  const result = compute({
    children: [{ qualified_expenses: 20000, special_needs: false }],
    magi: 100000,
    income_tax_liability: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 15000);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── Partial credit — MAGI in phase-out range ─────────────────────────────────

Deno.test("credit: partial credit when MAGI is in phase-out range", () => {
  // MAGI $279,190 — midpoint of phase-out ($259,190 to $299,190)
  // Phase-out fraction = (279190 - 259190) / 40000 = 0.500
  // Expenses $17,280 → allowed = $17,280 × (1 - 0.500) = $8,640
  // Nonrefundable: min($8,640, tax_liability $10,000) = $8,640
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 279190,
    income_tax_liability: 10000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 8640);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("credit: partial phase-out — fraction rounded to 3 decimal places", () => {
  // MAGI $269,190 → fraction = 10000/40000 = 0.250
  // Expenses $12,000 → allowed = $12,000 × (1 - 0.250) = $9,000
  // Nonrefundable: min($9,000, tax_liability $8,000) = $8,000
  const result = compute({
    children: [{ qualified_expenses: 12000, special_needs: false }],
    magi: 269190,
    income_tax_liability: 8000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 8000);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── No credit — MAGI above phase-out ────────────────────────────────────────

Deno.test("credit: no credit when MAGI at or above phase-out end ($299,190)", () => {
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 299190,
    income_tax_liability: 20000,
  });

  assertEquals(result.outputs.length, 0);
});

Deno.test("credit: no credit when MAGI above phase-out end", () => {
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 350000,
    income_tax_liability: 50000,
  });

  assertEquals(result.outputs.length, 0);
});

// ─── Special needs child ──────────────────────────────────────────────────────

Deno.test("special needs: full credit $17,280 even with zero qualified expenses", () => {
  // Special needs → max credit regardless of expenses
  // MAGI $150,000 (no phase-out), tax_liability $20,000
  // Nonrefundable: min($17,280, $20,000) = $17,280
  const result = compute({
    children: [{ qualified_expenses: 0, special_needs: true }],
    magi: 150000,
    income_tax_liability: 20000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 17280);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("special needs: full credit with prior year credit already claimed", () => {
  // Prior credit $3,000 → remaining = $17,280 - $3,000 = $14,280
  // MAGI $100,000, tax_liability $15,000
  // Nonrefundable: min($14,280, $15,000) = $14,280
  const result = compute({
    children: [{ qualified_expenses: 0, special_needs: true, prior_year_credit: 3000 }],
    magi: 100000,
    income_tax_liability: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 14280);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── Employer benefit exclusion (Part III) ────────────────────────────────────

Deno.test("exclusion: adoption_benefits below max are fully excluded", () => {
  // $10,000 employer benefits, max exclusion $17,280 → fully excluded → no taxable benefits
  // $0 qualified expenses → no credit
  const result = compute({
    adoption_benefits: 10000,
    children: [{ qualified_expenses: 0, special_needs: false }],
    magi: 200000,
    income_tax_liability: 5000,
  });

  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("exclusion: adoption_benefits above max produce taxable income on f1040 line1f", () => {
  // $20,000 employer benefits, max exclusion $17,280 → taxable = $20,000 - $17,280 = $2,720
  const result = compute({
    adoption_benefits: 20000,
    children: [{ qualified_expenses: 0, special_needs: false }],
    magi: 200000,
    income_tax_liability: 5000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line1f_taxable_adoption_benefits, 2720);
});

Deno.test("exclusion: phase-out reduces both exclusion and taxable amount", () => {
  // $17,280 employer benefits, MAGI $279,190 (50% phased out)
  // Excluded = $17,280 × 0.500 = $8,640; taxable = $17,280 - $8,640 = $8,640
  const result = compute({
    adoption_benefits: 17280,
    children: [{ qualified_expenses: 0, special_needs: false }],
    magi: 279190,
    income_tax_liability: 5000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line1f_taxable_adoption_benefits, 8640);
});

// ─── Combined credit + exclusion ─────────────────────────────────────────────

Deno.test("combined: credit and exclusion together — employer paid part, taxpayer paid rest", () => {
  // Employer paid $5,000 (Box 12T) → fully excluded (no phase-out)
  // Taxpayer paid $10,000 qualified expenses → credit $10,000
  // Nonrefundable: min($10,000, tax_liability $15,000) = $10,000
  // No taxable benefits (employer amount fully excluded)
  const result = compute({
    adoption_benefits: 5000,
    children: [{ qualified_expenses: 10000, special_needs: false }],
    magi: 200000,
    income_tax_liability: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 10000);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── Multi-child ─────────────────────────────────────────────────────────────

Deno.test("multi-child: two children, credits aggregated", () => {
  // Child 1: $8,000 expenses; Child 2: $6,000 expenses
  // Total credit = $14,000, limited by tax_liability $15,000 → $14,000
  const result = compute({
    children: [
      { qualified_expenses: 8000, special_needs: false },
      { qualified_expenses: 6000, special_needs: false },
    ],
    magi: 200000,
    income_tax_liability: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 14000);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── Credit limit by tax liability ───────────────────────────────────────────

Deno.test("credit limit: nonrefundable credit capped by income tax liability", () => {
  // $17,280 credit, tax liability $3,000 → capped at $3,000
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 100000,
    income_tax_liability: 3000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 3000);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("credit limit: zero tax liability means no credit output", () => {
  // $17,280 credit, tax liability $0 → nonrefundable = 0 → no outputs
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 100000,
    income_tax_liability: 0,
  });

  assertEquals(result.outputs.length, 0);
});

// ─── MFS restriction ─────────────────────────────────────────────────────────

Deno.test("mfs: no credit for MFS filers without exception", () => {
  const result = compute({
    children: [{ qualified_expenses: 15000, special_needs: false }],
    magi: 100000,
    income_tax_liability: 10000,
    filing_status: "mfs",
  });

  assertEquals(result.outputs.length, 0);
});

// ─── Validation ───────────────────────────────────────────────────────────────

Deno.test("validation: rejects negative qualified_expenses", () => {
  assertThrows(() =>
    compute({
      children: [{ qualified_expenses: -100, special_needs: false }],
      magi: 100000,
    })
  );
});

Deno.test("validation: rejects negative magi", () => {
  assertThrows(() =>
    compute({
      children: [{ qualified_expenses: 5000, special_needs: false }],
      magi: -1,
    })
  );
});

Deno.test("validation: rejects negative adoption_benefits", () => {
  assertThrows(() =>
    compute({
      adoption_benefits: -500,
      children: [],
      magi: 100000,
    })
  );
});

// ─── Output routing smoke test ────────────────────────────────────────────────

Deno.test("routing: outputs are directed only to schedule3 and f1040 node types", () => {
  const result = compute({
    children: [{ qualified_expenses: 10000, special_needs: false }],
    magi: 150000,
    income_tax_liability: 10000,
  });

  const nodeTypes = result.outputs.map((o) => o.nodeType);
  for (const nt of nodeTypes) {
    assertEquals(
      nt === "schedule3" || nt === "f1040",
      true,
      `Unexpected nodeType: ${nt}`,
    );
  }
});

// ─── prior_year_credit reduces available credit ───────────────────────────────

Deno.test("credit: prior_year_credit reduces per-child baseline", () => {
  // Max $17,280; prior $10,000 → remaining = $7,280
  // Expenses $12,000 > remaining → capped at $7,280
  // Nonrefundable: min($7,280, tax_liability $10,000) = $7,280
  const result = compute({
    children: [{ qualified_expenses: 12_000, special_needs: false, prior_year_credit: 10_000 }],
    magi: 100_000,
    income_tax_liability: 10_000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 7_280);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("credit: prior_year_credit equal to max leaves zero remaining — no output", () => {
  // Prior credit = $17,280 = max → remaining = 0 → no credit
  const result = compute({
    children: [{ qualified_expenses: 15_000, special_needs: false, prior_year_credit: 17_280 }],
    magi: 100_000,
    income_tax_liability: 10_000,
  });

  assertEquals(result.outputs.length, 0);
});

// ─── Phase-out boundary at $259,190 ──────────────────────────────────────────

Deno.test("credit: MAGI exactly at phase-out start ($259,190) — full credit, no reduction", () => {
  // Fraction = 0 → no phase-out reduction
  // Expenses $10,000, tax_liability $10,000 → nonrefundable $10,000
  const result = compute({
    children: [{ qualified_expenses: 10_000, special_needs: false }],
    magi: 259_190,
    income_tax_liability: 10_000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 10_000);
  assertEquals(findOutput(result, "f1040"), undefined);
});
