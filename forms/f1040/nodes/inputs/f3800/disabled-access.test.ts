import { assertEquals, assertThrows } from "@std/assert";
import { allocateDisabledAccessLine1eCredits } from "./disabled-access.ts";

Deno.test("Form 3800 line 1e retains sources below the cap", () => {
  assertEquals(allocateDisabledAccessLine1eCredits([2_375, 1_000]), [
    2_375,
    1_000,
  ]);
});

Deno.test("Form 3800 line 1e allocates a combined cap in cents", () => {
  const allocated = allocateDisabledAccessLine1eCredits([
    2_375,
    3_000,
    0.01,
  ]);
  assertEquals(allocated, [2_209.30, 2_790.69, 0.01]);
  assertEquals(
    Math.round(allocated.reduce((sum, amount) => sum + amount, 0) * 100),
    500_000,
  );
});

Deno.test("Form 3800 line 1e rejects fractional-cent and unsafe source amounts", () => {
  assertThrows(() => allocateDisabledAccessLine1eCredits([1.001]));
  assertThrows(() => allocateDisabledAccessLine1eCredits([Number.MAX_VALUE]));
});
