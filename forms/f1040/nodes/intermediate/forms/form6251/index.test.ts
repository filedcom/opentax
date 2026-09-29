import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import { form6251, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form6251 as mef6251 } from "../../../../2025/mef/forms/f6251.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { form2555 } from "../form2555/index.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import { form4952 } from "../form4952/index.ts";
import { form6251Pdf } from "../../../../2025/pdf/forms/f6251.ts";

function compute(input: Record<string, unknown>) {
  return form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

const amtBasisCapitalAudit = {
  transactions: [{
    source_transaction_id: "broker-2025-1",
    part: "D",
    proceeds: 75_000,
    cost_basis: 25_000,
    gain_loss: 50_000,
  }],
  has_other_capital_activity: false,
};

Deno.test("form6251: identified Form 8949 basis gain refigures line 2k and Part III", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    regular_tax: 10_000,
    net_capital_gain: 50_000,
    line2k_8949_capital_audit: amtBasisCapitalAudit,
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-2025-1",
      part: "D",
      proceeds: 75_000,
      regular_basis: 25_000,
      amt_basis: 35_000,
      regular_gain: 50_000,
      amt_gain: 40_000,
    },
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, -10_000);
  assertEquals(filed?.fields.amti, 190_000);
  assertEquals(filed?.fields.line13, 40_000);
  assertEquals(filed?.fields.line20, 150_000);
  assertEquals(filed?.fields.line27, 150_000);
});

Deno.test("form6251: Form 8949 AMT basis requires intact rows and regular Schedule D reconciliation", () => {
  const base = {
    filing_status: FilingStatus.Single,
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    regular_tax: 10_000,
    net_capital_gain: 50_000,
    line2k_8949_capital_audit: amtBasisCapitalAudit,
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-2025-1",
      part: "D",
      proceeds: 75_000,
      regular_basis: 25_000,
      amt_basis: 35_000,
      regular_gain: 50_000,
      amt_gain: 40_000,
    },
  };
  assertThrows(
    () => compute({ ...base, net_capital_gain: 49_000 }),
    Error,
    "regular Schedule D net capital gain",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        line2k_8949_basis_dispositions: {
          ...base.line2k_8949_basis_dispositions,
          amt_gain: 39_000,
        },
      }),
    Error,
    "gains must reconcile",
  );
  assertThrows(
    () => compute({ ...base, form4952_amt_election: 1_000 }),
    Error,
    "with no other capital activity, Form 4952",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        line2k_8949_capital_audit: {
          ...amtBasisCapitalAudit,
          has_other_capital_activity: true,
        },
      }),
    Error,
    "complete Schedule D source audit",
  );
  assertThrows(
    () => compute({ ...base, line2k_8949_capital_audit: undefined }),
    Error,
    "complete Schedule D source audit",
  );
});

Deno.test("form6251: identified short-term AMT basis gain changes line 2k without Part III", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 0,
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: "broker-st-1",
        part: "A",
        proceeds: 75_000,
        cost_basis: 25_000,
        gain_loss: 50_000,
      }],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-st-1",
      part: "A",
      proceeds: 75_000,
      regular_basis: 25_000,
      amt_basis: 35_000,
      regular_gain: 50_000,
      amt_gain: 40_000,
    },
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, -10_000);
  assertEquals(filed?.fields.amti, 190_000);
  assertEquals(filed?.fields.line13, undefined);
  assertEquals(filed?.fields.line15, undefined);
});

Deno.test("form6251: audited short-term basis loss below both deduction limits reaches line 2k", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 0,
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: "broker-st-loss",
        part: "A",
        proceeds: 5_000,
        cost_basis: 6_000,
        gain_loss: -1_000,
      }],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-st-loss",
      part: "A",
      proceeds: 5_000,
      regular_basis: 6_000,
      amt_basis: 6_500,
      regular_gain: -1_000,
      amt_gain: -1_500,
    },
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, -500);
  assertEquals(filed?.fields.amti, 199_500);
  assertEquals(filed?.fields.line13, undefined);
  assertStringIncludes(
    mef6251.build(filed!.fields),
    "<PropertyDispositionAmt>-500</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, {
      f1040: {
        line11_agi: 200_000,
        line14_deductions_qbi_total: 0,
      },
    })?.line2k_disposition,
    -500,
  );
});

Deno.test("form6251: audited long-term basis loss below both deduction limits reaches line 2k", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 0,
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: "broker-lt-loss",
        part: "D",
        proceeds: 5_000,
        cost_basis: 6_000,
        gain_loss: -1_000,
      }],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-lt-loss",
      part: "D",
      proceeds: 5_000,
      regular_basis: 6_000,
      amt_basis: 6_500,
      regular_gain: -1_000,
      amt_gain: -1_500,
    },
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, -500);
  assertEquals(filed?.fields.amti, 199_500);
  assertEquals(filed?.fields.line13, undefined);
  assertStringIncludes(
    mef6251.build(filed!.fields),
    "<PropertyDispositionAmt>-500</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, {
      f1040: { line11_agi: 200_000, line14_deductions_qbi_total: 0 },
    })?.line2k_disposition,
    -500,
  );
});

Deno.test("form6251: long-term AMT loss limit and mixed terms stop", () => {
  const base = {
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 0,
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: "broker-lt-loss",
        part: "D",
        proceeds: 5_000,
        cost_basis: 7_000,
        gain_loss: -2_000,
      }],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-lt-loss",
      part: "D",
      proceeds: 5_000,
      regular_basis: 7_000,
      amt_basis: 8_100,
      regular_gain: -2_000,
      amt_gain: -3_100,
    },
  };
  assertThrows(
    () => compute(base),
    Error,
    "within both regular and AMT Schedule D deduction limits",
  );
  assertThrows(
    () => compute({ ...base, filing_status: "mfs" }),
    Error,
    "within both regular and AMT Schedule D deduction limits",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        line2k_8949_capital_audit: {
          ...base.line2k_8949_capital_audit,
          has_other_capital_activity: true,
        },
      }),
    Error,
    "within both regular and AMT Schedule D deduction limits",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        line2k_8949_capital_audit: {
          transactions: [
            {
              source_transaction_id: "broker-lt-loss",
              part: "D",
              proceeds: 5_000,
              cost_basis: 6_000,
              gain_loss: -1_000,
            },
            {
              source_transaction_id: "broker-st-loss",
              part: "A",
              proceeds: 1_000,
              cost_basis: 1_500,
              gain_loss: -500,
            },
          ],
          has_other_capital_activity: false,
        },
        line2k_8949_basis_dispositions: [
          {
            source_transaction_id: "broker-lt-loss",
            part: "D",
            proceeds: 5_000,
            regular_basis: 6_000,
            amt_basis: 6_500,
            regular_gain: -1_000,
            amt_gain: -1_500,
          },
          {
            source_transaction_id: "broker-st-loss",
            part: "A",
            proceeds: 1_000,
            regular_basis: 1_500,
            amt_basis: 1_500,
            regular_gain: -500,
            amt_gain: -500,
          },
        ],
      }),
    Error,
    "one term of identified losses",
  );
});

