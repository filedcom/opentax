import { assertEquals, assertThrows } from "@std/assert";
import { ContractType, f8697 } from "./index.ts";

function compute(items: Record<string, unknown>[]) {
  return f8697.compute(
    { taxYear: 2025, formType: "f1040" },
    { f8697s: items } as Parameters<typeof f8697.compute>[1],
  );
}

Deno.test("Form 8697 rejects malformed or empty source before filing review", () => {
  assertThrows(() => compute([]), Error);
  assertEquals(
    f8697.inputSchema.safeParse({ f8697s: [{ contract_type: "invalid" }] }).success,
    false,
  );
});

Deno.test("Form 8697 blocks interest owed instead of treating it as Schedule 1 income", () => {
  assertThrows(
    () => compute([{ contract_type: ContractType.Regular, net_interest: 1_200 }]),
    Error,
    "Schedule 2 line 17n or separate-refund filing branch",
  );
});

Deno.test("Form 8697 blocks interest refund instead of a Schedule 1 deduction", () => {
  assertThrows(
    () => compute([{ contract_type: ContractType.Regular, net_interest: -800 }]),
    Error,
    "Schedule 2 line 17n or separate-refund filing branch",
  );
});

Deno.test("Form 8697 zero, absent, and offsetting amounts cannot silently disappear", () => {
  for (const items of [
    [{ contract_type: ContractType.Regular }],
    [{ contract_type: ContractType.Regular, net_interest: 0 }],
    [
      { contract_type: ContractType.Regular, net_interest: 400 },
      { contract_type: ContractType.Simplified, net_interest: -400 },
    ],
  ]) {
    assertThrows(() => compute(items), Error, "Form 8697 look-back interest");
  }
});

Deno.test("Form 8697 prior-year workpaper facts remain a blocked source", () => {
  assertThrows(
    () => compute([{
      contract_type: ContractType.Simplified,
      prior_tax_years_affected: [{
        tax_year: 2022,
        hypothetical_tax: 5_000,
        actual_tax_paid: 4_500,
      }],
      underpayment_of_tax_prior_year: 500,
      interest_rate: 0.07,
      net_interest: 35,
    }]),
    Error,
    "Form 8697 look-back interest",
  );
});
