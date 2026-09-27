import { element, elements } from "../../../mef/xml.ts";
import type { Form8621Lines } from "../../../nodes/inputs/f8621/index.ts";
import { PficRegime } from "../../../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../../../nodes/inputs/f8621/excess_distribution.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = { items?: readonly Form8621Lines[] };

function shareValue(item: Form8621Lines["item"]): string {
  const value = item.fmv_at_year_end;
  if (value <= 50_000) return element("SharesValueRangeAInd", "X");
  if (value <= 100_000) return element("SharesValueRangeBInd", "X");
  if (value <= 150_000) return element("SharesValueRangeCInd", "X");
  if (value <= 200_000) return element("SharesValueRangeDInd", "X");
  return element("SharesValueRangeEAmt", value);
}

function buildEvent(
  result: Form8621Lines["excessEvents"][number],
): string {
  return elements("DistriAndDisposOfStockTyp", [
    result.kind === ExcessEventKind.Distribution
      ? [
        element(
          "TotalPFICDistriDurCurrTYAmt",
          result.line15a_current_distributions,
        ),
        ...(result.first_holding_year ? [] : [
          element(
            "DistributionsIn3PrecedingTYAmt",
            result.line15b_prior_distributions,
          ),
          element(
            "AverageDistribution3PrecTYAmt",
            result.line15c_prior_average,
          ),
          element("AverageDistri3PrevTY125PctAmt", result.line15d_threshold),
          element("TotalExcessDistributionAmt", result.amount_form_currency),
          element("TotalExcessDistributionUSAmt", result.amount_usd),
        ]),
      ].join("")
      : element("GainLossFromDisposOfStkAmt", result.amount_usd),
    ...(result.first_holding_year ? [] : [
      element(
        "TotalAllcblCurrAndPrePFICTYAmt",
        result.line16b_current_and_pre_pfic_income,
      ),
      element(
        "AggregateIncreaseInTxEachTYAmt",
        result.line16c_prior_year_tax_before_credit,
      ),
      element(
        "ForeignTaxCreditAmt",
        result.line16d_prior_year_foreign_tax_credit,
      ),
      element("AggregateIncrLessFrgnTxCrAmt", result.line16e_additional_tax),
      element("InterestOnEachNetIncrInTaxAmt", result.line16f_interest),
    ]),
  ]);
}

function buildItem(
  line: Form8621Lines,
  statementIndex: number | undefined,
  context?: MefBuildContext,
): string {
  const { item } = line;
  const filer = context?.filer;
  const statementId = statementIndex === undefined ? undefined : context
    ?.documentIdsByPendingKey?.form8621_excess_statement?.[statementIndex];
  if (
    statementIndex !== undefined && context?.documentIdsByPendingKey &&
    !statementId
  ) {
    throw new Error("Form 8621 Part V needs its holding-period statement");
  }
  const qefOrdinary = item.qef_ordinary_income ?? 0;
  const qefGain = item.qef_capital_gain ?? 0;
  const qefOrdinaryReduction = item.qef_ordinary_951_or_1293g_reduction ?? 0;
  const qefCapitalReduction = item.qef_capital_951_or_1293g_reduction ?? 0;
  const hasEin = /^\d{2}-?\d{7}$/.test(item.company_ein_or_ref);
  const currencies = new Set(
    line.excessEvents.filter((event) =>
      event.kind === ExcessEventKind.Distribution
    ).map((event) => event.currency_code),
  );
  if (currencies.size > 1) {
    throw new Error("Form 8621 Part V needs one line 15 currency per filing");
  }
  const children = [
    filer
      ? element("ShareholderPersonNm", filer.fullName ?? filer.nameLine1)
      : "",
    filer ? element("SSN", filer.primarySSN.replaceAll("-", "")) : "",
    element("ShareholderTaxYr", "2025"),
    element("IndividualShareholderInd", "X"),
    elements("PFICOrQEFName", [
      element("BusinessNameLine1Txt", item.company_name),
    ]),
    hasEin
      ? element("PFICOrQEFEIN", item.company_ein_or_ref.replaceAll("-", ""))
      : "",
    !hasEin
      ? elements("ForeignEntityIdentificationGrp", [
        element("ForeignEntityReferenceIdNum", item.company_ein_or_ref),
      ])
      : "",
    Number.isInteger(item.shares_owned)
      ? element("EndTaxYearSharesCnt", item.shares_owned)
      : "",
    shareValue(item),
    item.regime === PficRegime.EXCESS_DISTRIBUTION
      ? element("Section1291Ind", "X")
      : "",
    item.regime === PficRegime.QEF ? element("Section1293Ind", "X") : "",
    item.regime === PficRegime.MTM ? element("Section1296Ind", "X") : "",
    item.regime === PficRegime.QEF
      ? [
        element("ProRataShareOfQEFOrdnryEarnAmt", qefOrdinary),
        element("IncomePortionOfOrdinaryEarnAmt", qefOrdinaryReduction),
        element("OrdinaryIncomeFromQEFAmt", qefOrdinary - qefOrdinaryReduction),
        element("ProRataShareOfTotNetCapGainAmt", qefGain),
        element("IncomePortionOfNetCapGainAmt", qefCapitalReduction),
        element("NetLongTermCapitalGainAmt", qefGain - qefCapitalReduction),
        element(
          "DividendIncomeAndNetLTCGAmt",
          qefOrdinary - qefOrdinaryReduction + qefGain - qefCapitalReduction,
        ),
      ].join("")
      : "",
    item.regime === PficRegime.MTM &&
      item.mtm_adjusted_basis_at_year_end !== undefined
      ? [
        element("FairMarketValueOfPFICStkAmt", item.fmv_at_year_end),
        element(
          "AdjustedBasisInStockEndOfTYAmt",
          item.mtm_adjusted_basis_at_year_end,
        ),
        element(
          "ExcessAmt",
          item.fmv_at_year_end - item.mtm_adjusted_basis_at_year_end,
        ),
        item.fmv_at_year_end < item.mtm_adjusted_basis_at_year_end
          ? element(
            "UnreversedInclusionsAmt",
            item.mtm_unreversed_inclusions ?? 0,
          ) + element(
            "ExcessOrUnreservedInclsnAmt",
            -Math.min(
              item.mtm_adjusted_basis_at_year_end - item.fmv_at_year_end,
              item.mtm_unreversed_inclusions ?? 0,
            ),
          )
          : "",
      ].join("")
      : "",
    element("FunctionalCurrencyCd", [...currencies][0] ?? "USD"),
    ...line.excessEvents.map(buildEvent),
  ];
  return elements(
    "IRS8621",
    children,
    statementId
      ? {
        referenceDocumentId: statementId,
        referenceDocumentName:
          "ShareholdersStockOwnershipStmt TaxationOfExcessDistributionStmt IRS8886",
      }
      : undefined,
  );
}

export const form8621: MefFormDescriptor<"form8621", Input, readonly string[]> =
  {
    pendingKey: "form8621",
    FIELD_MAP: [],
    pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8621.pdf",
    build(fields, context) {
      const items = fields.items ?? [];
      return items.map((line, itemIndex) => {
        const index = line.excessEvents.some((event) => event.amount_usd > 0)
          ? items.slice(0, itemIndex).filter((prior) =>
            prior.excessEvents.some((event) => event.amount_usd > 0)
          ).length
          : undefined;
        return buildItem(line, index, context);
      });
    },
  };
