import { form8936Lines } from "../../form8936_lines.ts";
import { inputSchema, modifiedAgi } from "../../../nodes/inputs/f8936/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const page = "topmostSubform[0].Page1[0].";
const text = (domainKey: string, field: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}${field}`,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("line1a", "Line1a_ReadOrder[0].f1_3[0]"),
  text("line1b", "f1_4[0]"),
  text("line1c", "f1_5[0]"),
  text("line1d", "f1_6[0]"),
  text("line1e", "f1_7[0]"),
  text("line2", "f1_8[0]"),
  text("line3a", "Line3a_ReadOrder[0].f1_9[0]"),
  text("line3b", "f1_10[0]"),
  text("line3c", "f1_11[0]"),
  text("line3d", "f1_12[0]"),
  text("line3e", "f1_13[0]"),
  text("line4", "f1_14[0]"),
  text("line5", "f1_15[0]"),
  text("line6", "f1_16[0]"),
  text("line8", "f1_18[0]"),
  text("line9", "f1_19[0]"),
  text("line10", "f1_20[0]"),
  text("line11", "f1_21[0]"),
  {
    kind: "text",
    domainKey: "line12",
    pdfField: `${page}f1_22[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line13",
    pdfField: `${page}f1_23[0]`,
    printZero: true,
  },
  text("line14", "f1_24[0]"),
  text("line15", "f1_25[0]"),
  text("line16", "f1_26[0]"),
  {
    kind: "text",
    domainKey: "line17",
    pdfField: `${page}f1_27[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line18",
    pdfField: `${page}f1_28[0]`,
    printZero: true,
  },
  text("line19", "f1_29[0]"),
  text("line21", "f1_31[0]"),
];

const printedStatus: Readonly<Record<FilingStatus, string>> = {
  [FilingStatus.Single]: "S",
  [FilingStatus.MFJ]: "MFJ",
  [FilingStatus.MFS]: "MFS",
  [FilingStatus.HOH]: "HOH",
  [FilingStatus.QSS]: "QSS",
};

export const form8936Pdf: PdfFormDescriptor = {
  pendingKey: "f8936",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8936--2025.pdf",
  fields,
  filerFields: [
    text("nameLine1", "f1_1[0]"),
    text("primarySSN", "f1_2[0]"),
  ],
  projectFields(fields, allPending) {
    if (!Array.isArray(fields.f8936s) || fields.f8936s.length === 0) {
      return {};
    }
    const source = inputSchema.parse(fields);
    const lines = form8936Lines(source, allPending);
    if (lines === undefined) return {};
    const current = source.current_year_magi;
    const prior = source.prior_year_magi;
    return {
      line1a: current.adjusted_gross_income,
      line1b: current.excluded_puerto_rico_income,
      line1c: current.foreign_earned_income_exclusion,
      line1d: current.foreign_housing_deduction,
      line1e: current.excluded_american_samoa_income,
      line2: modifiedAgi(current),
      line3a: prior.adjusted_gross_income,
      line3b: prior.excluded_puerto_rico_income,
      line3c: prior.foreign_earned_income_exclusion,
      line3d: prior.foreign_housing_deduction,
      line3e: prior.excluded_american_samoa_income,
      line4: modifiedAgi(prior),
      line5: printedStatus[source.prior_year_filing_status],
      line6: lines.line6Business > 0 ? lines.line6Business : undefined,
      line8: lines.line8Business > 0 ? lines.line8Business : undefined,
      ...(lines.line9TentativeNew > 0
        ? {
          line9: lines.line9TentativeNew,
          line10: lines.line10TaxBeforeCredits,
          line11: lines.line11OtherCredits,
          line12: lines.line12NewAvailable,
          line13: lines.line13AllowedNew,
        }
        : {}),
      ...(lines.line14TentativeUsed > 0
        ? {
          line14: lines.line14TentativeUsed,
          line15: lines.line15TaxBeforeCredits,
          line16: lines.line16OtherCredits,
          line17: lines.line17UsedAvailable,
          line18: lines.line18AllowedUsed,
        }
        : {}),
      line19: lines.line19Commercial > 0 ? lines.line19Commercial : undefined,
      line21: lines.line19Commercial > 0 ? lines.line19Commercial : undefined,
    };
  },
};