Deno.test("form6251: short-term AMT losses crossing either Schedule D limit stop", () => {
  const base = {
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 0,
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: "broker-st-loss",
        part: "A",
        proceeds: 5_000,
        cost_basis: 7_000,
        gain_loss: -2_000,
      }],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-st-loss",
      part: "A",
      proceeds: 5_000,
      regular_basis: 7_000,
      amt_basis: 8_100,
      regular_gain: -2_000,
      amt_gain: -3_100,
    },
  };
  assertThrows(
    () => compute(base),
    Error,
    "within both regular and AMT Schedule D deduction limits",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        filing_status: "mfs",
        line2k_8949_basis_dispositions: {
          ...base.line2k_8949_basis_dispositions,
          amt_basis: 7_500,
          amt_gain: -2_500,
        },
      }),
    Error,
    "within both regular and AMT Schedule D deduction limits",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        line2k_8949_capital_audit: {
          ...base.line2k_8949_capital_audit,
          has_other_capital_activity: true,
        },
        line2k_8949_basis_dispositions: {
          ...base.line2k_8949_basis_dispositions,
          amt_basis: 7_500,
          amt_gain: -2_500,
        },
      }),
    Error,
    "complete Schedule D source audit",
  );
});

Deno.test("form6251: a positive short-term AMT basis adjustment does not create preferential capital gain", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 0,
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: "broker-st-2",
        part: "A",
        proceeds: 75_000,
        cost_basis: 25_000,
        gain_loss: 50_000,
      }],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-st-2",
      part: "A",
      proceeds: 75_000,
      regular_basis: 25_000,
      amt_basis: 15_000,
      regular_gain: 50_000,
      amt_gain: 60_000,
    },
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, 10_000);
  assertEquals(filed?.fields.amti, 210_000);
  assertEquals(filed?.fields.line13, undefined);
  assertEquals(filed?.fields.line15, undefined);
});

Deno.test("form6251: audited short-term AMT basis and qualified dividends use Part III without capital gain", () => {
  const base = {
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    regular_tax: 0,
    qualified_dividends: 10_000,
    net_capital_gain: 0,
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: "broker-st-div-1",
        part: "A",
        proceeds: 75_000,
        cost_basis: 25_000,
        gain_loss: 50_000,
      }],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-st-div-1",
      part: "A",
      proceeds: 75_000,
      regular_basis: 25_000,
      amt_basis: 35_000,
      regular_gain: 50_000,
      amt_gain: 40_000,
    },
  };
  const result = compute(base);
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, -10_000);
  assertEquals(filed?.fields.amti, 190_000);
  assertEquals(filed?.fields.line13, 10_000);
  assertEquals(filed?.fields.line15, 10_000);
  assertEquals(filed?.fields.line20, 190_000);
  assertEquals(filed?.fields.line27, 190_000);
  assertStringIncludes(
    mef6251.build(filed!.fields),
    "<CapitalGainsWorksheetAmt>10000</CapitalGainsWorksheetAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, {
      f1040: { line11_agi: 200_000, line14_deductions_qbi_total: 0 },
    })?.line13,
    10_000,
  );
  assertThrows(
    () => compute({ ...base, regular_taxable_income: 9_999 }),
    Error,
    "dividend amount within regular and AMT taxable income",
  );
  assertThrows(
    () => compute({ ...base, regular_tax_income: 90_000 }),
    Error,
    "dividend amount within regular and AMT taxable income",
  );
});

Deno.test("form6251: audited mixed Form 8949 basis gains keep short-term gain out of Part III", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 50_000,
    line2k_8949_capital_audit: {
      transactions: [
        {
          source_transaction_id: "broker-st-3",
          part: "A",
          proceeds: 30_000,
          cost_basis: 10_000,
          gain_loss: 20_000,
        },
        {
          source_transaction_id: "broker-lt-3",
          part: "D",
          proceeds: 75_000,
          cost_basis: 25_000,
          gain_loss: 50_000,
        },
      ],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: [
      {
        source_transaction_id: "broker-st-3",
        part: "A",
        proceeds: 30_000,
        regular_basis: 10_000,
        amt_basis: 15_000,
        regular_gain: 20_000,
        amt_gain: 15_000,
      },
      {
        source_transaction_id: "broker-lt-3",
        part: "D",
        proceeds: 75_000,
        regular_basis: 25_000,
        amt_basis: 35_000,
        regular_gain: 50_000,
        amt_gain: 40_000,
      },
    ],
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2k_disposition, -15_000);
  assertEquals(filed?.fields.amti, 185_000);
  assertEquals(filed?.fields.line13, 40_000);
  assertEquals(filed?.fields.line20, 150_000);
  assertEquals(filed?.fields.line27, 150_000);
  assertStringIncludes(
    mef6251.build(filed!.fields),
    "<PropertyDispositionAmt>-15000</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed!.fields, {
      f1040: { line11_agi: 200_000, line14_deductions_qbi_total: 0 },
    })?.line13,
    40_000,
  );
});

Deno.test("form6251: short-term AMT basis rejects unaudited capital activity and Form 4952", () => {
  const base = {
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 0,
    net_capital_gain: 0,
    line2k_8949_capital_audit: {
      transactions: [{
        source_transaction_id: "broker-st-1",
        part: "A",
        proceeds: 75_000,
        cost_basis: 25_000,
        gain_loss: 50_000,
      }],
      has_other_capital_activity: false,
    },
    line2k_8949_basis_dispositions: {
      source_transaction_id: "broker-st-1",
      part: "A",
      proceeds: 75_000,
      regular_basis: 25_000,
      amt_basis: 35_000,
      regular_gain: 50_000,
      amt_gain: 40_000,
    },
  };
  assertThrows(
    () => compute({ ...base, net_capital_gain: 50_000 }),
    Error,
    "identified rows to reconcile with regular Schedule D net capital gain",
  );
  assertThrows(
    () => compute({ ...base, form4952_regular_election: 100 }),
    Error,
    "with no other capital activity, Form 4952",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        line2k_8949_capital_audit: {
          ...base.line2k_8949_capital_audit,
          transactions: [{
            ...base.line2k_8949_capital_audit.transactions[0],
            part: "D",
          }],
        },
      }),
    Error,
    "complete Schedule D source audit",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        line2k_8949_capital_audit: {
          ...base.line2k_8949_capital_audit,
          has_other_capital_activity: true,
        },
      }),
    Error,
    "complete Schedule D source audit",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        line2k_8949_basis_dispositions: [
          base.line2k_8949_basis_dispositions,
          {
            ...base.line2k_8949_basis_dispositions,
            source_transaction_id: "broker-lt-1",
            part: "D",
          },
        ],
      }),
    Error,
    "complete Schedule D source audit",
  );
});

Deno.test("form6251: trust K-1 code A sums on line 2j and AMTI", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    line2j_estates_and_trusts: [3_000, -800],
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2j_estates_and_trusts, 2_200);
  assertEquals(filed?.fields.amti, 202_200);
});

Deno.test("form6251: negative trust K-1 code A can require a zero-AMT filing", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 15_000,
    line2j_estates_and_trusts: -100_000,
  });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2j_estates_and_trusts, -100_000);
  assertEquals(filed?.fields.amti, 100_000);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
});

