import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  net_profit_schedule_c?: number | null;
  net_profit_schedule_f?: number | null;
  unreported_tips_4137?: number | null;
  wages_8919?: number | null;
  w2_ss_wages?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names and element ordering verified against IRS1040ScheduleSE.xsd (2025v3.0):
//   net_profit_schedule_f → NetFarmProfitLossAmt   (xsd line 79)
//   net_profit_schedule_c → NetNonFarmProfitLossAmt (xsd line 97)
//   w2_ss_wages           → SSTWagesRRTCompAmt      (xsd line 271; W-2 SS wages for SE cap)
//   unreported_tips_4137  → UnreportedTipsAmt        (xsd line 280)
//   wages_8919            → WagesSubjectToSSTAmt     (xsd line 289)
// IRS1040ScheduleSE.xsd §60 requires SSN (no minOccurs) before all other fields.
// When taxpayer_ssn is absent from the pending dict, "000000000" is used as a
// placeholder to keep the XML well-formed.
// SE_INCOME_KEYS: fields that trigger Schedule SE emission. w2_ss_wages alone
// (W-2-only filers) should not cause a Schedule SE to be generated.
const SE_INCOME_KEYS: ReadonlyArray<keyof Fields> = [
  "net_profit_schedule_c",
  "net_profit_schedule_f",
  "unreported_tips_4137",
  "wages_8919",
];

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["net_profit_schedule_f", "NetFarmProfitLossAmt"],
  ["net_profit_schedule_c", "NetNonFarmProfitLossAmt"],
  ["w2_ss_wages", "SSTWagesRRTCompAmt"],
  ["unreported_tips_4137", "UnreportedTipsAmt"],
  ["wages_8919", "WagesSubjectToSSTAmt"],
];

function buildIRS1040ScheduleSE(fields: Input): string {
  const hasSeIncome = SE_INCOME_KEYS.some((key) => typeof fields[key] === "number");
  if (!hasSeIncome) return "";

  // IRS1040ScheduleSE.xsd §60 requires SSN before income fields.
  // Use taxpayer_ssn from pending dict if available; fall back to placeholder.
  const ssn = typeof fields["taxpayer_ssn"] === "string"
    ? (fields["taxpayer_ssn"] as string)
    : "000000000";

  const ssnChild = element("SSN", ssn);
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleSE", [ssnChild, ...children]);
}

export const scheduleSE: MefFormDescriptor<"schedule_se", Input> = {
  pendingKey: "schedule_se",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sse.pdf",
  build(fields) {
    return buildIRS1040ScheduleSE(fields);
  },
};
