import { assertEquals, assertThrows } from "@std/assert";
import { form8839 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8839.compute({ taxYear: 2025, formType: "f1040" }, input);
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

// ─── 2025 per-child refundable and nonrefundable credit split ────────────────

Deno.test("credit: full credit when MAGI below phase-out threshold", () => {
  // MAGI $200,000 — below $259,190 phase-out start → no reduction
  // Expenses $15,000, max $17,280 → credit $15,000
  // Refundable $5,000; remaining $10,000 fits the line 17 limit.
  const result = compute({
    children: [{ qualified_expenses: 15000, special_needs: false }],
    magi: 200000,
    credit_limit_worksheet_line5: 12000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 10000);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

Deno.test("credit: expenses above max are capped at $17,280 per child", () => {
  // Expenses $20,000 > $17,280 → capped at $17,280
  // Refundable $5,000; remaining $12,280 is nonrefundable.
  const result = compute({
    children: [{ qualified_expenses: 20000, special_needs: false }],
    magi: 100000,
    credit_limit_worksheet_line5: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 12280);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

// ─── Partial credit — MAGI in phase-out range ─────────────────────────────────

Deno.test("credit: partial credit when MAGI is in phase-out range", () => {
  // MAGI $279,190 — midpoint of phase-out ($259,190 to $299,190)
  // Phase-out fraction = (279190 - 259190) / 40000 = 0.500
  // Expenses $17,280 → allowed = $17,280 × (1 - 0.500) = $8,640
  // Refundable $5,000; remaining $3,640 is nonrefundable.
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 279190,
    credit_limit_worksheet_line5: 10000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 3640);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

Deno.test("credit: partial phase-out — fraction rounded to 3 decimal places", () => {
  // MAGI $269,190 → fraction = 10000/40000 = 0.250
  // Expenses $12,000 → allowed = $12,000 × (1 - 0.250) = $9,000
  // Refundable $5,000; remaining $4,000 is nonrefundable.
  const result = compute({
    children: [{ qualified_expenses: 12000, special_needs: false }],
    magi: 269190,
    credit_limit_worksheet_line5: 8000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 4000);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

// ─── No credit — MAGI above phase-out ────────────────────────────────────────

Deno.test("credit: no credit when MAGI at or above phase-out end ($299,190)", () => {
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 299190,
    credit_limit_worksheet_line5: 20000,
  });

  assertEquals(result.outputs.length, 0);
});

Deno.test("credit: no credit when MAGI above phase-out end", () => {
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 350000,
    credit_limit_worksheet_line5: 50000,
  });

  assertEquals(result.outputs.length, 0);
});

Deno.test("benefits: full phase-out still sends taxable W-2 adoption benefits to line 1f", () => {
  const result = compute({
    adoption_benefits: 8_000,
    children: [{ qualified_expenses: 0, special_needs: false }],
    magi: 299_190,
  });

  assertEquals(findOutput(result, "schedule3"), undefined);
  assertEquals(
    findOutput(result, "f1040")?.fields.line1f_taxable_adoption_benefits,
    8_000,
  );
});

// ─── Special needs child ──────────────────────────────────────────────────────

Deno.test("special needs: full credit $17,280 even with zero qualified expenses", () => {
  // Special needs → max credit regardless of expenses
  // MAGI $150,000 (no phase-out), tax_liability $20,000
  // Refundable $5,000; nonrefundable $12,280.
  const result = compute({
    children: [{ qualified_expenses: 0, special_needs: true }],
    magi: 150000,
    credit_limit_worksheet_line5: 20000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 12280);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

Deno.test("special needs: full credit with prior year credit already claimed", () => {
  // Prior credit $3,000 → remaining = $17,280 - $3,000 = $14,280
  // MAGI $100,000, tax_liability $15,000
  // Refundable $5,000; nonrefundable $9,280.
  const result = compute({
    children: [{ qualified_expenses: 0, special_needs: true, prior_year_credit: 3000 }],
    magi: 100000,
    credit_limit_worksheet_line5: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 9280);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

// ─── Employer benefit exclusion (Part III) ────────────────────────────────────

Deno.test("exclusion: adoption_benefits below max are fully excluded", () => {
  // $10,000 employer benefits, max exclusion $17,280 → fully excluded → no taxable benefits
  // $0 qualified expenses → no credit
  const result = compute({
    adoption_benefits: 10000,
    children: [{ qualified_expenses: 0, special_needs: false }],
    magi: 200000,
    credit_limit_worksheet_line5: 5000,
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
    credit_limit_worksheet_line5: 5000,
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
    credit_limit_worksheet_line5: 5000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line1f_taxable_adoption_benefits, 8640);
});

// ─── Combined credit + exclusion ─────────────────────────────────────────────

Deno.test("combined: credit and exclusion together — employer paid part, taxpayer paid rest", () => {
  // Employer paid $5,000 (Box 12T) → fully excluded (no phase-out)
  // Taxpayer paid $10,000 qualified expenses → credit $10,000
  // Refundable $5,000; nonrefundable $5,000.
  // No taxable benefits (employer amount fully excluded)
  const result = compute({
    adoption_benefits: 5000,
    children: [{ qualified_expenses: 10000, special_needs: false }],
    magi: 200000,
    credit_limit_worksheet_line5: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 5000);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

// ─── Multi-child ─────────────────────────────────────────────────────────────

Deno.test("multi-child: two children, credits aggregated", () => {
  // Child 1: $8,000 expenses; Child 2: $6,000 expenses
  // Each child contributes up to $5,000 refundable: $10,000 total.
  const result = compute({
    children: [
      { qualified_expenses: 8000, special_needs: false },
      { qualified_expenses: 6000, special_needs: false },
    ],
    magi: 200000,
    credit_limit_worksheet_line5: 15000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 4000);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 10000);
});

// ─── Credit limit by tax liability ───────────────────────────────────────────

Deno.test("credit limit: nonrefundable credit capped by income tax liability", () => {
  // $5,000 refundable; $12,280 remainder limited to $3,000.
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 100000,
    credit_limit_worksheet_line5: 3000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 3000);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

Deno.test("credit limit: zero worksheet limit leaves the refundable credit", () => {
  // $17,280 credit, line 17 limit $0: only line 30 has $5,000.
  const result = compute({
    children: [{ qualified_expenses: 17280, special_needs: false }],
    magi: 100000,
    credit_limit_worksheet_line5: 0,
  });

  assertEquals(findOutput(result, "schedule3"), undefined);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5000);
});

Deno.test("credit: a child's phased credit below $5,000 is entirely refundable", () => {
  const result = compute({
    children: [{ qualified_expenses: 8_000, special_needs: false }],
    magi: 279_190,
  });

  assertEquals(findOutput(result, "schedule3"), undefined);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 4_000);
});

Deno.test("credit: a child under $5,000 does not consume another child's cap", () => {
  const result = compute({
    children: [
      { qualified_expenses: 2_000, special_needs: false },
      { qualified_expenses: 10_000, special_needs: false },
    ],
    magi: 150_000,
    credit_limit_worksheet_line5: 5_000,
  });

  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 7_000);
  assertEquals(findOutput(result, "schedule3")?.fields.line6c_adoption_credit, 5_000);
});

Deno.test("credit: nonrefundable remainder needs Credit Limit Worksheet line 5", () => {
  assertThrows(
    () => compute({
      children: [{ qualified_expenses: 10_000, special_needs: false }],
      magi: 150_000,
    }),
    Error,
    "Credit Limit Worksheet line 5",
  );
});

Deno.test("credit: old income-tax-liability input is not a worksheet alias", () => {
  assertThrows(
    () => compute({
      children: [{ qualified_expenses: 10_000, special_needs: false }],
      magi: 150_000,
      income_tax_liability: 10_000,
    }),
    Error,
    "Credit Limit Worksheet line 5",
  );
});

Deno.test("credit: missing MAGI is not treated as below the phase-out", () => {
  assertThrows(
    () => compute({
      children: [{ qualified_expenses: 4_000, special_needs: false }],
    }),
    Error,
    "sourced MAGI",
  );
});

Deno.test("benefits: missing MAGI cannot create an unsupported exclusion", () => {
  assertThrows(
    () => compute({
      adoption_benefits: 8_000,
      children: [{ qualified_expenses: 0, special_needs: false }],
    }),
    Error,
    "sourced MAGI",
  );
});

// ─── MFS restriction ─────────────────────────────────────────────────────────

Deno.test("mfs: adoption credit needs the separation exception route", () => {
  assertThrows(
    () => compute({
      children: [{ qualified_expenses: 15000, special_needs: false }],
      magi: 100000,
      credit_limit_worksheet_line5: 10000,
      filing_status: "mfs",
    }),
    Error,
    "MFS adoption credit and employer-benefit treatment",
  );
});

Deno.test("mfs: employer adoption benefits cannot silently disappear", () => {
  assertThrows(
    () => compute({
      adoption_benefits: 8_000,
      children: [],
      magi: 100_000,
      filing_status: "mfs",
    }),
    Error,
    "MFS adoption credit and employer-benefit treatment",
  );
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
    credit_limit_worksheet_line5: 10000,
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
  // Refundable $5,000; nonrefundable $2,280.
  const result = compute({
    children: [{ qualified_expenses: 12_000, special_needs: false, prior_year_credit: 10_000 }],
    magi: 100_000,
    credit_limit_worksheet_line5: 10_000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 2_280);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5_000);
});

Deno.test("credit: prior_year_credit equal to max leaves zero remaining — no output", () => {
  // Prior credit = $17,280 = max → remaining = 0 → no credit
  const result = compute({
    children: [{ qualified_expenses: 15_000, special_needs: false, prior_year_credit: 17_280 }],
    magi: 100_000,
    credit_limit_worksheet_line5: 10_000,
  });

  assertEquals(result.outputs.length, 0);
});

// ─── Phase-out boundary at $259,190 ──────────────────────────────────────────

Deno.test("credit: MAGI exactly at phase-out start ($259,190) — full credit, no reduction", () => {
  // Fraction = 0 → no phase-out reduction
  // Expenses $10,000: refundable and nonrefundable are $5,000 each.
  const result = compute({
    children: [{ qualified_expenses: 10_000, special_needs: false }],
    magi: 259_190,
    credit_limit_worksheet_line5: 10_000,
  });

  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6c_adoption_credit, 5_000);
  assertEquals(findOutput(result, "f1040")?.fields.line30_refundable_adoption, 5_000);
});
