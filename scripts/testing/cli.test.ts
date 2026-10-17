import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { pdfReviewFixtures } from "../../forms/f1040/2025/pdf/review-fixtures.ts";
import { CLI_RETURNS } from "./cli.ts";

test("every CLI readiness return is a current PDF review fixture", () => {
  const ids = new Set(pdfReviewFixtures.map((f) => f.id));
  assertEquals(CLI_RETURNS.filter((id) => !ids.has(id)), []);
});
