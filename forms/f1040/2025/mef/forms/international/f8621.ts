import { element, elements } from "../../../../mef/xml.ts";
import type { Form8621Lines } from "../../../../nodes/inputs/f8621/index.ts";
import { PficRegime } from "../../../../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../../../../nodes/inputs/f8621/excess_distribution.ts";
import { calculateMtmDisposition } from "../../../../nodes/inputs/f8621/mtm_disposition.ts";
import { calculateSection1294PriorStatus } from "../../../../nodes/inputs/f8621/section1294.ts";
import {
  assertForm8621PrintableSource,
  projectForm8621ParentSource,
} from "../../../domains/international/form8621/form8621_parent_source.ts";
import type { MefBuildContext, MefFormDescriptor } from "../../form-descriptor.ts";
import { explainForm8621ExcessStatement } from "./f8621_excess_statement.ts";
import { form8621ElectionBTaxForHolding } from "../../../domains/international/form8621/form8621_1294_allocation.ts";

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
  if (context?.pending) assertForm8621PrintableSource(item);
  const parent = item.parent_source
    ? projectForm8621ParentSource(item)
    : undefined;
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
  const qefIncome = qefOrdinary - qefOrdinaryReduction + qefGain -
    qefCapitalReduction;
  const qef1294 = item.qef_1294_election;
  const electionTax = qef1294
    ? form8621ElectionBTaxForHolding(context?.pending ?? {}, item)
    : undefined;
  const yearEndMtm = item.mtm_adjusted_basis_at_year_end === undefined
    ? 0
    : Math.max(0, item.fmv_at_year_end - item.mtm_adjusted_basis_at_year_end) -
      Math.min(
        Math.max(0, item.mtm_adjusted_basis_at_year_end - item.fmv_at_year_end),
        item.mtm_unreversed_inclusions ?? 0,
      );
  const mtmIncome = yearEndMtm + (item.mtm_dispositions ?? []).reduce(
    (sum, row) => sum + calculateMtmDisposition(row).ordinary,
    0,
  );
  const prior1294 = parent?.section1294_prior_status
    ? calculateSection1294PriorStatus(
      parent.section1294_prior_status,
      item.company_ein_or_ref,
    )
    : [];
  const hasEin = /^\d{2}-?\d{7}$/.test(item.company_ein_or_ref);
  const currencies = new Set(
    line.excessEvents.filter((event) =>
      event.kind === ExcessEventKind.Distribution
    ).map((event) => event.currency_code),
  );
  if (currencies.size > 1) {
    throw new Error("Form 8621 Part V needs one line 15 currency per filing");
  }
  explainForm8621ExcessStatement(line);
  const section1291Amount = line.excessEvents.reduce(
    (sum, event) => sum + event.amount_usd,
    0,
  );
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
    parent
      ? elements("PFICOrQEFForeignAddress", [
        element("AddressLine1Txt", parent.corporation_address.line1),
        element("AddressLine2Txt", parent.corporation_address.line2),
        element("CityNm", parent.corporation_address.city),
        element(
          "ProvinceOrStateNm",
          parent.corporation_address.province_or_state,
        ),
        element("CountryCd", parent.corporation_address.country_code),
        element("ForeignPostalCd", parent.corporation_address.postal_code),
      ])
      : "",
    hasEin
      ? element("PFICOrQEFEIN", item.company_ein_or_ref.replaceAll("-", ""))
      : "",
    !hasEin
      ? elements("ForeignEntityIdentificationGrp", [
        element("ForeignEntityReferenceIdNum", item.company_ein_or_ref),
      ])
      : "",
    parent?.corporation_tax_year_start === "2025-01-01" &&
      parent?.corporation_tax_year_end === "2025-12-31"
      ? element("TaxYr", "2025")
      : parent
      ? element("TaxYearBeginDt", parent.corporation_tax_year_start) +
        element("TaxYearEndDt", parent.corporation_tax_year_end)
      : "",
    parent
      ? element(
        "ClassOfShareTxt",
        parent.share_classes.map((share) => share.description).join("; "),
      )
      : "",
    parent?.jointly_owned_with_spouse
      ? element("JointlyOwnedWithSpouseInd", "X")
      : "",
    parent?.acquisition_date
      ? element("SharesAcquiredDt", parent.acquisition_date)
      : "",
    Number.isInteger(item.shares_owned)
      ? element("EndTaxYearSharesCnt", item.shares_owned)
      : "",
    shareValue(item),
    item.regime === PficRegime.EXCESS_DISTRIBUTION
      ? element(
        "Section1291Ind",
        "X",
        section1291Amount > 0
          ? { section1291Amt: String(Math.round(section1291Amount)) }
          : undefined,
      )
      : "",
    item.regime === PficRegime.QEF
      ? element("Section1293Ind", "X", {
        section1293Amt: String(Math.round(qefIncome)),
      })
      : "",
    item.regime === PficRegime.MTM
      ? element("Section1296Ind", "X", {
        Section1296Amt: String(Math.round(mtmIncome)),
      })
      : "",
    parent?.election_status === "qef_new_2025"
      ? element("ElectionToTreatThePFICAsQEFInd", "X")
      : "",
    qef1294 ? element("ElectToExtndTmForPymtOfTxInd", "X") : "",
    parent?.election_status === "mtm_new_2025"
      ? element("ElectionToMarkToMrktPFICStkInd", "X")
      : "",
    item.regime === PficRegime.QEF
      ? [
        element("ProRataShareOfQEFOrdnryEarnAmt", qefOrdinary),
        element("IncomePortionOfOrdinaryEarnAmt", qefOrdinaryReduction),
        element("OrdinaryIncomeFromQEFAmt", qefOrdinary - qefOrdinaryReduction),
        element("ProRataShareOfTotNetCapGainAmt", qefGain),
        element("IncomePortionOfNetCapGainAmt", qefCapitalReduction),
        element("NetLongTermCapitalGainAmt", qefGain - qefCapitalReduction),
        ...(qef1294
          ? [
            element("DividendIncomeAndNetLTCGAmt", qefIncome),
            element(
              "TotalCashAndDistributionsAmt",
              qef1294.distributions_cash_and_property_usd,
            ),
            element(
              "PortionOfProRateOrdnryEarnAmt",
              qef1294.transferred_share_earnings_usd,
            ),
            element(
              "TotalCashAndPrtnOfProRataAmt",
              qef1294.distributions_cash_and_property_usd +
                qef1294.transferred_share_earnings_usd,
            ),
            element(
              "ProRataLessCashAndPortionAmt",
              qef1294.undistributed_ordinary_earnings_usd +
                qef1294.undistributed_capital_gain_usd,
            ),
            element(
              "TotalTaxForTaxYearAmt",
              electionTax?.line9a,
            ),
            element("TotTxWithoutProRataLessCashAmt", electionTax?.line9b),
            element("DeferredTaxAmt", electionTax?.line9c),
          ]
          : []),
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
    ...((item.mtm_dispositions?.length ?? 0) > 1
      ? [
        element(
          "OrdinaryIncomeFromPFICStkAmt",
          item.mtm_dispositions!.reduce(
            (sum, row) =>
              sum + Math.max(0, calculateMtmDisposition(row).ordinary),
            0,
          ),
        ),
        element(
          "LossLimitedByOrdinaryIncomeAmt",
          item.mtm_dispositions!.reduce(
            (sum, row) =>
              sum + Math.min(0, calculateMtmDisposition(row).ordinary),
            0,
          ),
        ),
        element(
          "LossExcessOfUnrvrsdInclsnAmt",
          item.mtm_dispositions!.reduce(
            (sum, row) => sum + calculateMtmDisposition(row).otherLoss,
            0,
          ),
        ),
      ]
      : (item.mtm_dispositions ?? []).map((disposition) => {
        const calculation = calculateMtmDisposition(disposition);
        return [
          element(
            "FMVStkOnDtSaleOrDisposAmt",
            disposition.fair_market_value_usd,
          ),
          element(
            "AdjBasisStkOnDtSaleOrDisposAmt",
            disposition.adjusted_basis_usd,
          ),
          element("OrdinaryIncomeFromPFICStkAmt", calculation.difference),
          ...(calculation.difference < 0
            ? [
              element(
                "StkSaleUnreversedInclusionsAmt",
                disposition.unreversed_inclusions_usd,
              ),
              element("LossLimitedByOrdinaryIncomeAmt", calculation.ordinary),
              ...(calculation.otherLoss > 0
                ? [
                  element(
                    "LossExcessOfUnrvrsdInclsnAmt",
                    calculation.otherLoss,
                  ),
                ]
                : []),
            ]
            : []),
        ].join("");
      })),
    element("FunctionalCurrencyCd", [...currencies][0] ?? "USD"),
    ...line.excessEvents.map(buildEvent),
    ...prior1294.map((column) =>
      elements("ElectionStatus", [
        element("OutstandingElectionTaxYr", column.taxYear),
        element("UndistributedEarningsAmt", column.earnings),
        element("DeferredTaxAmt", column.deferredTax),
        element("InterestAccruedOnDefrdTaxAmt", column.interestAtFiling),
        element("EventTerminatingElectionTxt", column.terminationDescription),
        element("EarningsDistributedDurTheTYAmt", column.earningsDistributed),
        element("DeferredTaxDueWithThisRetAmt", column.taxDue),
        element("AccruedInterestDueThisRetAmt", column.interestDue),
        element("DeferredTaxAfterPartialTermAmt", column.taxRemaining),
        element("InterestAccrAftrPartlTermAmt", column.interestRemaining),
      ])
    ),
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
