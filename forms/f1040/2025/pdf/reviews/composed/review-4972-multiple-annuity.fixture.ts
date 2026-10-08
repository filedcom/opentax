import { extractFilerIdentity } from "../../../../mef/filer.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";
import { multipleNuaInputs } from "./review-4972-multiple-nua.fixture.ts";

export function multipleAnnuityInputs(
  primary: number,
  spouse = 0,
  withNua = true,
) {
  const inputs = multipleNuaInputs(primary, spouse);
  return {
    ...inputs,
    f1099r: inputs.f1099r.map((copy) => ({
      ...copy,
      box1_gross_distribution: withNua ? 12000 : 10000,
      box6_nua: withNua ? 2000 : 0,
      box8_other: 2000,
      box8_pct_total: 100,
    })),
    form4972: {
      elections: inputs.form4972.elections.map((election) => ({
        ...election,
        elect_include_nua: withNua,
      })),
    },
  };
}

export const multipleAnnuityReviewFixtures: readonly PdfReviewFixture[] = [
  [3, 0, 1],
  [5, 0, 1],
  [7, 0, 1],
  [2, 3, 1],
  [4, 5, 1],
  [1, 1, 1],
  [3, 0, 0],
].map(([n, spouse, nua]) => ({
  id: `form4972-annuity-primary-${n}-spouse-${spouse}-nua-${nua}`,
  inputs: multipleAnnuityInputs(n, spouse, nua === 1),
  filer: extractFilerIdentity(
    multipleAnnuityInputs(n, spouse, nua === 1).general,
  )!,
  expectedPdfForms: [
    "f1040",
    "schedule1a",
    "form4972",
    ...(spouse ? ["form4972"] : []),
  ],
  reviewFocus: [
    "Complete same-plan cash/NUA/annuity source totals reconcile to separate owner worksheets",
    "Line11 annuity value and lines20-28 subtraction use independently verified official rate totals",
    "Native and PDF owner copies and Form1040line16mark/combinedtax match actual complete source records",
  ],
}));
