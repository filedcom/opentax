import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";
import { inputSchema as f1099rInputSchema } from "../nodes/inputs/f1099r/index.ts";

const rollover = pdfReviewFixtures.find((row) =>
  row.id === "single-ira-rollover"
)!;

Deno.test("issued IRA rollover source fixes Form 1040 lines 4a and 4b in both exports", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    rollover.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  buildMefXml(pending, rollover.filer);
  const changedGross = {
    ...pending,
    f1040: { ...pending.f1040, line4a_ira_gross: 4_999 },
  };
  assertThrows(
    () => buildMefXml(changedGross, rollover.filer),
    Error,
    "line 4a differs from retained IRA sources",
  );
  await assertRejects(
    () => buildPdfBytes(changedGross, rollover.filer),
    Error,
    "line 4a differs from retained IRA sources",
  );
  const changedTaxable = {
    ...pending,
    f1040: { ...pending.f1040, line4b_ira_taxable: 1 },
  };
  assertThrows(
    () => buildMefXml(changedTaxable, rollover.filer),
    Error,
    "line 4b and AGI differ from retained IRA sources",
  );
  await assertRejects(
    () => buildPdfBytes(changedTaxable, rollover.filer),
    Error,
    "line 4b and AGI differ from retained IRA sources",
  );
  const fakeForm8606 = { ...changedTaxable, form8606: [] as const };
  assertThrows(
    () => buildMefXml(fakeForm8606, rollover.filer),
    Error,
    "line 4b and AGI differ from retained IRA sources",
  );
});

Deno.test("fully taxable sourced IRA may omit Form 1040 line 4a", async () => {
  const original = f1099rInputSchema.parse({ f1099rs: rollover.inputs.f1099r })
    .f1099rs[0]!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...rollover.inputs,
      f1099r: [{
        ...original,
        box2a_taxable_amount: 5_000,
        rollover_code: undefined,
        ira_rollover: undefined,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line4b_ira_taxable, 5_000);
  const omitted = {
    ...pending,
    f1040: { ...pending.f1040, line4a_ira_gross: undefined },
  };
  buildMefXml(omitted, rollover.filer);
  await buildPdfBytes(omitted, rollover.filer);
});
