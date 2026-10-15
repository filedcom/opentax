import { assertEquals, assertThrows } from "@std/assert";
import { allocateSourceDollars2026 } from "./source-allocation.ts";
Deno.test("2026 reviewed allocation conserves dollars and breaks ties by reference", () => {
  const rows = [{ reference: "c", weight: 1 }, { reference: "a", weight: 1 }, {
    reference: "b",
    weight: 1,
  }];
  assertEquals(
    allocateSourceDollars2026(2, rows).map((r) => [r.reference, r.amount]),
    [["c", 0], ["a", 1], ["b", 1]],
  );
  assertEquals(
    allocateSourceDollars2026(2, rows.toReversed()).toReversed(),
    allocateSourceDollars2026(2, rows),
  );
  assertEquals(allocateSourceDollars2026(0, []), []);
  assertEquals(
    allocateSourceDollars2026(0, [{ reference: "zero", weight: 0 }])[0].amount,
    0,
  );
});
Deno.test("2026 reviewed allocation rejects invalid weights and retains exact arithmetic for large sources", () => {
  for (const amount of [-1, .5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assertThrows(() => allocateSourceDollars2026(amount, []));
  }
  assertThrows(
    () => allocateSourceDollars2026(2, [{ reference: "a", weight: 1 }]),
    Error,
    "exceeds source weights",
  );
  assertThrows(
    () =>
      allocateSourceDollars2026(1, [{ reference: "a", weight: 1 }, {
        reference: "a",
        weight: 2,
      }]),
    Error,
    "unique references",
  );
  assertThrows(() =>
    allocateSourceDollars2026(0, [{ reference: "a", weight: -1 }])
  );
  const r = allocateSourceDollars2026(1, [{
    reference: "a",
    weight: Number.MAX_SAFE_INTEGER,
  }, { reference: "b", weight: Number.MAX_SAFE_INTEGER }]);
  assertEquals(r.map((r) => r.amount), [1, 0]);
});