Deno.test("form6251: negative trust K-1 code A with qualified dividends refigures the filing test", () => {
  const base = {
    filing_status: "single" as const,
    regular_tax_income: 100_000,
    regular_taxable_income: 100_000,
    qualified_dividends: 1_000,
    line2j_estates_and_trusts: -20_000,
  };
  const result = compute({ ...base, regular_tax: 2_000 });
  const filed = result.outputs.find((row) => row.nodeType === "form6251");
  assertEquals(filed?.fields.line2j_estates_and_trusts, -20_000);
  assertEquals(filed?.fields.amti, 80_000);
  assertEquals(filed?.fields.tentative_tax, 0);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
  assertStringIncludes(
    mef6251.build(filed!.fields),
    "<EstatesAndTrustsAmt>-20000</EstatesAndTrustsAmt>",
  );
  const pdf = form6251Pdf.projectFields?.(filed!.fields, {
    f1040: { line11_agi: 120_000, line14_deductions_qbi_total: 20_000 },
  });
  assertEquals(pdf?.line2j_estates_and_trusts, -20_000);
  assertEquals(form6251Pdf.includeWhen?.(pdf ?? {}), true);

  assertEquals(compute({ ...base, regular_tax: 4_000 }).outputs, []);
  assertThrows(
    () =>
      compute({
        ...base,
        regular_tax: 2_000,
        regular_taxable_income: undefined,
      }),
    Error,
    "needs a refigured special-rate line 7",
  );
  assertThrows(
    () => compute({ ...base, regular_tax: 4_000, qualified_dividends: 15_000 }),
    Error,
    "capital-gain-excess refigure",
  );
});

// ─── No AMT owed (AMT < regular tax) ─────────────────────────────────────────

Deno.test("form6251: no output when AMT is less than regular tax", () => {
  // Single filer, modest AMTI — regular tax exceeds tentative minimum tax
  // AMTI = $80,000; exemption = $88,100 → AMTI fully exempt → line6 = $0
  // TMT = $0 → AMT = max(0, 0 − regular_tax) = 0
  const result = compute({
    filing_status: "single",
    regular_tax_income: 80_000,
    regular_tax: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form6251: direct ATNOLD stops without regular and AMT NOL source refigures", () => {
  for (const adjustment of [1_000, -1_000, -180_000]) {
    assertThrows(
      () =>
        compute({
          filing_status: "single",
          regular_tax_income: 200_000,
          regular_tax: 10_000,
          nol_adjustment: adjustment,
        }),
      Error,
      "sourced regular NOL and AMT NOL refigures",
    );
  }
});

Deno.test("form6251: taxable state income-tax refund reduces line 4 through line 2b", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    line2b_tax_refund: 1_000,
    regular_tax: 10_000,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line2b_tax_refund, 1_000);
  assertEquals(filed?.fields.amti, 199_000);
  assertEquals(filed?.fields.tentative_tax, 28_834);
  assertEquals(filed?.fields.line11_amt, 18_834);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line2_amt, 18_834);
});

Deno.test("form6251: Schedule C AMT depletion difference enters line 2d and AMTI", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    line2d_depletion: 400,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line2d_depletion, 400);
  assertEquals(filed?.fields.amti, 200_400);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line2_amt,
    filed?.fields.line11_amt,
  );
  const xml = mef6251.build(filed!.fields);
  assertEquals(xml.includes("<DepletionAmt>400</DepletionAmt>"), true);
});

Deno.test("form6251: circulation cost difference enters line 2o and AMTI", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    line2o_circulation_costs: 6_000,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line2o_circulation_costs, 6_000);
  assertEquals(filed?.fields.amti, 206_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line2_amt,
    filed?.fields.line11_amt,
  );
});

Deno.test("form6251: negative circulation adjustment can require zero-AMT filing", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_tax: 2_000,
    line2o_circulation_costs: -20_000,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
});

Deno.test("form6251: negative line 2d can require a filed zero-AMT form", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_tax: 2_000,
    line2d_depletion: -20_000,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line2d_depletion, -20_000);
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
});

Deno.test("form6251: line 2b refund alone does not activate the lines 2c-through-3 filing test", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    line2b_tax_refund: 20_000,
    regular_tax: 2_000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("form6251: Form 8911 claim files the form with zero AMT", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 80_000,
    line2a_taxes_paid: 15_750,
    regular_tax: 10_000,
    must_file_for_credit: true,
  });
  assertEquals(result.outputs.length, 2);
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(filed?.fields.must_file_for_credit, true);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.credit_limit_form6251_line11,
    0,
  );
});

Deno.test("form6251: Form 3800 source receives zero-TMT evidence and files the form", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 80_000,
    regular_tax: 10_000,
    must_file_for_gbc: true,
  });
  assertEquals(result.outputs.length, 2);
  assertEquals(fieldsOf(result.outputs, f1040)?.credit_limit_form6251_line9, 0);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.credit_limit_form6251_line11,
    0,
  );
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.must_file_for_credit, true);
});

Deno.test("form6251: Form 8912 receives zero-AMT evidence without sharing Form 8911's signal", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 80_000,
    regular_tax: 10_000,
    must_compute_for_bond_credit: true,
  });
  assertEquals(result.outputs.length, 2);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.credit_limit_form6251_line11,
    0,
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "form6251")?.fields
      .must_file_for_credit,
    true,
  );
});

Deno.test("form6251: no output when tentative minimum tax equals regular tax", () => {
  // Single: AMTI = $200,000; exemption = $88,100; line6 = $111,900
  // TMT = floor($111,900 × 0.26) = $29,094; regular_tax = $29,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 29_094,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form6251: negative line 2c files when removing it would make line 7 exceed line 10", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_tax: 2_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.line2c_investment_interest, -20_000);
  assertEquals(filed?.fields.tentative_tax, 0);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
});

Deno.test("form6251: negative line 2c does not file when counterfactual line 7 stays below line 10", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_tax: 4_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("form6251: domestic qualified dividends use the Part III negative-adjustment counterfactual", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_taxable_income: 100_000,
    regular_tax: 2_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
    qualified_dividends: 1_000,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(filed?.fields.tentative_tax, 0);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
});

Deno.test("form6251: domestic preferential counterfactual does not file below line 10", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_taxable_income: 100_000,
    regular_tax: 4_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
    qualified_dividends: 1_000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("form6251: negative circulation costs with qualified dividends retain the zero-AMT form", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_taxable_income: 100_000,
    regular_tax: 2_000,
    line2o_circulation_costs: -20_000,
    qualified_dividends: 1_000,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.line2o_circulation_costs, -20_000);
  assertEquals(filed?.fields.amti, 80_000);
  assertEquals(filed?.fields.tentative_tax, 0);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
  assertStringIncludes(
    mef6251.build(filed!.fields),
    "<CirculationCostAmt>-20000</CirculationCostAmt>",
  );
  const pdf = form6251Pdf.projectFields?.(filed!.fields, {
    f1040: { line11_agi: 120_000, line14_deductions_qbi_total: 20_000 },
  });
  assertEquals(pdf?.line2o_circulation_costs, -20_000);
  assertEquals(form6251Pdf.includeWhen?.(pdf ?? {}), true);
});

Deno.test("form6251: circulation-cost preferential counterfactual respects line 10 and source bounds", () => {
  const base = {
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_taxable_income: 100_000,
    line2o_circulation_costs: -20_000,
    qualified_dividends: 1_000,
  };
  assertEquals(compute({ ...base, regular_tax: 4_000 }).outputs, []);
  assertThrows(
    () =>
      compute({
        ...base,
        regular_tax: 2_000,
        regular_taxable_income: undefined,
      }),
    Error,
    "needs a refigured special-rate line 7",
  );
  assertThrows(
    () => compute({ ...base, regular_tax: 4_000, qualified_dividends: 15_000 }),
    Error,
    "capital-gain-excess refigure",
  );
});

