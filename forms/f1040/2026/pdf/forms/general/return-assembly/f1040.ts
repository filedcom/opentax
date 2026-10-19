import { form1040PdfFor } from "../../../../../2025/pdf/forms/general/return-assembly/f1040.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 1040 early-release draft (Created 4/27/26), page 1 is the
// IRS cover sheet. Against the 2025 form: two citizenship questions add
// c1_11/c1_12, so later page-1 boxes move +2; line 12f (f2_03) is new; lines
// 13a and 13b swap (13a is Schedule 1-A, 13b QBI); line 24 becomes 24a/24b/24c
// and line 32 becomes 32a/32b/32c; the line 28 ACTC opt-out box is gone.
const RENAME: Readonly<Record<string, string>> = {
  "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[0]":
    "topmostSubform[0].Page1[0].c1_8[0]",
  "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[1]":
    "topmostSubform[0].Page1[0].c1_8[1]",
  "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[2]":
    "topmostSubform[0].Page1[0].c1_8[2]",
  "topmostSubform[0].Page1[0].c1_8[0]":
    "topmostSubform[0].Page1[0].HOH-QSS_ReadOrder[0].c1_8[0]",
  "topmostSubform[0].Page1[0].c1_8[1]":
    "topmostSubform[0].Page1[0].HOH-QSS_ReadOrder[0].c1_8[1]",
  "topmostSubform[0].Page1[0].c1_9[0]":
    "topmostSubform[0].Page1[0].Nonresident_ReadOrder[0].c1_9[0]",
  "topmostSubform[0].Page1[0].Dependents_ReadOrder[0].c1_11[0]":
    "topmostSubform[0].Page1[0].Dependents_ReadOrder[0].c1_13[0]",
  "topmostSubform[0].Page1[0].c1_32[0]":
    "topmostSubform[0].Page1[0].c1_34[0]",
  "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].f1_28[0]":
    "topmostSubform[0].Page1[0].f1_28[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent1[0].c1_12[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent1[0].c1_14[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent1[0].c1_13[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent1[0].c1_15[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent1[0].c1_20[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent1[0].c1_22[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent1[0].c1_21[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent1[0].c1_23[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent1[0].c1_28[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent1[0].c1_30[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent1[0].c1_28[1]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent1[0].c1_30[1]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent2[0].c1_14[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent2[0].c1_16[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent2[0].c1_15[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent2[0].c1_17[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent2[0].c1_22[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent2[0].c1_24[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent2[0].c1_23[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent2[0].c1_25[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent2[0].c1_29[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent2[0].c1_31[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent2[0].c1_29[1]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent2[0].c1_31[1]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent3[0].c1_16[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent3[0].c1_18[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent3[0].c1_17[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent3[0].c1_19[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent3[0].c1_24[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent3[0].c1_26[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent3[0].c1_25[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent3[0].c1_27[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent3[0].c1_30[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent3[0].c1_32[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent3[0].c1_30[1]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent3[0].c1_32[1]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent4[0].c1_18[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent4[0].c1_20[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent4[0].c1_19[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row5[0].Dependent4[0].c1_21[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent4[0].c1_26[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent4[0].c1_28[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent4[0].c1_27[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row6[0].Dependent4[0].c1_29[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent4[0].c1_31[0]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent4[0].c1_33[0]",
  "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent4[0].c1_31[1]":
    "topmostSubform[0].Page1[0].Table_Dependents[0].Row7[0].Dependent4[0].c1_33[1]",
  "topmostSubform[0].Page1[0].c1_33[0]":
    "topmostSubform[0].Page1[0].c1_35[0]",
  "topmostSubform[0].Page1[0].c1_34[0]":
    "topmostSubform[0].Page1[0].c1_36[0]",
  "topmostSubform[0].Page1[0].c1_35[0]":
    "topmostSubform[0].Page1[0].c1_37[0]",
  "topmostSubform[0].Page1[0].c1_36[0]":
    "topmostSubform[0].Page1[0].c1_38[0]",
  "topmostSubform[0].Page1[0].c1_38[0]":
    "topmostSubform[0].Page1[0].c1_40[0]",
  "topmostSubform[0].Page1[0].c1_39[0]":
    "topmostSubform[0].Page1[0].c1_41[0]",
  "topmostSubform[0].Page1[0].c1_42[0]":
    "topmostSubform[0].Page1[0].c1_44[0]",
  "topmostSubform[0].Page1[0].c1_43[0]":
    "topmostSubform[0].Page1[0].c1_45[0]",
  "topmostSubform[0].Page1[0].c1_44[0]":
    "topmostSubform[0].Page1[0].c1_46[0]",
  "topmostSubform[0].Page2[0].f2_03[0]":
    "topmostSubform[0].Page2[0].f2_05[0]",
  "topmostSubform[0].Page2[0].f2_05[0]":
    "topmostSubform[0].Page2[0].f2_06[0]",
  "topmostSubform[0].Page2[0].f2_06[0]":
    "topmostSubform[0].Page2[0].f2_07[0]",
  "topmostSubform[0].Page2[0].f2_07[0]":
    "topmostSubform[0].Page2[0].f2_08[0]",
  "topmostSubform[0].Page2[0].f2_08[0]":
    "topmostSubform[0].Page2[0].f2_09[0]",
  "topmostSubform[0].Page2[0].f2_09[0]":
    "topmostSubform[0].Page2[0].f2_10[0]",
  "topmostSubform[0].Page2[0].f2_10[0]":
    "topmostSubform[0].Page2[0].f2_11[0]",
  "topmostSubform[0].Page2[0].f2_11[0]":
    "topmostSubform[0].Page2[0].f2_12[0]",
  "topmostSubform[0].Page2[0].f2_12[0]":
    "topmostSubform[0].Page2[0].f2_13[0]",
  "topmostSubform[0].Page2[0].f2_13[0]":
    "topmostSubform[0].Page2[0].f2_14[0]",
  "topmostSubform[0].Page2[0].f2_14[0]":
    "topmostSubform[0].Page2[0].f2_15[0]",
  "topmostSubform[0].Page2[0].f2_15[0]":
    "topmostSubform[0].Page2[0].f2_16[0]",
  "topmostSubform[0].Page2[0].f2_16[0]":
    "topmostSubform[0].Page2[0].f2_17[0]",
  "topmostSubform[0].Page2[0].f2_17[0]":
    "topmostSubform[0].Page2[0].Line25_ReadOrder[0].f2_20[0]",
  "topmostSubform[0].Page2[0].f2_18[0]":
    "topmostSubform[0].Page2[0].f2_21[0]",
  "topmostSubform[0].Page2[0].f2_19[0]":
    "topmostSubform[0].Page2[0].f2_22[0]",
  "topmostSubform[0].Page2[0].f2_20[0]":
    "topmostSubform[0].Page2[0].f2_23[0]",
  "topmostSubform[0].Page2[0].f2_21[0]":
    "topmostSubform[0].Page2[0].f2_24[0]",
  "topmostSubform[0].Page2[0].SSN_ReadOrder[0].f2_22[0]":
    "topmostSubform[0].Page2[0].Estimated_ReadOrder[0].f2_25[0]",
  "topmostSubform[0].Page2[0].f2_23[0]":
    "topmostSubform[0].Page2[0].f2_26[0]",
  "topmostSubform[0].Page2[0].f2_24[0]":
    "topmostSubform[0].Page2[0].f2_27[0]",
  "topmostSubform[0].Page2[0].f2_25[0]":
    "topmostSubform[0].Page2[0].f2_28[0]",
  "topmostSubform[0].Page2[0].f2_26[0]":
    "topmostSubform[0].Page2[0].f2_29[0]",
  "topmostSubform[0].Page2[0].f2_27[0]":
    "topmostSubform[0].Page2[0].Line31-32_ReadOrder[0].f2_30[0]",
  "topmostSubform[0].Page2[0].f2_28[0]":
    "topmostSubform[0].Page2[0].Line31-32_ReadOrder[0].f2_31[0]",
  "topmostSubform[0].Page2[0].f2_29[0]":
    "topmostSubform[0].Page2[0].f2_34[0]",
  "topmostSubform[0].Page2[0].f2_30[0]":
    "topmostSubform[0].Page2[0].f2_35[0]",
  "topmostSubform[0].Page2[0].f2_31[0]":
    "topmostSubform[0].Page2[0].f2_36[0]",
  "topmostSubform[0].Page2[0].f2_34[0]":
    "topmostSubform[0].Page2[0].f2_39[0]",
  "topmostSubform[0].Page2[0].c2_15[0]":
    "topmostSubform[0].Page2[0].c2_14[0]",
  "topmostSubform[0].Page2[0].f2_35[0]":
    "topmostSubform[0].Page2[0].f2_40[0]",
  "topmostSubform[0].Page2[0].f2_36[0]":
    "topmostSubform[0].Page2[0].f2_41[0]",
  "topmostSubform[0].Page2[0].RoutingNo[0].f2_32[0]":
    "topmostSubform[0].Page2[0].RoutingNo[0].f2_37[0]",
  "topmostSubform[0].Page2[0].c2_16[0]":
    "topmostSubform[0].Page2[0].c2_15[0]",
  "topmostSubform[0].Page2[0].c2_16[1]":
    "topmostSubform[0].Page2[0].c2_15[1]",
  "topmostSubform[0].Page2[0].AccountNo[0].f2_33[0]":
    "topmostSubform[0].Page2[0].AccountNo[0].f2_38[0]",
  "topmostSubform[0].Page2[0].f2_40[0]":
    "topmostSubform[0].Page2[0].f2_45[0]",
  "topmostSubform[0].Page2[0].f2_41[0]":
    "topmostSubform[0].Page2[0].f2_46[0]",
  "topmostSubform[0].Page2[0].f2_42[0]":
    "topmostSubform[0].Page2[0].f2_47[0]",
  "topmostSubform[0].Page2[0].f2_43[0]":
    "topmostSubform[0].Page2[0].f2_48[0]",
  "topmostSubform[0].Page2[0].f2_44[0]":
    "topmostSubform[0].Page2[0].f2_49[0]",
  "topmostSubform[0].Page2[0].f2_45[0]":
    "topmostSubform[0].Page2[0].f2_50[0]",};

