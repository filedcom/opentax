import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Verified against the 2025 Form 8615 AcroForm field tree. Numeric fields
// f1_5 through f1_23 follow form lines 1 through 18 in reading order.
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "parent_name",
    pdfField: "topmostSubform[0].Page1[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "parent_ssn",
    pdfField: "topmostSubform[0].Page1[0].f1_4[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "parent_filing_status",
    whenValue: "single",
    pdfField: "topmostSubform[0].Page1[0].c1_1[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "parent_filing_status",
    whenValue: "mfj",
    pdfField: "topmostSubform[0].Page1[0].c1_1[1]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "parent_filing_status",
    whenValue: "mfs",
    pdfField: "topmostSubform[0].Page1[0].c1_1[2]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "parent_filing_status",
    whenValue: "hoh",
    pdfField: "topmostSubform[0].Page1[0].c1_1[3]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "parent_filing_status",
    whenValue: "qss",
    pdfField: "topmostSubform[0].Page1[0].c1_1[4]",
  },
  {
    kind: "text",
    domainKey: "line1_child_unearned_income",
    pdfField: "topmostSubform[0].Page1[0].f1_5[0]",
  },
  {
    kind: "text",
    domainKey: "line2_kiddie_deduction",
    pdfField: "topmostSubform[0].Page1[0].f1_6[0]",
  },
  {
    kind: "text",
    domainKey: "line3_adjusted_unearned_income",
    pdfField: "topmostSubform[0].Page1[0].f1_7[0]",
  },
  {
    kind: "text",
    domainKey: "line4_child_taxable_income",
    pdfField: "topmostSubform[0].Page1[0].f1_8[0]",
  },
  {
    kind: "text",
    domainKey: "line5_child_net_unearned_income",
    pdfField: "topmostSubform[0].Page1[0].f1_9[0]",
  },
  {
    kind: "text",
    domainKey: "line6_parent_taxable_income",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "line7_other_children_income",
    pdfField: "topmostSubform[0].Page1[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "line8_family_income",
    pdfField: "topmostSubform[0].Page1[0].f1_12[0]",
  },
  {
    kind: "text",
    domainKey: "line9_family_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_13[0]",
  },
  {
    kind: "text",
    domainKey: "line10_parent_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
  },
  {
    kind: "text",
    domainKey: "line11_children_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "line12a_children_income",
    pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
  },
  {
    kind: "text",
    domainKey: "line12b_allocation_ratio",
    pdfField: "topmostSubform[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "line13_allocable_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_18[0]",
  },
  {
    kind: "text",
    domainKey: "line14_child_net_income",
    pdfField: "topmostSubform[0].Page1[0].f1_19[0]",
  },
  {
    kind: "text",
    domainKey: "line15_child_net_income_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_20[0]",
  },
  {
    kind: "text",
    domainKey: "line16_combined_child_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_21[0]",
  },
  {
    kind: "text",
    domainKey: "line17_child_regular_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_22[0]",
  },
  {
    kind: "text",
    domainKey: "line18_child_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_23[0]",
  },
];

export const form8615Pdf: PdfFormDescriptor = {
  pendingKey: "form8615",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8615--2025.pdf",
  fields,
  filerFields: [
    {
      kind: "text",
      domainKey: "fullName",
      pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
    },
  ],
};
