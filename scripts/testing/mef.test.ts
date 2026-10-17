import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { compareFindings, keptReasons, summarize } from "./mef.ts";

test("a new finding fails and a fixed one must leave the baseline", () => {
  assertEquals(
    compareFindings(
      { a: ["rule IND-021-01", "rule F1040-377-12"], b: [], c: ["rule X"] },
      { a: ["rule IND-021-01"], b: ["rule IND-082"], c: ["rule X"] },
    ),
    [
      { id: "a", kind: "new", finding: "rule F1040-377-12" },
      { id: "b", kind: "fixed", finding: "rule IND-082" },
    ],
  );
});

test("a sample return that no longer exists is not a problem", () => {
  assertEquals(compareFindings({}, { gone: ["rule X"] }), []);
});

test("summary counts ready returns and common findings", () => {
  assertEquals(
    summarize({ a: [], b: ["rule X"], c: ["rule X", "rule Y"] }),
    "3 sample returns, 1 ready to file\nMost common findings:\n     2  rule X\n     1  rule Y",
  );
});

test("a baseline reason leaves with its fixed return", () => {
  assertEquals(
    keptReasons({ a: ["rule X"], b: [] }, { a: "why a", b: "why b", c: "gone" }),
    { a: "why a" },
  );
});
