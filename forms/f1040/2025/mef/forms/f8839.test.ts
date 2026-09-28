import { assertEquals, assertThrows } from "@std/assert";
import { form8839 } from "./f8839.ts";

Deno.test("Form 8839 MeF: absent pending emits no document", () => {
  assertEquals(form8839.build([]), "");
});

Deno.test("Form 8839 MeF: empty pending record rejects", () => {
  assertThrows(() => form8839.build({}), Error, "empty pending record");
});

Deno.test("Form 8839 MeF: active child claim fails closed even with asserted worksheet values", () => {
  assertThrows(
    () =>
      form8839.build({
        children: [{ qualified_expenses: 15_000, special_needs: false }],
        magi: 200_000,
        credit_limit_worksheet_line5: 10_000,
      }),
    Error,
    "source-verified adoption eligibility",
  );
});

Deno.test("Form 8839 MeF: employer benefit fails closed", () => {
  assertThrows(
    () => form8839.build({ adoption_benefits: 4_000 }),
    Error,
    "source-verified adoption eligibility",
  );
});
