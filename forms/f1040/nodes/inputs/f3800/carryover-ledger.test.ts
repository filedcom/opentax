import { assertEquals, assertThrows } from "@std/assert";
import {
  type Form3800CarryoverVintage,
  reconcileForm3800CarryoverLedger,
} from "./carryover-ledger.ts";

const vintage: Form3800CarryoverVintage = {
  source_key: "2022-qei-1",
  credit_type: "New markets credit",
  form3800_credit_line: "1i",
  originating_tax_year: 2022,
  source_document_reference: "2022 filed Form 8874 investment 1",
  originating_return_reference: "2022 accepted Form 1040 and Form 3800",
  permitted_carryback_years: 1,
  credit_generated_as_filed: 5_000,
  credit_allowed_origin_year: 2_000,
  historical_uses: [{
    tax_year: 2023,
    credit_allowed: 500,
    return_reference: "2023 accepted Form 1040 and Form 3800",
    kind: "carryforward",
  }, {
    tax_year: 2024,
    credit_allowed: 500,
    return_reference: "2024 accepted Form 1040 and Form 3800",
    kind: "carryforward",
  }],
  prior_adjustments: [{
    tax_year: 2024,
    amount: 500,
    reason: "audit adjustment",
    source_document_reference: "2024 final adjustment notice",
  }],
  balance_carried_to_2025: 1_500,
  original_reported_balance_carried_to_2025: 2_000,
  adjustment_2025: {
    amount: 1_000,
    reason: "New markets recapture",
    source_document_reference: "2025 Form 8874-B and Section 38 review",
  },
};

Deno.test("Form 3800 carryover ledger reconciles source vintage and keeps recapture out of usable credit", () => {
  const [result] = reconcileForm3800CarryoverLedger([vintage]);
  assertEquals(result.sourceKey, "2022-qei-1");
  assertEquals(result.creditType, "New markets credit");
  assertEquals(result.form3800CreditLine, "1i");
  assertEquals(result.originatingTaxYear, 2022);
  assertEquals(result.balanceEntering2025, 1_500);
  assertEquals(result.adjustment2025, 1_000);
  assertEquals(result.availableAfterAdjustment, 500);
  assertEquals(result.revisedFromOriginal, true);
  assertEquals(result.statementFacts.historicalUses.length, 2);
  assertEquals(result.statementFacts.priorAdjustments.length, 1);
});

Deno.test("Form 3800 carryover ledger preserves cent-precision balances", () => {
  const [result] = reconcileForm3800CarryoverLedger([{
    ...vintage,
    credit_generated_as_filed: 5_000.25,
    balance_carried_to_2025: 1_500.25,
    adjustment_2025: { ...vintage.adjustment_2025!, amount: 1_000.10 },
  }]);
  assertEquals(result.availableAfterAdjustment, 500.15);
});

Deno.test("Form 3800 carryover ledger rejects changed balance, unsupported carryback year, and excess recapture", () => {
  for (
    const changed of [
      { ...vintage, balance_carried_to_2025: 1_501 },
      {
        ...vintage,
        adjustment_2025: { ...vintage.adjustment_2025!, amount: 1_501 },
      },
      {
        ...vintage,
        historical_uses: [{
          tax_year: 2020,
          credit_allowed: 500,
          return_reference: "2020 return",
          kind: "carryback" as const,
        }, vintage.historical_uses[1]],
      },
    ]
  ) {
    assertThrows(() => reconcileForm3800CarryoverLedger([changed]));
  }
});

Deno.test("Form 3800 carryover ledger rejects missing extended carryback evidence and duplicate source", () => {
  assertThrows(() =>
    reconcileForm3800CarryoverLedger([{
      ...vintage,
      permitted_carryback_years: 3,
    }])
  );
  assertThrows(() => reconcileForm3800CarryoverLedger([vintage, vintage]));
});
