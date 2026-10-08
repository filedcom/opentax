import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { buildMefXml } from "../../mef/builder.ts";
import { buildPending } from "../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { registry } from "../../registry.ts";
import { assertFinalBalanceProjection } from "./return-wide-arithmetic.ts";

Deno.test("final exporters require the calculated refund and overpayment", async () => {
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
  assertFinalBalanceProjection(pending.f1040 ?? {});
  const withoutOverpayment = {
    ...pending,
    f1040: { ...pending.f1040, line34_overpayment: undefined },
  };
  assertThrows(
    () => buildMefXml(withoutOverpayment, fixture.filer),
    Error,
    "line 34 must report the full overpayment",
  );
  await assertRejects(
    () => buildPdfBytes(withoutOverpayment, fixture.filer),
    Error,
    "line 34 must report the full overpayment",
  );
  assertThrows(
    () =>
      assertFinalBalanceProjection({
        ...pending.f1040,
        line35a_refund: undefined,
      }),
    Error,
    "lines 35a and 36 must allocate the overpayment",
  );
});

Deno.test("final amount owed includes a reported estimated-tax penalty", () => {
  const fields = {
    line24_total_tax: 1_000,
    line33_total_payments: 800,
    line38_underpayment_penalty: 25,
    line37_amount_owed: 225,
  };
  assertFinalBalanceProjection(fields);
  assertThrows(
    () =>
      assertFinalBalanceProjection({
        ...fields,
        line37_amount_owed: undefined,
      }),
    Error,
    "line 37 must report the amount owed",
  );
  assertFinalBalanceProjection({
    line24_total_tax: 1_000,
    line33_total_payments: 1_200,
    line34_overpayment: 200,
    line38_underpayment_penalty: 250,
    line37_amount_owed: 50,
  });
});

Deno.test("calculated refund and line 38 penalty stay reconciled through native and PDF export", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-w2-refund"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs, f2210: { underpayment_penalty: 250 } },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filed = pending.f1040!;
  assertEquals(filed.line38_underpayment_penalty, 250);
  assertEquals(filed.line35a_refund, filed.line34_overpayment! - 250);
  const xml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(xml, "<EsPenaltyAmt>250</EsPenaltyAmt>");
  assertStringIncludes(xml, `<RefundAmt>${filed.line35a_refund}</RefundAmt>`);
  assertEquals((await buildPdfBytes(pending, fixture.filer)).length > 0, true);
  const changed = {
    ...pending,
    f1040: { ...filed, line35a_refund: filed.line35a_refund! + 1 },
  };
  assertThrows(() => buildMefXml(changed, fixture.filer), Error);
  await assertRejects(() => buildPdfBytes(changed, fixture.filer), Error);
});
