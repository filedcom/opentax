import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { scheduleBFilingRequired } from "../../../schedule_b_filing.ts";
import {
  type SellerFinancedBuyer,
  sellerFinancedBuyerSchema,
} from "../../../seller_financed_buyer.ts";

export interface Fields {
  interest_rows?: readonly { payerName: string; amount: number }[] | null;
  seller_financed_rows?: readonly {
    buyer: SellerFinancedBuyer;
    amount: number;
  }[];
  payer_name?: string | readonly string[] | null;
  taxable_interest_net?: number | readonly number[] | null;
  ee_bond_exclusion?: number | null;
  ordinaryDividends?: number | readonly number[] | null;
  dividend_rows?: readonly { payerName: string; amount: number }[];
  dividend_line5_subtotal?: number;
  dividend_nominee?: number;
  print_line2_total?: number | null;
  print_line4_total?: number | null;
  print_line6_total?: number | null;
  interest_line1_subtotal?: number;
  interest_nominee?: number;
  interest_accrued?: number;
  interest_oid_adjustment?: number;
  interest_bond_premium?: number;
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
  const sellerRows = fields.seller_financed_rows ?? [];
  if (sellerRows.length > 0 && interest === undefined) {
    throw new Error(
      "Schedule B seller-financed interest needs the reconciled line 2 amount",
    );
  }
  if (
    sellerRows.some((row) =>
      !sellerFinancedBuyerSchema.safeParse(row?.buyer).success ||
      !Number.isFinite(row.amount) || row.amount <= 0
    )
  ) {
    throw new Error(
      "Schedule B seller-financed rows need a buyer, address, SSN, and positive interest",
    );
  }
  const sellerAmount = sellerRows.reduce((total, row) => total + row.amount, 0);
  const sellerXml = sellerRows.map((row) =>
    elements("Form1040SchBPartIGroup1", [
      element("SellerFinancedNm", row.buyer.name),
      row.buyer.address_type === "us"
        ? elements("SellerFinancedAddressUS", [
          element("AddressLine1Txt", row.buyer.address_line1),
          row.buyer.address_line2
            ? element("AddressLine2Txt", row.buyer.address_line2)
            : "",
          element("CityNm", row.buyer.city),
          element("StateAbbreviationCd", row.buyer.state),
          element("ZIPCd", row.buyer.zip),
        ])
        : elements("SellerFinancedAddressForeign", [
          element("AddressLine1Txt", row.buyer.address_line1),
          row.buyer.address_line2
            ? element("AddressLine2Txt", row.buyer.address_line2)
            : "",
          element("CityNm", row.buyer.city),
          row.buyer.province_or_state
            ? element("ProvinceOrStateNm", row.buyer.province_or_state)
            : "",
          element("CountryCd", row.buyer.country_code),
          row.buyer.foreign_postal_code
            ? element("ForeignPostalCd", row.buyer.foreign_postal_code)
            : "",
        ]),
      element("SellerFinancedSSN", row.buyer.ssn),
      element("SellerFinancedMortgageIntAmt", row.amount),
    ])
  );
  const line1Subtotal = fields.interest_line1_subtotal ??
    interestAmounts.reduce((total, amount) => total + amount, 0) + sellerAmount;
  const adjustments = (fields.interest_nominee ?? 0) +
    (fields.interest_accrued ?? 0) +
    (fields.interest_oid_adjustment ?? 0) +
    (fields.interest_bond_premium ?? 0);
  if (
    (interestRows.length > 0 || sellerRows.length > 0) &&
    interest !== undefined &&
    (Math.abs(
          line1Subtotal -
            interestAmounts.reduce((total, amount) => total + amount, 0) -
            sellerAmount,
        ) > 0.000001 ||
      Math.abs(line1Subtotal - adjustments - interest) > 0.000001)
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
  if (
    typeof fields.ee_bond_exclusion === "number" &&
    (interest === undefined || fields.ee_bond_exclusion > interest)
  ) {
    throw new Error("Schedule B savings bond exclusion exceeds interest");
  }
  if (
    interest !== undefined && taxableInterest !== undefined &&
    Math.abs(
        taxableInterest - (interest - (fields.ee_bond_exclusion ?? 0)),
      ) > 0.000001
  ) {
    throw new Error("Schedule B line 4 does not reconcile to lines 2 and 3");
  }
  const filingRequired = scheduleBFilingRequired({
    taxableInterest: taxableInterest ?? 0,
    ordinaryDividends: dividends ?? 0,
    sellerFinancedInterest: sellerRows.length > 0,
    nomineeInterest: fields.interest_nominee ?? 0,
    accruedInterest: fields.interest_accrued ?? 0,
    oidAdjustment: fields.interest_oid_adjustment ?? 0,
    bondPremiumAdjustment: fields.interest_bond_premium ?? 0,
    savingsBondExclusion: fields.ee_bond_exclusion ?? 0,
    nomineeDividends: fields.dividend_nominee ?? 0,
    foreignAccount: fields.foreign_accounts_question === true ||
      fields.form8814_foreign_account === true,
    foreignTrust: fields.foreign_trust_question === true ||
      fields.form8814_foreign_trust === true,
  });
  if (!filingRequired) return "";
  if (
    fields.foreign_accounts_question === undefined ||
    fields.foreign_trust_question === undefined
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
  const dividendRows = fields.dividend_rows ?? [];
  if (
    (fields.dividend_nominee ?? 0) > 0 &&
    (dividendRows.length === 0 || dividends === undefined)
  ) {
    throw new Error(
      "Schedule B nominee dividends need gross payer rows and net line 6",
    );
  }
  if (
    dividendRows.some((row) =>
      !row.payerName.trim() || !Number.isFinite(row.amount) || row.amount < 0
    )
  ) {
    throw new Error("Schedule B dividend rows need named, nonnegative payers");
  }
  const dividendSubtotal = fields.dividend_line5_subtotal ??
    dividendRows.reduce((total, row) => total + row.amount, 0);
  if (
    dividendRows.length > 0 && dividends !== undefined &&
    (Math.abs(
          dividendRows.reduce((total, row) => total + row.amount, 0) -
            dividendSubtotal,
        ) > 0.000001 ||
      Math.abs(dividendSubtotal - (fields.dividend_nominee ?? 0) - dividends) >
        0.000001)
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
    ...sellerXml,
    sellerRows.length > 0
      ? element("TotalSellerFinancedMortgIntAmt", sellerAmount)
      : "",
    ...interestRows,
    (interestRows.length > 0 || sellerRows.length > 0) && interest !== undefined
      ? element("InterestSubtotalAmt", line1Subtotal, {
        interestSubtotalLiteralCd: "INTEREST SUBTOTAL",
      })
      : "",
    (fields.interest_nominee ?? 0) > 0
      ? element("NomineeInterestAmt", fields.interest_nominee!, {
        nomineeInterestLiteralCd: "NOMINEE DISTRIBUTION",
      })
      : "",
    (fields.interest_accrued ?? 0) > 0
      ? element("AccruedInterestAmt", fields.interest_accrued!, {
        accruedInterestLiteralCd: "ACCRUED INTEREST",
      })
      : "",
    (fields.interest_oid_adjustment ?? 0) > 0
      ? element(
        "OriginalIssueDiscountAdjAmt",
        fields.interest_oid_adjustment!,
        {
          originalIssueDiscountAdjLitCd: "OID ADJUSTMENT",
        },
      )
      : "",
    (fields.interest_bond_premium ?? 0) > 0
      ? element("AmortizableBondPremAdjAmt", fields.interest_bond_premium!, {
        amortizableBondPremiumAdjLitCd: "ABP ADJUSTMENT",
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
    dividendRows.length > 0
      ? element("OrdinaryDividendSubtotalAmt", dividendSubtotal, {
        dividendSubtotalLiteralCd: "DIVIDEND SUBTOTAL",
      })
      : "",
    (fields.dividend_nominee ?? 0) > 0
      ? element("NomineeDividendAmt", fields.dividend_nominee!, {
        nomineeDividendLiteralCd: "NOMINEE DISTRIBUTION",
      })
      : "",
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
