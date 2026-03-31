import type { ScheduleHFields, ScheduleHInput } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof ScheduleHFields, string]> = [
  ["total_cash_wages", "TotCashWagesPdToHshldEmplAmt"],
  ["ss_wages", "SocialSecurityWagesAmt"],
  ["medicare_wages", "MedicareWagesAndTipsAmt"],
  ["federal_income_tax_withheld", "FedIncomeTaxWithheldAmt"],
  ["employee_ss_withheld", "SocSecTaxWithheldAmt"],
  ["employee_medicare_withheld", "MedicareTaxWithheldAmt"],
  ["futa_wages", "FUTATaxableWagesAmt"],
  ["futa_tax", "FUTATaxAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS1040ScheduleH(fields: ScheduleHInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleH", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class ScheduleHMefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040sh.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1040ScheduleH(pending.schedule_h ?? {});
  }
}

export const scheduleH = new ScheduleHMefNode();
