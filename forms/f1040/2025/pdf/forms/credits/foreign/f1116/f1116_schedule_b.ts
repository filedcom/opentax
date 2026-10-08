import type { PdfFieldEntry, PdfFormDescriptor } from "../../../../review-support/form-descriptor.ts";
import {
  categorySummarySchema,
  IncomeCategory,
} from "../../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { scheduleBPresentation } from "../../../../../mef/forms/credits/foreign/f1116/f1116_schedule_b.ts";
import { assertForm1116CarryoverSource } from "../../../../../domains/credits/foreign/form1116/form1116_carryover_source.ts";

// Official f1116sb.pdf (Rev. 12-2022), still current for TY2025. Both pages
// were inspected in the canonical AcroForm tree. Page 2 columns are viii
// subtotal, ix 4th, x 3rd, xi 2nd, xii 1st, xiii current, xiv total.
const p1 = "topmostSubform[0].Page1[0]";
const p2 = "topmostSubform[0].Page2[0].Table_Page2[0]";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({ kind: "text", domainKey, pdfField, printZero });
const row = (
  line: 1 | 3 | 4 | 5 | 6 | 8,
  key: string,
  field: string,
  printZero = false,
): PdfFieldEntry => text(key, `${p2}.Line${line}[0].${field}`, printZero);
const page1Row = (
  line: 1 | 3 | 4 | 5 | 8,
  key: string,
  field: string,
  printZero = false,
): PdfFieldEntry =>
  text(
    key,
    `${p1}.Table_Page1[0].Line${line}[0].${field}`,
    printZero,
  );

const fields: readonly PdfFieldEntry[] = [
  text("tax_year_suffix", `${p1}.Pg1Header[0].f1_01[0]`),
  text("filer_name", `${p1}.f1_06[0]`),
  text("filer_ssn", `${p1}.f1_07[0]`),
  {
    kind: "checkboxWhen",
    domainKey: "category",
    pdfField: `${p1}.CheckboxC-D_ReadOrder[0].c1_01[0]`,
    whenValue: IncomeCategory.Passive,
  },
  {
    kind: "checkboxWhen",
    domainKey: "category",
    pdfField: `${p1}.CheckboxC-D_ReadOrder[0].c1_01[1]`,
    whenValue: IncomeCategory.General,
  },
  // Page 1 column (vii), then page 2 column (viii): reviewed 2015-2020
  // tenth- through fifth-preceding vintages contribute to both subtotals.
  ...([1, 3, 4, 5, 6, 8] as const).flatMap((line) => [
    text(
      `line${line}_page1_subtotal`,
      `${p1}.Table_Page1[0].Line${line}[0].f1_${
        ({ 1: "16", 3: "77", 4: "84", 5: "91", 6: "98", 8: "112" } as const)[
          line
        ]
      }[0]`,
      true,
    ),
    row(
      line,
      `line${line}_page2_subtotal`,
      `f2_${
        ({ 1: "01", 3: "62", 4: "69", 5: "76", 6: "83", 8: "97" } as const)[
          line
        ]
      }[0]`,
      true,
    ),
  ]),
  page1Row(1, "line1_2015", "f1_10[0]"),
  page1Row(3, "line3_2015", "f1_71[0]"),
  page1Row(4, "line4_2015", "f1_78[0]"),
  page1Row(5, "line5_2015", "f1_85[0]"),
  page1Row(8, "line8_2015", "f1_106[0]", true),
  page1Row(1, "line1_2016", "f1_11[0]"),
  page1Row(3, "line3_2016", "f1_72[0]"),
  page1Row(4, "line4_2016", "f1_79[0]"),
  page1Row(8, "line8_2016", "f1_107[0]", true),
  page1Row(1, "line1_2017", "f1_12[0]"),
  page1Row(3, "line3_2017", "f1_73[0]"),
  page1Row(4, "line4_2017", "f1_80[0]"),
  page1Row(8, "line8_2017", "f1_108[0]", true),
  page1Row(1, "line1_2018", "f1_13[0]"),
  page1Row(3, "line3_2018", "f1_74[0]"),
  page1Row(4, "line4_2018", "f1_81[0]"),
  page1Row(8, "line8_2018", "f1_109[0]", true),
  page1Row(1, "line1_2019", "f1_14[0]"),
  page1Row(3, "line3_2019", "f1_75[0]"),
  page1Row(4, "line4_2019", "f1_82[0]"),
  page1Row(8, "line8_2019", "f1_110[0]", true),
  page1Row(1, "line1_2020", "f1_15[0]"),
  page1Row(3, "line3_2020", "f1_76[0]"),
  page1Row(4, "line4_2020", "f1_83[0]"),
  page1Row(8, "line8_2020", "f1_111[0]", true),
  ...([2021, 2022, 2023, 2024] as const).flatMap((year, index) => [
    row(1, `line1_${year}`, `f2_0${index + 2}[0]`),
    row(3, `line3_${year}`, `f2_${index + 63}[0]`),
    row(4, `line4_${year}`, `f2_${index + 70}[0]`),
    row(8, `line8_${year}`, `f2_${index + 98}[0]`, true),
  ]),
  row(1, "line1_total", "f2_07[0]"),
  row(3, "line3_total", "f2_68[0]"),
  row(4, "line4_total", "f2_75[0]"),
  row(5, "line5_total", "f2_82[0]"),
  row(6, "line6_current", "f2_88[0]"),
  row(6, "line6_total", "f2_89[0]"),
  row(8, "line8_current", "f2_102[0]"),
  row(8, "line8_total", "f2_103[0]"),
];

