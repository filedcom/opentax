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
  source_transaction_id: "broker-st-gain",
  part: "A" as const,
  proceeds: 5_000,
  regular_basis: 4_500,
  amt_basis: 4_300,
  regular_gain: 500,
  amt_gain: 700,
};
const loss = {
  source_transaction_id: "broker-st-loss",
  part: "A" as const,
  proceeds: 4_000,
  regular_basis: 6_000,
  amt_basis: 6_500,
  regular_gain: -2_000,
  amt_gain: -2_500,
};
const input = {
  filing_status: "single",
  regular_tax_income: 200_000,
  regular_tax: 0,
  net_capital_gain: 0,
  line2k_8949_basis_dispositions: [gain, loss],
  line2k_8949_capital_audit: {
    transactions: [{
      source_transaction_id: gain.source_transaction_id,
      part: gain.part,
      proceeds: gain.proceeds,
      cost_basis: gain.regular_basis,
      gain_loss: gain.regular_gain,
    }, {
      source_transaction_id: loss.source_transaction_id,
      part: loss.part,
      proceeds: loss.proceeds,
      cost_basis: loss.regular_basis,
      gain_loss: loss.regular_gain,
    }],
    has_other_capital_activity: false,
  },
};

function compute(raw: unknown) {
  return form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(raw),
  );
}

Deno.test("Form 6251 nets audited same-term gain and loss within both Schedule D limits", () => {
  // Regular Schedule D: +500 - 2,000 = -1,500. AMT Schedule D:
  // +700 - 2,500 = -1,800. Both are fully deductible in the current year.
  const result = compute(input);
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, -300);
  assertEquals(filed?.fields.amti, 199_700);
  assertEquals(filed?.fields.line13, undefined);
  assertStringIncludes(
    mef6251.build(filed!.fields, {
      pending: basisSourcePending(filed!.fields),
    }),
    "<PropertyDispositionAmt>-300</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, {
      ...basisSourcePending(filed!.fields),
      f1040: { line11_agi: 200_000, line14_deductions_qbi_total: 0 },
    })?.line2k_disposition,
    -300,
  );
});

Deno.test("Form 6251 rejects mixed-sign rows when either tax exceeds its loss limit", () => {
  assertThrows(
    () =>
      compute({
        ...input,
        line2k_8949_basis_dispositions: [{
          ...gain,
        }, {
          ...loss,
          amt_basis: 8_000,
          amt_gain: -4_000,
        }],
      }),
    Error,
    "within both regular and AMT Schedule D deduction limits",
  );
  assertThrows(
    () => compute({ ...input, filing_status: "mfs" }),
    Error,
    "within both regular and AMT Schedule D deduction limits",
  );
});

Deno.test("Form 6251 rejects mixed-sign rows with other activity or a basis sign change", () => {
  assertThrows(
    () =>
      compute({
        ...input,
        line2k_8949_capital_audit: {
          ...input.line2k_8949_capital_audit,
          has_other_capital_activity: true,
        },
      }),
    Error,
    "complete Schedule D source audit",
  );
  assertThrows(
    () =>
      compute({
        ...input,
        line2k_8949_basis_dispositions: [gain, {
          ...loss,
          part: "D",
          amt_basis: 3_000,
          amt_gain: 1_000,
        }],
        line2k_8949_capital_audit: {
          ...input.line2k_8949_capital_audit,
          transactions: [input.line2k_8949_capital_audit.transactions[0], {
            ...input.line2k_8949_capital_audit.transactions[1],
            part: "D",
          }],
        },
      }),
    Error,
    "one term of identified losses",
  );
});

