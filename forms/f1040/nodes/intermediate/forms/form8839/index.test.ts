import { assertEquals, assertThrows } from "@std/assert";
import { form8839 } from "./index.ts";

function compute(taxYear: number, input: Record<string, unknown>) {
  return form8839.compute({ taxYear, formType: "f1040" }, input);
}

function fields(taxYear: number, input: Record<string, unknown>) {
  const result = compute(taxYear, input);
  return {
    f1040: result.outputs.find((item) => item.nodeType === "f1040")?.fields,
    schedule3: result.outputs.find((item) => item.nodeType === "schedule3")?.fields,
  };
}

const child = (qualified_expenses: number, special_needs = false) => ({
  qualified_expenses,
  special_needs,
});

Deno.test("Form 8839 splits the 2025 credit into refundable and nonrefundable portions", () => {
  const result = fields(2025, {
    children: [child(15_000)],
    magi: 200_000,
    income_tax_liability: 12_000,
  });
  assertEquals(result.f1040?.line30_refundable_adoption, 5_000);
  assertEquals(result.schedule3?.line6c_adoption_credit, 10_000);
});

Deno.test("Form 8839 caps the total 2025 credit at $17,280 per child", () => {
  const result = fields(2025, {
    children: [child(20_000)],
    magi: 100_000,
    income_tax_liability: 15_000,
  });
  assertEquals(result.f1040?.line30_refundable_adoption, 5_000);
  assertEquals(result.schedule3?.line6c_adoption_credit, 12_280);
});

Deno.test("Form 8839 phaseout reduces credit before the refundable split", () => {
  const result = fields(2025, {
    children: [child(17_280)],
    magi: 279_190,
    income_tax_liability: 10_000,
  });
  assertEquals(result.f1040?.line30_refundable_adoption, 5_000);
  assertEquals(result.schedule3?.line6c_adoption_credit, 3_640);
  assertEquals(fields(2025, {
    children: [child(17_280)],
    magi: 299_190,
  }).f1040, undefined);
});

Deno.test("Form 8839 limits each child's refundable amount separately", () => {
  const result = fields(2025, {
    children: [child(8_000), child(6_000)],
    magi: 100_000,
    income_tax_liability: 15_000,
  });
  assertEquals(result.f1040?.line30_refundable_adoption, 10_000);
  assertEquals(result.schedule3?.line6c_adoption_credit, 4_000);
});

Deno.test("Form 8839 grants the special-needs amount and subtracts prior-year credit", () => {
  const result = fields(2025, {
    children: [{ ...child(0, true), prior_year_credit: 3_000 }],
    magi: 100_000,
    income_tax_liability: 15_000,
  });
  assertEquals(result.f1040?.line30_refundable_adoption, 5_000);
  assertEquals(result.schedule3?.line6c_adoption_credit, 9_280);
  assertEquals(fields(2025, {
    children: [{ ...child(0, true), prior_year_credit: 17_280 }],
  }).f1040, undefined);
});

Deno.test("Form 8839 caps only the nonrefundable portion at tax liability", () => {
  const result = fields(2025, {
    children: [child(17_280)],
    magi: 100_000,
    income_tax_liability: 3_000,
  });
  assertEquals(result.f1040?.line30_refundable_adoption, 5_000);
  assertEquals(result.schedule3?.line6c_adoption_credit, 3_000);
  const noTax = fields(2025, {
    children: [child(17_280)],
    income_tax_liability: 0,
  });
  assertEquals(noTax.f1040?.line30_refundable_adoption, 5_000);
  assertEquals(noTax.schedule3, undefined);
});

Deno.test("Form 8839 uses oldest nonrefundable carryforward first and preserves origin years", () => {
  const result = compute(2026, {
    children: [child(10_000)],
    magi: 100_000,
    income_tax_liability: 2_500,
    prior_year_credit_carryforwards: [
      { origin_tax_year: 2025, amount: 1_000 },
      { origin_tax_year: 2021, amount: 2_000 },
    ],
  });
  assertEquals(result.outputs.find((item) => item.nodeType === "f1040")?.fields.line30_refundable_adoption, 5_120);
  assertEquals(result.outputs.find((item) => item.nodeType === "schedule3")?.fields.line6c_adoption_credit, 2_500);
  assertEquals(result.carryforwards, {
    adoption_credit_2025: 500,
    adoption_credit_2026: 4_880,
  });
});

