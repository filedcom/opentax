import { assertEquals, assertThrows } from "@std/assert";
import type { z } from "zod";
import type { NodeOutput } from "../../../../../core/types/tax-node.ts";
import { FormType, f4852, itemSchema } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Item = z.infer<typeof itemSchema>;

function w2Item(overrides: Partial<Item> = {}): Item {
  return {
    form_type: FormType.W2,
    payer_name: "Acme Corp",
    payer_tin: "12-3456789",
    wages: 50000,
    federal_withheld: 8000,
    ...overrides,
  };
}

function r1099Item(overrides: Partial<Item> = {}): Item {
  return {
    form_type: FormType.R_1099,
    payer_name: "Big Pension Fund",
    payer_tin: "98-7654321",
    gross_distribution: 20000,
    federal_withheld: 2000,
    ...overrides,
  };
}

function compute(items: Item[]) {
  return f4852.compute({ f4852s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o: NodeOutput) => o.nodeType === nodeType);
}

function f1040Fields(result: ReturnType<typeof compute>) {
  return (findOutput(result, "f1040")?.fields ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. Schema validation
// ---------------------------------------------------------------------------

Deno.test("f4852: empty array throws (min 1 required)", () => {
  assertThrows(() => f4852.compute({ f4852s: [] }));
});

Deno.test("f4852: missing form_type throws", () => {
  assertThrows(() =>
    f4852.compute({
      f4852s: [
        {
          payer_name: "Acme",
          payer_tin: "12-3456789",
          wages: 50000,
          federal_withheld: 8000,
        } as Item,
      ],
    })
  );
});

Deno.test("f4852: missing payer_name throws", () => {
  assertThrows(() =>
    f4852.compute({
      f4852s: [
        {
          form_type: FormType.W2,
          payer_tin: "12-3456789",
          wages: 50000,
          federal_withheld: 8000,
        } as Item,
      ],
    })
  );
});

Deno.test("f4852: W2 type with no wages or federal_withheld throws", () => {
  assertThrows(() =>
    f4852.compute({
      f4852s: [
        {
          form_type: FormType.W2,
          payer_name: "Acme",
          payer_tin: "12-3456789",
        } as Item,
      ],
    })
  );
});

// ---------------------------------------------------------------------------
// 2. Part I: Substitute W-2 — wages and withholding to f1040
// ---------------------------------------------------------------------------

Deno.test("f4852: Part I W2 substitute → wages to line1a, withheld to line25a_w2_withheld", () => {
  const result = compute([w2Item({ wages: 50000, federal_withheld: 8000 })]);
  const fields = f1040Fields(result);
  assertEquals(fields["line1a_wages"], 50000);
  assertEquals(fields["line25a_w2_withheld"], 8000);
});

Deno.test("f4852: Part I W2 substitute with only wages (no withholding)", () => {
  const result = compute([w2Item({ wages: 40000, federal_withheld: 0 })]);
  const fields = f1040Fields(result);
  assertEquals(fields["line1a_wages"], 40000);
  // No withholding key expected when zero
  assertEquals(fields["line25a_w2_withheld"], undefined);
});

Deno.test("f4852: Part I W2 substitute with no wages but withholding (edge)", () => {
  const result = compute([w2Item({ wages: 0, federal_withheld: 500 })]);
  const fields = f1040Fields(result);
  assertEquals(fields["line1a_wages"], undefined);
  assertEquals(fields["line25a_w2_withheld"], 500);
});

// ---------------------------------------------------------------------------
// 3. Part II: Substitute 1099-R — pension and withholding to f1040
// ---------------------------------------------------------------------------

Deno.test("f4852: Part II 1099-R pension → line5a/5b, withheld to line25b", () => {
  const result = compute([
    r1099Item({ gross_distribution: 20000, taxable_amount: 18000, federal_withheld: 2000 }),
  ]);
  const fields = f1040Fields(result);
  assertEquals(fields["line5a_pension_gross"], 20000);
  assertEquals(fields["line5b_pension_taxable"], 18000);
  assertEquals(fields["line25b_withheld_1099"], 2000);
});

Deno.test("f4852: Part II 1099-R pension, taxable_amount omitted → defaults to gross", () => {
  const result = compute([r1099Item({ gross_distribution: 15000, federal_withheld: 1500 })]);
  const fields = f1040Fields(result);
  assertEquals(fields["line5a_pension_gross"], 15000);
  assertEquals(fields["line5b_pension_taxable"], 15000);
  assertEquals(fields["line25b_withheld_1099"], 1500);
});

Deno.test("f4852: Part II 1099-R IRA distribution → line4a/4b, withheld to line25b", () => {
  const result = compute([
    r1099Item({ gross_distribution: 10000, taxable_amount: 10000, federal_withheld: 1000, is_ira: true }),
  ]);
  const fields = f1040Fields(result);
  assertEquals(fields["line4a_ira_gross"], 10000);
  assertEquals(fields["line4b_ira_taxable"], 10000);
  assertEquals(fields["line25b_withheld_1099"], 1000);
  // Should NOT set pension lines
  assertEquals(fields["line5a_pension_gross"], undefined);
  assertEquals(fields["line5b_pension_taxable"], undefined);
});

Deno.test("f4852: Part II 1099-R pension with no withholding", () => {
  const result = compute([r1099Item({ gross_distribution: 12000, federal_withheld: 0 })]);
  const fields = f1040Fields(result);
  assertEquals(fields["line5a_pension_gross"], 12000);
  assertEquals(fields["line5b_pension_taxable"], 12000);
  assertEquals(fields["line25b_withheld_1099"], undefined);
});

// ---------------------------------------------------------------------------
// 4. Both parts populated in one call
// ---------------------------------------------------------------------------

Deno.test("f4852: Part I + Part II both populated → merged f1040 output", () => {
  const result = compute([
    w2Item({ wages: 60000, federal_withheld: 10000 }),
    r1099Item({ gross_distribution: 20000, taxable_amount: 18000, federal_withheld: 2000 }),
  ]);
  const fields = f1040Fields(result);
  assertEquals(fields["line1a_wages"], 60000);
  assertEquals(fields["line25a_w2_withheld"], 10000);
  assertEquals(fields["line5a_pension_gross"], 20000);
  assertEquals(fields["line5b_pension_taxable"], 18000);
  assertEquals(fields["line25b_withheld_1099"], 2000);
  // Only one f1040 output
  const f1040Outputs = result.outputs.filter((o: NodeOutput) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
});

// ---------------------------------------------------------------------------
// 5. Multiple 4852 forms (multiple employers/payers)
// ---------------------------------------------------------------------------

Deno.test("f4852: multiple W2 substitutes → wages and withholding summed", () => {
  const result = compute([
    w2Item({ wages: 30000, federal_withheld: 5000 }),
    w2Item({ wages: 25000, federal_withheld: 3000, payer_name: "Second Employer" }),
  ]);
  const fields = f1040Fields(result);
  assertEquals(fields["line1a_wages"], 55000);
  assertEquals(fields["line25a_w2_withheld"], 8000);
});

Deno.test("f4852: multiple 1099-R substitutes → pension amounts summed", () => {
  const result = compute([
    r1099Item({ gross_distribution: 10000, taxable_amount: 10000, federal_withheld: 1000 }),
    r1099Item({
      gross_distribution: 15000,
      taxable_amount: 12000,
      federal_withheld: 1500,
      payer_name: "Second Pension",
    }),
  ]);
  const fields = f1040Fields(result);
  assertEquals(fields["line5a_pension_gross"], 25000);
  assertEquals(fields["line5b_pension_taxable"], 22000);
  assertEquals(fields["line25b_withheld_1099"], 2500);
});

Deno.test("f4852: multiple mixed forms (W2 + R_1099 + IRA) → all fields correct", () => {
  const result = compute([
    w2Item({ wages: 40000, federal_withheld: 6000 }),
    r1099Item({ gross_distribution: 8000, taxable_amount: 7000, federal_withheld: 700 }),
    r1099Item({
      gross_distribution: 5000,
      taxable_amount: 5000,
      federal_withheld: 500,
      is_ira: true,
      payer_name: "My IRA Custodian",
    }),
  ]);
  const fields = f1040Fields(result);
  assertEquals(fields["line1a_wages"], 40000);
  assertEquals(fields["line25a_w2_withheld"], 6000);
  assertEquals(fields["line5a_pension_gross"], 8000);
  assertEquals(fields["line5b_pension_taxable"], 7000);
  assertEquals(fields["line4a_ira_gross"], 5000);
  assertEquals(fields["line4b_ira_taxable"], 5000);
  assertEquals(fields["line25b_withheld_1099"], 1200);
});

// ---------------------------------------------------------------------------
// 6. Edge: single R_1099 item with no withholding produces no line25b
// ---------------------------------------------------------------------------

Deno.test("f4852: R_1099 item zero withholding → no line25b in output", () => {
  const result = compute([r1099Item({ gross_distribution: 5000, federal_withheld: 0 })]);
  const fields = f1040Fields(result);
  assertEquals(fields["line25b_withheld_1099"], undefined);
});

// ---------------------------------------------------------------------------
// 7. W2 item with all zeros → schema rejects (requires nonzero wages or withheld)
// ---------------------------------------------------------------------------

Deno.test("f4852: W2 item with wages=0 and federal_withheld=0 → schema throws", () => {
  assertThrows(() => compute([w2Item({ wages: 0, federal_withheld: 0 })]));
});
