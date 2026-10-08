import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { assertDividendIncomeSources } from "./f1099div-income-reconciliation.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { registry } from "../../../registry.ts";

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
  assertDividendIncomeSources(pending.f1040 ?? {}, pending);
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
    agi_aggregator: { line3b_ordinary_dividends: 200 },
  };
  assertDividendIncomeSources(
    { line3b_ordinary_dividends: 200, line3a_qualified_dividends: 100 },
    pending,
  );
  assertThrows(
    () =>
      assertDividendIncomeSources(
        { line3b_ordinary_dividends: 199, line3a_qualified_dividends: 100 },
        pending,
      ),
    Error,
    "line 3b omits sourced Form 1099-DIV",
  );
});

Deno.test("three K-1 issuer families add to the 1099-DIV minimum without box 6c", () => {
  const pending = {
    f1099div: {
      f1099divs: [{ isNominee: false, box11: false, box1a: 100, box1b: 40 }],
    },
    k1_partnership: {
      k1_partnerships: [{
        partnership_name: "Partnership",
        box6a_ordinary_dividends: 200,
        box6b_qualified_dividends: 80,
        box6c_dividend_equivalents: 500,
      }],
    },
    k1_s_corp: {
      k1_s_corps: [{
        corporation_name: "S Corporation",
        box5a_ordinary_dividends: 300,
        box5b_qualified_dividends: 120,
      }],
    },
    k1_trust: {
      k1_trusts: [{
        estate_trust_name: "Trust",
        box2a_ordinary_dividends: 400,
        box2b_qualified_dividends: 160,
      }],
    },
    agi_aggregator: { line3b_ordinary_dividends: [100, 200, 300, 400] },
  };
  assertDividendIncomeSources(
    { line3b_ordinary_dividends: 1_000, line3a_qualified_dividends: 400 },
    pending,
  );
  assertThrows(
    () =>
      assertDividendIncomeSources(
        { line3b_ordinary_dividends: 999, line3a_qualified_dividends: 400 },
        pending,
      ),
    Error,
    "line 3b omits sourced K-1 ordinary dividends",
  );
  assertThrows(
    () =>
      assertDividendIncomeSources(
        { line3b_ordinary_dividends: 1_000, line3a_qualified_dividends: 399 },
        pending,
      ),
    Error,
    "line 3a omits sourced K-1 qualified dividends",
  );
});

Deno.test("partnership K-1 dividends survive both final exporters", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-w2-refund"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...fixture.inputs,
      k1_partnership: [{
        partnership_name: "Example Partnership",
        partnership_ein: "123456789",
        source_document_reference: "2025 issued K-1",
        recipient_tin: fixture.filer.primarySSN,
        box6a_ordinary_dividends: 100,
        box6b_qualified_dividends: 40,
        box6c_dividend_equivalents: 500,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line3b_ordinary_dividends, 100);
  assertEquals(pending.f1040?.line3a_qualified_dividends, 40);
  buildMefXml(pending, fixture.filer);
  await buildPdfBytes(pending, fixture.filer);
  const ordinary = {
    ...pending,
    f1040: { ...pending.f1040, line3b_ordinary_dividends: 99 },
  };
  const qualified = {
    ...pending,
    f1040: { ...pending.f1040, line3a_qualified_dividends: 39 },
  };
  const retained = {
    ...pending,
    agi_aggregator: {
      ...pending.agi_aggregator,
      line3b_ordinary_dividends: 99,
    },
  };
  assertThrows(
    () => buildMefXml(ordinary, fixture.filer),
    Error,
    "line 3b omits sourced K-1 ordinary dividends",
  );
  await assertRejects(
    () => buildPdfBytes(qualified, fixture.filer),
    Error,
    "line 3a omits sourced K-1 qualified dividends",
  );
  assertThrows(
    () => buildMefXml(retained, fixture.filer),
    Error,
    "Retained AGI ordinary dividends must equal Form 1040 line 3b",
  );
  await assertRejects(
    () => buildPdfBytes(retained, fixture.filer),
    Error,
    "Retained AGI ordinary dividends must equal Form 1040 line 3b",
  );
});