Deno.test("form6251: domestic preferential counterfactual still blocks unmodeled capital-gain excess", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 100_000,
        regular_taxable_income: 100_000,
        regular_tax: 4_000,
        taking_standard_deduction: false,
        form4952_amt_line2c_difference: -20_000,
        qualified_dividends: 15_000,
      }),
    Error,
    "capital-gain-excess refigure",
  );
});

Deno.test("form6251: domestic preferential counterfactual does not absorb another AMT adjustment", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 100_000,
        regular_taxable_income: 100_000,
        regular_tax: 4_000,
        taking_standard_deduction: false,
        form4952_amt_line2c_difference: -20_000,
        depreciation_adjustment: -1_000,
        line2l_depreciation_workpaper: {
          properties: [{
            property_id: "nonpassive-machine-negative",
            placed_in_service_year: 2020,
            regular_200_percent_declining_balance: true,
            non_section1250_property: true,
            no_special_allowance_or_section179_component: true,
            not_passive_at_risk_limited_or_tax_shelter_farm: true,
            no_inventory_capitalization_difference: true,
            regular_tax_depreciation: 1_000,
            amt_depreciation: 2_000,
            reviewed_workpaper_reference:
              "Reviewed 2025 AMT depreciation schedule",
          }],
        },
        qualified_dividends: 1_000,
      }),
    Error,
    "refigured special-rate line 7",
  );
});

Deno.test("form6251: negative line 2c files under the ordinary Form 2555 counterfactual", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_tax: 2_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.tentative_tax, 0);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
});

Deno.test("form6251: Form 2555 qualified dividends refigure negative-adjustment filing line 7", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_taxable_income: 100_000,
    regular_tax: 2_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
    qualified_dividends: 1_000,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.tentative_tax, 0);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
});

Deno.test("form6251: Form 2555 preferential counterfactual does not file below line 10", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_taxable_income: 100_000,
    regular_tax: 4_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
    qualified_dividends: 1_000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("form6251: Form 2555 preferential counterfactual needs taxable-income source", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 100_000,
        regular_tax: 2_000,
        taking_standard_deduction: false,
        form4952_amt_line2c_difference: -20_000,
        foreign_earned_income_exclusion: 100_000,
        foreign_exclusion_disallowed_deductions: 0,
        qualified_dividends: 1_000,
      }),
    Error,
    "counterfactual needs Form 1040 line 15 taxable income",
  );
});

Deno.test("form6251: Form 2555 preferential counterfactual needs worksheet line 2b", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 100_000,
        regular_taxable_income: 100_000,
        regular_tax: 2_000,
        taking_standard_deduction: false,
        form4952_amt_line2c_difference: -20_000,
        foreign_earned_income_exclusion: 100_000,
        qualified_dividends: 1_000,
      }),
    Error,
    "negative-adjustment Foreign Earned Income Tax Worksheet needs line 2b",
  );
});

Deno.test("form6251: Form 2555 special-rate gain counterfactual remains blocked", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 100_000,
        regular_taxable_income: 100_000,
        regular_tax: 2_000,
        taking_standard_deduction: false,
        form4952_amt_line2c_difference: -20_000,
        foreign_earned_income_exclusion: 100_000,
        foreign_exclusion_disallowed_deductions: 0,
        net_capital_gain: 1_000,
        unrecaptured_1250_gain: 500,
      }),
    Error,
    "refigured special-rate line 7",
  );
});

Deno.test("form6251: ordinary Form 2555 counterfactual does not file below line 10", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_tax: 4_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
  });
  assertEquals(result.outputs, []);
});

Deno.test("form6251: Form 2555 counterfactual refigures the 26-to-28-percent boundary", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 100_000,
    regular_tax: 3_200,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -20_000,
    foreign_earned_income_exclusion: 250_000,
    foreign_exclusion_disallowed_deductions: 15_000,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.must_file_for_negative_adjustments, true);
  assertEquals(filed?.fields.tentative_tax, 0);
});

Deno.test("form6251: ordinary Form 2555 counterfactual needs sourced disallowed deductions", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 100_000,
        regular_tax: 4_000,
        taking_standard_deduction: false,
        form4952_amt_line2c_difference: -20_000,
        foreign_earned_income_exclusion: 100_000,
      }),
    Error,
    "negative-adjustment Foreign Earned Income Tax Worksheet needs line 2b",
  );
});

Deno.test("form6251: mixed other adjustments cannot silently bypass the negative-adjustment filing test", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 100_000,
        regular_tax: 4_000,
        other_adjustments: -20_000,
      }),
    Error,
    "mixed other_adjustments",
  );
});

Deno.test("form6251: a filing trigger does not make mixed adjustments safe to print on line 3", () => {
  for (const adjustment of [-20_000, 20_000]) {
    assertThrows(
      () =>
        compute({
          filing_status: "single",
          regular_tax_income: 200_000,
          regular_tax: 10_000,
          must_file_for_credit: true,
          other_adjustments: adjustment,
        }),
      Error,
      "mixed other_adjustments needs line-specific AMT modeling",
    );
  }
});

// ─── AMT owed calculation ─────────────────────────────────────────────────────

Deno.test("form6251: AMT owed routes to schedule2 line2_amt", () => {
  // Single: AMTI = $200,000; exemption = $88,100; line6 = $111,900
  // TMT = floor($111,900 × 0.26) = $29,094; regular_tax = $15,000
  // AMT = $29,094 − $15,000 = $14,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 15_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 14_094);
});

Deno.test("form6251: line 10 combines Form 4972, Schedule 2 line 1z, and Schedule 3 line 1", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 15_000,
    form4972_tax: 2_000,
    schedule2_line1z_tax: 1_200,
    schedule3_line1_foreign_tax_credit: 300,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.regular_tax, 13_900);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line2_amt, 15_194);
});

Deno.test("form6251: line 10 subtracts a negative Form 8978 line 14", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 15_000,
    form8978_negative_line14: 500,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.regular_tax, 14_500);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line2_amt, 14_594);
});

Deno.test("form6251: AMT owed with ISO adjustment", () => {
  // Single: regular income $150,000, ISO adjustment $100,000
  // AMTI = $250,000; exemption = $88,100; line6 = $161,900
  // TMT = floor($161,900 × 0.26) = $42,094; regular_tax = $25,000
  // AMT = $42,094 − $25,000 = $17,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 150_000,
    iso_adjustment: 100_000,
    regular_tax: 25_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 17_094);
});

Deno.test("form6251: Part III zero-rate gain uses regular-tax worksheet line 5", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 20_000,
    regular_taxable_income: 20_000,
    iso_adjustment: 180_000,
    qualified_dividends: 10_000,
    regular_tax: 5_000,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line12, 111_900);
  assertEquals(filed?.fields.line13, 10_000);
  assertEquals(filed?.fields.line20, 10_000);
  assertEquals(filed?.fields.line21, 38_350);
  assertEquals(filed?.fields.line23, 10_000);
  assertEquals(filed?.fields.line31, 0);
  assertEquals(filed?.fields.line40, 26_494);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line2_amt, 21_494);
});

