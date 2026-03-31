import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line_1a_proceeds?: number | null;
  line_1a_cost?: number | null;
  line_4_other_st?: number | null;
  line_5_k1_st?: number | null;
  line_6_carryover?: number | null;
  line_8a_proceeds?: number | null;
  line_8a_cost?: number | null;
  line_11_form2439?: number | null;
  line_12_k1_lt?: number | null;
  line13_cap_gain_distrib?: number | null;
  line_12_cap_gain_dist?: number | null;
  line_14_carryover?: number | null;
  line19_unrecaptured_1250?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Direct 1:1 scalar field mappings (inputSchema key -> XSD element name)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line_4_other_st", "STGainOrLossFromFormsAmt"],
  ["line_5_k1_st", "NetSTGainOrLossFromSchK1Amt"],
  ["line_6_carryover", "STCapitalLossCarryoverAmt"],
  ["line_11_form2439", "LTGainOrLossFromFormsAmt"],
  ["line_12_k1_lt", "NetLTGainOrLossFromSchK1Amt"],
  ["line_14_carryover", "LTCapitalLossCarryoverAmt"],
  ["line19_unrecaptured_1250", "UnrcptrSect1250GainWrkshtAmt"],
];

// Aggregated mappings: multiple inputSchema fields summed into single XSD element.
// Both line13_cap_gain_distrib (from f1099div) and line_12_cap_gain_dist (from d_screen)
// represent Schedule D Line 13 from different input sources — they are not additive fields
// but alternative sources that may both be present and should be summed.
const AGGREGATED_CAP_GAIN_DIST: ReadonlyArray<keyof Fields> = [
  "line13_cap_gain_distrib",
  "line_12_cap_gain_dist",
];

// Build a nested F1040BasisRptNoAdjustmentsType group element (lines 1a / 8a).
// Only emits the group if at least one of proceeds or cost is a number.
function buildBasisRptNoAdjGroup(
  groupTag: string,
  proceeds: number | null | undefined,
  cost: number | null | undefined,
): string {
  const hasProceeds = typeof proceeds === "number";
  const hasCost = typeof cost === "number";
  if (!hasProceeds && !hasCost) return "";

  const children: string[] = [
    hasProceeds
      ? element("TotalProceedsSalesPriceAmt", proceeds as number)
      : "",
    hasCost ? element("TotalCostOrOtherBasisAmt", cost as number) : "",
  ];

  // TotalGainOrLossAmt is only emitted when both values are present
  if (hasProceeds && hasCost) {
    children.push(
      element("TotalGainOrLossAmt", (proceeds as number) - (cost as number)),
    );
  }

  return elements(groupTag, children);
}

function buildIRS1040ScheduleD(fields: Input): string {
  const f = fields as Fields;
  const children: string[] = [];

  // Nested groups first (XSD order: line 1a before line 8a)
  children.push(
    buildBasisRptNoAdjGroup(
      "TotalSTCGL1099BBssRptNoAdjGrp",
      f.line_1a_proceeds,
      f.line_1a_cost,
    ),
  );
  children.push(
    buildBasisRptNoAdjGroup(
      "TotalLTCGL1099BBssRptNoAdjGrp",
      f.line_8a_proceeds,
      f.line_8a_cost,
    ),
  );

  // Scalar FIELD_MAP
  for (const [key, tag] of FIELD_MAP) {
    const value = f[key];
    if (typeof value !== "number") continue;
    children.push(element(tag, value));
  }

  // Aggregated capital gain distributions (line 13 from two possible sources)
  const capGainValues = AGGREGATED_CAP_GAIN_DIST
    .map((k) => f[k])
    .filter((v): v is number => typeof v === "number");
  if (capGainValues.length > 0) {
    const sum = capGainValues.reduce((a, b) => a + b, 0);
    children.push(element("CapitalGainDistributionsAmt", sum));
  }

  return elements("IRS1040ScheduleD", children);
}

export const scheduleD: MefFormDescriptor<"schedule_d", Input> = {
  pendingKey: "schedule_d",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sd.pdf",
  build(fields) {
    return buildIRS1040ScheduleD(fields);
  },
};
