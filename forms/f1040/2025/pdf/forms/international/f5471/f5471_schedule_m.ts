import type { PdfFieldEntry, PdfFormDescriptor } from "../../../reviews/execution/form-descriptor.ts";
import { projectForm8992Source } from "../../../../domains/international/form8992/form8992_source.ts";

const text = (
  key: string,
  page: number,
  path: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: `topmostSubform[0].Page${page}[0].${path}`,
  printZero,
});
const row = (
  key: string,
  page: number,
  line: number,
  field: number,
  printZero = false,
) =>
  text(key, page, `Table[0].BodyRow${line}[0].f${page}_${field}[0]`, printZero);

export const form5471ScheduleMPdf: PdfFormDescriptor = {
  pendingKey: "f5471_schedule_m",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5471sm--2021.pdf",
  pageIndices: () => [0, 1],
  fields: [
    text("filer_name", 1, "f1_1[0]"),
    text("filer_tin", 1, "f1_2[0]"),
    text("cfc_name", 1, "f1_3[0]"),
    text("cfc_ein", 1, "f1_4[0]"),
    text("cfc_reference_id", 1, "f1_5[0]"),
    text("currency_rate", 1, "f1_6[0]"),
    row("inventory_sales", 1, 1, 7),
    row("interest_received", 1, 11, 57),
    row("total_received", 1, 15, 77),
    text("filer_name", 2, "f2_1[0]"),
    text("filer_tin", 2, "f2_2[0]"),
    row("max_accounts_payable", 2, 31, 3, true),
    row("max_borrowing", 2, 32, 8, true),
    row("max_accounts_receivable", 2, 33, 13, true),
    row("max_lending", 2, 34, 18, true),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 5471 Schedule M PDF needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    const m = cfc.schedule_m;
    return [{
      filer_name: shareholderName,
      filer_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      currency_rate:
        `${cfc.functional_currency} / ${cfc.schedule_i1.average_exchange_rate}`,
      inventory_sales: m.inventory_sales_to_filer_usd,
      interest_received: m.interest_received_from_filer_usd,
      total_received: m.inventory_sales_to_filer_usd +
        (m.interest_received_from_filer_usd ?? 0),
      max_accounts_payable: m.maximum_related_party_accounts_payable_usd,
      max_borrowing: m.maximum_related_party_borrowing_usd,
      max_accounts_receivable: m.maximum_related_party_accounts_receivable_usd,
      max_lending: m.maximum_related_party_lending_usd,
    }];
  },
};
