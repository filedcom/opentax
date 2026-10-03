import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { assert1099DivIncomeSource } from "./f1099div-income-reconciliation.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";

Deno.test("retained 1099-DIV income survives native and PDF export", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-form4952-interest-and-dividends"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assert1099DivIncomeSource(pending.f1040 ?? {}, pending);
  const ordinary = {
    ...pending,
    f1040: { ...pending.f1040, line3b_ordinary_dividends: 399 },
  };
  const qualified = {
    ...pending,
    f1040: { ...pending.f1040, line3a_qualified_dividends: 99 },
  };
  assertThrows(
    () => buildMefXml(ordinary, fixture.filer),
    Error,
    "line 3b omits sourced Form 1099-DIV",
  );
  await assertRejects(
    () => buildPdfBytes(qualified, fixture.filer),
    Error,
    "line 3a omits sourced Form 1099-DIV",
  );
});

Deno.test("nominee distributions are excluded from sourced 1099-DIV minimum", () => {
  const pending = {
    f1099div: {
      f1099divs: [{
        isNominee: true,
        box11: false,
        box1a: 500,
        box1b: 200,
        nominee_distribution: { box1a: 300, box1b: 100 },
      }],
    },
  };
  assert1099DivIncomeSource(
    { line3b_ordinary_dividends: 200, line3a_qualified_dividends: 100 },
    pending,
  );
  assertThrows(
    () =>
      assert1099DivIncomeSource(
        { line3b_ordinary_dividends: 199, line3a_qualified_dividends: 100 },
        pending,
      ),
    Error,
    "line 3b omits sourced Form 1099-DIV",
  );
});
