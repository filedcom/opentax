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

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["net_profit_schedule_c", "NetProfitOrLossAmt"],
  ["net_profit_schedule_f", "NetFarmProfitOrLossAmt"],
  ["unreported_tips_4137", "Form4137UnreportedTipsAmt"],
  ["wages_8919", "WagesSubjectToSSTAmt"],
  ["w2_ss_wages", "SocSecWagesAmt"],
];

function buildIRS1040ScheduleSE(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleSE", children);
}

export const scheduleSE: MefFormDescriptor<"schedule_se", Input> = {
  pendingKey: "schedule_se",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sse.pdf",
  build(fields) {
    return buildIRS1040ScheduleSE(fields);
  },
};
