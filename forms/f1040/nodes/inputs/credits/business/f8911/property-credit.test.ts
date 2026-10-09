import { assertEquals, assertThrows } from "@std/assert";
import { calculatePropertyCredit } from "./property-credit.ts";

Deno.test("Form 8911 mixed-use arithmetic separates section 179 and the two caps", () => {
  const source = {
    cost: 10000,
    business_use_pct: 0.4,
    section179_deduction: 1000,
  };
  const base = calculatePropertyCredit(source);
  assertEquals([
    base.businessCost,
    base.netBusinessCost,
    base.businessCredit,
    base.personalCost,
    base.personalCreditBeforeCap,
    base.personalCredit,
  ], [4000, 3000, 180, 6000, 1800, 1000]);
  const increased = calculatePropertyCredit({
    ...source,
    business_credit_rate: "increased",
  });
  assertEquals(increased.businessCredit, 900);
  assertEquals(increased.personalCredit, 1000);
  assertEquals(source, {
    cost: 10000,
    business_use_pct: 0.4,
    section179_deduction: 1000,
  });
});

Deno.test("Form 8911 property business caps apply at both statutory rates", () => {
  assertEquals(
    calculatePropertyCredit({ cost: 2000000, business_use_pct: 1 })
      .businessCredit,
    100000,
  );
  assertEquals(
    calculatePropertyCredit({
      cost: 500000,
      business_use_pct: 1,
      business_credit_rate: "increased",
    }).businessCredit,
    100000,
  );
  const fullyExpensed = calculatePropertyCredit({
    cost: 10000,
    business_use_pct: 1,
    section179_deduction: 10000,
  });
  assertEquals([fullyExpensed.businessCredit, fullyExpensed.personalCredit], [
    0,
    0,
  ]);
  assertThrows(
    () =>
      calculatePropertyCredit({
        cost: 10000,
        business_use_pct: 0.4,
        section179_deduction: 4001,
      }),
    Error,
    "exceeds the business-use cost",
  );
});

Deno.test("Form 8911 property calculation preserves cents before aggregate filing rounding", () => {
  const personal = calculatePropertyCredit({ cost: 1001.49 });
  assertEquals(personal.personalCredit, 300.447);
  assertEquals(personal.businessCredit, 0);
  const mixed = calculatePropertyCredit({
    cost: 1000,
    business_use_pct: 0.25,
    section179_deduction: 50,
  });
  assertEquals([mixed.businessCredit, mixed.personalCredit], [12, 225]);
});
