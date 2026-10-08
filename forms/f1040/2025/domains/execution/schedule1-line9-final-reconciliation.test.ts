import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { buildPending } from "../../mef/execution/pending.ts";
import { buildMefXml } from "../../mef/builder.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

Deno.test("mixed nonbusiness income keeps Schedule 1 line 9 tied to its printed sources", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-nec-k-nonbusiness-line8j"
  );
  if (!fixture) throw new Error("Missing mixed nonbusiness review fixture");
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule1?.line9_total_other_income, 8_000);
  assert(buildMefXml(pending, fixture.filer).length > 1_000);
  assert((await buildPdfBytes(pending, fixture.filer)).length > 100_000);

  const changed = {
    ...pending,
    schedule1: {
      ...pending.schedule1,
      line9_total_other_income: 8_001,
      line10_total_additional_income: 8_001,
    },
    f1040: {
      ...pending.f1040,
      line8_additional_income: 8_001,
      line9_total_income: 8_001,
      line11_agi: 8_001,
    },
  };
  assertThrows(
    () => buildMefXml(changed, fixture.filer),
    Error,
    "Schedule 1 line 9 must equal its printed other-income lines",
  );
  await assertRejects(
    () => buildPdfBytes(changed, fixture.filer),
    Error,
    "Schedule 1 line 9 must equal its printed other-income lines",
  );
});
