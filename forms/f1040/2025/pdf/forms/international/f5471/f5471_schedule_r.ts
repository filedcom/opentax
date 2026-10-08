import type { PdfFormDescriptor } from "../../../reviews/execution/form-descriptor.ts";
import { projectForm8992Source } from "../../../../domains/international/form8992/form8992_source.ts";

const page = "topmostSubform[0].Page1[0].";

export const form5471ScheduleRPdf: PdfFormDescriptor = {
  pendingKey: "f5471_schedule_r",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sr.pdf",
  pageIndices: () => [0],
  fields: [
    { kind: "text", domainKey: "filer_name", pdfField: `${page}f1_1[0]` },
    { kind: "text", domainKey: "filer_tin", pdfField: `${page}f1_2[0]` },
    { kind: "text", domainKey: "cfc_name", pdfField: `${page}f1_3[0]` },
    { kind: "text", domainKey: "cfc_ein", pdfField: `${page}f1_4[0]` },
    {
      kind: "text",
      domainKey: "cfc_reference_id",
      pdfField: `${page}f1_5[0]`,
    },
    {
      kind: "text",
      domainKey: "no_distribution_description",
      pdfField: `${page}Table_Lines1-24[0].Line1[0].f1_6[0]`,
    },
    {
      kind: "text",
      domainKey: "distribution_total_functional",
      pdfField: `${page}Table_Lines1-24[0].Line1[0].f1_8[0]`,
      printZero: true,
    },
    {
      kind: "text",
      domainKey: "ep_distribution_total_functional",
      pdfField: `${page}Table_Lines1-24[0].Line1[0].f1_9[0]`,
      printZero: true,
    },
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 5471 Schedule R PDF needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    return [{
      filer_name: shareholderName,
      filer_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      // Required all-zero schedules still print zero amounts. This is an
      // explanation of the reviewed empty ledger, not a dated distribution.
      no_distribution_description: "No distributions during the tax year",
      distribution_total_functional: 0,
      ep_distribution_total_functional: 0,
    }];
  },
};
