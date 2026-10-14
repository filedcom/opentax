import { assertEquals } from "@std/assert";
import { reportedCapitalSale } from "./reported-money.ts";

Deno.test("8949 adjusted columns round signed cents before subtraction", () => {
  const row = reportedCapitalSale({
    part: "A",
    proceeds: 2.50,
    cost_basis: 1,
    adjustment_codes: "D",
    adjustment_amount: -.50,
    gain_loss: 1,
  });
  assertEquals(row.proceeds, 3);
  assertEquals(row.adjustment_amount, -1);
  assertEquals(row.gain_loss, 1);
});

Deno.test("unadjusted covered sources retain cents for Schedule D aggregation", () => {
  const source = {
    part: "D",
    proceeds: 100.4,
    cost_basis: 90.1,
    gain_loss: 10.3,
  };
  assertEquals(reportedCapitalSale(source), source);
});
