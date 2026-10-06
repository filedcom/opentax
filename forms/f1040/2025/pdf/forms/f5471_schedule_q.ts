import { owned5471PdfValues } from "./f5471-owned-values.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectForm8992Source } from "../../form8992_source.ts";

const text = (
  key: string,
  page: number,
  path: string,
): Extract<PdfFieldEntry, { kind: "text" }> => ({
  kind: "text",
  domainKey: key,
  pdfField: `topmostSubform[0].Page${page}[0].${path}`,
});
const table3 = "Table_ColsI-VII_Lines1h-5";
const table4 = "Table_ColsVIII-XVI_Lines1h-5";
const row = (
  key: string,
  page: 3 | 4,
  line: string,
  field: string,
) =>
  text(
    key,
    page,
    `${page === 3 ? table3 : table4}[0].BodyRow${line}[0].f${page}_${field}[0]`,
  );

export const form5471ScheduleQPdf: PdfFormDescriptor = {
  pendingKey: "f5471_schedule_q",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5471sq--2024.pdf",
  pageIndices: () => [0, 1, 2, 3],
  fields: [
    text("filer_name", 1, "f1_01[0]"),
    text("filer_tin", 1, "f1_02[0]"),
    text("cfc_name", 1, "f1_03[0]"),
    text("cfc_ein", 1, "f1_04[0]"),
    text("cfc_reference_id", 1, "f1_05[0]"),
    text("category", 1, "f1_06[0]"),
    text("passive_group", 1, "f1_07[0]"),
    {
      kind: "checkboxWhen",
      domainKey: "us_source",
      pdfField: "topmostSubform[0].Page1[0].c1_1[0]",
      whenValue: "true",
    },
    text(
      "passive_gross",
      1,
      "Table_ColsI-VII_Ln1-1g2[0].BodyRow1a[0].f1_10[0]",
    ),
    text(
      "passive_unit_name",
      1,
      "Table_ColsI-VII_Ln1-1g2[0].BodyRow1a1[0].f1_16[0]",
    ),
    text(
      "passive_country",
      1,
      "Table_ColsI-VII_Ln1-1g2[0].BodyRow1a1[0].f1_17[0]",
    ),
    text(
      "passive_gross",
      1,
      "Table_ColsI-VII_Ln1-1g2[0].BodyRow1a1[0].f1_18[0]",
    ),
    text(
      "passive_interest",
      1,
      "Table_ColsI-VII_Ln1-1g2[0].BodyRow1a[0].f1_13[0]",
    ),
    text(
      "passive_interest",
      1,
      "Table_ColsI-VII_Ln1-1g2[0].BodyRow1a1[0].f1_21[0]",
    ),
    ...[
      ["passive_tax", "1a", "03"],
      ["passive_net", "1a", "04"],
      ["passive_assets", "1a", "06"],
      ["passive_net", "1a", "08"],
      ["passive_tax", "1a1", "11"],
      ["passive_net", "1a1", "12"],
      ["passive_assets", "1a1", "14"],
      ["passive_net", "1a1", "16"],
    ].map(([key, line, n]) =>
      text(
        key,
        2,
        `Table_ColsVIII-XVI_Ln1a-1g2[0].BodyRow${line}[0].f2_${n}[0]`,
      )
    ),
    {
      kind: "checkboxWhen",
      domainKey: "foreign_source",
      pdfField: "topmostSubform[0].Page1[0].c1_1[1]",
      whenValue: "true",
    },
    row("sales_gross", 3, "1g", "02"),
    row("unit_name", 3, "1g1", "08"),
    row("country", 3, "1g1", "09"),
    row("sales_gross", 3, "1g1", "10"),
    row("sales_interest", 3, "1g", "05"),
    row("sales_interest", 3, "1g1", "13"),
    row("sales_net", 4, "1g", "04"),
    row("sales_net", 4, "1g", "08"),
    row("sales_net", 4, "1g1", "12"),
    row("sales_net", 4, "1g1", "16"),
    row("tested_gross", 3, "3", "122"),
    row("tested_interest", 3, "3", "125"),
    row("tested_other_expenses", 3, "3", "127"),
    row("unit_name", 3, "3\\.1", "128"),
    row("country", 3, "3\\.1", "129"),
    row("tested_gross", 3, "3\\.1", "130"),
    row("tested_interest", 3, "3\\.1", "133"),
    row("tested_other_expenses", 3, "3\\.1", "135"),
    row("tested_tax", 4, "3", "139"),
    row("tested_net", 4, "3", "140"),
    row("creditable_tax", 4, "3", "141"),
    row("tested_assets", 4, "3", "142"),
    row("tested_net", 4, "3", "144"),
    row("tested_tax", 4, "3\\.1", "147"),
    row("tested_net", 4, "3\\.1", "148"),
    row("creditable_tax", 4, "3\\.1", "149"),
    row("tested_assets", 4, "3\\.1", "150"),
    row("tested_net", 4, "3\\.1", "152"),
    row("total_gross", 3, "5", "168"),
    {
      ...row("total_interest", 3, "5", "171"),
      fallbackDomainKey: "tested_interest",
    },
    row("tested_other_expenses", 3, "5", "173"),
    { ...row("total_tax", 4, "5", "187"), fallbackDomainKey: "tested_tax" },
    row("total_net", 4, "5", "188"),
    row("creditable_tax", 4, "5", "189"),
    {
      ...row("total_assets", 4, "5", "190"),
      fallbackDomainKey: "tested_assets",
    },
    row("total_net", 4, "5", "192"),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 5471 Schedule Q PDF needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    if (cfc.owned_worksheet_source) {
      return owned5471PdfValues(cfc, shareholderName, "Q");
    }
    const q = cfc.schedule_q;
    const testedNet = q.tested_gross_income_functional -
      q.tested_other_interest_expense_functional -
      q.tested_other_expenses_functional -
      q.tested_other_current_year_tax_functional;
    return [{
      filer_name: shareholderName,
      filer_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      category: "GEN",
      foreign_source: true,
      unit_name: cfc.foreign_corp_name,
      country: cfc.country_of_incorporation,
      sales_gross: q.sales_gross_income_functional,
      sales_net: q.sales_gross_income_functional,
      tested_gross: q.tested_gross_income_functional,
      tested_interest: q.tested_other_interest_expense_functional,
      total_interest: q.tested_other_interest_expense_functional,
      tested_other_expenses: q.tested_other_expenses_functional,
      tested_tax: q.tested_other_current_year_tax_functional,
      tested_net: testedNet,
      creditable_tax: q.foreign_taxes_credit_allowed_usd,
      tested_assets: q.tested_average_asset_value_functional,
      total_tax: q.tested_other_current_year_tax_functional,
      total_assets: q.tested_average_asset_value_functional,
      total_gross: q.sales_gross_income_functional +
        q.tested_gross_income_functional,
      total_net: q.sales_gross_income_functional + testedNet,
    }];
  },
};
