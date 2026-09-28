import { element, elements } from "../../../mef/xml.ts";
import type { ScheduleJLines } from "../../../nodes/intermediate/forms/schedule_j/calculation.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

// The calculator publishes one complete set of Schedule J dollar lines. Lines
// 10, 14, and 18 appear on paper but have no TY2025 MeF elements: the schema
// uses lines 6 and 17 for those repeated values.
export type ScheduleJFields = ScheduleJLines;

type Line = keyof ScheduleJFields;
type Input = ScheduleJFields | readonly [];

const ALL_LINES: readonly Line[] = [
  "line1", "line2a", "line2b", "line2c", "line3", "line4", "line5",
  "line6", "line7", "line8", "line9", "line10", "line11", "line12",
  "line13", "line14", "line15", "line16", "line17", "line18",
  "line19", "line20", "line21", "line22", "line23",
];

const NONNEGATIVE_LINES: readonly Line[] = [
  "line1", "line2a", "line2b", "line2c", "line3", "line4", "line6", "line7",
  "line8", "line10", "line12", "line14", "line16", "line17",
  "line18", "line19", "line20", "line21",
  "line22", "line23",
];

// Exact element sequence in TY2025 v5.4 IRS1040ScheduleJ.xsd.
export const FIELD_MAP: ReadonlyArray<readonly [Line, string]> = [
  ["line1", "TaxableIncomeAmt"],
  ["line2a", "ElectedFarmIncomeAmt"],
  ["line2b", "ExcessNetLongTermCapGainAmt"],
  ["line2c", "UnrecapturedPropertyGainAmt"],
  ["line3", "NetIncomeAmt"],
  ["line4", "CurrentTaxAmt"],
];

function line(value: unknown, name: Line): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Schedule J ${name} needs a whole-dollar amount`);
  }
  return value;
}

function numberFromReturn(
  fields: Record<string, unknown>,
  key: string,
): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Schedule J needs finalized Form 1040 ${key}`);
  }
  return value;
}

export function buildScheduleJ(
  raw: Input,
  context: MefBuildContext = {},
): string {
  // buildFragments passes [] for every absent optional document.
  if (Array.isArray(raw)) {
    if (raw.length === 0) return "";
    throw new Error("Schedule J needs one complete calculated line set");
  }
  const fields = raw as ScheduleJFields;
  for (const name of ALL_LINES) line(fields[name], name);
  for (const name of NONNEGATIVE_LINES) {
    if (fields[name] < 0) {
      throw new Error(`Schedule J ${name} cannot be negative`);
    }
  }
  if (
    fields.line2a <= 0 || fields.line2a > fields.line1 ||
    fields.line2b > fields.line2a || fields.line2c > fields.line2b ||
    fields.line3 !== fields.line1 - fields.line2a ||
    fields.line6 !== Math.round(fields.line2a / 3) ||
    fields.line7 !== Math.max(0, fields.line5 + fields.line6) ||
    fields.line11 !== fields.line9 + fields.line6 ||
    fields.line15 !== fields.line13 + fields.line6 ||
    fields.line10 !== fields.line6 || fields.line14 !== fields.line6 ||
    fields.line18 !== fields.line17 ||
    fields.line17 !== fields.line4 + fields.line8 + fields.line12 +
      fields.line16 ||
    fields.line22 !== fields.line19 + fields.line20 + fields.line21 ||
    fields.line23 !== fields.line18 - fields.line22
  ) {
    throw new Error("Schedule J lines do not reconcile");
  }
  const returnFields = context.pending?.f1040;
  if (!returnFields || typeof returnFields !== "object") {
    throw new Error("Schedule J needs finalized Form 1040");
  }
  const f1040 = returnFields as Record<string, unknown>;
  if (
    fields.line1 !== numberFromReturn(f1040, "line15_taxable_income") ||
    fields.line23 !== numberFromReturn(f1040, "line16_income_tax")
  ) {
    throw new Error("Schedule J must reconcile to Form 1040 lines 15 and 16");
  }
  return elements("IRS1040ScheduleJ", [
    ...FIELD_MAP.map(([name, tag]) => element(tag, fields[name])),
    elements("ThirdPYTxblFarmIncmDetail", [
      element("TaxableIncomeAmt", fields.line5),
      element("AverageIncomeAmt", fields.line6),
      element("NetIncomeAmt", fields.line7),
      element("TaxTableAmt", fields.line8),
    ]),
    elements("SecondPYTxblFarmIncmDetail", [
      element("TaxableIncomeAmt", fields.line9),
      element("NetIncomeAmt", fields.line11),
      element("TaxTableAmt", fields.line12),
    ]),
    elements("FirstPYTxblFarmIncmDetail", [
      element("TaxableIncomeAmt", fields.line13),
      element("NetIncomeAmt", fields.line15),
      element("TaxTableAmt", fields.line16),
    ]),
    element("TotalTaxTableAmt", fields.line17),
    element("TentativeTax3rdPYRtnAmt", fields.line19),
    element("TentativeTax2ndPYRtnAmt", fields.line20),
    element("TentativeTax1stPYRtnAmt", fields.line21),
    element("GrossFarmIncomeTaxAmt", fields.line22),
    element("AverageFarmIncomeTaxAmt", fields.line23),
  ]);
}

export const scheduleJ: MefFormDescriptor<"schedule_j", Input> = {
  pendingKey: "schedule_j",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sj--2025.pdf",
  build: buildScheduleJ,
};