Deno.test("form6251: Part III Schedule D branch handles 25% and 28% gain", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    qualified_dividends: 1_000,
    net_capital_gain: 50_000,
    unrecaptured_1250_gain: 10_000,
    rate_28_gain: 5_000,
    regular_tax: 10_000,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line13, 36_000);
  assertEquals(filed?.fields.line14, 10_000);
  assertEquals(filed?.fields.line15, 46_000);
  assertEquals(filed?.fields.line20, 164_000);
  assertEquals(filed?.fields.line27, 164_000);
  assertEquals(filed?.fields.line37, 2_500);
  assertEquals(filed?.fields.line40, 25_034);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line2_amt, 15_034);
});

Deno.test("form6251: Form 4952 election reduces preferential income in Part III", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    qualified_dividends: 10_000,
    net_capital_gain: 20_000,
    form4952_amt_election: 5_000,
    form4952_amt_elected_capital_gain: 5_000,
    regular_tax: 10_000,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line13, 25_000);
  assertEquals(filed?.fields.line20, 175_000);
  assertEquals(filed?.fields.line27, 175_000);
});

Deno.test("form6251: AMT Form 4952 election must fit the stated preferential-income pools", () => {
  const base = {
    filing_status: "single" as const,
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    regular_tax: 10_000,
    qualified_dividends: 3_000,
    net_capital_gain: 4_000,
  };
  for (
    const election of [
      {
        form4952_amt_election: 8_000,
        form4952_amt_elected_capital_gain: 4_000,
      },
      {
        form4952_amt_election: 5_000,
        form4952_amt_elected_capital_gain: 5_000,
      },
      {
        form4952_amt_election: 5_000,
        form4952_amt_elected_capital_gain: 1_000,
      },
      { form4952_amt_election: 0, form4952_amt_elected_capital_gain: 1_000 },
    ]
  ) {
    assertThrows(
      () => compute({ ...base, ...election }),
      Error,
      "election exceeds its qualified-dividend or net-capital-gain source",
    );
  }
  assertThrows(
    () =>
      compute({
        ...base,
        qualified_dividends: 0,
        net_capital_gain: 0,
        form4952_amt_election: 100,
      }),
    Error,
    "election exceeds its qualified-dividend or net-capital-gain source",
  );
  const allowed = compute({
    ...base,
    form4952_amt_election: 5_000,
    form4952_amt_elected_capital_gain: 3_000,
  });
  assertEquals(
    allowed.outputs.some((item) => item.nodeType === "form6251"),
    true,
  );
});

Deno.test("form6251: AMT Form 4952 line 8 difference goes to signed line 2c", () => {
  const itemized = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    regular_tax: 10_000,
    taking_standard_deduction: false,
    form4952_amt_line2c_difference: -300,
  });
  const filed = itemized.outputs.find((output) =>
    output.nodeType === "form6251"
  );
  assertEquals(filed?.fields.amti, 199_700);
  assertEquals(filed?.fields.line2c_investment_interest, -300);
  assertEquals(
    mef6251.build({ line11_amt: 1, line2c_investment_interest: -300 })
      .includes("<InvestmentInterestAmt>-300</InvestmentInterestAmt>"),
    true,
  );
  const standard = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_taxable_income: 200_000,
    regular_tax: 10_000,
    taking_standard_deduction: true,
    form4952_amt_line2c_difference: -300,
  });
  const standardForm = standard.outputs.find((output) =>
    output.nodeType === "form6251"
  );
  assertEquals(standardForm?.fields.amti, 200_000);
  assertEquals(standardForm?.fields.line2c_investment_interest, undefined);
});

Deno.test("form6251: private-activity-bond interest from 1099-INT and 1099-DIV adds on line 2g", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    line2g_pab_interest: 300,
    private_activity_bond_interest: 200,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.private_activity_bond_interest, 500);
  assertEquals(filed?.fields.amti, 200_500);
});

Deno.test("form6251: Form 2555 worksheet requires an explicit line 2b fact", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 200_000,
        regular_taxable_income: 200_000,
        regular_tax: 10_000,
        foreign_earned_income_exclusion: 100_000,
      }),
    Error,
    "line 2b disallowed deductions",
  );
});

Deno.test("form6251: Form 2555 stacks ordinary income across the AMT 26% bracket", () => {
  // Line 6 = $300,000 - $88,100 = $211,900.
  // Worksheet 2c = $100,000; line 3 = $311,900.
  // Worksheet 4 = $82,550; line 5 = $26,000; line 7 = $56,550.
  const result = compute({
    filing_status: "single",
    regular_tax_income: 300_000,
    regular_tax: 40_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.tentative_tax, 56_550);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line2_amt, 16_550);
});

Deno.test("form6251: Form 2555 worksheet subtracts denied deductions before stacking", () => {
  // Worksheet line 2c = $100,000 - $40,000 = $60,000.
  // Tax on $271,900 is $71,350; tax on $60,000 is $15,600.
  const result = compute({
    filing_status: "single",
    regular_tax_income: 300_000,
    regular_tax: 40_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 40_000,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.tentative_tax, 55_750);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line2_amt, 15_750);
});

Deno.test("form6251: Form 2555 line 2b source reaches the AMT worksheet", () => {
  const ctx = { taxYear: 2025, formType: "f1040" } as const;
  const source = form2555.compute(ctx, {
    filing_details: {
      foreign_address: {
        line1: "1 Main Street",
        city: "Stockholm",
        country_code: "SE",
      },
      occupation: "Engineer",
      employer_name: "Nordic AB",
      employer_foreign_address: {
        line1: "2 Main Street",
        city: "Stockholm",
        country_code: "SE",
      },
      employer_has_us_ein: false,
      employer_issued_w2: false,
      citizenship_country: "United States",
      tax_home_description: "Stockholm, Sweden",
      tax_home_established_date: "2024-12-31",
      tax_home_foreign_entire_period: true,
      physical_presence_begin: "2025-01-01",
      physical_presence_end: "2025-12-31",
      principal_employment_country: "Sweden",
      no_travel_during_period: true,
      employment_contract_terms: "Full-year employment",
      visa_type: "Residence permit",
      visa_limits_stay: false,
      maintained_us_home: false,
      no_prior_exclusion_claim: true,
      exclusion_previously_revoked: false,
      separate_foreign_residence: false,
      foreign_wages: 100_000,
      no_other_foreign_earned_income: true,
      claiming_housing_exclusion_or_deduction: false,
      deductions_allocable_to_excluded_income: 0,
      amt_line2b_disallowed_deductions_and_exclusions: 0,
    },
  });
  const incomeFacts = fieldsOf(source.outputs, income_tax_calculation);
  assertEquals(incomeFacts?.foreign_earned_income_exclusion, 100_000);
  assertEquals(incomeFacts?.foreign_exclusion_disallowed_deductions, 0);
  const regular = income_tax_calculation.compute(ctx, {
    ...incomeFacts,
    taxable_income: 300_000,
    form6251_line1b: 300_000,
    form6251_line2a: 0,
    filing_status: FilingStatus.Single,
  });
  const amtFacts = fieldsOf(regular.outputs, form6251);
  assertEquals(amtFacts?.foreign_earned_income_exclusion, 100_000);
  assertEquals(amtFacts?.foreign_exclusion_disallowed_deductions, 0);
  const filed = form6251.compute(
    ctx,
    inputSchema.parse({
      ...amtFacts,
      must_file_for_credit: true,
    }),
  );
  assertEquals(
    filed.outputs.find((output) => output.nodeType === "form6251")?.fields
      .tentative_tax,
    56_550,
  );
});