Deno.test("Form 6251 replays a cross-term offset with fully deductible regular and AMT losses", () => {
  for (
    const [shortPart, longPart] of [
      [loss, { ...gain, part: "D" as const }],
      [gain, { ...loss, part: "D" as const }],
    ]
  ) {
    const rows = [shortPart, longPart];
    const caseInput = {
      ...input,
      line2k_8949_basis_dispositions: rows,
      line2k_8949_capital_audit: {
        transactions: rows.map((row) => ({
          source_transaction_id: row.source_transaction_id,
          part: row.part,
          proceeds: row.proceeds,
          cost_basis: row.regular_basis,
          gain_loss: row.regular_gain,
        })),
        has_other_capital_activity: false,
      },
    };
    const result = compute(caseInput);
    const filed = result.outputs.find((row) => row.nodeType === "form6251");
    const regularLoss = rows.reduce((sum, row) => sum + row.regular_gain, 0);
    const amtLoss = rows.reduce((sum, row) => sum + row.amt_gain, 0);
    assertEquals(regularLoss, -1_500);
    assertEquals(amtLoss, -1_800);
    assertEquals(filed?.fields.line2k_disposition, -300);
    assertEquals(filed?.fields.line13, undefined);
    const pending = {
      ...basisSourcePending(filed!.fields),
      schedule2: { line2_amt: filed!.fields.line11_amt },
      f1040: {
        line2a_tax_exempt: 0,
        line7_capital_gain: regularLoss,
        line11_agi: 200_000,
        line14_deductions_qbi_total: 0,
        line17_additional_taxes: filed!.fields.line11_amt,
      },
    };
    assertStringIncludes(
      mef6251.build(filed!.fields, { pending }),
      "<PropertyDispositionAmt>-300</PropertyDispositionAmt>",
    );
    assertEquals(
      form6251Pdf.projectFields?.(filed!.fields, pending)
        ?.line2k_disposition,
      -300,
    );
    assertThrows(
      () =>
        mef6251.build(filed!.fields, {
          pending: {
            ...pending,
            f1040: { ...pending.f1040, line7_capital_gain: -1_400 },
          },
        }),
      Error,
      "cross-term basis loss",
    );
  }
});

Deno.test("Form 6251 rejects a cross-term offset once the AMT loss exceeds the current limit", () => {
  const longGain = { ...gain, part: "D" as const };
  const deepAmtLoss = {
    ...loss,
    amt_basis: 8_000,
    amt_gain: -4_000,
  };
  assertThrows(
    () =>
      compute({
        ...input,
        line2k_8949_basis_dispositions: [deepAmtLoss, longGain],
        line2k_8949_capital_audit: {
          transactions: [deepAmtLoss, longGain].map((row) => ({
            source_transaction_id: row.source_transaction_id,
            part: row.part,
            proceeds: row.proceeds,
            cost_basis: row.regular_basis,
            gain_loss: row.regular_gain,
          })),
          has_other_capital_activity: false,
        },
      }),
    Error,
    "one term of identified losses",
  );
});

Deno.test("Form 6251 reconciles four audited cross-term gain and loss lots inside both capital-loss limits", () => {
  const longGain = {
    source_transaction_id: "broker-lt-gain",
    part: "D" as const,
    proceeds: 2_000,
    regular_basis: 1_700,
    amt_basis: 1_800,
    regular_gain: 300,
    amt_gain: 200,
  };
  const longLoss = {
    source_transaction_id: "broker-lt-loss",
    part: "D" as const,
    proceeds: 3_000,
    regular_basis: 3_500,
    amt_basis: 3_600,
    regular_gain: -500,
    amt_gain: -600,
  };
  const rows = [gain, loss, longGain, longLoss];
  const caseInput = {
    ...input,
    line2k_8949_basis_dispositions: rows,
    line2k_8949_capital_audit: {
      transactions: rows.map((row) => ({
        source_transaction_id: row.source_transaction_id,
        part: row.part,
        proceeds: row.proceeds,
        cost_basis: row.regular_basis,
        gain_loss: row.regular_gain,
      })),
      has_other_capital_activity: false,
    },
  };
  const result = compute(caseInput);
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, -500);
  assertEquals(filed?.fields.line13, undefined);
  const pending = {
    ...basisSourcePending(filed!.fields),
    schedule2: { line2_amt: filed!.fields.line11_amt },
    f1040: {
      line2a_tax_exempt: 0,
      line7_capital_gain: -1_700,
      line11_agi: 200_000,
      line14_deductions_qbi_total: 0,
      line17_additional_taxes: filed!.fields.line11_amt,
    },
  };
  assertStringIncludes(
    mef6251.build(filed!.fields, { pending }),
    "<PropertyDispositionAmt>-500</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, pending)?.line2k_disposition,
    -500,
  );
  assertThrows(
    () => compute({ ...caseInput, filing_status: "mfs" }),
    Error,
    "within both regular and AMT Schedule D deduction limits",
  );
  assertThrows(
    () =>
      mef6251.build(filed!.fields, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line7_capital_gain: -1_699 },
        },
      }),
    Error,
    "cross-term basis loss",
  );
});
