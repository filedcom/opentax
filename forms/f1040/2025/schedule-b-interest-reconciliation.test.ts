import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";
import { assertScheduleBInterestJoin } from "./schedule-b-interest-reconciliation.ts";

function preparedFixture(id: string) {
  const fixture = pdfReviewFixtures.find((row) => row.id === id)!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  return { fixture, pending: buildPending(result.pending) };
}

Deno.test("Schedule B interest joins Form 1040 and AGI in both exporters", async () => {
  const { fixture, pending } = preparedFixture(
    "single-form4952-interest-and-dividends",
  );
  assertEquals(
    (pending.schedule_b?.interest_detail as { net: number })?.net,
    500,
  );
  assertScheduleBInterestJoin(pending);
  const forged = {
    ...pending,
    f1040: { ...pending.f1040, line2b_taxable_interest: 499 },
  };
  assertThrows(
    () => buildMefXml(forged, fixture.filer),
    Error,
    "line 2b must equal Schedule B line 4",
  );
  await assertRejects(
    () => buildPdfBytes(forged, fixture.filer),
    Error,
    "line 2b must equal Schedule B line 4",
  );
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        ...pending,
        agi_aggregator: {
          ...pending.agi_aggregator,
          line2b_taxable_interest: 499,
        },
      }),
    Error,
    "Retained AGI taxable interest",
  );
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        ...pending,
        agi_aggregator: {},
      }),
    Error,
    "Retained AGI taxable interest",
  );
});

Deno.test("excluded savings-bond interest remains zero on Form 1040", () => {
  assertScheduleBInterestJoin({
    schedule_b: { taxable_interest_net: 800, ee_bond_exclusion: 800 },
    f1040: {},
  });
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        schedule_b: { taxable_interest_net: 800, ee_bond_exclusion: 800 },
        f1040: { line2b_taxable_interest: 800 },
      }),
    Error,
    "line 2b must equal Schedule B line 4",
  );
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        f1040: { line2b_taxable_interest: 100 },
      }),
    Error,
    "line 2b must equal Schedule B line 4",
  );
});
