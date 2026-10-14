import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { priorIsoSaleFixture } from "./form6251_prior_iso_sale.fixture.ts";
import { form6251 as mef6251 } from "../../../../mef/forms/taxes/amt/f6251.ts";
import { form6251Pdf } from "../../../../pdf/forms/taxes/amt/f6251.ts";
import { registry } from "../../../../registry.ts";

const general = {
  filing_status: "single" as const,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const lots = [
  {
    part: "A",
    description: "Short-term capital gain with AMT basis",
    source_transaction_id: "broker-short-gain-to-amt-loss",
    broker_statement_reference: "2025 issued short-term gain lot",
    date_acquired: "2025-01-10",
    date_sold: "2025-06-20",
    proceeds: 3_000,
    cost_basis: 1_000,
    amt_cost_basis: 2_000,
  },
  {
    part: "D",
    description: "Long-term capital loss with AMT basis",
    source_transaction_id: "broker-long-loss-to-amt-loss",
    broker_statement_reference: "2025 issued long-term loss lot",
    date_acquired: "2023-01-10",
    date_sold: "2025-06-20",
    proceeds: 1_000,
    cost_basis: 2_000,
    amt_cost_basis: 3_000,
  },
];

function filedReturn() {
  const retainedIso = priorIsoSaleFixture(general.taxpayer_ssn);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: retainedIso.w2,
    f3921: retainedIso.f3921,
    f8949: lots,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return {
    result,
    filed: result.pending.form6251!,
    filer: extractFilerIdentity(general),
  };
}

Deno.test("Form 6251 offsets a regular short-term gain into a deductible AMT loss", () => {
  const { result, filed, filer } = filedReturn();
  // Regular +$2,000 short / -$1,000 long nets +$1,000; AMT +$1,000 short
  // / -$2,000 long nets -$1,000. Neither side has preferential net gain.
  assertEquals(result.pending.f1040?.line7_capital_gain, 1_000);
  assertEquals(filed.line2k_disposition, -2_000);
  assertEquals(filed.net_capital_gain ?? 0, 0);
  assertEquals(result.pending.schedule2?.line2_amt, filed.line11_amt);
  assertEquals(result.pending.f1040?.line17_additional_taxes, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer }),
    "<PropertyDispositionAmt>-2000</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)?.line2k_disposition,
    -2_000,
  );
});

Deno.test("Form 6251 mixed-term regular gain to AMT loss rejects source and return drift", () => {
  const { result, filed, filer } = filedReturn();
  const altered = [
    { ...result.pending, f8949: { f8949s: [lots[0]] } },
    {
      ...result.pending,
      f8949: { f8949s: [lots[0], { ...lots[1], amt_cost_basis: 3_100 }] },
    },
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line7_capital_gain: 0 },
    },
    {
      ...result.pending,
      schedule2: { ...result.pending.schedule2, line2_amt: 0 },
    },
  ];
  for (const pending of altered) {
    assertThrows(() => mef6251.build(filed, { pending, filer }));
    assertThrows(() => form6251Pdf.projectFields?.(filed, pending));
  }
  const changed = { ...filed, line2k_disposition: -1_000 };
  assertThrows(() =>
    mef6251.build(changed, { pending: result.pending, filer })
  );
  assertThrows(() => form6251Pdf.projectFields?.(changed, result.pending));
});
