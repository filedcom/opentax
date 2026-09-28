import { assertEquals, assertThrows } from "@std/assert";
import { f8941 } from "./index.ts";

function compute(input: Parameters<typeof f8941.compute>[1]) {
  return f8941.compute({ taxYear: 2025, formType: "f1040" }, input);
}

const base = {
  fte_count: 5,
  average_annual_wages: 20_000,
  premiums_paid: 50_000,
};

Deno.test("Form 8941 rejects a direct credit even when SHOP is affirmed", () => {
  assertThrows(
    () => compute({ ...base, shop_enrollment: true }),
    Error,
    "TY2025 Form 8941 credit needs verified SHOP and credit-period facts",
  );
});

Deno.test("Form 8941 rejects missing or false SHOP rather than treating either as eligibility", () => {
  assertThrows(() => compute(base), Error);
  assertThrows(() => compute({ ...base, shop_enrollment: false }), Error);
});

Deno.test("Form 8941 does not turn $56,000 wages into an obsolete 2025 disqualification", () => {
  assertThrows(
    () => compute({ ...base, average_annual_wages: 56_000 }),
    Error,
    "TY2025 Form 8941 credit needs verified SHOP and credit-period facts",
  );
});

Deno.test("Form 8941 tax-exempt premium claim also cannot use Schedule 3 route", () => {
  assertThrows(() => compute({ ...base, is_tax_exempt: true }), Error);
});

Deno.test("Form 8941 zero premiums make no claim; negative or unmodeled facts reject", () => {
  assertEquals(compute({ ...base, premiums_paid: 0 }).outputs, []);
  assertEquals(
    f8941.inputSchema.safeParse({ ...base, premiums_paid: -1 }).success,
    false,
  );
  assertThrows(
    () =>
      compute(
        { ...base, form3800_credit: 12_000 } as Parameters<
          typeof f8941.compute
        >[1],
      ),
    Error,
    "Unrecognized key",
  );
});
