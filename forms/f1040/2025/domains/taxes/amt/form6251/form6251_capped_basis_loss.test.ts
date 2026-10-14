import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { registry } from "../../../../registry.ts";
import { form6251 as mef6251 } from "../../../../mef/forms/taxes/amt/f6251.ts";
import { form6251Pdf } from "../../../../pdf/forms/taxes/amt/f6251.ts";
import { priorIsoSaleFixture } from "./form6251_prior_iso_sale.fixture.ts";

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

const brokerLoss = {
  part: "A",
  description: "Capital asset with different AMT basis",
  source_transaction_id: "broker-capped-loss",
  broker_statement_reference: "2025 issued broker loss lot",
  date_acquired: "2025-01-10",
  date_sold: "2025-06-20",
  proceeds: 1_000,
  cost_basis: 3_000,
  amt_cost_basis: 6_000,
};

function cappedReturn() {
  const retainedIso = priorIsoSaleFixture(general.taxpayer_ssn);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: retainedIso.w2,
    f3921: retainedIso.f3921,
    f8949: [brokerLoss],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const filed = result.pending.form6251!;
  const filer = extractFilerIdentity(general);
  return { result, filed, filer };
}

Deno.test("Form 6251 caps a same-term AMT basis loss separately from regular Schedule D", () => {
  const { result, filed, filer } = cappedReturn();
  // Regular loss -$2,000 is fully deductible; AMT loss -$5,000 is capped at
  // -$3,000, with the other $2,000 carried to the separate AMT ledger.
  assertEquals(result.pending.f1040?.line7_capital_gain, -2_000);
  assertEquals(filed.line2k_disposition, -1_000);
  if (typeof filed.regular_tax_income !== "number") {
    throw new Error("Expected numeric regular taxable income");
  }
  assertEquals(
    filed.amti,
    filed.regular_tax_income +
      (typeof filed.line2a_taxes_paid === "number"
        ? filed.line2a_taxes_paid
        : 0) + 239_000,
  );
  assertEquals(result.pending.schedule2?.line2_amt, filed.line11_amt);
  assertEquals(
    result.pending.f1040?.line17_additional_taxes,
    filed.line11_amt,
  );
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer }),
    "<PropertyDispositionAmt>-1000</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)?.line2k_disposition,
    -1_000,
  );
});

Deno.test("Form 6251 capped AMT loss rejects changed basis, printed adjustment, and final joins", () => {
  const { result, filed, filer } = cappedReturn();
  const altered = [
    {
      ...result.pending,
      f8949: { f8949s: [{ ...brokerLoss, amt_cost_basis: 6_100 }] },
    },
    {
      ...result.pending,
      schedule2: { ...result.pending.schedule2, line2_amt: 0 },
    },
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line7_capital_gain: -3_000 },
    },
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line17_additional_taxes: 0 },
    },
  ];
  for (const pending of altered) {
    assertThrows(() => mef6251.build(filed, { pending, filer }));
    assertThrows(() => form6251Pdf.projectFields?.(filed, pending));
  }
  const changed = { ...filed, line2k_disposition: -3_000 };
  assertThrows(
    () => mef6251.build(changed, { pending: result.pending, filer }),
  );
  assertThrows(
    () => form6251Pdf.projectFields?.(changed, result.pending),
  );
});

const mixedTermLosses = [
  {
    ...brokerLoss,
    source_transaction_id: "broker-short-loss",
    broker_statement_reference: "2025 issued broker short-term lot",
  },
  {
    ...brokerLoss,
    part: "D",
    source_transaction_id: "broker-long-loss",
    broker_statement_reference: "2025 issued broker long-term lot",
    date_acquired: "2023-01-10",
    date_sold: "2025-06-20",
    proceeds: 2_000,
    cost_basis: 2_500,
    amt_cost_basis: 3_500,
  },
];

function cappedMixedTermReturn() {
  const retainedIso = priorIsoSaleFixture(general.taxpayer_ssn);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: retainedIso.w2,
    f3921: retainedIso.f3921,
    f8949: mixedTermLosses,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return {
    result,
    filed: result.pending.form6251!,
    filer: extractFilerIdentity(general),
  };
}

