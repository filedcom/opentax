import { assertEquals, assertThrows } from "@std/assert";
import { form3800Unregistered } from "./f3800_unregistered.ts";

Deno.test("Form 3800 export stays empty without a source credit", () => {
  assertEquals(form3800Unregistered.build({}), "");
  assertEquals(form3800Unregistered.build({ f3800s: [{}] }), "");
});

Deno.test("Form 3800 export rejects source-backed and legacy credits without IRS3800", () => {
  assertThrows(
    () => form3800Unregistered.build({ allowed_credit: 0 }),
    Error,
    "cannot be exported",
  );
  assertThrows(
    () => form3800Unregistered.build({ f3800s: [{ research_credit: 500 }] }),
    Error,
    "cannot be exported",
  );
});