Deno.test("form6251: Form 2555 worksheet uses the halved MFS bracket", () => {
  const result = compute({
    filing_status: "mfs",
    regular_tax_income: 300_000,
    regular_tax: 40_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.tentative_tax, 64_429);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line2_amt, 24_429);
});

Deno.test("form6251: zero line 6 skips the Form 2555 worksheet", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 80_000,
    regular_tax: 1_000,
    foreign_earned_income_exclusion: 100_000,
    must_file_for_credit: true,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.tentative_tax, 0);
  assertEquals(filed?.fields.line11_amt, 0);
});

Deno.test("form6251: Form 2555 qualified dividends stack Part III before subtracting excluded-income tax", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 300_000,
    regular_taxable_income: 300_000,
    regular_tax: 40_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
    qualified_dividends: 1_000,
    must_file_for_credit: true,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line12, 311_900);
  assertEquals(filed?.fields.line13, 1_000);
  assertEquals(filed?.fields.line20, 399_000);
  assertEquals(filed?.fields.line27, 399_000);
  assertEquals(
    filed?.fields.tentative_tax,
    (filed?.fields.line40 as number) - 26_000,
  );
});

Deno.test("form6251: Form 2555 AMT gain excess changes Part III preference but not regular-tax lines 20 and 27", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 500,
    line2a_taxes_paid: 89_500,
    regular_taxable_income: 500,
    regular_tax: 0,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
    qualified_dividends: 3_000,
    net_capital_gain: 1_000,
    must_file_for_credit: true,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  // Form 6251 line 6 is $1,900, so AMT gain excess is $2,100. Regular
  // capital gain excess is $3,500, independently fixing lines 20 and 27.
  assertEquals(filed?.fields.line12, 101_900);
  assertEquals(filed?.fields.line13, 1_900);
  assertEquals(filed?.fields.line15, 1_900);
  assertEquals(filed?.fields.line20, 100_000);
  assertEquals(filed?.fields.line27, 100_000);
});

Deno.test("form6251: Form 2555 Schedule D special-rate gain without capital gain excess uses Part III", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 300_000,
    regular_taxable_income: 300_000,
    regular_tax: 40_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
    net_capital_gain: 5_000,
    unrecaptured_1250_gain: 2_000,
    must_file_for_credit: true,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line12, 311_900);
  assertEquals(filed?.fields.line13, 3_000);
  assertEquals(filed?.fields.line14, 2_000);
  assertEquals(filed?.fields.line15, 5_000);
  assertEquals(filed?.fields.line20, 397_000);
  assertEquals(filed?.fields.line27, 395_000);
  assertEquals(
    filed?.fields.tentative_tax,
    (filed?.fields.line40 as number) - 26_000,
  );
});

Deno.test("form6251: sourced Form 2555 and matching Form 4952 election reach Part III, native XML, and PDF fields", () => {
  const ctx = { taxYear: 2025, formType: "f1040" } as const;
  const exclusion = form2555.compute(ctx, {
    filing_details: {
      foreign_address: {
        line1: "1 Main Street",
        city: "Stockholm",
        country_code: "SE",
      },
      occupation: "Engineer",
      employer_name: "Nordic AB",
      employer_foreign_address: {
        line1: "2 Main Street",
        city: "Stockholm",
        country_code: "SE",
      },
      employer_has_us_ein: false,
      employer_issued_w2: false,
      citizenship_country: "United States",
      tax_home_description: "Stockholm, Sweden",
      tax_home_established_date: "2024-12-31",
      tax_home_foreign_entire_period: true,
      physical_presence_begin: "2025-01-01",
      physical_presence_end: "2025-12-31",
      principal_employment_country: "Sweden",
      no_travel_during_period: true,
      employment_contract_terms: "Full-year employment",
      visa_type: "Residence permit",
      visa_limits_stay: false,
      maintained_us_home: false,
      no_prior_exclusion_claim: true,
      exclusion_previously_revoked: false,
      separate_foreign_residence: false,
      foreign_wages: 100_000,
      no_other_foreign_earned_income: true,
      claiming_housing_exclusion_or_deduction: false,
      deductions_allocable_to_excluded_income: 0,
      amt_line2b_disallowed_deductions_and_exclusions: 0,
    },
  });
  const investment = form4952.compute(ctx, {
    investment_interest_expense: 100,
    source_1099_dividends: 300,
    source_1099_qualified_dividends: 300,
    investment_income_election: 100,
    amt_refigure: {
      prior_year_disallowed_interest: 0,
      interest_on_private_activity_bonds: 0,
      other_gross_income_adjustment: 0,
      qualified_dividends_adjustment: 0,
      net_disposition_gain_adjustment: 0,
      net_capital_gain_adjustment: 0,
      investment_expenses_adjustment: 0,
    },
  });
  const regular = income_tax_calculation.compute(ctx, {
    ...fieldsOf(exclusion.outputs, income_tax_calculation),
    ...fieldsOf(investment.outputs, income_tax_calculation),
    taxable_income: 300_000,
    form6251_line1b: 300_000,
    form6251_line2a: 0,
    filing_status: FilingStatus.Single,
    taking_standard_deduction: false,
    qualified_dividends: 300,
  });
  const amtFacts = fieldsOf(regular.outputs, form6251);
  assertEquals(amtFacts?.form4952_regular_election, 100);
  assertEquals(amtFacts?.form4952_amt_election, 100);
  const amt = form6251.compute(
    ctx,
    inputSchema.parse({ ...amtFacts, must_file_for_credit: true }),
  );
  const filed = amt.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.line12, 311_900);
  assertEquals(filed?.fields.line13, 200);
  assertEquals(filed?.fields.line20, 399_800);
  assertEquals(filed?.fields.line27, 399_800);
  const xml = mef6251.build(filed!.fields);
  assertStringIncludes(
    xml,
    "<CapitalGainsWorksheetAmt>200</CapitalGainsWorksheetAmt>",
  );
  assertStringIncludes(
    xml,
    "<IncomeAboveThresholdWorkshtAmt>399800</IncomeAboveThresholdWorkshtAmt>",
  );
  const pdf = form6251Pdf.projectFields?.(filed!.fields, {
    f1040: { line11_agi: 315_000, line14_deductions_qbi_total: 15_000 },
  });
  assertEquals(pdf?.line13, 200);
  assertEquals(pdf?.line20, 399_800);
  assertEquals(
    form6251Pdf.fields.find((field) => field.domainKey === "line13")?.pdfField,
    "topmostSubform[0].Page2[0].f2_2[0]",
  );
});

Deno.test("form6251: Form 2555 and Form 4952 still reject different elections or capital-gain excess", () => {
  const base = {
    filing_status: "single",
    regular_tax_income: 300_000,
    regular_taxable_income: 300_000,
    regular_tax: 40_000,
    foreign_earned_income_exclusion: 100_000,
    foreign_exclusion_disallowed_deductions: 0,
    qualified_dividends: 300,
    form4952_regular_election: 100,
    form4952_regular_elected_capital_gain: 0,
    form4952_amt_election: 100,
    form4952_amt_elected_capital_gain: 0,
  };
  assertThrows(
    () => compute({ ...base, form4952_amt_election: 150 }),
    Error,
    "Part III Schedule D refigure",
  );
  assertThrows(
    () => compute({ ...base, regular_taxable_income: 100 }),
    Error,
    "Part III Schedule D refigure",
  );
  assertThrows(
    () => compute({ ...base, form4952_regular_election: undefined }),
    Error,
    "Part III Schedule D refigure",
  );
});