Deno.test("Form 6251 caps audited mixed-term losses separately for regular and AMT", () => {
  const { result, filed, filer } = cappedMixedTermReturn();
  // Short-term: -$2,000 regular/-$5,000 AMT. Long-term: -$500/-$1,500.
  // Both totals exceed the AMT limit only; regular is fully deductible.
  assertEquals(result.pending.f1040?.line7_capital_gain, -2_500);
  assertEquals(filed.line2k_disposition, -500);
  assertEquals(result.pending.schedule2?.line2_amt, filed.line11_amt);
  assertEquals(result.pending.f1040?.line17_additional_taxes, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer }),
    "<PropertyDispositionAmt>-500</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)?.line2k_disposition,
    -500,
  );
});

Deno.test("Form 6251 capped mixed-term loss rejects omitted lot, changed AMT basis, and return totals", () => {
  const { result, filed, filer } = cappedMixedTermReturn();
  const altered = [
    {
      ...result.pending,
      f8949: { f8949s: [mixedTermLosses[0]] },
    },
    {
      ...result.pending,
      f8949: {
        f8949s: [
          mixedTermLosses[0],
          { ...mixedTermLosses[1], amt_cost_basis: 3_600 },
        ],
      },
    },
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line7_capital_gain: -3_000 },
    },
    {
      ...result.pending,
      schedule2: { ...result.pending.schedule2, line2_amt: 0 },
    },
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line17_additional_taxes: 0 },
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

const mixedGainAndLoss = [
  {
    part: "A",
    description: "Short-term capital gain with AMT basis",
    source_transaction_id: "broker-short-gain-cap",
    broker_statement_reference: "2025 issued short-term gain lot",
    date_acquired: "2025-01-10",
    date_sold: "2025-06-20",
    proceeds: 2_000,
    cost_basis: 1_000,
    amt_cost_basis: 1_100,
  },
  {
    part: "D",
    description: "Long-term capital loss with AMT basis",
    source_transaction_id: "broker-long-loss-cap",
    broker_statement_reference: "2025 issued long-term loss lot",
    date_acquired: "2023-01-10",
    date_sold: "2025-06-20",
    proceeds: 1_000,
    cost_basis: 4_500,
    amt_cost_basis: 6_600,
  },
];

function cappedMixedOffsetReturn() {
  const retainedIso = priorIsoSaleFixture(general.taxpayer_ssn);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: retainedIso.w2,
    f3921: retainedIso.f3921,
    f8949: mixedGainAndLoss,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return {
    result,
    filed: result.pending.form6251!,
    filer: extractFilerIdentity(general),
  };
}

Deno.test("Form 6251 caps audited mixed-term gain and loss separately for regular and AMT", () => {
  const { result, filed, filer } = cappedMixedOffsetReturn();
  // $1,000 short gain offsets a $3,500 long loss for regular tax. For AMT,
  // $900 offsets a $5,600 loss, so only $3,000 of the $4,700 net is deducted.
  assertEquals(result.pending.f1040?.line7_capital_gain, -2_500);
  assertEquals(filed.line2k_disposition, -500);
  assertEquals(filed.net_capital_gain ?? 0, 0);
  assertEquals(result.pending.schedule2?.line2_amt, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer }),
    "<PropertyDispositionAmt>-500</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)?.line2k_disposition,
    -500,
  );
});

Deno.test("Form 6251 capped mixed-term offset rejects missing lot, AMT basis, and final loss tampering", () => {
  const { result, filed, filer } = cappedMixedOffsetReturn();
  const altered = [
    {
      ...result.pending,
      f8949: { f8949s: [mixedGainAndLoss[1]] },
    },
    {
      ...result.pending,
      f8949: {
        f8949s: [
          mixedGainAndLoss[0],
          { ...mixedGainAndLoss[1], amt_cost_basis: 6_700 },
        ],
      },
    },
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line7_capital_gain: -3_000 },
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
  const changed = { ...filed, line2k_disposition: -2_200 };
  assertThrows(() =>
    mef6251.build(changed, { pending: result.pending, filer })
  );
  assertThrows(() => form6251Pdf.projectFields?.(changed, result.pending));
});
