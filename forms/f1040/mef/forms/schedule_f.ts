import type { ScheduleFFields, ScheduleFInput } from "../types.ts";
import { element, elements } from "../xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof ScheduleFFields, string]> = [
  ["crop_insurance", "CropInsuranceProceedsAmt"],
  ["line8_other_income", "OtherFarmIncomeAmt"],
];

export function buildIRS1040ScheduleF(fields: ScheduleFInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleF", children);
}
