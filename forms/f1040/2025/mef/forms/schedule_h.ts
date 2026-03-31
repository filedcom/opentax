import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  total_cash_wages?: number | null;
  ss_wages?: number | null;
  medicare_wages?: number | null;
  federal_income_tax_withheld?: number | null;
  employee_ss_withheld?: number | null;
  employee_medicare_withheld?: number | null;
  futa_wages?: number | null;
  futa_tax?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["total_cash_wages", "TotCashWagesPdToHshldEmplAmt"],
  ["ss_wages", "SocialSecurityWagesAmt"],
  ["medicare_wages", "MedicareWagesAndTipsAmt"],
  ["federal_income_tax_withheld", "FedIncomeTaxWithheldAmt"],
  ["employee_ss_withheld", "SocSecTaxWithheldAmt"],
  ["employee_medicare_withheld", "MedicareTaxWithheldAmt"],
  ["futa_wages", "FUTATaxableWagesAmt"],
  ["futa_tax", "FUTATaxAmt"],
];

function buildIRS1040ScheduleH(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleH", children);
}

export const scheduleH: MefFormDescriptor<"schedule_h", Input> = {
  pendingKey: "schedule_h",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sh.pdf",
  build(fields) {
    return buildIRS1040ScheduleH(fields);
  },
};
