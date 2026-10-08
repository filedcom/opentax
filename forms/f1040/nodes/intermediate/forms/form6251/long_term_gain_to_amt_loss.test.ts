import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 as mef6251 } from "../../../../2025/mef/forms/taxes/f6251.ts";
import { form6251Pdf } from "../../../../2025/pdf/forms/taxes/f6251.ts";
import { form6251, inputSchema } from "./index.ts";

const sale = {
  source_transaction_id: "2025-broker-lot",
  part: "D" as const,
  proceeds: 5_000,
  regular_basis: 4_000,
  amt_basis: 5_500,
  regular_gain: 1_000,
  amt_gain: -500,
};

const input = {
  filing_status: "single",
  regular_tax_income: 200_000,
  regular_taxable_income: 200_000,
  regular_tax: 0,
  net_capital_gain: 1_000,
  line2k_8949_basis_dispositions: [sale],
  line2k_8949_capital_audit: {
    transactions: [{
      source_transaction_id: sale.source_transaction_id,
      part: sale.part,
      proceeds: sale.proceeds,
      cost_basis: sale.regular_basis,
      gain_loss: sale.regular_gain,
    }],
    has_other_capital_activity: false,
  },
};

function gainToLossCase() {
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
      f8949s: [{
        source_transaction_id: sale.source_transaction_id,
        part: sale.part,
        description: "Audited long-term capital lot",
        date_acquired: "2022-01-10",
        date_sold: "2025-06-20",
        proceeds: sale.proceeds,
        cost_basis: sale.regular_basis,
        amt_cost_basis: sale.amt_basis,
      }],
    },
    schedule2: { line2_amt: schedule2Amount },
    f1040: {
      line7_capital_gain: 1_000,
      line11_agi: 200_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 200_000,
      line17_additional_taxes: filed.line11_amt,
    },
  };
  return { filed, pending, schedule2Amount };
}

const secondLoss = {
  source_transaction_id: "2025-broker-loss-lot",
  part: "E" as const,
  proceeds: 1_000,
  regular_basis: 1_500,
  amt_basis: 1_700,
  regular_gain: -500,
  amt_gain: -700,
};
const twoLotGain = { ...sale, regular_basis: 3_000, regular_gain: 2_000 };
const twoLots = [twoLotGain, secondLoss];
const twoLotInput = {
  ...input,
  net_capital_gain: 1_500,
  line2k_8949_basis_dispositions: twoLots,
  line2k_8949_capital_audit: {
    transactions: twoLots.map((row) => ({
      source_transaction_id: row.source_transaction_id,
      part: row.part,
      proceeds: row.proceeds,
      cost_basis: row.regular_basis,
      gain_loss: row.regular_gain,
    })),
    has_other_capital_activity: false,
  },
};

function twoLotCase() {
  const result = form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(twoLotInput),
  );
  const filed = result.outputs.find((row) => row.nodeType === "form6251")!
    .fields;
  const schedule2Amount = result.outputs.find((row) =>
    row.nodeType === "schedule2"
  )?.fields.line2_amt;
  const pending = {
    f8949: {
      f8949s: twoLots.map((row) => ({
        source_transaction_id: row.source_transaction_id,
        part: row.part,
        description: "Audited long-term capital lot",
        date_acquired: "2022-01-10",
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

Deno.test("one long-term regular gain becomes fully deductible AMT loss on line 2k", () => {
  const { filed, pending, schedule2Amount } = gainToLossCase();
  assertEquals(filed.line2k_disposition, -1_500);
  assertEquals(filed.amti, 198_500);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertEquals(schedule2Amount, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<PropertyDispositionAmt>-1500</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)?.line2k_disposition,
    -1_500,
  );
});

Deno.test("gain-to-AMT-loss route rejects changed basis, tax join and excess AMT loss", () => {
  const { filed, pending } = gainToLossCase();
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: {
          ...pending,
          f8949: {
            f8949s: [{
              ...pending.f8949.f8949s[0],
              amt_cost_basis: 5_501,
            }],
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
          f1040: { ...pending.f1040, line7_capital_gain: 999 },
        },
      }),
    Error,
    "matching Schedule 2 and Form 1040",
  );
  assertThrows(
    () =>
      form6251.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse({
          ...input,
          line2k_8949_basis_dispositions: [{
            ...sale,
            amt_basis: 8_001,
            amt_gain: -3_001,
          }],
        }),
      ),
    Error,
    "AMT basis losses need audited",
  );
  assertThrows(
    () =>
      form6251.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse({
          ...input,
          line2k_8949_basis_dispositions: [{ ...sale, part: "A" }],
          line2k_8949_capital_audit: {
            ...input.line2k_8949_capital_audit,
            transactions: [{
              ...input.line2k_8949_capital_audit.transactions[0],
              part: "A",
            }],
          },
        }),
      ),
    Error,
    "identified rows to reconcile with regular Schedule D",
  );
});

Deno.test("two long-term lots net regular gain against a deductible AMT loss", () => {
  const { filed, pending, schedule2Amount } = twoLotCase();
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

Deno.test("two-lot gain-to-AMT-loss route rejects changed second lot and return", () => {
  const { filed, pending } = twoLotCase();
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: {
          ...pending,
          f8949: {
            f8949s: [
              pending.f8949.f8949s[0],
              { ...pending.f8949.f8949s[1], amt_cost_basis: 1_701 },
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
        f1040: { ...pending.f1040, line7_capital_gain: 1_000 },
      }),
    Error,
    "matching Schedule 2 and Form 1040",
  );
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: { ...pending, schedule2: { line2_amt: 0 } },
      }),
    Error,
    "matching Schedule 2 and Form 1040",
  );
  assertThrows(
    () =>
      form6251.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse({
          ...twoLotInput,
          line2k_8949_basis_dispositions: [twoLotGain, {
            ...secondLoss,
            amt_basis: 3_501,
            amt_gain: -2_501,
          }],
        }),
      ),
    Error,
    "AMT basis losses need audited",
  );
});

const thirdLoss = {
  source_transaction_id: "2025-broker-third-loss-lot",
  part: "F" as const,
  proceeds: 1_000,
  regular_basis: 1_400,
  amt_basis: 1_600,
  regular_gain: -400,
  amt_gain: -600,
};

Deno.test("three audited long-term lots reconcile regular gain and deductible AMT loss", () => {
  const lots = [...twoLots, thirdLoss];
  const result = form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({
      ...twoLotInput,
      net_capital_gain: 1_100,
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
        description: "Audited long-term capital lot",
        date_acquired: "2022-01-10",
        date_sold: "2025-06-20",
        proceeds: row.proceeds,
        cost_basis: row.regular_basis,
        amt_cost_basis: row.amt_basis,
      })),
    },
    schedule2: { line2_amt: schedule2Amount },
    f1040: {
      line7_capital_gain: 1_100,
      line11_agi: 200_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 200_000,
      line17_additional_taxes: filed.line11_amt,
    },
  };
  assertEquals(filed.line2k_disposition, -2_900);
  assertEquals(filed.amti, 197_100);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertEquals(schedule2Amount, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<PropertyDispositionAmt>-2900</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)?.line2k_disposition,
    -2_900,
  );
  assertThrows(
    () =>
      mef6251.build(filed, {
        pending: {
          ...pending,
          f8949: {
            f8949s: pending.f8949.f8949s.map((row, index) =>
              index === 2 ? { ...row, amt_cost_basis: 1_601 } : row
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
        f1040: { ...pending.f1040, line7_capital_gain: 1_500 },
      }),
    Error,
    "matching Schedule 2 and Form 1040",
  );
});
