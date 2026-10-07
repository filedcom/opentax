import { owned5471PdfValues } from "./f5471-owned-values.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectForm8992Source } from "../../form8992_source.ts";

const textField = (
  key: string,
  page: number,
  path: string,
  printZero = false,
): Extract<PdfFieldEntry, { kind: "text" }> => ({
  kind: "text",
  domainKey: key,
  pdfField: `topmostSubform[0].Page${page}[0].${path}`,
  printZero,
});
const simple = (key: string, page: number, name: string, printZero = false) =>
  textField(key, page, `${name}[0]`, printZero);
const row = (key: string, table: string, name: string) =>
  textField(key, 1, `${table}[0].BodyRow1[0].${name}[0]`);
const e1 = (key: string, line: string, name: string) =>
  textField(key, 2, `Table_SchE-1_a-d[0].BodyRow${line}[0].${name}[0]`);

export const form5471ScheduleEPdf: PdfFormDescriptor = {
  pendingKey: "f5471_schedule_e",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5471se--2021.pdf",
  pageIndices: () => [0, 1, 2],
  fields: [
    simple("shareholder_name", 1, "f1_1"),
    simple("shareholder_tin", 1, "f1_2"),
    ...([1, 2, 3] as const).flatMap((page) => [
      simple("cfc_name", page, "f1_3"),
      simple("cfc_ein", page, "f1_4"),
      simple("cfc_reference_id", page, "f1_5"),
      simple("category", page, "f1_6"),
    ]),
    row("payor_name", "Table_Part1_Sec1_a-f", "f1_8"),
    row("payor_id", "Table_Part1_Sec1_a-f", "f1_9"),
    row("country", "Table_Part1_Sec1_a-f", "f1_10"),
    row("foreign_year_end", "Table_Part1_Sec1_a-f", "f1_11"),
    row("us_year_end", "Table_Part1_Sec1_a-f", "f1_12"),
    row("taxable_income", "Table_Part1_Sec1_g-m", "f1_28"),
    row("local_currency", "Table_Part1_Sec1_g-m", "f1_29"),
    row("tax_local", "Table_Part1_Sec1_g-m", "f1_30"),
    row("rate", "Table_Part1_Sec1_g-m", "f1_31"),
    row("tax_usd", "Table_Part1_Sec1_g-m", "f1_32"),
    row("tax_functional", "Table_Part1_Sec1_g-m", "f1_33"),
    {
      ...simple("total_tax_usd", 1, "f1_52", true),
      fallbackDomainKey: "tax_usd",
    },
    {
      ...simple("total_tax_functional", 1, "f1_53", true),
      fallbackDomainKey: "tax_functional",
    },
    textField("disallowed_payor_name", 2, "Table_Part3[0].BodyRow1[0].f2_2[0]"),
    textField("disallowed_payor_id", 2, "Table_Part3[0].BodyRow1[0].f2_3[0]"),
    textField("disallowed_tax", 2, "Table_Part3[0].BodyRow1[0].f2_7[0]"),
    textField("disallowed_tax", 2, "Table_Part3[0].BodyRow1[0].f2_10[0]"),
    simple("disallowed_tax", 2, "f2_20"),
    simple("disallowed_tax", 2, "f2_21"),
    {
      kind: "checkboxWhen",
      domainKey: "section986_election",
      pdfField: "topmostSubform[0].Page2[0].c2_1[1]",
      whenValue: "false",
    },
    { ...e1("total_tax_usd", "4", "f2_47"), fallbackDomainKey: "tax_usd" },
    { ...e1("total_tax_usd", "8", "f2_63"), fallbackDomainKey: "tax_usd" },
    { ...e1("total_tax_usd", "13", "f2_83"), fallbackDomainKey: "tax_usd" },
    e1("e1_reduction", "15", "f2_91"),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 5471 Schedule E PDF needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    if (cfc.owned_worksheet_source) {
      return owned5471PdfValues(cfc, shareholderName, "E");
    }
    const e = cfc.schedule_e;
    return [{
      shareholder_name: shareholderName,
      shareholder_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      category: "GEN",
      payor_name: cfc.foreign_corp_name,
      payor_id: cfc.foreign_corp_ein ?? cfc.foreign_corp_reference_id,
      country: e.tax_country_code,
      foreign_year_end: e.foreign_tax_year_end.replaceAll("-", "/"),
      us_year_end: e.us_tax_year_end.replaceAll("-", "/"),
      taxable_income: e.taxable_income_local,
      local_currency: e.local_currency,
      tax_local: e.tax_local,
      rate: e.tax_conversion_rate,
      tax_usd: e.tax_usd,
      total_tax_usd: e.tax_usd,
      total_tax_functional: e.tax_functional,
      tax_functional: e.tax_functional,
      section986_election: e.section986_election,
      e1_reduction: -e.tax_usd,
    }];
  },
};
