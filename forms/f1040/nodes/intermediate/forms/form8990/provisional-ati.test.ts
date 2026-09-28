import { assertEquals, assertThrows } from "@std/assert";
import type { ExecuteResult } from "../../../../../../core/runtime/executor.ts";
import { calculateBoundedProvisionalATI } from "./provisional-ati.ts";
import { stageProvisionalScheduleCInterest } from "./two-stage.ts";

const business = {
  business_reference: "C-1",
  line_a_principal_business: "Software consulting",
  line_b_business_code: "541510",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 200_000,
  line_12_depletion: 1_000,
  line_13_depreciation: 7_500,
  line_16b_interest_other: 8_000,
};

const provisional = stageProvisionalScheduleCInterest({
  schedule_cs: [business],
});
const returnInputs = {
  general: { filing_status: "single" },
  schedule_c: provisional.source.schedule_cs,
};
const profit = 183_500;
const seDeduction = profit * 0.9235 * 0.153 / 2;
const agi = profit - seDeduction;
const standardDeduction = 15_750;
const qbi = (agi - standardDeduction) * 0.2;
const signedLine6 = agi - standardDeduction - qbi;

function provisionalResult(): ExecuteResult {
  return {
    diagnostics: [],
    carryforwards: {},
    pending: {
      start: returnInputs,
      schedule_c: provisional.source,
      schedule1: {
        line3_schedule_c: profit,
        line15_se_deduction: seDeduction,
      },
      schedule_se: { net_profit_schedule_c: profit },
      agi_aggregator: {
        line3_schedule_c: profit,
        line15_se_deduction: seDeduction,
      },
      form8995: { qbi_deduction: qbi },
      income_tax_calculation: { form6251_line1b: signedLine6 },
      f1040: {
        line9_total_income: profit,
        line10_adjustments: seDeduction,
        line11_agi: agi,
        line12a_standard_deduction: standardDeduction,
        line13_qbi_deduction: qbi,
        line15_taxable_income: signedLine6,
      },
    },
  };
}

Deno.test("2025 Form 8990 provisional ATI reconciles signed taxable income and sourced receipts", () => {
  const ati = calculateBoundedProvisionalATI({
    provisional,
    returnInputs,
    result: provisionalResult(),
    receipts: [{ source_reference: "sale-1", kind: "sale", amount: 200_000 }],
  });
  assertEquals(ati.line6SignedTentativeTaxableIncome, signedLine6);
  assertEquals(ati.line7NonbusinessDeduction, standardDeduction);
  assertEquals(ati.line8BusinessInterestExpense, 8_000);
  assertEquals(ati.line10QbiDeduction, qbi);
  assertEquals(ati.line11DepreciationDepletion, 8_500);
  assertEquals(ati.line22AdjustedTaxableIncome, agi + 16_500);
  assertEquals(ati.line23CurrentYearBusinessInterestIncome, 0);
});

Deno.test("2025 Form 8990 provisional ATI subtracts ledger-linked business interest income", () => {
  const ati = calculateBoundedProvisionalATI({
    provisional,
    returnInputs,
    result: provisionalResult(),
    receipts: [
      { source_reference: "sale-1", kind: "sale", amount: 199_500 },
      {
        source_reference: "interest-1",
        kind: "business_interest",
        amount: 500,
      },
    ],
  });
  assertEquals(ati.line18BusinessInterestIncome, 500);
  assertEquals(ati.line21TotalReductions, 500);
  assertEquals(ati.line22AdjustedTaxableIncome, agi + 16_000);
});

Deno.test("2025 Form 8990 provisional ATI rejects unknown or unreconciled inputs", () => {
  assertThrows(
    () =>
      calculateBoundedProvisionalATI({
        provisional,
        returnInputs,
        result: provisionalResult(),
        receipts: [{
          source_reference: "sale-1",
          kind: "sale",
          amount: 199_999,
        }],
      }),
    Error,
    "gross receipts ledger",
  );
  const missingQbi = provisionalResult();
  delete (missingQbi.pending.form8995 as Record<string, unknown>).qbi_deduction;
  assertThrows(
    () =>
      calculateBoundedProvisionalATI({
        provisional,
        returnInputs,
        result: missingQbi,
        receipts: [{
          source_reference: "sale-1",
          kind: "sale",
          amount: 200_000,
        }],
      }),
    Error,
    "form8995.qbi_deduction",
  );
  assertThrows(
    () =>
      calculateBoundedProvisionalATI({
        provisional,
        returnInputs: { ...returnInputs, w2: [] },
        result: provisionalResult(),
        receipts: [{
          source_reference: "sale-1",
          kind: "sale",
          amount: 200_000,
        }],
      }),
    Error,
    "only general and Schedule C inputs",
  );
});
