import { assertEquals, assertThrows } from "@std/assert";
import { form8839 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8839.compute(input);
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

Deno.test("credit: full credit when MAGI below phase-out threshold", () => {
  // MAGI $200,000 — well below $259,190 phase-out start → no reduction
  // One child, $15,000 qualified expenses
  // Max credit $17,280, expenses $15,000 → credit $15,000
  // Refundable: min($15,000, $5,000) = $5,000
  // Nonrefundable: $15,000 - $5,000 = $10,000 (subject to tax liability limit)
  // income_tax_liability = $12,000 → nonrefundable = min($10,000, $12,000) = $10,000
  const result = compute({
    children: [{ qualified_expenses: 15000, special_needs: false }],
    magi: 200000,
    income_tax_liability: 12000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 10000);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
});

Deno.test("credit: expenses above max are capped at $17,280 per child", () => {
  // Expenses $20,000 > $17,280 → capped at $17,280
  // Refundable: min($17,280, $5,000) = $5,000
  // Nonrefundable: $17,280 - $5,000 = $12,280, tax liability $15,000 → $12,280
  const result = compute({
    children: [{ qualified_expenses: 20000, special_needs: false }],
    magi: 100000,
    income_tax_liability: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 12280);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
});

// ─── Partial credit — MAGI in phase-out range ─────────────────────────────────

Deno.test("credit: partial credit when MAGI is in phase-out range", () => {
  // MAGI $279,190 — midpoint of phase-out ($259,190 to $299,190)
  // Phase-out fraction = (279190 - 259190) / 40000 = 20000/40000 = 0.500
  // Qualified expenses $17,280, max credit $17,280
  // Line 6 = $17,280, allowed = $17,280 × (1 - 0.500) = $8,640
  // Refundable: min($8,640, $5,000) = $5,000
  // Nonrefundable: $8,640 - $5,000 = $3,640, tax liability = $10,000
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 279190,
    income_tax_liability: 10000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 3640);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
});

Deno.test("credit: partial phase-out — fraction rounded to 3 decimal places", () => {
  // MAGI $269,190 → fraction = (269190 - 259190) / 40000 = 10000/40000 = 0.250
  // Expenses $12,000 → line6 = $12,000
  // Allowed = $12,000 × (1 - 0.250) = $9,000
  // Refundable: min($9,000, $5,000) = $5,000
  // Nonrefundable: $9,000 - $5,000 = $4,000, tax liability $8,000 → $4,000
  const result = compute({
    children: [{ qualified_expenses: 12000, special_needs: false }],
    magi: 269190,
    income_tax_liability: 8000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 4000);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
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
  // Special needs child — receives max credit regardless of expenses paid
  // MAGI $150,000 (no phase-out)
  // Expenses $0, but special_needs = true → line5 = $17,280 - prior(0) = $17,280
  // Refundable: min($17,280, $5,000) = $5,000
  // Nonrefundable: $12,280, tax liability $20,000 → $12,280
  const result = compute({
    children: [{ qualified_expenses: 0, special_needs: true }],
    magi: 150000,
    income_tax_liability: 20000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 12280);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
});

Deno.test("special needs: full credit with prior year credit already claimed", () => {
  // Prior year credit $3,000 already claimed for same child
  // Line 5 for special needs = $17,280 - $3,000 = $14,280
  // Line 6 = min($17,280 - $3,000, $14,280) = $14,280
  // No phase-out (MAGI $100,000)
  // Refundable: min($14,280, $5,000) = $5,000
  // Nonrefundable: $9,280, tax liability $15,000 → $9,280
  const result = compute({
    children: [{ qualified_expenses: 0, special_needs: true, prior_year_credit: 3000 }],
    magi: 100000,
    income_tax_liability: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 9280);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
});

// ─── Employer benefit exclusion (Part III) ────────────────────────────────────

Deno.test("exclusion: adoption_benefits below max are fully excluded", () => {
  // $10,000 in employer adoption benefits (W-2 Box 12T), MAGI $200,000
  // Max exclusion $17,280 → all $10,000 excluded → no taxable benefits
  // No qualified expenses → no credit
  const result = compute({
    adoption_benefits: 10000,
    children: [{ qualified_expenses: 0, special_needs: false }],
    magi: 200000,
    income_tax_liability: 5000,
  });

  const f1040 = findOutput(result, "f1040");
  // No taxable benefits, no refundable credit
  assertEquals(f1040?.input.line1f_taxable_adoption_benefits, undefined);
  assertEquals(f1040?.input.line30_refundable_adoption, undefined);
});

Deno.test("exclusion: adoption_benefits above max produce taxable income on f1040 line1f", () => {
  // $20,000 in employer benefits, max exclusion $17,280 (MAGI $200,000, no phase-out)
  // Excluded = $17,280, taxable = $20,000 - $17,280 = $2,720
  const result = compute({
    adoption_benefits: 20000,
    children: [{ qualified_expenses: 0, special_needs: false }],
    magi: 200000,
    income_tax_liability: 5000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.input.line1f_taxable_adoption_benefits, 2720);
});

Deno.test("exclusion: phase-out reduces both exclusion and taxable amount", () => {
  // $17,280 in employer benefits, MAGI $279,190 (50% phased out)
  // Excluded = $17,280 × (1 - 0.500) = $8,640
  // Taxable = $17,280 - $8,640 = $8,640
  const result = compute({
    adoption_benefits: 17280,
    children: [{ qualified_expenses: 0, special_needs: false }],
    magi: 279190,
    income_tax_liability: 5000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.input.line1f_taxable_adoption_benefits, 8640);
});

// ─── Combined credit + exclusion ─────────────────────────────────────────────

Deno.test("combined: credit and exclusion together — employer paid part, taxpayer paid rest", () => {
  // Employer paid $5,000 (Box 12T), taxpayer paid $10,000 in qualified expenses
  // Employer-reimbursed expenses are NOT qualified for the credit
  // So qualified expenses for credit = $10,000 (taxpayer-paid only)
  // MAGI $200,000, no phase-out
  // Exclusion: min($17,280, $5,000) = $5,000 fully excluded, taxable = $0
  // Credit: $10,000 expenses → $10,000 credit
  // Refundable: $5,000, Nonrefundable: $5,000, tax liability $15,000 → $5,000
  const result = compute({
    adoption_benefits: 5000,
    children: [{ qualified_expenses: 10000, special_needs: false }],
    magi: 200000,
    income_tax_liability: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 5000);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
  assertEquals(f1040?.input.line1f_taxable_adoption_benefits, undefined);
});

// ─── Multi-child ─────────────────────────────────────────────────────────────

Deno.test("multi-child: two children, credits aggregated", () => {
  // Child 1: $8,000 expenses, Child 2: $6,000 expenses
  // MAGI $200,000, no phase-out
  // Child 1 credit: $8,000, refundable: $5,000, nonrefundable: $3,000
  // Child 2 credit: $6,000, refundable: $5,000, nonrefundable: $1,000
  // Total refundable: $10,000, total nonrefundable: $4,000
  // Tax liability $15,000 → nonrefundable: min($4,000, $15,000) = $4,000
  const result = compute({
    children: [
      { qualified_expenses: 8000, special_needs: false },
      { qualified_expenses: 6000, special_needs: false },
    ],
    magi: 200000,
    income_tax_liability: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 4000);
  assertEquals(f1040?.input.line30_refundable_adoption, 10000);
});

// ─── Credit limit by tax liability ───────────────────────────────────────────

Deno.test("credit limit: nonrefundable credit capped by income tax liability", () => {
  // $17,280 credit, refundable $5,000, nonrefundable $12,280
  // Tax liability $3,000 → nonrefundable capped at $3,000
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 100000,
    income_tax_liability: 3000,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3?.input.line6c_adoption_credit, 3000);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
});

Deno.test("credit limit: zero tax liability means no nonrefundable credit", () => {
  // $17,280 credit, tax liability $0 → nonrefundable = 0, only refundable $5,000
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 100000,
    income_tax_liability: 0,
  });

  const s3 = findOutput(result, "schedule3");
  const f1040 = findOutput(result, "f1040");

  assertEquals(s3, undefined);
  assertEquals(f1040?.input.line30_refundable_adoption, 5000);
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
