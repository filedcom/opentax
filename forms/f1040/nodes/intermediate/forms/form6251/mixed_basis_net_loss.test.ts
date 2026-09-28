import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 as mef6251 } from "../../../../2025/mef/forms/f6251.ts";
import { form6251Pdf } from "../../../../2025/pdf/forms/f6251.ts";
import { form6251, inputSchema } from "./index.ts";

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
    mef6251.build(filed!.fields),
    "<PropertyDispositionAmt>-300</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, {
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

Deno.test("Form 6251 rejects mixed-sign rows with other Schedule D activity or mixed terms", () => {
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
        line2k_8949_basis_dispositions: [gain, { ...loss, part: "D" }],
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
