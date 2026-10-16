import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import {
  allocateDisabledAccessLine1eCredits,
  allocateMixedDisabledAccessCredits,
} from "./disabled-access.ts";

test("Form 3800 line 1e retains sources below the cap", () => {
  assertEquals(allocateDisabledAccessLine1eCredits([2_375, 1_000]), [
    2_375,
    1_000,
  ]);
});

test("Form 3800 line 1e allocates a combined cap in cents", () => {
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

test("Form 3800 line 1e rejects fractional-cent and unsafe source amounts", () => {
  assertThrows(() => allocateDisabledAccessLine1eCredits([1.001]));
  assertThrows(() => allocateDisabledAccessLine1eCredits([Number.MAX_VALUE]));
});

test("mixed disabled-access sources share the $5,000 cap before the passive limit", () => {
  assertEquals(
    allocateMixedDisabledAccessCredits([1_000, 2_000], [4_000]),
    { passive: [714, 1_429], nonpassive: [2_857] },
  );
  assertEquals(
    allocateMixedDisabledAccessCredits([3_000], [4_000.01]),
    { passive: [2_143], nonpassive: [2_857] },
  );
});

test("mixed disabled-access allocator leaves under-cap sources unchanged", () => {
  assertEquals(
    allocateMixedDisabledAccessCredits([1_000], [499.25]),
    { passive: [1_000], nonpassive: [499.25] },
  );
  assertEquals(
    allocateMixedDisabledAccessCredits([3_000, 4_000], []),
    { passive: [2_143, 2_857], nonpassive: [] },
  );
  assertThrows(() => allocateMixedDisabledAccessCredits([0.5], [5_000]));
});