Deno.test("form6251: Form 2555 Schedule D special-rate gain still needs its Part III refigure", () => {
  assertThrows(
    () =>
      compute({
        filing_status: "single",
        regular_tax_income: 90_000,
        regular_taxable_income: 500,
        regular_tax: 0,
        foreign_earned_income_exclusion: 100_000,
        foreign_exclusion_disallowed_deductions: 0,
        net_capital_gain: 1_000,
        unrecaptured_1250_gain: 500,
      }),
    Error,
    "Part III Schedule D refigure",
  );
});

Deno.test("form6251: AMT owed with depreciation adjustment", () => {
  // Single: regular income $200,000, depreciation adjustment $50,000
  // AMTI = $250,000; exemption = $88,100; line6 = $161,900
  // TMT = floor($161,900 × 0.26) = $42,094; regular_tax = $30,000
  // AMT = $42,094 − $30,000 = $12,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    depreciation_adjustment: 50_000,
    line2l_depreciation_workpaper: {
      properties: [{
        property_id: "nonpassive-machine-positive",
        placed_in_service_year: 2021,
        regular_200_percent_declining_balance: true,
        non_section1250_property: true,
        no_special_allowance_or_section179_component: true,
        not_passive_at_risk_limited_or_tax_shelter_farm: true,
        no_inventory_capitalization_difference: true,
        regular_tax_depreciation: 60_000,
        amt_depreciation: 10_000,
        reviewed_workpaper_reference: "Reviewed 2025 AMT depreciation schedule",
      }],
    },
    regular_tax: 30_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 12_094);
});

Deno.test("form6251: line 2l needs distinct reviewed post-1998 property deductions", () => {
  const property = {
    property_id: "machine-1",
    placed_in_service_year: 2021,
    regular_200_percent_declining_balance: true,
    non_section1250_property: true,
    no_special_allowance_or_section179_component: true,
    not_passive_at_risk_limited_or_tax_shelter_farm: true,
    no_inventory_capitalization_difference: true,
    regular_tax_depreciation: 6_000,
    amt_depreciation: 4_000,
    reviewed_workpaper_reference: "2025 AMT asset schedule, machine 1",
  };
  const base = {
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    depreciation_adjustment: 1_000,
  };
  const second = {
    ...property,
    property_id: "machine-2",
    regular_tax_depreciation: 2_000,
    amt_depreciation: 3_000,
    reviewed_workpaper_reference: "2025 AMT asset schedule, machine 2",
  };
  const reviewed = {
    ...base,
    line2l_depreciation_workpaper: { properties: [property, second] },
  };
  const result = compute(reviewed);
  assertEquals(
    fieldsOf(result.outputs, form6251)?.depreciation_adjustment,
    1_000,
  );
  assertThrows(() => compute(base), Error, "line 2l needs distinct reviewed");
  assertThrows(
    () =>
      compute({
        ...reviewed,
        depreciation_adjustment: 999,
      }),
    Error,
    "line 2l needs distinct reviewed",
  );
  assertThrows(
    () =>
      compute({
        ...reviewed,
        line2l_depreciation_workpaper: { properties: [property, property] },
      }),
    Error,
    "line 2l needs distinct reviewed",
  );
  assertThrows(() =>
    compute({
      ...reviewed,
      line2l_depreciation_workpaper: {
        properties: [{ ...property, non_section1250_property: false }],
      },
    })
  );
});

// ─── Exemption phase-out ──────────────────────────────────────────────────────

