import { assertEquals } from "@std/assert";
import { computeRegularMethodPenalty } from "./calculation.ts";

Deno.test("regular method: four unpaid installments accrue through filing day", () => {
  assertEquals(
    computeRegularMethodPenalty({
      current_year_tax: 37_067,
      prior_year_tax: 30_000,
      prior_year_agi: 180_000,
    }),
    1_536,
  );
});

Deno.test("regular method: timely quarterly payments avoid a penalty", () => {
  assertEquals(
    computeRegularMethodPenalty({
      current_year_tax: 10_000,
      q1_estimated_payment: 2_250,
      q2_estimated_payment: 2_250,
      q3_estimated_payment: 2_250,
      q4_estimated_payment: 2_250,
    }),
    0,
  );
});

Deno.test("regular method: a late catch-up payment still leaves an earlier penalty", () => {
  assertEquals(
    computeRegularMethodPenalty({
      current_year_tax: 10_000,
      q4_estimated_payment: 9_000,
    }),
    264,
  );
});

Deno.test("regular method: withholding is treated evenly across installments", () => {
  assertEquals(
    computeRegularMethodPenalty({
      current_year_tax: 10_000,
      withholding: 9_000,
    }),
    0,
  );
});

Deno.test("regular method: less than $1,000 due after withholding has no penalty", () => {
  assertEquals(
    computeRegularMethodPenalty({
      current_year_tax: 10_000,
      withholding: 9_001,
    }),
    0,
  );
});

Deno.test("regular method: explicit penalty remains authoritative", () => {
  assertEquals(
    computeRegularMethodPenalty({
      current_year_tax: 10_000,
      underpayment_penalty: 321,
    }),
    321,
  );
});

Deno.test("regular method: waiver suppresses an explicit penalty", () => {
  assertEquals(
    computeRegularMethodPenalty({
      current_year_tax: 10_000,
      underpayment_penalty: 321,
      waiver_requested: true,
    }),
    0,
  );
});
