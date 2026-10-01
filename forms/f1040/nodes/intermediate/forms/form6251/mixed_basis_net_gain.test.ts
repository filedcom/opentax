import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 as mef6251 } from "../../../../2025/mef/forms/f6251.ts";
import { form6251Pdf } from "../../../../2025/pdf/forms/f6251.ts";
import { form6251, inputSchema } from "./index.ts";

function basisSourcePending(
  fields: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const raw = fields.line2k_8949_basis_dispositions;
  if (raw === undefined) return {};
  const rows = Array.isArray(raw) ? raw : [raw];
  return {
    f8949: {
      f8949s: rows.map((row: {
        source_transaction_id: string;
        part: string;
        proceeds: number;
        regular_basis: number;
        amt_basis: number;
      }) => ({
        source_transaction_id: row.source_transaction_id,
        part: row.part,
        description: "Synthetic AMT basis disposition",
        date_acquired: ["A", "B", "C"].includes(row.part)
          ? "2025-01-10"
          : "2022-01-10",
        date_sold: "2025-06-20",
        proceeds: row.proceeds,
        cost_basis: row.regular_basis,
        amt_cost_basis: row.amt_basis,
      })),
    },
  };
}

const gain = {
  source_transaction_id: "short-gain",
  part: "A" as const,
  proceeds: 8_000,
  regular_basis: 5_000,
  amt_basis: 4_500,
  regular_gain: 3_000,
  amt_gain: 3_500,
};
const loss = {
  source_transaction_id: "short-loss",
  part: "B" as const,
  proceeds: 4_000,
  regular_basis: 5_000,
  amt_basis: 5_200,
  regular_gain: -1_000,
  amt_gain: -1_200,
};
const input = {
  filing_status: "single",
  regular_tax_income: 200_000,
  regular_tax: 0,
  net_capital_gain: 0,
  line2k_8949_basis_dispositions: [gain, loss],
  line2k_8949_capital_audit: {
    transactions: [gain, loss].map((row) => ({
      source_transaction_id: row.source_transaction_id,
      part: row.part,
      proceeds: row.proceeds,
      cost_basis: row.regular_basis,
      gain_loss: row.regular_gain,
    })),
    has_other_capital_activity: false,
  },
};

function compute(raw: unknown) {
  return form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(raw),
  );
}

Deno.test("Form 6251 nets audited short-term gains and losses without creating preferential gain", () => {
  // Regular Schedule D net: +3,000 - 1,000 = +2,000.
  // AMT Schedule D net: +3,500 - 1,200 = +2,300.
  const result = compute(input);
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, 300);
  assertEquals(filed?.fields.amti, 200_300);
  assertEquals(filed?.fields.line13, undefined);
  assertStringIncludes(
    mef6251.build(filed!.fields, {
      pending: basisSourcePending(filed!.fields),
    }),
    "<PropertyDispositionAmt>300</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, {
      ...basisSourcePending(filed!.fields),
      f1040: { line11_agi: 200_000, line14_deductions_qbi_total: 0 },
    })?.line2k_disposition,
    300,
  );
});

Deno.test("Form 6251 short-term mixed-sign net gain rejects unsupported Schedule D refigures", () => {
  const unsupported: Array<[unknown, string]> = [
    [{ ...input, qualified_dividends: 100 }, "no preferential-rate"],
    [{ ...input, form4952_regular_election: 100 }, "no preferential-rate"],
    [
      { ...input, net_capital_gain: 100 },
      "regular Schedule D net capital gain",
    ],
    [{
      ...input,
      line2k_8949_capital_audit: {
        ...input.line2k_8949_capital_audit,
        has_other_capital_activity: true,
      },
    }, "complete Schedule D source audit"],
    [{
      ...input,
      line2k_8949_basis_dispositions: [gain, {
        ...loss,
        part: "D" as const,
      }],
    }, "one term of identified losses"],
    [{
      ...input,
      line2k_8949_basis_dispositions: [gain, {
        ...loss,
        amt_basis: 9_000,
        amt_gain: -5_000,
      }],
    }, "net losses within both regular and AMT Schedule D deduction limits"],
    [{
      ...input,
      line2k_8949_basis_dispositions: [gain, {
        ...loss,
        amt_basis: 7_500,
        amt_gain: -3_500,
      }],
    }, "net positive short-term gains"],
    [{
      ...input,
      line2k_8949_basis_dispositions: [gain, {
        ...loss,
        amt_basis: 3_500,
        amt_gain: 500,
      }],
    }, "one term of identified losses"],
  ];
  for (const [candidate, reason] of unsupported) {
    assertThrows(() => compute(candidate), Error, reason);
  }
});

Deno.test("Form 6251 short-term mixed-sign rows retain a zero difference", () => {
  const result = compute({
    ...input,
    line2k_8949_basis_dispositions: [
      gain,
      { ...loss, amt_basis: 5_500, amt_gain: -1_500 },
    ],
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, 0);
  assertEquals(filed?.fields.amti, 200_000);
});

Deno.test("Form 6251 nets audited long-term gains and losses for AMT Part III", () => {
  const longGain = {
    ...gain,
    source_transaction_id: "long-gain",
    part: "D" as const,
  };
  const longLoss = {
    ...loss,
    source_transaction_id: "long-loss",
    part: "E" as const,
  };
  const longInput = {
    ...input,
    regular_taxable_income: 200_000,
    net_capital_gain: 2_000,
    line2k_8949_basis_dispositions: [longGain, longLoss],
    line2k_8949_capital_audit: {
      transactions: [longGain, longLoss].map((row) => ({
        source_transaction_id: row.source_transaction_id,
        part: row.part,
        proceeds: row.proceeds,
        cost_basis: row.regular_basis,
        gain_loss: row.regular_gain,
      })),
      has_other_capital_activity: false,
    },
  };
  const result = compute(longInput);
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, 300);
  assertEquals(filed?.fields.amti, 200_300);
  assertEquals(filed?.fields.line13, 2_300);
  assertEquals(filed?.fields.line15, 2_300);
  assertStringIncludes(
    mef6251.build(filed!.fields, {
      pending: basisSourcePending(filed!.fields),
    }),
    "<CapitalGainsWorksheetAmt>2300</CapitalGainsWorksheetAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, {
      ...basisSourcePending(filed!.fields),
      f1040: { line11_agi: 200_000, line14_deductions_qbi_total: 0 },
    })?.line13,
    2_300,
  );
  assertThrows(
    () => compute({ ...longInput, net_capital_gain: 0 }),
    Error,
    "regular Schedule D net capital gain",
  );
  assertThrows(
    () => compute({ ...longInput, qualified_dividends: 100 }),
    Error,
    "no preferential-rate extras",
  );
  assertThrows(
    () =>
      compute({
        ...longInput,
        line2k_8949_capital_audit: {
          ...longInput.line2k_8949_capital_audit,
          transactions: [
            longInput.line2k_8949_capital_audit.transactions[0],
            longInput.line2k_8949_capital_audit.transactions[0],
          ],
        },
      }),
    Error,
    "complete Schedule D source audit",
  );
  assertThrows(
    () =>
      compute({
        ...longInput,
        line2k_8949_basis_dispositions: [longGain, {
          ...longLoss,
          amt_basis: 9_000,
          amt_gain: -5_000,
        }],
      }),
    Error,
    "net positive long-term gains",
  );
});
