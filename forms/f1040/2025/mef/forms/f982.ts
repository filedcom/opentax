import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line2_excluded_cod?: number | null;
  insolvency_amount?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line2_excluded_cod", "ExcludedCancelledDebtAmt"],
  ["insolvency_amount", "InsolvencyAmt"],
];

function buildIRS982(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    return typeof value === "number" ? element(tag, value) : "";
  });
  return elements("IRS982", children);
}

export const form982: MefFormDescriptor<"form982", Input> = {
  pendingKey: "form982",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f982.pdf",
  build(fields) {
    return buildIRS982(fields);
  },
};
