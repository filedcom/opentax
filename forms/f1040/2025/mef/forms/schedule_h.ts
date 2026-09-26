import { element, elements } from "../../../mef/xml.ts";
import {
  computeScheduleHAmounts,
  inputSchema,
} from "../../../nodes/intermediate/forms/schedule_h/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  employer_ein?: string;
  cash_wages_over_2025_limit?: boolean;
  cash_wages_over_quarter_limit?: boolean;
  ss_wages?: number | null;
  medicare_wages?: number | null;
  additional_medicare_wages?: number | null;
  federal_income_tax_withheld?: number | null;
  federal_unemployment?: {
    paid_only_one_state: true;
    all_contributions_paid_on_time: true;
    all_futa_wages_state_taxable: true;
    state: string;
    contributions_paid?: number;
    zero_experience_rate?: true;
    taxable_wages: number;
  } | {
    paid_only_one_state: boolean;
    all_contributions_paid_on_time: boolean;
    all_futa_wages_state_taxable: boolean;
    taxable_futa_wages: number;
    state_rows: Array<{
      state: string;
      taxable_state_wages: number;
      experience_rate?: number;
      rate_period_from?: string;
      rate_period_to?: string;
      contributions_paid_by_due_date: number;
    }>;
    late_contributions?: number;
    credit_reduction_wages?: Array<{
      state: "CA" | "VI";
      taxable_futa_wages: number;
    }>;
  };
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["ss_wages", "SocialSecurityTaxCashWagesAmt"],
  ["medicare_wages", "MedicareTaxCashWagesAmt"],
  ["additional_medicare_wages", "TotMedcrTaxCashWagesAddnlWhAmt"],
  ["federal_income_tax_withheld", "FederalIncomeTaxWithheldAmt"],
];