const PAGE2 = "topmostSubform[0].Page2[0]";
const REFUNDABLE_LINES = [
  "line27_eitc",
  "line28_actc",
  "line29_refundable_aoc",
  "line30_refundable_adoption",
] as const;

function assertTy2026Printable(fields: Record<string, unknown>): void {
  const positive = (key: string) =>
    typeof fields[key] === "number" && (fields[key] as number) > 0;
  const refundable = REFUNDABLE_LINES.filter(positive);
  if (refundable.length > 0) {
    throw new Error(
      `TY2026 PDF Form 1040 ${
        refundable.join(", ")
      } needs Schedule 3-A (line 32b), which is not modeled; export MeF XML`,
    );
  }
  if (fields.print_do_not_claim_actc === true) {
    throw new Error("TY2026 draft Form 1040 has no ACTC opt-out box");
  }
  if (
    typeof fields.print_form8814_line7a_note === "string" ||
    positive("form8621_1294_deferred_tax")
  ) {
    throw new Error(
      "TY2026 PDF Form 1040 line 7a and line 24 notes are placed for the 2025 layout only",
    );
  }
}

const base = form1040PdfFor(2026);
const draft = onTy2026Template(
  base,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040--dft.pdf",
    pdfSha256:
      "e044e765ace334c76bda7910bd3193fc813c7789d06340124359b885c98d58d0",
    formPages: [1, 2],
  },
  RENAME,
  ["print_do_not_claim_actc"],
  [{
    kind: "text",
    domainKey: "line12f_nonitemizer_charitable",
    pdfField: `${PAGE2}.f2_03[0]`,
  }],
);

const TOTALS: Readonly<Record<string, string>> = {
  // Form 1062 (24b) and Schedule 3-A (32b) are not modeled, so 24c = 24a and
  // 32c = 32a; refundable credits that would need Schedule 3-A are refused.
  line24_total_tax: `${PAGE2}.f2_19[0]`,
  line32_refundable_credits_total: `${PAGE2}.f2_33[0]`,
};

export const irs1040Pdf2026: PdfFormDescriptor = {
  ...draft,
  fields: draft.fields.map((entry) =>
    entry.kind === "text" && TOTALS[entry.domainKey]
      ? { ...entry, extraPdfFields: [TOTALS[entry.domainKey]] }
      : entry
  ),
  projectFields(fields, allPending) {
    const projected = base.projectFields?.(fields, allPending) ?? fields;
    assertTy2026Printable(projected);
    return projected;
  },
  decoratePages: undefined,
};
