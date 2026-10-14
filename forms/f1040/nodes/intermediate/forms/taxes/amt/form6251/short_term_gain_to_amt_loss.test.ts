import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 as mef6251 } from "../../../../../../2025/mef/forms/taxes/amt/f6251.ts";
import { form6251Pdf } from "../../../../../../2025/pdf/forms/taxes/amt/f6251.ts";
import { form6251, inputSchema } from "./index.ts";

const lots = [
  {
    source_transaction_id: "2025-short-gain-amt-loss",
    part: "A" as const,
    proceeds: 5_000,
    regular_basis: 2_800,
    amt_basis: 5_200,
    regular_gain: 2_200,
    amt_gain: -200,
  },
  {
    source_transaction_id: "2025-short-loss-b",
    part: "B" as const,
    proceeds: 1_000,
    regular_basis: 1_400,
    amt_basis: 1_500,
    regular_gain: -400,
    amt_gain: -500,
  },
  {
    source_transaction_id: "2025-short-loss-c",
    part: "C" as const,
    proceeds: 1_000,
    regular_basis: 1_300,
    amt_basis: 1_400,
    regular_gain: -300,
    amt_gain: -400,
  },
];

function shortTermCase() {
  const result = form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({
      filing_status: "single",
      regular_tax_income: 200_000,
      regular_taxable_income: 200_000,
      regular_tax: 0,
      net_capital_gain: 0,
      line2k_8949_basis_dispositions: lots,
      line2k_8949_capital_audit: {
        transactions: lots.map((row) => ({
          source_transaction_id: row.source_transaction_id,
          part: row.part,
          proceeds: row.proceeds,
          cost_basis: row.regular_basis,
          gain_loss: row.regular_gain,
        })),
        has_other_capital_activity: false,
      },
    }),
  );
  const filed = result.outputs.find((row) => row.nodeType === "form6251")!
    .fields;
  const schedule2Amount = result.outputs.find((row) =>
    row.nodeType === "schedule2"
  )?.fields.line2_amt;
  const pending = {
    f8949: {
      f8949s: lots.map((row) => ({
        source_transaction_id: row.source_transaction_id,
        part: row.part,
        description: "Complete short-term capital lot",
        date_acquired: "2025-02-01",
        date_sold: "2025-06-20",
        proceeds: row.proceeds,
        cost_basis: row.regular_basis,
        amt_cost_basis: row.amt_basis,
      })),
    },
    schedule2: { line2_amt: schedule2Amount },
    f1040: {
      line7_capital_gain: 1_500,
      line11_agi: 200_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 200_000,
      line17_additional_taxes: filed.line11_amt,
    },
  };
  return { filed, pending, schedule2Amount };
}

Deno.test("short-term regular gain becomes fully deductible AMT loss after audited offsets", () => {
  const { filed, pending, schedule2Amount } = shortTermCase();
  assertEquals(filed.net_capital_gain, 0);
  assertEquals(filed.line2k_disposition, -2_600);
  assertEquals(filed.amti, 197_400);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertEquals(schedule2Amount, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<PropertyDispositionAmt>-2600</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)?.line2k_disposition,
    -2_600,
  );
});

Deno.test("short-term gain-to-AMT-loss route rejects basis, return, and incomplete audit", () => {
  const { filed, pending } = shortTermCase();
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: {
          ...pending,
          f8949: {
            f8949s: pending.f8949.f8949s.map((row, index) =>
              index === 1 ? { ...row, amt_cost_basis: 1_501 } : row
            ),
          },
        },
      }),
    Error,
    "retained, unadjusted Form 8949 source",
  );
  assertThrows(
    () =>
      form6251Pdf.projectFields?.(filed, {
        ...pending,
        f1040: { ...pending.f1040, line7_capital_gain: 1_499 },
      }),
    Error,
    "matching Schedule 2 and Form 1040",
  );
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: {
          ...pending,
          f8949: { f8949s: pending.f8949.f8949s.slice(0, 2) },
        },
      }),
    Error,
    "retained, unadjusted Form 8949 source",
  );
});
