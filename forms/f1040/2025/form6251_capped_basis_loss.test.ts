import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { registry } from "./registry.ts";
import { form6251 as mef6251 } from "./mef/forms/f6251.ts";
import { form6251Pdf } from "./pdf/forms/f6251.ts";
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
  assertEquals(filed.amti, filed.regular_tax_income + 239_000);
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
