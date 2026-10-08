import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 as mef6251 } from "../../../../2025/mef/forms/taxes/f6251.ts";
import { form6251Pdf } from "../../../../2025/pdf/forms/taxes/f6251.ts";
import { form6251, inputSchema } from "./index.ts";

const lots = [{
  source_transaction_id: "2025-short-regular-loss-amt-gain",
  part: "A" as const,
  proceeds: 2_000,
  regular_basis: 3_000,
  amt_basis: 1_500,
  regular_gain: -1_000,
  amt_gain: 500,
}, {
  source_transaction_id: "2025-short-stable-gain",
  part: "B" as const,
  proceeds: 5_000,
  regular_basis: 1_000,
  amt_basis: 1_000,
  regular_gain: 4_000,
  amt_gain: 4_000,
}];

const input = {
  filing_status: "single",
  regular_tax_income: 200_000,
  regular_taxable_income: 200_000,
  regular_tax: 0,
  net_capital_gain: 0,
  line2k_8949_basis_dispositions: lots,
  line2k_8949_capital_audit: {
    transactions: lots.map((lot) => ({
      source_transaction_id: lot.source_transaction_id,
      part: lot.part,
      proceeds: lot.proceeds,
      cost_basis: lot.regular_basis,
      gain_loss: lot.regular_gain,
    })),
    has_other_capital_activity: false,
  },
};

function filedCase() {
  const result = form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
  const filed = result.outputs.find((row) => row.nodeType === "form6251")!
    .fields;
  const amt = result.outputs.find((row) => row.nodeType === "schedule2")
    ?.fields.line2_amt;
  const pending = {
    f8949: {
      f8949s: lots.map((lot) => ({
        source_transaction_id: lot.source_transaction_id,
        part: lot.part,
        description: "Audited short-term capital lot",
        date_acquired: "2025-02-01",
        date_sold: "2025-06-20",
        proceeds: lot.proceeds,
        cost_basis: lot.regular_basis,
        amt_cost_basis: lot.amt_basis,
      })),
    },
    schedule2: { line2_amt: amt },
    f1040: {
      line7_capital_gain: 3_000,
      line11_agi: 200_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 200_000,
      line17_additional_taxes: filed.line11_amt,
    },
  };
  return { filed, pending };
}

Deno.test("two short-term lots with one regular loss becoming AMT gain reconcile", () => {
  const { filed, pending } = filedCase();
  assertEquals(filed.line2k_disposition, 1_500);
  assertEquals(filed.net_capital_gain, 0);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<PropertyDispositionAmt>1500</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)?.line2k_disposition,
    1_500,
  );
});

Deno.test("two short-term AMT lots reject omitted, altered and final-return facts", () => {
  const { filed, pending } = filedCase();
  for (
    const changed of [
      { ...pending, f8949: { f8949s: pending.f8949.f8949s.slice(0, 1) } },
      {
        ...pending,
        f8949: {
          f8949s: [
            { ...pending.f8949.f8949s[0], amt_cost_basis: 1_501 },
            pending.f8949.f8949s[1],
          ],
        },
      },
      { ...pending, schedule2: { line2_amt: 0 } },
      { ...pending, f1040: { ...pending.f1040, line7_capital_gain: 2_999 } },
      {
        ...pending,
        f1040: { ...pending.f1040, line15_taxable_income: 199_999 },
      },
    ]
  ) {
    assertThrows(() => mef6251.build(filed, { pending: changed }));
    assertThrows(() => form6251Pdf.projectFields?.(filed, changed));
  }
  assertThrows(() =>
    mef6251.build({ ...filed, line2k_disposition: 1_499 }, { pending })
  );
  assertThrows(() =>
    form6251Pdf.projectFields?.(
      { ...filed, line2k_disposition: 1_499 },
      pending,
    )
  );
  assertThrows(() =>
    form6251.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({ ...input, filing_status: "mfs" }),
    )
  );
});