export const form1116ScheduleBPdf: PdfFormDescriptor = {
  pendingKey: "form1116_schedule_b",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1116sb--2022.pdf",
  pageIndices: () => [0, 1],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const presentation = scheduleBPresentation(raw);
    const parent = allPending.form_1116;
    const summaries = Array.isArray(parent?.category_summaries)
      ? parent.category_summaries.map((summary) =>
        categorySummarySchema.parse(summary)
      )
      : [];
    const matching = summaries.filter((summary) =>
      summary.category === presentation.category
    );
    const summary = matching.length === 1 ? matching[0] : undefined;
    if (
      !summary ||
      (presentation.case === "current_year_excess"
        ? summary.currentYearExcessTax !== presentation.amount
        : summary.priorYearCarryover !== presentation.balance ||
          summary.usedPriorYearCarryover !== presentation.used ||
          (presentation.case === "combined_current_excess_prior_balance" &&
            summary.currentYearExcessTax !== presentation.amount))
    ) {
      throw new Error(
        "Form 1116 Schedule B PDF differs from the matching Form 1116 category summary",
      );
    }
    if (
      presentation.case !== "current_year_excess" &&
      (allPending.f1040 !== undefined ||
        allPending.form1116_prior_carryover !== undefined)
    ) {
      assertForm1116CarryoverSource(
        allPending,
        raw.prior_year_carryover_source,
      );
    }
    if (allPending.f1040 !== undefined) {
      const schedule3 = allPending.schedule3;
      const form1040 = allPending.f1040;
      const parentCredit = summaries.reduce(
        (total, entry) => total + entry.allowedCredit,
        0,
      );
      if (
        typeof schedule3?.line1_foreign_tax_credit !== "number" ||
        schedule3.line1_foreign_tax_credit !== parentCredit ||
        typeof schedule3.line8_total !== "number" ||
        form1040?.line20_nonrefundable_credits !== schedule3.line8_total
      ) {
        throw new Error(
          "Form 1116 Schedule B PDF credit differs from Schedule 3 and Form 1040",
        );
      }
    }
    if (presentation.case === "current_year_excess") {
      return {
        category: presentation.category,
        tax_year_suffix: "25",
        line6_page1_subtotal: 0,
        line6_page2_subtotal: 0,
        line6_current: presentation.amount,
        line6_total: presentation.amount,
        line8_page1_subtotal: 0,
        line8_page2_subtotal: 0,
        line8_current: presentation.amount,
        line8_total: presentation.amount,
      };
    }
    const vintageFields = Object.fromEntries(presentation.rows.flatMap(
      (vintage) => [
        [`line1_${vintage.year}`, vintage.amount],
        [`line3_${vintage.year}`, vintage.amount],
        ...(vintage.used > 0 ? [[`line4_${vintage.year}`, -vintage.used]] : []),
        ...(vintage.expired > 0
          ? [[`line5_${vintage.year}`, -vintage.expired]]
          : []),
        [`line8_${vintage.year}`, vintage.remaining],
      ],
    ));
    const currentExcess = presentation.case ===
        "combined_current_excess_prior_balance"
      ? presentation.amount
      : 0;
    const page1Vintages = presentation.rows.filter((row) => row.year <= 2020);
    const page1Amount = page1Vintages.reduce((sum, row) => sum + row.amount, 0);
    const page1Used = page1Vintages.reduce((sum, row) => sum + row.used, 0);
    const page1Remaining = page1Vintages.reduce(
      (sum, row) => sum + row.remaining,
      0,
    );
    return {
      category: presentation.category,
      tax_year_suffix: "25",
      line1_page1_subtotal: page1Amount,
      line1_page2_subtotal: page1Amount,
      line1_total: presentation.balance,
      line3_page1_subtotal: page1Amount,
      line3_page2_subtotal: page1Amount,
      line3_total: presentation.balance,
      ...(presentation.used > 0
        ? {
          line4_page1_subtotal: -page1Used,
          line4_page2_subtotal: -page1Used,
          line4_total: -presentation.used,
        }
        : {}),
      ...(presentation.expired > 0
        ? {
          line5_page1_subtotal: -presentation.expired,
          line5_page2_subtotal: -presentation.expired,
          line5_total: -presentation.expired,
        }
        : {}),
      ...(currentExcess > 0
        ? {
          line6_page1_subtotal: 0,
          line6_page2_subtotal: 0,
          line6_current: currentExcess,
          line6_total: currentExcess,
          line8_current: currentExcess,
        }
        : {}),
      line8_page1_subtotal: page1Remaining,
      line8_page2_subtotal: page1Remaining,
      line8_total: presentation.remaining + currentExcess,
      ...vintageFields,
    };
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
      throw new Error("Form 1116 Schedule B PDF needs filer name and SSN");
    }
    return [{ ...projected, filer_name: name, filer_ssn: ssn }];
  },
  fields,
};
