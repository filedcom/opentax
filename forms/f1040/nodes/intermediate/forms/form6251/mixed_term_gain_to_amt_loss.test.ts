import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 as mef6251 } from "../../../../2025/mef/forms/f6251.ts";
import { form6251Pdf } from "../../../../2025/pdf/forms/f6251.ts";
import { form6251, inputSchema } from "./index.ts";

const shortLoss = {
  source_transaction_id: "2025-short-loss-lot",
  part: "A" as const,
  proceeds: 1_000,
  regular_basis: 1_500,
  amt_basis: 1_700,
  regular_gain: -500,
  amt_gain: -700,
};
const longGainToLoss = {
  source_transaction_id: "2025-long-gain-amt-loss-lot",
  part: "D" as const,
  proceeds: 5_000,
  regular_basis: 3_000,
  amt_basis: 5_500,
  regular_gain: 2_000,
  amt_gain: -500,
};
const lots = [shortLoss, longGainToLoss];
const input = {
  filing_status: "single",
  regular_tax_income: 200_000,
  regular_taxable_income: 200_000,
  regular_tax: 0,
  net_capital_gain: 1_500,
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
};

function mixedTermCase() {
  const result = form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
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
        description: "Audited 2025 capital lot",
        date_acquired: row.part === "A" ? "2025-02-01" : "2022-01-10",
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

Deno.test("mixed-term short loss offsets regular long gain that becomes AMT net loss", () => {
  const { filed, pending, schedule2Amount } = mixedTermCase();
  assertEquals(filed.net_capital_gain, 1_500);
  assertEquals(filed.line2k_disposition, -2_700);
  assertEquals(filed.amti, 197_300);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertEquals(schedule2Amount, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<PropertyDispositionAmt>-2700</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)?.line2k_disposition,
    -2_700,
  );
});

Deno.test("mixed-term gain-to-AMT-loss route rejects altered sources and return", () => {
  const { filed, pending } = mixedTermCase();
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: {
          ...pending,
          f8949: {
            f8949s: [
              { ...pending.f8949.f8949s[0], amt_cost_basis: 1_701 },
              pending.f8949.f8949s[1],
            ],
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
        schedule2: { line2_amt: 0 },
      }),
    Error,
    "matching Schedule 2 and Form 1040",
  );
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line7_capital_gain: 1_499 },
        },
      }),
    Error,
    "matching Schedule 2 and Form 1040",
  );
  assertThrows(
    () =>
      form6251.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse({ ...input, net_capital_gain: 0 }),
      ),
    Error,
    "regular Schedule D net capital gain",
  );
  assertThrows(
    () =>
      form6251.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse({
          ...input,
          line2k_8949_basis_dispositions: [shortLoss, {
            ...longGainToLoss,
            amt_basis: 7_301,
            amt_gain: -2_301,
          }],
        }),
      ),
    Error,
    "AMT basis losses need audited",
  );
});

Deno.test("audited short-term losses offset one long-term regular gain that becomes AMT loss", () => {
  const auditedLots = [
    {
      source_transaction_id: "2025-short-loss-a",
      part: "A" as const,
      proceeds: 1_000,
      regular_basis: 1_300,
      amt_basis: 1_350,
      regular_gain: -300,
      amt_gain: -350,
    },
    {
      source_transaction_id: "2025-short-loss-b",
      part: "B" as const,
      proceeds: 1_000,
      regular_basis: 1_400,
      amt_basis: 1_450,
      regular_gain: -400,
      amt_gain: -450,
    },
    {
      source_transaction_id: "2025-short-loss-c",
      part: "C" as const,
      proceeds: 1_000,
      regular_basis: 1_500,
      amt_basis: 1_550,
      regular_gain: -500,
      amt_gain: -550,
    },
    {
      source_transaction_id: "2025-long-gain-amt-loss",
      part: "D" as const,
      proceeds: 5_000,
      regular_basis: 2_000,
      amt_basis: 5_400,
      regular_gain: 3_000,
      amt_gain: -400,
    },
  ];
  const result = form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({
      ...input,
      net_capital_gain: 1_800,
      line2k_8949_basis_dispositions: auditedLots,
      line2k_8949_capital_audit: {
        transactions: auditedLots.map((row) => ({
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
      f8949s: auditedLots.map((row) => ({
        source_transaction_id: row.source_transaction_id,
        part: row.part,
        description: "Complete 2025 Schedule D lot",
        date_acquired: row.part === "D" ? "2022-01-10" : "2025-02-01",
        date_sold: "2025-06-20",
        proceeds: row.proceeds,
        cost_basis: row.regular_basis,
        amt_cost_basis: row.amt_basis,
      })),
    },
    schedule2: { line2_amt: schedule2Amount },
    f1040: {
      line7_capital_gain: 1_800,
      line11_agi: 200_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 200_000,
      line17_additional_taxes: filed.line11_amt,
    },
  };
  assertEquals(filed.line2k_disposition, -3_550);
  assertEquals(filed.amti, 196_450);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertEquals(schedule2Amount, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<PropertyDispositionAmt>-3550</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)?.line2k_disposition,
    -3_550,
  );
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: {
          ...pending,
          f8949: {
            f8949s: pending.f8949.f8949s.map((row, index) =>
              index === 2 ? { ...row, amt_cost_basis: 1_551 } : row
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
        f1040: { ...pending.f1040, line7_capital_gain: 1_799 },
      }),
    Error,
    "matching Schedule 2 and Form 1040",
  );
});
