import { assertEquals, assertThrows } from "@std/assert";
import { ct2, itemSchema } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { form8959 } from "../../intermediate/forms/form8959/index.ts";
import type { z } from "zod";

type Item = z.infer<typeof itemSchema>;

function quarter(quarter: number, overrides: Partial<Item> = {}): Item {
  return {
    recipient: "taxpayer",
    recipient_ssn: "123-45-6789",
    tax_year: 2025,
    quarter,
    line2_tier1_medicare_compensation: 50_000,
    line3_additional_medicare_compensation: 0,
    line3_additional_medicare_tax_paid: 0,
    ...overrides,
  };
}

function compute(items: Item[]) {
  return ct2.compute({ taxYear: 2025, formType: "f1040" }, { ct2s: items });
}

Deno.test("CT-2 four quarters feed Form 8959 RRTA compensation and tax paid", () => {
  const result = compute([
    quarter(1),
    quarter(2),
    quarter(3),
    quarter(4, {
      line2_tier1_medicare_compensation: 70_000,
      line3_additional_medicare_compensation: 20_000,
      line3_additional_medicare_tax_paid: 180,
      payment_reference: "EFTPS-Q4-2025-001",
    }),
  ]);
  assertEquals(fieldsOf(result.outputs, form8959)?.ct2_rrta_wages, 220_000);
  assertEquals(
    fieldsOf(result.outputs, form8959)?.ct2_rrta_medicare_tax_paid,
    180,
  );
});

Deno.test("spouse CT-2 records carry a joint-return validation fact", () => {
  const result = compute([
    quarter(1, { recipient: "spouse", recipient_ssn: "987-65-4321" }),
    quarter(2, { recipient: "spouse", recipient_ssn: "987-65-4321" }),
    quarter(3, { recipient: "spouse", recipient_ssn: "987-65-4321" }),
    quarter(4, {
      recipient: "spouse",
      recipient_ssn: "987-65-4321",
      line2_tier1_medicare_compensation: 70_000,
      line3_additional_medicare_compensation: 20_000,
      line3_additional_medicare_tax_paid: 180,
      payment_reference: "EFTPS-Q4-2025-002",
    }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, form8959)?.ct2_spouse_ssn,
    "987-65-4321",
  );
});

Deno.test("taxpayer and spouse CT-2 quarters remain distinct before annual totals", () => {
  const result = compute([
    quarter(1),
    quarter(2),
    quarter(3),
    quarter(4),
    quarter(1, { recipient: "spouse", recipient_ssn: "987-65-4321" }),
    quarter(2, { recipient: "spouse", recipient_ssn: "987-65-4321" }),
    quarter(3, { recipient: "spouse", recipient_ssn: "987-65-4321" }),
    quarter(4, { recipient: "spouse", recipient_ssn: "987-65-4321" }),
  ]);
  assertEquals(fieldsOf(result.outputs, form8959)?.ct2_rrta_wages, 400_000);
  assertEquals(
    fieldsOf(result.outputs, form8959)?.ct2_taxpayer_ssn,
    "123-45-6789",
  );
  assertEquals(
    fieldsOf(result.outputs, form8959)?.ct2_spouse_ssn,
    "987-65-4321",
  );
});

Deno.test("CT-2 rejects different SSNs across one recipient's quarters", () => {
  assertThrows(
    () =>
      compute([
        quarter(1),
        quarter(2),
        quarter(3),
        quarter(4, { recipient_ssn: "987-65-4321" }),
      ]),
    Error,
    "quarterly SSNs do not match",
  );
});

Deno.test("CT-2 rejects omitted or duplicated quarterly records", () => {
  assertThrows(() => compute([quarter(1), quarter(2), quarter(3)]), Error);
  assertThrows(
    () => compute([quarter(1), quarter(2), quarter(3), quarter(3)]),
    Error,
  );
});

Deno.test("CT-2 rejects line 3 compensation that misses the annual threshold", () => {
  assertThrows(
    () =>
      compute([
        quarter(1),
        quarter(2),
        quarter(3),
        quarter(4, { line2_tier1_medicare_compensation: 70_000 }),
      ]),
    Error,
    "line 3 compensation does not match",
  );
});

Deno.test("CT-2 line 3 credit needs a payment reference and full tax payment", () => {
  const base = [quarter(1), quarter(2), quarter(3)];
  const fourth = {
    line2_tier1_medicare_compensation: 70_000,
    line3_additional_medicare_compensation: 20_000,
  };
  assertThrows(
    () =>
      compute([
        ...base,
        quarter(4, { ...fourth, line3_additional_medicare_tax_paid: 180 }),
      ]),
    Error,
    "payment needs a reference",
  );
  assertThrows(
    () =>
      compute([
        ...base,
        quarter(4, {
          ...fourth,
          line3_additional_medicare_tax_paid: 181,
          payment_reference: "EFTPS-Q4-2025-003",
        }),
      ]),
    Error,
    "payment must match the calculated tax",
  );
  assertThrows(
    () =>
      compute([
        ...base,
        quarter(4, {
          ...fourth,
          line3_additional_medicare_tax_paid: 100,
          payment_reference: "EFTPS-Q4-2025-PARTIAL",
        }),
      ]),
    Error,
    "partial payments need separate allocation evidence",
  );
  const unpaid = compute([
    ...base,
    quarter(4, {
      ...fourth,
      line3_additional_medicare_tax_paid: 0,
    }),
  ]);
  assertEquals(
    fieldsOf(unpaid.outputs, form8959)?.ct2_rrta_medicare_tax_paid,
    0,
  );
});
