import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  crop_insurance?: number | null;
  line8_other_income?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["crop_insurance", "CropInsuranceProceedsAmt"],
  ["line8_other_income", "OtherFarmIncomeAmt"],
];

function buildIRS1040ScheduleF(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleF", children);
}

export const scheduleF: MefFormDescriptor<"schedule_f", Input> = {
  pendingKey: "schedule_f",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sf.pdf",
  build(fields) {
    return buildIRS1040ScheduleF(fields);
  },
};
