import { element, elements } from "../xml.ts";
import type { ScheduleSEFields, ScheduleSEInput } from "../types.ts";
export type { ScheduleSEInput };

const FIELD_MAP: ReadonlyArray<readonly [keyof ScheduleSEFields, string]> = [
  ["net_profit_schedule_c", "NetProfitOrLossAmt"],
  ["net_profit_schedule_f", "NetFarmProfitOrLossAmt"],
  ["unreported_tips_4137", "Form4137UnreportedTipsAmt"],
  ["wages_8919", "WagesSubjectToSSTAmt"],
  ["w2_ss_wages", "SocSecWagesAmt"],
];

export function buildIRS1040ScheduleSE(fields: ScheduleSEInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleSE", children);
}
