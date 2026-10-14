import { assertEquals, assertThrows } from "@std/assert";
import { assertReviewScope, reviewScope } from "./ty2025-pdf-review-scope.ts";

Deno.test("review scope declares selected cases and every exclusion in fixture order", () => {
  const scope = reviewScope(["a", "b", "c"], ["c", "a"]);
  assertEquals(scope, {
    kind: "selected",
    includedFixtureIds: ["a", "c"],
    excludedFixtureIds: ["b"],
  });
  assertEquals(assertReviewScope(scope, ["a", "b", "c"]), scope);
  assertThrows(() =>
    assertReviewScope({ ...scope, excludedFixtureIds: [] }, ["a", "b", "c"])
  );
  assertThrows(() => reviewScope(["a", "b"], ["a", "a"]));
  assertThrows(() => reviewScope(["a", "b"], ["missing"]));
});

Deno.test("full review scope lists every checked-in fixture", () => {
  const scope = reviewScope(["a", "b"]);
  assertEquals(scope, {
    kind: "full",
    includedFixtureIds: ["a", "b"],
    excludedFixtureIds: [],
  });
  assertThrows(() => reviewScope(["a", "b"], ["a", "b"]));
});
