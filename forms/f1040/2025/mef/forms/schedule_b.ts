import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  interest_rows?: readonly { payerName: string; amount: number }[] | null;
  payer_name?: string | readonly string[] | null;
  taxable_interest_net?: number | readonly number[] | null;
  ee_bond_exclusion?: number | null;
  ordinaryDividends?: number | readonly number[] | null;
  dividend_rows?: readonly { payerName: string; amount: number }[];
  print_line2_total?: number | null;
  print_line4_total?: number | null;
  print_line6_total?: number | null;
  foreign_accounts_question?: boolean;
  fincen_form114_required?: boolean;
  foreign_country_codes?: readonly string[];
  foreign_trust_question?: boolean;
  form8814_foreign_account?: boolean;
  form8814_foreign_trust?: boolean;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS1040ScheduleB.xsd (2025v3.0).
// Element order matches the XSD sequence (required for validation).
// - taxable_interest_net → TaxableInterestSubtotalAmt (line 2)
// - ee_bond_exclusion    → ExcludableSavingsBondIntAmt (line 3, note: "Excludable" not "Excludible")
// - print_line6_total / ordinaryDividends → TotalOrdinaryDividendsAmt (line 6)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["taxable_interest_net", "TaxableInterestSubtotalAmt"],
  ["ee_bond_exclusion", "ExcludableSavingsBondIntAmt"],
  ["ordinaryDividends", "TotalOrdinaryDividendsAmt"],
  ["foreign_accounts_question", "ForeignAccountsQuestionInd"],
  ["fincen_form114_required", "FinCENForm114Ind"],
  ["foreign_country_codes", "ForeignCountryCd"],
  ["foreign_trust_question", "ForeignTrustQuestionInd"],
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
    : fields.interest_rows
    ? fields.interest_rows.reduce((total, row) => total + row.amount, 0)
    : sum(fields.taxable_interest_net);
  const interestAmounts = fields.interest_rows
    ? fields.interest_rows.map((row) => row.amount)
    : typeof fields.taxable_interest_net === "number"
    ? [fields.taxable_interest_net]
    : Array.isArray(fields.taxable_interest_net)
    ? [...fields.taxable_interest_net]
    : [];
  const interestPayers = fields.interest_rows
    ? fields.interest_rows.map((row) => row.payerName)
    : typeof fields.payer_name === "string"
    ? [fields.payer_name]
    : Array.isArray(fields.payer_name)
    ? [...fields.payer_name]
    : [];
  if (
    interestAmounts.length > 0 && interestPayers.length > 0 &&
    interestPayers.length !== interestAmounts.length
  ) {
    throw new Error(
      "Schedule B interest payer names and amounts must pair one-to-one",
    );
  }
  if (interestPayers.some((name) => !name.trim())) {
    throw new Error("Schedule B needs a name for each interest payer");
  }
  if (
    interestAmounts.some((amount) => !Number.isFinite(amount) || amount < 0)
  ) {
    throw new Error(
      "Schedule B interest payer rows need nonnegative finite amounts",
    );
  }
  const interestRows = (interestAmounts.length > 0 ? interestPayers : []).map((
    name,
    index,
  ) =>
    elements("Form1040SchBPartIGroup2", [
      elements("InterestPayerName", [element("BusinessNameLine1Txt", name)]),
      element("InterestAmt", interestAmounts[index]),
    ])
  );
  if (
    interestRows.length > 0 && interest !== undefined &&
    Math.abs(
        interestAmounts.reduce((total, amount) => total + amount, 0) - interest,
      ) > 0.000001
  ) {
    throw new Error(
      "Schedule B interest payer rows do not reconcile to line 2",
    );
  }
  const dividends = typeof fields.print_line6_total === "number"
    ? fields.print_line6_total
    : sum(fields.ordinaryDividends);
  const taxableInterest = typeof fields.print_line4_total === "number"
    ? fields.print_line4_total
    : interest === undefined
    ? undefined
    : Math.max(0, interest - (fields.ee_bond_exclusion ?? 0));
  const partIIIRequired = (taxableInterest ?? 0) > 1_500 ||
    (dividends ?? 0) > 1_500 ||
    fields.foreign_accounts_question === true ||
    fields.foreign_trust_question === true ||
    fields.form8814_foreign_account === true ||
    fields.form8814_foreign_trust === true;
  if (
    partIIIRequired &&
    (fields.foreign_accounts_question === undefined ||
      fields.foreign_trust_question === undefined)
  ) {
    throw new Error("Schedule B MeF needs both Part III Yes/No answers");
  }
  if (
    fields.foreign_accounts_question === true &&
    fields.fincen_form114_required === undefined
  ) {
    throw new Error("Schedule B MeF needs the separate FBAR Yes/No answer");
  }
  if (
    fields.fincen_form114_required === true &&
    (fields.foreign_accounts_question !== true ||
      !fields.foreign_country_codes?.length)
  ) {
    throw new Error("Schedule B MeF FBAR Yes needs foreign country codes");
  }
  if (
    (fields.foreign_country_codes?.length ?? 0) > 25 ||
    (fields.foreign_country_codes?.length &&
      fields.fincen_form114_required !== true)
  ) {
    throw new Error("Schedule B MeF foreign country codes are invalid");
  }
  if (
    fields.taxable_interest_net === undefined &&
    fields.interest_rows === undefined &&
    fields.ordinaryDividends === undefined &&
    fields.dividend_rows === undefined &&
    fields.dividend_info === undefined &&
    fields.form8814_dividends === undefined &&
    fields.ee_bond_exclusion === undefined &&
    fields.foreign_accounts_question !== true &&
    fields.foreign_trust_question !== true
  ) return "";
  // Information-only deposits from below-threshold 1099-DIV and Form 8814
  // must not force Schedule B onto an otherwise below-threshold return.
  if (
    (fields["dividend_info"] !== undefined ||
      fields["form8814_dividends"] !== undefined) &&
    fields.ordinaryDividends === undefined &&
    fields.taxable_interest_net === undefined &&
    fields.interest_rows === undefined &&
    fields.foreign_accounts_question !== true &&
    fields.foreign_trust_question !== true &&
    (dividends ?? 0) <= 1500
  ) return "";
  const dividendRows = fields.dividend_rows ?? [];
  if (
    dividendRows.some((row) =>
      !row.payerName.trim() || !Number.isFinite(row.amount) || row.amount < 0
    )
  ) {
    throw new Error("Schedule B dividend rows need named, nonnegative payers");
  }
  if (
    dividendRows.length > 0 && dividends !== undefined &&
    Math.abs(
        dividendRows.reduce((total, row) => total + row.amount, 0) - dividends,
      ) > 0.000001
  ) {
    throw new Error(
      "Schedule B dividend payer rows do not reconcile to line 6",
    );
  }
  const rows = dividendRows.map(({ payerName, amount }) => {
    if (amount <= 0) return "";
    if (!payerName.trim()) {
      throw new Error(
        "Schedule B MeF needs a payer name for each dividend row",
      );
    }
    return elements("Form1040SchBPartII", [
      elements("DividendPayerNameBusiness", [
        element("BusinessNameLine1Txt", payerName),
      ]),
      element("DividendAmt", amount),
    ]);
  });
  const children = [
    ...interestRows,
    interestRows.length > 0 && interest !== undefined
      ? element("InterestSubtotalAmt", interest, {
        interestSubtotalLiteralCd: "INTEREST SUBTOTAL",
      })
      : "",
    interest === undefined
      ? ""
      : element("TaxableInterestSubtotalAmt", interest),
    typeof fields.ee_bond_exclusion === "number"
      ? element("ExcludableSavingsBondIntAmt", fields.ee_bond_exclusion)
      : "",
    interest === undefined ? "" : element(
      "CalculatedTotalTaxableIntAmt",
      typeof fields.print_line4_total === "number"
        ? fields.print_line4_total
        : Math.max(0, interest - (fields.ee_bond_exclusion ?? 0)),
    ),
    ...rows,
    dividends === undefined
      ? ""
      : element("TotalOrdinaryDividendsAmt", dividends),
    fields.form8814_foreign_account === true
      ? element("Form8814LiteralCd", "FORM8814")
      : "",
    fields.foreign_accounts_question === undefined ? "" : element(
      "ForeignAccountsQuestionInd",
      String(fields.foreign_accounts_question),
    ),
    fields.fincen_form114_required === undefined
      ? ""
      : element("FinCENForm114Ind", String(fields.fincen_form114_required)),
    ...(fields.foreign_country_codes ?? []).map((code) =>
      element("ForeignCountryCd", code)
    ),
    fields.form8814_foreign_trust === true
      ? element("TrustFormLiteralCd", "FORM8814")
      : "",
    fields.foreign_trust_question === undefined ? "" : element(
      "ForeignTrustQuestionInd",
      String(fields.foreign_trust_question),
    ),
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
