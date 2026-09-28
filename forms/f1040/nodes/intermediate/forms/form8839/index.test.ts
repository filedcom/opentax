import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8839Credit, form8839 } from "./index.ts";

const context = { taxYear: 2025, formType: "f1040" } as const;

Deno.test("Form 8839: inactive input emits no credit", () => {
  assertEquals(form8839.compute(context, {}).outputs, []);
});

Deno.test("Form 8839: active child claim fails closed before return credit", () => {
  assertThrows(
    () =>
      form8839.compute(context, {
        children: [{ qualified_expenses: 15_000, special_needs: false }],
        magi: 200_000,
        credit_limit_worksheet_line5: 10_000,
      }),
    Error,
    "source-verified adoption eligibility",
  );
});

Deno.test("Form 8839: employer adoption benefit also fails closed", () => {
  assertThrows(
    () =>
      form8839.compute(context, { adoption_benefits: 5_000, magi: 200_000 }),
    Error,
    "source-verified adoption eligibility",
  );
});

Deno.test("Form 8839: pure worksheet split remains bounded by line 16", () => {
  const credit = calculateForm8839Credit({
    children: [{ qualified_expenses: 15_000, special_needs: false }],
    magi: 200_000,
    credit_limit_worksheet_line5: 10_000,
  });
  assertEquals(credit.line11c, 5_000);
  assertEquals(credit.line14, 10_000);
  assertEquals(credit.line17, 10_000);
  assertEquals(credit.line18, 10_000);
});

Deno.test("Form 8839: Credit Limit Worksheet line 5 cannot exceed line 16", () => {
  assertThrows(
    () =>
      calculateForm8839Credit({
        children: [{ qualified_expenses: 15_000, special_needs: false }],
        magi: 200_000,
        credit_limit_worksheet_line5: 12_000,
      }),
    Error,
    "cannot exceed Form 8839 line 16",
  );
});

Deno.test("Form 8839: pure worksheet requires MAGI", () => {
  assertThrows(
    () =>
      calculateForm8839Credit({
        children: [{ qualified_expenses: 15_000, special_needs: false }],
        credit_limit_worksheet_line5: 10_000,
      }),
    Error,
    "needs sourced MAGI",
  );
});
