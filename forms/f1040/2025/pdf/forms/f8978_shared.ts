import { isDeepStrictEqual } from "node:util";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  calculateFiling,
  type Form8978Lines,
  inputSchema,
} from "../../../nodes/inputs/f8978/index.ts";

export function form8978PdfSource(
  allPending: Record<string, Record<string, unknown>>,
  filer: FilerIdentity | undefined,
): { filing: Form8978Lines; name: string; tin: string } {
  const raw = allPending.f8978;
  if (!raw) throw new Error("Form 8978 PDF needs its source filing");
  const input = inputSchema.parse(raw);
  if (input.filings.length !== 1 || input.filings[0].columns.length !== 1) {
    throw new Error(
      "Form 8978 PDF currently supports one filing and one affected tax year; additional forms or columns need a separately reviewed projection",
    );
  }
  const column = input.filings[0].columns[0];
  if (
    column.income_adjustments.length > 7 ||
    column.deduction_adjustments.length > 7 ||
    column.credit_adjustments.length > 7
  ) {
    throw new Error(
      "Form 8978 Schedule A PDF has seven printed rows per adjustment category",
    );
  }
  const filing = calculateFiling(input.filings[0]);
  if (
    !Array.isArray(raw.calculated_filings) ||
    raw.calculated_filings.length !== 1 ||
    !isDeepStrictEqual(raw.calculated_filings[0], filing) ||
    raw.line14 !== filing.line14
  ) {
    throw new Error(
      "Form 8978 PDF source and native affected-year calculation disagree",
    );
  }
  const return1040 = allPending.f1040 ?? {};
  const reporting = allPending.form8978_reporting_year ?? {};
  if (filing.line14 > 0) {
    if (
      return1040.form8978_tax !== filing.line14 ||
      typeof return1040.line16_income_tax !== "number" ||
      return1040.line16_income_tax < filing.line14 ||
      reporting.negative_form8978_line14 !== undefined
    ) {
      throw new Error(
        "Form 8978 PDF positive line 14 disagrees with finalized Form 1040 line 16 routing",
      );
    }
  } else if (filing.line14 < 0) {
    if (
      reporting.negative_form8978_line14 !== -filing.line14 ||
      return1040.form8978_tax !== undefined
    ) {
      throw new Error(
        "Form 8978 PDF negative line 14 disagrees with the finalized reporting-year worksheet",
      );
    }
  } else if (
    return1040.form8978_tax !== undefined ||
    reporting.negative_form8978_line14 !== undefined
  ) {
    throw new Error("Form 8978 PDF zero line 14 has unexpected return routing");
  }
  const name = filer?.nameLine1?.trim();
  const tin = filer?.primarySSN?.replaceAll("-", "");
  if (!name || !tin || !/^\d{9}$/.test(tin)) {
    throw new Error("Form 8978 PDF needs the filing partner's name and TIN");
  }
  return { filing, name, tin };
}
