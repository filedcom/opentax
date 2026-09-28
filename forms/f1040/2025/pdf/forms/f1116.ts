import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema as fecInputSchema } from "../../../nodes/inputs/fec/index.ts";
import { categorySummarySchema } from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { projectSingleSourceForm1116Pdf } from "./f1116_single_source.ts";
import { projectGeneralWageForm1116Pdf } from "./f1116_general_wage.ts";
import { IncomeCategory } from "../../../nodes/intermediate/forms/form_1116/index.ts";

// Canonical 2025 two-page AcroForm tree, checked against page widgets.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";
const part1 = `${page1}Table_Part1_Lines2-6[0].`;
const part2a = `${page1}Table_Part2[0].RowA[0].`;
function p1(line: string, number: number): string {
  return `${part1}${line}[0].f1_${number}[0]`;
}
function textField(
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry {
  return { kind: "text", domainKey, pdfField, printZero };
}
const fields: ReadonlyArray<PdfFieldEntry> = [
  textField("pdf_name", `${page1}f1_01[0]`),
  textField("pdf_ssn", `${page1}f1_02[0]`),
  {
    kind: "checkboxWhen",
    domainKey: "income_category",
    pdfField: "topmostSubform[0].Page1[0].LineA-B_ReadOrder[0].c1_1[0]",
    whenValue: "section_951a",
  },
  {
    kind: "checkboxWhen",
    domainKey: "income_category",
    pdfField: "topmostSubform[0].Page1[0].LineA-B_ReadOrder[0].c1_1[1]",
    whenValue: "branch",
  },
  {
    kind: "checkboxWhen",
    domainKey: "income_category",
    pdfField: "topmostSubform[0].Page1[0].LineC-D_ReadOrder[0].c1_1[0]",
    whenValue: "passive",
  },
  {
    kind: "checkboxWhen",
    domainKey: "income_category",
    pdfField: "topmostSubform[0].Page1[0].LineC-D_ReadOrder[0].c1_1[1]",
    whenValue: "general",
  },
  {
    kind: "checkboxWhen",
    domainKey: "income_category",
    pdfField: "topmostSubform[0].Page1[0].LineE-F_ReadOrder[0].c1_1[0]",
    whenValue: "section_901j",
  },
  {
    kind: "checkboxWhen",
    domainKey: "income_category",
    pdfField: "topmostSubform[0].Page1[0].LineE-F_ReadOrder[0].c1_1[1]",
    whenValue: "treaty",
  },
  {
    kind: "text",
    domainKey: "pdf_income_description",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Part1_LinesI-1a[0].Line1a[0].Line1a_Text[0].f1_07[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "alternative_compensation_source",
    pdfField: "topmostSubform[0].Page1[0].Line1b_ReadOrder[0].c1_2[0]",
    whenValue: "true",
  },
  {
    kind: "text",
    domainKey: "total_income",
    pdfField: "topmostSubform[0].Page2[0].f2_10[0]",
  },
  {
    kind: "text",
    domainKey: "us_tax_before_credits",
    pdfField: "topmostSubform[0].Page2[0].f2_12[0]",
  },
  textField(
    "pdf_country_a",
    `${page1}Table_Part1_LinesI-1a[0].Rowi[0].f1_04[0]`,
  ),
  textField(
    "pdf_line1a_a",
    `${page1}Table_Part1_LinesI-1a[0].Line1a[0].ColA[0].f1_10[0]`,
  ),
  textField("pdf_line1a_total", `${page1}f1_13[0]`),
  textField("pdf_line2_a", p1("Line2", 14), true),
  textField("pdf_line3a_a", p1("Line3a", 17), true),
  textField("pdf_line3b_a", p1("Line3b", 20), true),
  textField("pdf_line3c_a", p1("Line3c", 23), true),
  textField("pdf_line3d_a", p1("Line3d", 26)),
  textField("pdf_line3e_a", p1("Line3e", 29)),
  textField("pdf_line3f_a", p1("Line3f", 32)),
  textField("pdf_line3g_a", p1("Line3g", 35), true),
  textField("pdf_line4a_a", p1("Line4a", 38), true),
  textField("pdf_line4b_a", p1("Line4b", 41), true),
  textField("pdf_line5_a", p1("Line5", 44), true),
  textField("pdf_line6_a", p1("Line6", 47), true),
  textField("pdf_line6_total", `${page1}f1_50[0]`, true),
  textField("pdf_line7", `${page1}f1_51[0]`),
  {
    kind: "checkboxWhen",
    domainKey: "pdf_tax_credit_method",
    pdfField: `${page1}Part2[0].ActiveHeaderElements[0].c1_3[0]`,
    whenValue: "paid",
  },
  textField("pdf_part2_date_a", `${part2a}f1_52[0]`),
  textField("pdf_part2_foreign_interest_a", `${part2a}f1_55[0]`),
  textField("pdf_part2_foreign_other_a", `${part2a}f1_56[0]`),
  textField("pdf_part2_us_interest_a", `${part2a}f1_59[0]`),
  textField("pdf_part2_us_other_a", `${part2a}f1_60[0]`),
  textField("pdf_part2_total_a", `${part2a}f1_61[0]`),
  textField("pdf_line8", `${page1}f1_82[0]`),
  textField("pdf_line9", `${page2}Line9_ReadOrder[0].f2_01[0]`),
  textField("pdf_line10", `${page2}f2_02[0]`, true),
  textField("pdf_line11", `${page2}f2_03[0]`),
  textField("pdf_line12", `${page2}f2_04[0]`, true),
  textField("pdf_line13", `${page2}f2_05[0]`, true),
  textField("pdf_line14", `${page2}f2_06[0]`),
  textField("pdf_line15", `${page2}Line15_ReadOrder[0].f2_07[0]`),
  textField("pdf_line16", `${page2}f2_08[0]`, true),
  textField("pdf_line17", `${page2}f2_09[0]`),
  textField("pdf_line19", `${page2}f2_11[0]`),
  textField("pdf_line21", `${page2}f2_13[0]`),
  textField("pdf_line22", `${page2}f2_14[0]`, true),
  textField("pdf_line23", `${page2}f2_15[0]`),
  textField("pdf_line24", `${page2}f2_16[0]`),
  textField("pdf_line27", `${page2}f2_19[0]`),
  textField("pdf_line28", `${page2}f2_20[0]`),
  textField("pdf_line32", `${page2}f2_24[0]`),
  textField("pdf_line33", `${page2}f2_25[0]`),
  textField("pdf_line34", `${page2}f2_26[0]`, true),
  textField("pdf_line35", `${page2}f2_27[0]`),
];

function hasActiveForm1116(fields: Record<string, unknown>): boolean {
  return (Array.isArray(fields.category_summaries) &&
    fields.category_summaries.length > 0) ||
    Boolean(fields.foreign_tax_paid);
}

export const form1116Pdf: PdfFormDescriptor = {
  pendingKey: "form_1116",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1116--2025.pdf",
  projectFields(fields, allPending) {
    if (fields.foreign_tax_redeterminations !== undefined) {
      throw new Error(
        "Form 1116 foreign tax redetermination needs native Schedule C and amended-year handling",
      );
    }
    const summaries = Array.isArray(fields.category_summaries)
      ? fields.category_summaries.map((summary) =>
        categorySummarySchema.parse(summary)
      )
      : [];
    const alternatives = summaries.flatMap((summary) =>
      summary.items.flatMap((item) =>
        item.alternative_compensation_sourcing
          ? [item.alternative_compensation_sourcing]
          : []
      )
    );
    if (alternatives.length > 0) {
      const fec = fecInputSchema.safeParse(allPending.fec);
      if (!fec.success) {
        throw new Error(
          "Form 1116 PDF line 1b needs the foreign-employer compensation source",
        );
      }
      const sources = fec.data.fecs.filter((item) =>
        item.alternative_compensation_sourcing !== undefined
      );
      if (
        sources.length !== alternatives.length ||
        alternatives.some((alternative) => {
          const matches = sources.filter((item) =>
            item.alternative_compensation_sourcing
              ?.source_document_reference ===
              alternative.source_document_reference
          );
          const source = matches[0];
          return matches.length !== 1 || !source ||
            JSON.stringify(source.alternative_compensation_sourcing) !==
              JSON.stringify(alternative) ||
            source.compensation_usd < 250_000 ||
            Math.round(source.compensation_usd * 100) !==
              Math.round(alternative.compensation_item_total_usd * 100) ||
            Math.round((source.foreign_service_compensation_usd ?? 0) * 100) !==
              Math.round(alternative.alternative_foreign_source_usd * 100);
        })
      ) {
        throw new Error(
          "Form 1116 PDF line 1b must match each sourced foreign-employer compensation item",
        );
      }
    }
    if (!hasActiveForm1116(fields)) return fields;
    if (
      summaries.length === 1 &&
      summaries[0].category === IncomeCategory.General &&
      summaries[0].items.length === 1 &&
      summaries[0].items[0].alternative_compensation_sourcing
    ) {
      return projectGeneralWageForm1116Pdf(fields, allPending);
    }
    return projectSingleSourceForm1116Pdf(fields, allPending);
  },
  // The §904 limitation inputs land here on every return; only a claimed credit
  // puts the form on the return.
  presenceKey: "foreign_tax_paid",
  includeWhen(fields) {
    return fields.pdf_complete_single_source === true &&
      typeof fields.foreign_tax_paid === "number" &&
      fields.foreign_tax_paid > 0 &&
      Array.isArray(fields.category_summaries) &&
      fields.category_summaries.length === 1;
  },
  instances(fields, filer) {
    if (!hasActiveForm1116(fields)) return [fields];
    if (fields.pdf_complete_single_source !== true) {
      throw new Error("Form 1116 PDF cannot render an unreviewed category");
    }
    if (!filer?.nameLine1 || !filer.primarySSN) {
      throw new Error("Form 1116 PDF needs the filed taxpayer name and SSN");
    }
    return [{
      ...fields,
      pdf_name: filer.nameLine1,
      pdf_ssn: filer.primarySSN,
    }];
  },
  fields,
};
