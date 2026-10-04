import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "./registry.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { assertSchedule1Form8621Source } from "./schedule1-form8621-source.ts";
import { f8621, itemSchema, PficRegime } from "../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../nodes/inputs/f8621/excess_distribution.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;

function retained(item: Record<string, unknown>) {
  const result = f8621.compute(
    { taxYear: 2025, formType: "f1040" },
    { f8621s: [itemSchema.parse(item)] },
  );
  return {
    form8621: result.outputs.find((output) => output.nodeType === "form8621")
      ?.fields,
    schedule1: result.outputs.find((output) => output.nodeType === "schedule1")
      ?.fields,
  };
}

Deno.test("Schedule 1 Form 8621 source replay retains QEF, MTM, and section 1291 totals", () => {
  const base = {
    company_name: "Offshore Fund Ltd",
    company_ein_or_ref: "FUND001",
    country_of_incorporation: "Ireland",
    shares_owned: 100,
    fmv_at_year_end: 10_000,
  };
  const holdings = [
    retained({
      ...base,
      regime: PficRegime.QEF,
      qef_ordinary_income: 2_000,
      qef_capital_gain: 0,
    }),
    retained({
      ...base,
      regime: PficRegime.MTM,
      mtm_adjusted_basis_at_year_end: 9_000,
    }),
    retained({
      ...base,
      regime: PficRegime.EXCESS_DISTRIBUTION,
      excess_events: [{
        kind: ExcessEventKind.Distribution,
        holding_period_start: "2024-01-01",
        first_pfic_tax_year: 2024,
        shares_in_block: 100,
        prior_year_distributions: [{ tax_year: 2024, amount_usd: 0 }],
        current_year_distributions: [{
          date: "2025-12-31",
          amount_usd: 10_000,
          year_charges: [],
        }],
        taxable_nonexcess_dividend_usd: 0,
      }],
    }),
  ];
  const keys = [
    "line8z_form8621_qef",
    "line8z_form8621_mtm",
    "line8z_form8621_section1291",
  ] as const;
  for (const [index, pending] of holdings.entries()) {
    assertSchedule1Form8621Source(pending);
    const key = keys[index];
    const schedule1 = pending.schedule1 as Record<string, number>;
    assertThrows(
      () =>
        assertSchedule1Form8621Source({
          ...pending,
          schedule1: { ...schedule1, [key]: schedule1[key] + 1 },
        }),
      Error,
      "differs from retained PFIC holdings",
    );
  }
  const qef = holdings[0];
  const form = qef.form8621 as {
    items: Array<{ item: Record<string, unknown> }>;
  };
  assertThrows(
    () =>
      assertSchedule1Form8621Source({
        ...qef,
        form8621: {
          items: [{
            ...form.items[0],
            item: { ...form.items[0].item, qef_ordinary_income: 2_001 },
          }],
        },
      }),
    Error,
    "differs from retained PFIC holdings",
  );
});

Deno.test("Schedule 1 Form 8621 income needs retained PFIC source at both exports", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  for (
    const key of [
      "line8z_form8621_qef",
      "line8z_form8621_mtm",
      "line8z_form8621_section1291",
    ] as const
  ) {
    const changed = {
      ...pending,
      schedule1: { ...pending.schedule1, [key]: 100 },
    };
    assertThrows(
      () => buildMefXml(changed, fixture.filer),
      Error,
      "Schedule 1 Form 8621 income differs from retained PFIC holdings",
    );
    await assertRejects(
      () => buildPdfBytes(changed, fixture.filer),
      Error,
      "Schedule 1 Form 8621 income differs from retained PFIC holdings",
    );
  }
});