function buildIRS1040ScheduleH(
  fields: Input,
  context: MefBuildContext,
): string {
  if (Object.keys(fields).length === 0) return "";
  const filer = context.filer;
  if (!filer?.fullName) throw new Error("Schedule H needs filer identity");
  if (!fields.employer_ein || !/^\d{9}$/.test(fields.employer_ein)) {
    throw new Error("Schedule H needs a nine-digit employer EIN");
  }
  if (typeof fields.cash_wages_over_2025_limit !== "boolean") {
    throw new Error("Schedule H needs the explicit line A cash-wage answer");
  }
  if (typeof fields.cash_wages_over_quarter_limit !== "boolean") {
    throw new Error(
      "Schedule H needs the explicit line 9 quarterly-wage answer",
    );
  }
  if (
    fields.cash_wages_over_2025_limit === false &&
    ((fields.ss_wages ?? 0) > 0 || (fields.medicare_wages ?? 0) > 0)
  ) {
    throw new Error(
      "Schedule H taxable FICA wages conflict with a false line A answer",
    );
  }
  const amounts = computeScheduleHAmounts(inputSchema.parse(fields), 2025);
  const unemployment = fields.federal_unemployment;
  const ssTax = fields.ss_wages == null ? undefined : amounts.socialSecurityTax;
  const medicareTax = fields.medicare_wages == null
    ? undefined
    : amounts.medicareTax;
  const amount = (tag: string, value: number | null | undefined): string =>
    value == null ? "" : element(tag, value);
  const boolean = (tag: string, value: boolean | undefined): string =>
    value === undefined ? "" : element(tag, String(value));

  return elements("IRS1040ScheduleH", [
    element("HouseholdEmployerNm", filer.fullName),
    element("SSN", filer.primarySSN.replace(/\D/g, "")),
    element("EmployerEIN", fields.employer_ein),
    boolean(
      "HsldEmplPdCashWageOverLmtCYInd",
      fields.cash_wages_over_2025_limit,
    ),
    fields.cash_wages_over_2025_limit === false &&
      (fields.federal_income_tax_withheld ?? 0) > 0
      ? element("HsldEmplFedIncmTaxWithheldInd", "true")
      : "",
    amount("SocialSecurityTaxCashWagesAmt", fields.ss_wages),
    amount("SocialSecurityTaxAmt", ssTax),
    amount("MedicareTaxCashWagesAmt", fields.medicare_wages),
    amount("MedicareTaxWithheldAmt", medicareTax),
    amount("TotMedcrTaxCashWagesAddnlWhAmt", fields.additional_medicare_wages),
    amount(
      "AddnlMedicareTaxWithholdingAmt",
      fields.additional_medicare_wages == null
        ? undefined
        : amounts.additionalMedicareTax,
    ),
    amount("FederalIncomeTaxWithheldAmt", fields.federal_income_tax_withheld),
    amount("TotSocSecMedcrAndFedIncmTaxAmt", amounts.ficaAndWithholding),
    boolean(
      "HsldEmplPdTotCashWageAnyQtrInd",
      fields.cash_wages_over_quarter_limit,
    ),
    unemployment === undefined ? "" : [
      boolean("UnemplPaidOnlyOneStateInd", unemployment.paid_only_one_state),
      boolean(
        "PayAllStateUnemplContriInd",
        unemployment.all_contributions_paid_on_time,
      ),
      boolean(
        "TxblFUTAWagesAlsoTxblUnemplInd",
        unemployment.all_futa_wages_state_taxable,
      ),
      "state_rows" in unemployment
        ? elements("UnemplFundMultiStateGroup", [
          ...amounts.sectionB!.rows.map((row) =>
            elements("UnemploymentStateTaxGroup", [
              element("StateCd", row.state),
              element("TxblWagesPaidStUnemplFundAmt", row.taxable_state_wages),
              row.rate_period_from === undefined
                ? ""
                : element("UnemplStateExprncRateFromDt", row.rate_period_from),
              row.rate_period_to === undefined
                ? ""
                : element("UnemplStateExprncRateToDt", row.rate_period_to),
              amount("UnemploymentStateExperienceRt", row.experience_rate),
              amount("UnemploymentTaxCrAt54RateAmt", row.creditAt54),
              amount("UnemploymentTaxCrAtStateRtAmt", row.creditAtStateRate),
              amount(
                "UnemploymentAdditionalTaxCrAmt",
                row.creditAt54 === undefined ? undefined : row.additionalCredit,
              ),
              element(
                "ContriPaidToStateUnemplFundAmt",
                row.contributions_paid_by_due_date,
              ),
            ])
          ),
          element(
            "TotalUnemplAdditionalTaxCrAmt",
            amounts.sectionB!.additionalCredit,
          ),
          element(
            "TotalContriStateUnemplFundAmt",
            amounts.sectionB!.contributions,
          ),
          element("TentativeFUTACreditAmt", amounts.sectionB!.tentativeCredit),
          element(
            "TotalCashWagesSubjFUTATaxAmt",
            unemployment.taxable_futa_wages,
          ),
          element("GrossFUTATaxCreditAmt", amounts.sectionB!.grossTax),
          element(
            "FUTATaxCreditMaxAllowedAmt",
            amounts.sectionB!.maximumCredit,
          ),
          element(
            "UnemplSmallerTaxAdjustmentAmt",
            amounts.sectionB!.allowedCredit,
          ),
          amounts.sectionB!.needsWorksheet
            ? element("CreditReductionStateWrkshtInd", "X")
            : "",
          element("FUTATaxAmt", amounts.futaTax),
        ])
        : elements("UnemplFundSingleStateGroup", [
          element("StateCd", unemployment.state),
          unemployment.zero_experience_rate
            ? element("UnemploymentFundZeroRateCd", "0% RATE")
            : element(
              "ContriPaidToStateUnemplFundAmt",
              unemployment.contributions_paid,
            ),
          element("TotalCashWagesSubjFUTATaxAmt", unemployment.taxable_wages),
          element("FUTATaxAmt", amounts.futaTax),
        ]),
    ].join(""),
    amount("TotalTaxHouseholdEmplCalcAmt", amounts.ficaAndWithholding),
    amount("CombinedFUTATaxPlusNetTaxesAmt", amounts.totalTax),
    element("RequiredToFileForm1040Ind", "true"),
  ]);
}

export const scheduleH: MefFormDescriptor<"schedule_h", Input> = {
  pendingKey: "schedule_h",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sh.pdf",
  build(fields, context = {}) {
    return buildIRS1040ScheduleH(fields, context);
  },
};
