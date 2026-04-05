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

// Tag names verified against IRS1040ScheduleSE.xsd (2025v3.0):
//   net_profit_schedule_c → NetNonFarmProfitLossAmt (line 2; was NetProfitOrLossAmt)
//   net_profit_schedule_f → NetFarmProfitLossAmt (line 1a; was NetFarmProfitOrLossAmt)
// IRS1040ScheduleSE.xsd §60 requires SSN (no minOccurs) before all other fields.
// When taxpayer_ssn is absent from the pending dict, "000000000" is used as a
// placeholder to keep the XML well-formed.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["net_profit_schedule_c", "NetNonFarmProfitLossAmt"],
  ["net_profit_schedule_f", "NetFarmProfitLossAmt"],
  ["unreported_tips_4137", "Form4137UnreportedTipsAmt"],
  ["wages_8919", "WagesSubjectToSSTAmt"],
  ["w2_ss_wages", "SocSecWagesAmt"],
];

function buildIRS1040ScheduleSE(fields: Input): string {
  const hasAnyNumericField = FIELD_MAP.some(([key]) => typeof fields[key] === "number");
  if (!hasAnyNumericField) return "";

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
