import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 as mef6251 } from "../../../../2025/mef/forms/f6251.ts";
import { form6251Pdf } from "../../../../2025/pdf/forms/f6251.ts";
import { form6251, inputSchema } from "./index.ts";

const lot = {
  source_transaction_id: "2025-short-loss-amt-gain",
  part: "A" as const,
  proceeds: 1_000,
  regular_basis: 1_500,
  amt_basis: 500,
  regular_gain: -500,
  amt_gain: 500,
};

function filedCase(filingStatus: "single" | "mfs" = "single") {
  const source = inputSchema.parse({
    filing_status: filingStatus,
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 0,
    line2k_8949_basis_dispositions: [lot],
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: lot.source_transaction_id,
        part: lot.part,
        proceeds: lot.proceeds,
        cost_basis: lot.regular_basis,
        gain_loss: lot.regular_gain,
      }],
      has_other_capital_activity: false,
    },
  });
  const result = form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  const filed = result.outputs.find((row) => row.nodeType === "form6251")!
    .fields;
  const amt = result.outputs.find((row) => row.nodeType === "schedule2")
    ?.fields.line2_amt;
  const pending = {
    f8949: {
      f8949s: [{
        source_transaction_id: lot.source_transaction_id,
        part: lot.part,
        description: "Complete short-term capital lot",
        date_acquired: "2025-02-01",
        date_sold: "2025-06-20",
        proceeds: lot.proceeds,
        cost_basis: lot.regular_basis,
        amt_cost_basis: lot.amt_basis,
      }],
    },
    schedule2: { line2_amt: amt },
    f1040: {
      line7_capital_gain: -500,
      line11_agi: 200_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 200_000,
      line17_additional_taxes: filed.line11_amt,
    },
  };
  return { filed, pending };
}

Deno.test("one short-term regular loss becomes AMT gain after a sourced basis refigure", () => {
  const { filed, pending } = filedCase();
  assertEquals(filed.line2k_disposition, 1_000);
  assertEquals(filed.net_capital_gain, 0);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<PropertyDispositionAmt>1000</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)?.line2k_disposition,
    1_000,
  );
});

Deno.test("MFS short-term regular loss becomes AMT gain within its $1,500 limit", () => {
  const { filed, pending } = filedCase("mfs");
  assertEquals(filed.line2k_disposition, 1_000);
  assertEquals(filed.filing_status, "mfs");
  assertEquals(filed.net_capital_gain, 0);
  assertEquals(filed.line13, undefined);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<PropertyDispositionAmt>1000</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)?.line2k_disposition,
    1_000,
  );
  for (const changed of [
    { ...pending, f8949: { f8949s: [{ ...pending.f8949.f8949s[0], amt_cost_basis: 501 }] } },
    { ...pending, f1040: { ...pending.f1040, line7_capital_gain: -499 } },
    { ...pending, schedule2: { line2_amt: 0 } },
  ]) {
    assertThrows(() => mef6251.build(filed, { pending: changed }));
    assertThrows(() => form6251Pdf.projectFields?.(filed, changed));
  }
});

Deno.test("short-term loss-to-AMT-gain rejects changed Form 8949 basis, printed line, and final return", () => {
  const { filed, pending } = filedCase();
  const altered = [
    {
      ...pending,
      f8949: { f8949s: [{ ...pending.f8949.f8949s[0], amt_cost_basis: 501 }] },
    },
    { ...pending, f1040: { ...pending.f1040, line7_capital_gain: -499 } },
    { ...pending, schedule2: { line2_amt: 0 } },
    { ...pending, f1040: { ...pending.f1040, line15_taxable_income: 199_999 } },
  ];
  for (const candidate of altered) {
    assertThrows(() => mef6251.build(filed, { pending: candidate }));
    assertThrows(() => form6251Pdf.projectFields?.(filed, candidate));
  }
  assertThrows(() =>
    mef6251.build({ ...filed, line2k_disposition: 999 }, { pending })
  );
  assertThrows(() =>
    form6251Pdf.projectFields?.({ ...filed, line2k_disposition: 999 }, pending)
  );
  assertThrows(() =>
    form6251.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        filing_status: "mfs",
        regular_tax_income: 200_000,
        regular_taxable_income: 200_000,
        regular_tax: 0,
        net_capital_gain: 0,
        line2k_8949_basis_dispositions: [{
          ...lot,
          regular_basis: 3_000,
          regular_gain: -2_000,
        }],
        line2k_8949_capital_audit: {
          transactions: [{
            source_transaction_id: lot.source_transaction_id,
            part: lot.part,
            proceeds: lot.proceeds,
            cost_basis: 3_000,
            gain_loss: -2_000,
          }],
          has_other_capital_activity: false,
        },
      }),
    )
  );
});
