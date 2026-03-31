import type { ScheduleFFields, ScheduleFInput } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof ScheduleFFields, string]> = [
  ["crop_insurance", "CropInsuranceProceedsAmt"],
  ["line8_other_income", "OtherFarmIncomeAmt"],
];

function buildIRS1040ScheduleF(fields: ScheduleFInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleF", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class ScheduleFMefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040sf.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1040ScheduleF(pending.schedule_f ?? {});
  }
}

export const scheduleF = new ScheduleFMefNode();
