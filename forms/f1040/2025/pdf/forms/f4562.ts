import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { filedForm4562Schema } from "../../../nodes/intermediate/forms/form4562/index.ts";
import { form4562 as form4562Mef } from "../../mef/forms/f4562.ts";

// Verified against the canonical 2025 f4562 AcroForm tree. The bounded source
// has one Part I elected property and no Part II/III/V/VI depreciation.
const p1 = "topmostSubform[0].Page1[0]";
const p2 = "topmostSubform[0].Page2[0]";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({ kind: "text", domainKey, pdfField, printZero });

const fields: readonly PdfFieldEntry[] = [
  text("filer_name", `${p1}.f1_1[0]`),
  text("activity_description", `${p1}.f1_2[0]`),
  text("filer_ssn", `${p1}.f1_3[0]`),
  text("line1_maximum_dollar_limitation", `${p1}.f1_4[0]`),
  text("line2_total_cost", `${p1}.f1_5[0]`),
  text("line3_threshold_cost", `${p1}.f1_6[0]`),
  text("line4_reduction", `${p1}.f1_7[0]`, true),
  text("line5_dollar_limitation", `${p1}.f1_8[0]`),
  text("asset_description", `${p1}.Table_Ln6[0].BodyRow1[0].f1_9[0]`),
  text("line2_total_cost", `${p1}.Table_Ln6[0].BodyRow1[0].f1_10[0]`),
  text("line6_elected_cost", `${p1}.Table_Ln6[0].BodyRow1[0].f1_11[0]`),
  text("line8_total_elected_cost", `${p1}.f1_16[0]`),
  text("line9_tentative_deduction", `${p1}.f1_17[0]`),
  text("line10_prior_carryover", `${p1}.f1_18[0]`, true),
  text("line11_business_income_limitation", `${p1}.f1_19[0]`),
  text("line12_section179_expense_deduction", `${p1}.f1_20[0]`),
  text("line13_next_year_carryover", `${p1}.f1_21[0]`, true),
  text("line22_total_depreciation", `${p2}.f2_2[0]`),
];

export const form4562Pdf: PdfFormDescriptor = {
  pendingKey: "form4562",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4562--2025.pdf",
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const filed = filedForm4562Schema.parse(raw);
    form4562Mef.build(filed, { pending: allPending });
    return filed;
  },
  instances(projected, filer) {
    if (Object.keys(projected).length === 0) return [];
    const name = filer?.fullName ?? [
      filer?.firstName,
      filer?.middleInitial,
      filer?.lastName,
    ].filter(Boolean).join(" ");
    const ssn = filer?.primarySSN.replaceAll("-", "");
    if (!name || !ssn || !/^\d{9}$/.test(ssn)) {
      throw new Error("Form 4562 PDF needs filer name and identifying number");
    }
    return [{ ...projected, filer_name: name, filer_ssn: ssn }];
  },
  fields,
};
