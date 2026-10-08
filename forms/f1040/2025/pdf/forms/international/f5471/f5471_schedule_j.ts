import { owned5471PdfValues } from "./f5471-owned-values.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../../reviews/execution/form-descriptor.ts";
import { projectForm8992Source } from "../../../../domains/international/form8992/form8992_source.ts";

const page = (number: number) => `topmostSubform[0].Page${number}[0].`;
const text = (
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
  field: number,
  printZero = false,
) =>
  text(
    key,
    pdfPage,
    `${table}[0].BodyRow${line}[0].f${pdfPage}_${field}[0]`,
    printZero,
  );
const page1 = "Table_Part1_a-eii";
const page2Top = "Part1_Table_eiii-evii";
const page2Bottom = "Part1_Table_eviii-f";

export const form5471ScheduleJPdf: PdfFormDescriptor = {
  pendingKey: "f5471_schedule_j",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sj.pdf",
  pageIndices: () => [0, 1, 2],
  fields: [
    text("shareholder_name", 1, "f1_1[0]"),
    text("shareholder_tin", 1, "f1_2[0]"),
    text("cfc_name", 1, "f1_3[0]"),
    text("cfc_ein", 1, "f1_4[0]"),
    text("cfc_reference_id", 1, "f1_5[0]"),
    text("category", 1, "f1_6[0]"),
    row("a1a", 1, page1, "1a", 8),
    row("a1c", 1, page1, "1c", 20),
    row("a3", 1, page1, "3", 38),
    row("a7", 1, page1, "7", 68),
    row("a8", 1, page1, "8", 74),
    row("a11", 1, page1, "11", 92),
    row("a14", 1, page1, "14", 110),
    row("eiii10", 2, page2Top, "10", 66),
    row("eiii11", 2, page2Top, "11", 71),
    row("eiii14", 2, page2Top, "14", 86),
    row("eviii8", 2, page2Bottom, "8", 135),
    row("eviii10", 2, page2Bottom, "10", 143),
    row("eviii14", 2, page2Bottom, "14", 159, true),
    row("ex8", 2, page2Bottom, "8", 137),
    row("ex10", 2, page2Bottom, "10", 145),
    row("ex14", 2, page2Bottom, "14", 161, true),
    row("f1a", 2, page2Bottom, "1a", 94),
    row("f1c", 2, page2Bottom, "1c", 102),
    row("f3", 2, page2Bottom, "3", 114),
    row("f7", 2, page2Bottom, "7", 134),
    row("f14", 2, page2Bottom, "14", 162),
    text("part_ii_1", 3, "f3_1[0]", true),
    text("part_ii_2", 3, "f3_2[0]", true),
    text("part_ii_3", 3, "f3_3[0]", true),
    text("part_ii_4", 3, "f3_4[0]", true),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 5471 Schedule J PDF needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    if (cfc.owned_worksheet_source) {
      return owned5471PdfValues(cfc, shareholderName, "J");
    }
    const j = cfc.schedule_j;
    const opening = j.opening_post2017_untaxed_ep_functional;
    const current = cfc.schedule_h.book_net_income_functional;
    const beforeInclusions = opening + current;
    const subpartF = j.subpart_f_inclusion_functional;
    const gilti = j.section951a_inclusion_functional;
    const section956 = j.section956_inclusion_functional;
    const reclassifiedPtep = j.section956_ptep_reclassified_functional;
    return [{
      shareholder_name: shareholderName,
      shareholder_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      category: "GEN",
      a1a: opening,
      a1c: opening,
      a3: current,
      a7: beforeInclusions,
      a8: -(subpartF + gilti),
      a11: -section956,
      a14: beforeInclusions - subpartF - gilti - section956,
      eiii10: reclassifiedPtep,
      eiii11: section956,
      eiii14: reclassifiedPtep + section956,
      eviii8: gilti,
      eviii10: -gilti,
      eviii14: 0,
      ex8: subpartF,
      ex10: -subpartF,
      ex14: 0,
      f1a: opening,
      f1c: opening,
      f3: current,
      f7: beforeInclusions,
      f14: beforeInclusions,
      part_ii_1: 0,
      part_ii_2: 0,
      part_ii_3: 0,
      part_ii_4: 0,
    }];
  },
};
