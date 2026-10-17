import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { type F4868Input, form4868Lines, inputSchema } from "./index.ts";

const base: F4868Input = {
  taxpayer: { first_name: "Ann", last_name: "Lee", ssn: "400001111" },
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  line4_estimated_total_tax: 9_000,
  line5_total_payments: 6_500,
};

test("Form 4868 line 6 is line 4 minus line 5", () => {
  assertEquals(form4868Lines(base), {
    line4_total_tax_liability: 9_000,
    line5_total_payments: 6_500,
    line6_balance_due: 2_500,
    line7_amount_paying: 0,
    line8_out_of_country: false,
    line9_1040nr_no_wages_withheld: false,
  });
});

test("Form 4868 line 6 is zero when payments exceed the estimate", () => {
  const lines = form4868Lines({
    ...base,
    line5_total_payments: 12_000,
    line7_amount_paying: 0,
    line8_out_of_country: true,
  });
  assertEquals(lines.line6_balance_due, 0);
  assertEquals(lines.line8_out_of_country, true);
});

test("Form 4868 address is either US or foreign", () => {
  assertThrows(() =>
    inputSchema.parse({
      ...base,
      address: { ...base.address, foreign_country_code: "CA" },
    })
  );
  assertThrows(() =>
    inputSchema.parse({
      ...base,
      address: { line1: "1 Main St", city: "Austin" },
    })
  );
  inputSchema.parse({
    ...base,
    address: {
      line1: "1 Rue Haute",
      city: "Paris",
      foreign_country_code: "FR",
    },
  });
});
