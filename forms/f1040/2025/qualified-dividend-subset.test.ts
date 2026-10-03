import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";
import { assertQualifiedDividendSubset } from "./return-wide-arithmetic.ts";

Deno.test("qualified dividends are a subset of ordinary dividends at final export", async () => {
  assertQualifiedDividendSubset({
    line3a_qualified_dividends: 100,
    line3b_ordinary_dividends: 100,
  });
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-w2-refund"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const forged = {
    ...pending,
    f1040: {
      ...pending.f1040,
      line3a_qualified_dividends: 101,
      line3b_ordinary_dividends: 100,
    },
  };
  const message = "line 3a qualified dividends must be included in line 3b";
  assertThrows(
    () => assertQualifiedDividendSubset(forged.f1040),
    Error,
    message,
  );
  assertThrows(() => buildMefXml(forged, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(forged, fixture.filer),
    Error,
    message,
  );
});
