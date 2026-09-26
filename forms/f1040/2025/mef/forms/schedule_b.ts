import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  taxable_interest_net?: number | readonly number[] | null;
  ee_bond_exclusion?: number | null;
  ordinaryDividends?: number | readonly number[] | null;
  print_line2_total?: number | null;
  print_line6_total?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS1040ScheduleB.xsd (2025v3.0).
// Element order matches the XSD sequence (required for validation).
// - taxable_interest_net → TaxableInterestSubtotalAmt (line 2)
// - ee_bond_exclusion    → ExcludableSavingsBondIntAmt (line 3, note: "Excludable" not "Excludible")
// - ordinaryDividends    → TotalOrdinaryDividendsAmt  (line 6)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["taxable_interest_net", "TaxableInterestSubtotalAmt"],
  ["ee_bond_exclusion", "ExcludableSavingsBondIntAmt"],
  ["ordinaryDividends", "TotalOrdinaryDividendsAmt"],
];

function buildIRS1040ScheduleB(fields: Input): string {
  const sum = (
    value: number | readonly number[] | null | undefined,
  ): number | undefined =>
    typeof value === "number"
      ? value
      : Array.isArray(value)
      ? value.reduce((total, amount) => total + amount, 0)
      : undefined;
  const interest = typeof fields.print_line2_total === "number"
    ? fields.print_line2_total
    : sum(fields.taxable_interest_net);
  const dividends = typeof fields.print_line6_total === "number"
    ? fields.print_line6_total
    : sum(fields.ordinaryDividends);
  // Information-only deposits from below-threshold 1099-DIV and Form 8814
  // must not force Schedule B onto an otherwise below-threshold return.
  if (
    (fields["dividend_info"] !== undefined ||
      fields["form8814_dividends"] !== undefined) &&
    fields.ordinaryDividends === undefined &&
    fields.taxable_interest_net === undefined &&
    (dividends ?? 0) <= 1500
  ) return "";
  const rows = Array.from({ length: 15 }, (_, index) => {
    const name = fields[`print_div_payer_${index + 1}`];
    const amount = fields[`print_div_amount_${index + 1}`];
    if (typeof amount !== "number" || amount <= 0) return "";
    if (typeof name !== "string" || !name.trim()) {
      throw new Error(
        "Schedule B MeF needs a payer name for each dividend row",
      );
    }
    return elements("Form1040SchBPartII", [
      elements("DividendPayerNameBusiness", [
        element("BusinessNameLine1Txt", name),
      ]),
      element("DividendAmt", amount),
    ]);
  });
  const children = [
    interest === undefined
      ? ""
      : element("TaxableInterestSubtotalAmt", interest),
    typeof fields.ee_bond_exclusion === "number"
      ? element("ExcludableSavingsBondIntAmt", fields.ee_bond_exclusion)
      : "",
    ...rows,
    dividends === undefined
      ? ""
      : element("TotalOrdinaryDividendsAmt", dividends),
  ];
  return elements("IRS1040ScheduleB", children);
}

export const scheduleB: MefFormDescriptor<"schedule_b", Input> = {
  pendingKey: "schedule_b",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sb.pdf",
  build(fields) {
    return buildIRS1040ScheduleB(fields);
  },
};
