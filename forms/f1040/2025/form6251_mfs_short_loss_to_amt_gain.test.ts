import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { registry } from "./registry.ts";
import { f1040_2025 } from "./index.ts";
import { form6251 as mef6251 } from "./mef/forms/f6251.ts";
import { form6251Pdf } from "./pdf/forms/f6251.ts";
import { priorIsoSaleFixture } from "./form6251_prior_iso_sale.fixture.ts";

const general = {
  filing_status: "mfs" as const,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  taxpayer_can_be_claimed_as_dependent: false,
};
const brokerLot = {
  part: "A",
  description: "Short-term asset with separate AMT basis",
  source_transaction_id: "broker-mfs-short-loss-to-gain",
  broker_statement_reference: "2025 issued broker short-term lot",
  date_acquired: "2025-02-01",
  date_sold: "2025-06-20",
  proceeds: 1_000,
  cost_basis: 1_500,
  amt_cost_basis: 500,
};

function filedReturn() {
  const iso = priorIsoSaleFixture(general.taxpayer_ssn);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: iso.w2,
    f3921: iso.f3921,
    f8949: [brokerLot],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const filed = result.pending.form6251!;
  return { result, filed, filer: extractFilerIdentity(general) };
}

Deno.test("MFS short-term loss-to-AMT-gain lot reaches Form 6251 and final return", async () => {
  const { result, filed, filer } = filedReturn();
  assertEquals(result.pending.f1040?.line7_capital_gain, -500);
  assertEquals(filed.line2k_disposition, 1_000);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertEquals(result.pending.schedule2?.line2_amt, filed.line11_amt);
  assertEquals(result.pending.f1040?.line17_additional_taxes, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer }),
    "<PropertyDispositionAmt>1000</PropertyDispositionAmt>",
  );
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<PropertyDispositionAmt>1000</PropertyDispositionAmt>");
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)?.line2k_disposition,
    1_000,
  );
});

Deno.test("MFS short-term crossover rejects changed source and filed totals", () => {
  const { result, filed, filer } = filedReturn();
  for (const pending of [
    { ...result.pending, f8949: { f8949s: [{ ...brokerLot, amt_cost_basis: 501 }] } },
    { ...result.pending, schedule2: { ...result.pending.schedule2, line2_amt: 0 } },
    { ...result.pending, f1040: { ...result.pending.f1040, line7_capital_gain: -499 } },
    { ...result.pending, f1040: { ...result.pending.f1040, line17_additional_taxes: 0 } },
  ]) {
    assertThrows(() => mef6251.build(filed, { pending, filer }));
    assertThrows(() => form6251Pdf.projectFields?.(filed, pending));
  }
});