Deno.test("form6251: exemption phases out for high-AMTI single filer", () => {
  // Single: AMTI = $700,000
  // Phase-out start = $626,350; excess = $73,650
  // Reduction = floor(0.25 × $73,650) = floor($18,412.50) = $18,412
  // Exemption = max(0, $88,100 − $18,412) = $69,688
  // Line 6 = $700,000 − $69,688 = $630,312
  // $630,312 > $239,100 → TMT = floor($630,312 × 0.28 − $4,782)
  //   = floor($176,487.36 − $4,782) = floor($171,705.36) = $171,705
  // AMT = $171,705 − $100,000 = $71,705
  const result = compute({
    filing_status: "single",
    regular_tax_income: 700_000,
    regular_tax: 100_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 71_705);
});

Deno.test("form6251: exemption is zero when AMTI exceeds complete phase-out threshold", () => {
  // Single: zero-exemption threshold = $626,350 + 4 × $88,100 = $978,750
  // AMTI = $1,000,000 → exemption = $0 → line6 = $1,000,000
  // TMT = floor($1,000,000 × 0.28 − $4,782) = floor($275,218) = $275,218
  // AMT = $275,218 − $150,000 = $125,218
  const result = compute({
    filing_status: "single",
    regular_tax_income: 1_000_000,
    regular_tax: 150_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 125_218);
});

// ─── 26% bracket vs 28% bracket ──────────────────────────────────────────────

Deno.test("form6251: 26% rate applies when taxable excess is at or below $239,100 (single)", () => {
  // Single: AMTI = $300,000; exemption = $88,100; line6 = $211,900
  // $211,900 ≤ $239,100 → TMT = floor($211,900 × 0.26) = $55,094
  // regular_tax = $40,000 → AMT = $15,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 300_000,
    regular_tax: 40_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 15_094);
});

Deno.test("form6251: 28% rate applies when taxable excess exceeds $239,100 (single)", () => {
  // Single: AMTI = $400,000; exemption = $88,100; line6 = $311,900
  // $311,900 > $239,100 → TMT = floor($311,900 × 0.28 − $4,782)
  //   = floor($87,332 − $4,782) = floor($82,550) = $82,550
  // regular_tax = $60,000 → AMT = $22,550
  const result = compute({
    filing_status: "single",
    regular_tax_income: 400_000,
    regular_tax: 60_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 22_550);
});

// ─── Filing status differences ────────────────────────────────────────────────

Deno.test("form6251: MFJ exemption $137,000 (vs single $88,100)", () => {
  // MFJ: AMTI = $300,000; exemption = $137,000; line6 = $163,000
  // TMT = floor($163,000 × 0.26) = $42,380; regular_tax = $30,000
  // AMT = $12,380
  const result = compute({
    filing_status: "mfj",
    regular_tax_income: 300_000,
    regular_tax: 30_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 12_380);
});

Deno.test("form6251: MFS has halved rate bracket threshold ($119,550 vs $239,100)", () => {
  // MFS: AMTI = $300,000; exemption = $68,500; line6 = $231,500
  // $231,500 > $119,550 → TMT = floor($231,500 × 0.28 − $2,391)
  //   = floor($64,820 − $2,391) = floor($62,429) = $62,429
  // regular_tax = $40,000 → AMT = $22,429
  const result = compute({
    filing_status: "mfs",
    regular_tax_income: 300_000,
    regular_tax: 40_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 22_429);
});

Deno.test("form6251: MFS line 4 adds 25% above the 2025 $900,350 threshold", () => {
  const result = compute({
    filing_status: "mfs",
    regular_tax_income: 920_350,
    regular_tax: 0,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.amti, 925_350);
  assertEquals(filed?.fields.exemption, 0);
  assertEquals(filed?.fields.taxable_excess, 925_350);
  assertEquals(filed?.fields.tentative_tax, 256_707);
  assertEquals(
    mef6251.build(filed!.fields).includes(
      "<AlternativeMinTaxableIncomeAmt>925350</AlternativeMinTaxableIncomeAmt>",
    ),
    true,
  );
});

Deno.test("form6251: MFS line 4 addition stops at $68,500", () => {
  const result = compute({
    filing_status: "mfs",
    regular_tax_income: 1_174_350,
    regular_tax: 0,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.amti, 1_242_850);
  assertEquals(filed?.fields.tentative_tax, 345_607);
});

Deno.test("form6251: MFS line 4 addition does not apply at threshold or to single filers", () => {
  const atThreshold = compute({
    filing_status: "mfs",
    regular_tax_income: 900_350,
    regular_tax: 0,
  });
  const single = compute({
    filing_status: "single",
    regular_tax_income: 920_350,
    regular_tax: 0,
  });
  assertEquals(
    atThreshold.outputs.find((item) => item.nodeType === "form6251")?.fields
      .amti,
    900_350,
  );
  assertEquals(
    single.outputs.find((item) => item.nodeType === "form6251")?.fields.amti,
    920_350,
  );
});

Deno.test("form6251: HOH uses same exemption as single ($88,100)", () => {
  // HOH: AMTI = $200,000; exemption = $88,100; line6 = $111,900
  // TMT = floor($111,900 × 0.26) = $29,094; regular_tax = $15,000
  // AMT = $14,094
  const result = compute({
    filing_status: "hoh",
    regular_tax_income: 200_000,
    regular_tax: 15_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 14_094);
});

Deno.test("form6251: QSS uses MFJ exemption amounts ($137,000)", () => {
  // QSS: AMTI = $300,000; exemption = $137,000; line6 = $163,000
  // TMT = floor($163,000 × 0.26) = $42,380; regular_tax = $30,000
  // AMT = $12,380
  const result = compute({
    filing_status: "qss",
    regular_tax_income: 300_000,
    regular_tax: 30_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 12_380);
});

// ─── AMTFTC reduces AMT ───────────────────────────────────────────────────────

Deno.test("form6251: AMTFTC reduces tentative minimum tax", () => {
  // Single: AMTI = $200,000; exemption = $88,100; line6 = $111,900
  // TMT = $29,094; amtftc = $5,000
  // Line 9 = $29,094 − $5,000 = $24,094; regular_tax = $10,000
  // AMT = $14,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    amtftc: 5_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 14_094);
});

Deno.test("form6251: files when line 7 exceeds line 10 despite zero AMT after AMTFTC", () => {
  // Single: line 7 = $29,094 > line 10 = $10,000; AMTFTC makes line 11 zero.
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    amtftc: 29_094,
  });
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.tentative_tax, 29_094);
  assertEquals(filed?.fields.regular_tax, 10_000);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(
    mef6251.build(filed!.fields).includes(
      "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
    ),
    true,
  );
});

Deno.test("form6251: AMTFTC does not require filing when line 7 does not exceed line 10", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 30_000,
    amtftc: 20_000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("form6251: required zero-AMT form leaves line 8 blank when line 10 reaches line 7", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 30_000,
    amtftc: 5_000,
    must_file_for_credit: true,
  });
  const filed = result.outputs.find((output) => output.nodeType === "form6251");
  assertEquals(filed?.fields.tentative_tax, 29_094);
  assertEquals(filed?.fields.regular_tax, 30_000);
  assertEquals(filed?.fields.amtftc, undefined);
  assertEquals(filed?.fields.net_tmt, 29_094);
  assertEquals(filed?.fields.line11_amt, 0);
  assertEquals(
    mef6251.build(filed!.fields).includes("<AMTForeignTaxCreditAmt>"),
    false,
  );
});

// ─── Other adjustment fields ──────────────────────────────────────────────────

Deno.test("form6251: private activity bond interest increases AMTI", () => {
  // Single: regular income $200,000, PAB interest $20,000
  // AMTI = $220,000; exemption = $88,100; line6 = $131,900
  // TMT = floor($131,900 × 0.26) = $34,294; regular_tax = $15,000
  // AMT = $19,294
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    private_activity_bond_interest: 20_000,
    regular_tax: 15_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 19_294);
});

Deno.test("form6251: sourced ISO adjustment is included in AMTI", () => {
  // Single: regular income $200,000, ISO adjustment $30,000
  // AMTI = $230,000; exemption = $88,100; line6 = $141,900
  // TMT = floor($141,900 × 0.26) = $36,894; regular_tax = $20,000
  // AMT = $16,894
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    iso_adjustment: 30_000,
    regular_tax: 20_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 16_894);
});

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("form6251: throws on invalid filing_status", () => {
  assertThrows(() => {
    compute({
      filing_status: "invalid",
      regular_tax_income: 200_000,
      regular_tax: 15_000,
    });
  });
});

Deno.test("form6251: signed line 1b can be negative", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: -1,
    regular_tax: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form6251: throws on negative regular_tax", () => {
  assertThrows(() => {
    compute({
      filing_status: "single",
      regular_tax_income: 200_000,
      regular_tax: -1,
    });
  });
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("form6251: either PAB source channel contributes to line 2g", () => {
  const via_primary = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    private_activity_bond_interest: 20_000,
    regular_tax: 15_000,
  });
  const via_alias = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    line2g_pab_interest: 20_000,
    regular_tax: 15_000,
  });
  assertEquals(
    fieldsOf(via_primary.outputs, schedule2)!.line2_amt,
    fieldsOf(via_alias.outputs, schedule2)!.line2_amt,
  );
});

Deno.test("form6251: distinct PAB source channels add on line 2g", () => {
  // 1099-DIV and 1099-INT/OID amounts are separate source channels.
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    private_activity_bond_interest: 20_000,
    line2g_pab_interest: 5_000,
    regular_tax: 15_000,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.private_activity_bond_interest, 25_000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 20_594);
});

Deno.test("form6251: multiple 1099 and child PAB deposits accumulate on line 2g", () => {
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    private_activity_bond_interest: 25,
    line2g_pab_interest: [100, 200, 50],
    regular_tax: 15_000,
  });
  const filed = result.outputs.find((item) => item.nodeType === "form6251");
  assertEquals(filed?.fields.private_activity_bond_interest, 375);
  assertEquals(filed?.fields.amti, 200_375);
});

Deno.test("form6251: routes AMT to Schedule 2 and its filed form", () => {
  // Single: AMTI = $250,000; exemption = $88,100; line6 = $161,900
  // TMT = $42,094; regular_tax = $20,000; AMT = $22,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 250_000,
    regular_tax: 20_000,
  });
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].nodeType, "schedule2");
  assertEquals(fieldsOf(result.outputs, schedule2)!.line2_amt, 22_094);
  assertEquals(result.outputs[1].nodeType, "form6251");
  assertEquals(result.outputs[1].fields.line11_amt, 22_094);
  assertEquals(result.outputs[1].fields.amti, 250_000);
  assertEquals(result.outputs[1].fields.exemption, 88_100);
  assertEquals(result.outputs[1].fields.taxable_excess, 161_900);
});
