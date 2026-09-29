import { assertEquals, assertThrows } from "@std/assert";
import { scheduleAPdf } from "./schedule_a.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";

Deno.test("Schedule A PDF rejects a finalized capital-gain election without reconciled Form 8283 source", () => {
  assertThrows(
    () =>
      scheduleAPdf.includeWhen?.({
        line_12_noncash_contributions: 24_000,
        line_13_contribution_carryover: 5_000,
        charitable_limits_finalized: true,
        capital_gain_election_finalized: true,
      }, { f1040: { line12e_itemized_deductions: 29_000 } }),
    Error,
    "complete Schedule A source",
  );
  assertEquals(
    scheduleAPdf.includeWhen?.({ capital_gain_election_finalized: true }, {
      f1040: { line12a_standard_deduction: 15_750 },
    }),
    false,
  );
});

Deno.test("Schedule A PDF prints the ordinary gift on the official line 12 widget", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-ordinary-noncash-gift"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const [instance] = scheduleAPdf.instances?.(
    result.pending.schedule_a,
    fixture.filer,
    result.pending,
  ) ?? [];
  assertEquals(instance?.filer_name, "ALEX EXAMPLE");
  assertEquals(instance?.line_5e_salt_deduction, 24_000);
  assertEquals(instance?.line_12_noncash_contributions, 1_200);
  assertEquals(instance?.line_17_itemized, 37_200);
  assertEquals(
    scheduleAPdf.fields.find((field) =>
      field.domainKey === "line_12_noncash_contributions"
    )?.pdfField,
    "form1[0].Page1[0].f1_24[0]",
  );
});
