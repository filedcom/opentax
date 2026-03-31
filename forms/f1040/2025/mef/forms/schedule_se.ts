import type { ScheduleSEFields, ScheduleSEInput } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof ScheduleSEFields, string]> = [
  ["net_profit_schedule_c", "NetProfitOrLossAmt"],
  ["net_profit_schedule_f", "NetFarmProfitOrLossAmt"],
  ["unreported_tips_4137", "Form4137UnreportedTipsAmt"],
  ["wages_8919", "WagesSubjectToSSTAmt"],
  ["w2_ss_wages", "SocSecWagesAmt"],
];

function buildIRS1040ScheduleSE(fields: ScheduleSEInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleSE", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class ScheduleSEMefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040sse.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1040ScheduleSE(pending.schedule_se ?? {});
  }
}

export const scheduleSE = new ScheduleSEMefNode();