Deno.test("Form 8839 cannot turn a prior nonrefundable credit into a refund", () => {
  const result = compute(2026, {
    prior_year_credit_carryforwards: [{ origin_tax_year: 2025, amount: 2_000 }],
    income_tax_liability: 1_000,
  });
  assertEquals(result.outputs.find((item) => item.nodeType === "f1040"), undefined);
  assertEquals(result.outputs.find((item) => item.nodeType === "schedule3")?.fields.line6c_adoption_credit, 1_000);
  assertEquals(result.carryforwards, { adoption_credit_2025: 1_000 });
});

Deno.test("Form 8839 rejects stale, future, duplicate, and unsupported carryforwards", () => {
  const base = {
    income_tax_liability: 0,
    prior_year_credit_carryforwards: [{ origin_tax_year: 2025, amount: 1_000 }],
  };
  assertThrows(() => compute(2026, {
    ...base,
    prior_year_credit_carryforwards: [{ origin_tax_year: 2020, amount: 1_000 }],
  }), Error, "preceding five years");
  assertThrows(() => compute(2026, {
    ...base,
    prior_year_credit_carryforwards: [{ origin_tax_year: 2026, amount: 1_000 }],
  }), Error, "preceding five years");
  assertThrows(() => compute(2026, {
    ...base,
    prior_year_credit_carryforwards: [
      { origin_tax_year: 2025, amount: 1_000 },
      { origin_tax_year: 2025, amount: 2_000 },
    ],
  }), Error, "duplicate");
  assertThrows(() => compute(2026, {
    prior_year_credit_carryforwards: [{ origin_tax_year: 2025, amount: 1_000 }],
  }), Error, "credit-limit worksheet");
});

Deno.test("Form 8839 uses the 2026 indexed cap, refundable amount, and phaseout", () => {
  const full = fields(2026, {
    children: [child(20_000)],
    magi: 265_080,
    income_tax_liability: 20_000,
  });
  assertEquals(full.f1040?.line30_refundable_adoption, 5_120);
  assertEquals(full.schedule3?.line6c_adoption_credit, 12_550);
  const midpoint = fields(2026, {
    children: [child(17_670)],
    magi: 285_080,
    income_tax_liability: 20_000,
  });
  assertEquals(midpoint.f1040?.line30_refundable_adoption, 5_120);
  assertEquals(midpoint.schedule3?.line6c_adoption_credit, 3_715);
  assertEquals(fields(2026, {
    children: [child(17_670)],
    magi: 305_080,
  }).f1040, undefined);
});

Deno.test("Form 8839 requires a 2026 credit-limit amount before claiming nonrefundable credit", () => {
  assertThrows(() => compute(2026, {
    children: [child(17_670)],
    magi: 100_000,
  }), Error, "credit-limit worksheet");
});

Deno.test("Form 8839 routes taxable employer adoption benefits to 1040 line 1f", () => {
  const below = fields(2025, {
    adoption_benefits: 20_000,
    children: [child(0)],
    magi: 200_000,
  });
  assertEquals(below.f1040?.line1f_taxable_adoption_benefits, 2_720);
  const phasedOut = fields(2026, {
    adoption_benefits: 20_000,
    children: [child(0)],
    magi: 305_080,
  });
  assertEquals(phasedOut.f1040?.line1f_taxable_adoption_benefits, 20_000);
});

Deno.test("Form 8839 blocks MFS, unfinished foreign adoptions, and invalid inputs", () => {
  assertEquals(compute(2026, {
    children: [child(15_000)],
    filing_status: "mfs",
  }).outputs, []);
  assertEquals(fields(2026, {
    children: [{ ...child(15_000), is_foreign_child: true, adoption_is_final: false }],
  }).f1040, undefined);
  assertThrows(() => compute(2026, { children: [child(-1)] }), Error);
  assertThrows(() => compute(2026, { magi: -1 }), Error);
  assertThrows(() => compute(2024, {}), Error, "no rules");
});
