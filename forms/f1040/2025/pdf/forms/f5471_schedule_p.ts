import { owned5471PdfValues } from "./f5471-owned-values.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectForm8992Source } from "../../form8992_source.ts";

const page = (number: number) => `topmostSubform[0].Page${number}[0].`;
const field = (
  key: string,
  pdfPage: number,
  path: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: `${page(pdfPage)}${path}`,
  printZero,
});
const row = (
  key: string,
  pdfPage: number,
  table: string,
  line: string,
  fieldNumber: number,
  printZero = false,
) =>
  field(
    key,
    pdfPage,
    `${table}[0].BodyRow${line}[0].f${pdfPage}_${fieldNumber}[0]`,
    printZero,
  );

export const form5471SchedulePPdf: PdfFormDescriptor = {
  pendingKey: "f5471_schedule_p",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sp.pdf",
  pageIndices: () => [0, 1, 2, 3],
  fields: [
    field("filer_name", 1, "f1_1[0]"),
    field("filer_tin", 1, "f1_2[0]"),
    field("shareholder_name", 1, "f1_3[0]"),
    field("shareholder_tin", 1, "f1_4[0]"),
    field("cfc_name", 1, "f1_5[0]"),
    field("cfc_ein", 1, "f1_6[0]"),
    field("cfc_reference_id", 1, "f1_7[0]"),
    field("category", 1, "f1_8[0]"),
    row("fc_c9", 1, "Table_Part1", "9", 42),
    row("fc_c10", 1, "Table_Part1", "10", 45),
    row("fc_c12", 1, "Table_Part1", "12", 51),
    row("fc_h7", 2, "Pg2Table", "7", 70),
    row("fc_h9", 2, "Pg2Table", "9", 95),
    row("fc_h12", 2, "Pg2Table", "12", 119, true),
    row("fc_j7", 2, "Pg2Table", "7", 72),
    row("fc_j9", 2, "Pg2Table", "9", 97),
    row("fc_j12", 2, "Pg2Table", "12", 121, true),
    row("fc_k7", 2, "Pg2Table", "7", 73),
    row("fc_k10", 2, "Pg2Table", "10", 106),
    row("fc_k12", 2, "Pg2Table", "12", 122),
    row("us_c9", 3, "Pg3Table", "9", 33),
    row("us_c10", 3, "Pg3Table", "10", 36),
    row("us_c12", 3, "Pg3Table", "12", 42),
    row("us_h7", 4, "Pg4Table", "7", 69),
    row("us_h9", 4, "Pg4Table", "9", 85),
    row("us_h12", 4, "Pg4Table", "12", 109, true),
    row("us_j7", 4, "Pg4Table", "7", 71),
    row("us_j9", 4, "Pg4Table", "9", 87),
    row("us_j12", 4, "Pg4Table", "12", 111, true),
    row("us_k7", 4, "Pg4Table", "7", 72),
    row("us_k10", 4, "Pg4Table", "10", 96),
    row("us_k12", 4, "Pg4Table", "12", 112),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 5471 Schedule P PDF needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    const j = cfc.schedule_j;
    if (cfc.owned_worksheet_source) {
      return owned5471PdfValues(cfc, shareholderName, "P");
    }
    const p = cfc.schedule_p;
    const subpartFUsd = cfc.schedule_i.line1a + cfc.schedule_i.line1b +
      cfc.schedule_i.line1c + cfc.schedule_i.line1d + cfc.schedule_i.line1e +
      cfc.schedule_i.line1f + cfc.schedule_i.line1g + cfc.schedule_i.line1h;
    const giltiUsd = p.section956_ptep_reclassified_usd_basis - subpartFUsd;
    const totalFunctional = j.section956_ptep_reclassified_functional;
    const totalUsd = p.section956_ptep_reclassified_usd_basis;
    const section956Usd = cfc.schedule_i.line2_us_property;
    return [{
      filer_name: shareholderName,
      filer_tin: cfc.shareholder_tin,
      shareholder_name: shareholderName,
      shareholder_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      category: "GEN",
      fc_c9: totalFunctional,
      fc_c10: j.section956_inclusion_functional,
      fc_c12: totalFunctional + j.section956_inclusion_functional,
      fc_h7: j.section951a_inclusion_functional,
      fc_h9: -j.section951a_inclusion_functional,
      fc_h12: 0,
      fc_j7: j.subpart_f_inclusion_functional,
      fc_j9: -j.subpart_f_inclusion_functional,
      fc_j12: 0,
      fc_k7: totalFunctional,
      fc_k10: j.section956_inclusion_functional,
      fc_k12: totalFunctional + j.section956_inclusion_functional,
      us_c9: totalUsd,
      us_c10: section956Usd,
      us_c12: totalUsd + section956Usd,
      us_h7: giltiUsd,
      us_h9: -giltiUsd,
      us_h12: 0,
      us_j7: subpartFUsd,
      us_j9: -subpartFUsd,
      us_j12: 0,
      us_k7: totalUsd,
      us_k10: section956Usd,
      us_k12: totalUsd + section956Usd,
    }];
  },
};
