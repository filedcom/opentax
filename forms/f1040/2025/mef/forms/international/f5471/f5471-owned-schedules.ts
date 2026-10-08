import { element, elements } from "../../../../../mef/xml.ts";
import type { F5471Item } from "../../../../../nodes/inputs/f5471/index.ts";
import {
  owned5471Categories,
  owned5471Category,
  type OwnedCategory,
} from "../../../../domains/international/form5471/form5471-owned-source.ts";
export type OwnedScheduleTag =
  | "IRS5471ScheduleE"
  | "IRS5471ScheduleJ"
  | "IRS5471ScheduleP"
  | "IRS5471ScheduleQ";
function identity(
  cfc: F5471Item,
  name: string | undefined,
  shareholder = false,
) {
  return [
    element("PersonNm", name),
    element("SSN", cfc.shareholder_tin),
    ...(shareholder
      ? [
        element("ShareholderPersonNm", name),
        element("ShareholderSSN", cfc.shareholder_tin),
      ]
      : []),
    elements("ForeignCorporationName", [
      element("BusinessNameLine1Txt", cfc.foreign_corp_name),
    ]),
    element("ForeignCorporationEIN", cfc.foreign_corp_ein),
    elements("ForeignEntityIdentificationGrp", [
      element("ForeignEntityReferenceIdNum", cfc.foreign_corp_reference_id),
    ]),
  ];
}
function ptep(
  name: string,
  inclusion: number,
  reclass: number,
  section956: number,
  closing: number,
) {
  return elements(name, [
    element("ReclassifiedSect959c2EPAmt", inclusion),
    element("ReclassifiedSect959c1EPAmt", reclass),
    element("EarnInvstUSPropReclassifiedAmt", section956),
    element("BalanceBeginningNextYearAmt", closing),
  ]);
}
export function buildOwned5471Schedule(
  cfc: F5471Item,
  name: string | undefined,
  tag: OwnedScheduleTag,
  category: OwnedCategory,
): string {
  const s = owned5471Category(cfc, category), { r } = s;
  const head = [
    ...identity(cfc, name, tag === "IRS5471ScheduleP"),
    element("SeparateCategoryCd", category),
  ];
  if (tag === "IRS5471ScheduleJ") {
    return elements(tag, [
      ...head,
      elements("Post2017EPNotPrevTaxedGrp", [
        element("BeginningYearBalanceAmt", s.opening),
        element("AdjustedBeginningBalanceAmt", s.opening),
        element("CurrentYearEPDeficitAmt", s.current),
        element("TotalCurrentAccumulatedEPAmt", s.opening + s.current),
        element("ReclassifiedSect959c2EPAmt", -(s.subpartF + s.gilti)),
        element("EarnInvstUSPropReclassifiedAmt", -s.section956),
        element("BalanceBeginningNextYearAmt", s.untaxedClosing),
      ]),
      ptep(
        "GeneralSection959c1PTEPGrp",
        0,
        s.reclassified,
        s.section956,
        s.reclassified + s.section956,
      ),
      ptep(
        "Section951APTEPGrp",
        s.gilti,
        -s.reclassGilti,
        0,
        s.gilti - s.reclassGilti,
      ),
      ptep(
        "Section951a1APTEPGrp",
        s.subpartF,
        -s.reclassSf,
        0,
        s.subpartF - s.reclassSf,
      ),
      elements("TotalSection964AEPGrp", [
        element("BeginningYearBalanceAmt", s.opening),
        element("AdjustedBeginningBalanceAmt", s.opening),
        element("CurrentYearEPDeficitAmt", s.current),
        element("TotalCurrentAccumulatedEPAmt", s.opening + s.current),
        element("BalanceBeginningNextYearAmt", s.opening + s.current),
      ]),
      element("BeginningYearBalanceAmt", 0),
      element("FutureRecaptureAmt", 0),
      element("CurrentYearRecaptureAmt", 0),
      element("EndYearBalanceAmt", 0),
    ]);
  }
  if (tag === "IRS5471ScheduleP") {
    return elements(tag, [
      ...head,
      ...["FC", "US"].flatMap(
        (prefix) => [
          ptep(
            prefix + "GeneralSection959c1PTEPGrp",
            0,
            s.reclassified,
            s.section956,
            s.reclassified + s.section956,
          ),
          ptep(
            prefix + "Section951APTEPGrp",
            s.gilti,
            -s.reclassGilti,
            0,
            s.gilti - s.reclassGilti,
          ),
          ptep(
            prefix + "Section951a1APTEPGrp",
            s.subpartF,
            -s.reclassSf,
            0,
            s.subpartF - s.reclassSf,
          ),
          ptep(
            prefix + "TotalPTEPGrp",
            s.subpartF + s.gilti,
            0,
            s.section956,
            s.ptepClosing,
          ),
        ],
      ),
    ]);
  }
  if (tag === "IRS5471ScheduleE") {
    const e = cfc.schedule_e, tax = s.testedTaxes;
    return elements(tag, [
      ...head,
      tax > 0
        ? elements("TxsForeignTaxCrAllowedGrp", [
          elements("PayorName", [
            element("BusinessNameLine1Txt", cfc.foreign_corp_name),
          ]),
          elements("ForeignEntityIdentificationGrp", [
            element(
              "ForeignEntityReferenceIdNum",
              cfc.foreign_corp_reference_id,
            ),
          ]),
          element("ForeignCountryOrUSPossessionCd", e.tax_country_code),
          element("ForeignTaxYearEndDt", e.foreign_tax_year_end),
          element("USTaxYearEndDt", e.us_tax_year_end),
          element("ForeignTaxableIncomeAmount", e.taxable_income_local),
          element("LocalCurrencyCd", e.local_currency),
          element("TaxInForeignCurrencyAmt", tax),
          element("ConversionRt", "1.0000"),
          element("TaxInUSDollarsAmt", tax),
          element("TaxInFunctionalCurrencyAmt", tax),
        ])
        : "",
      element("TotalTaxInUSDollarsAmt", tax),
      element("TotalTaxInFunctionalCurAmt", tax),
      element("Section986a1DElectionInd", "false"),
      ...(s.passiveTax > 0
        ? [
          elements("TxsForeignTaxCrDisallowedGrp", [
            elements("PayorName", [
              element("BusinessNameLine1Txt", cfc.foreign_corp_name),
            ]),
            elements("ForeignEntityIdentificationGrp", [
              element(
                "ForeignEntityReferenceIdNum",
                cfc.foreign_corp_reference_id,
              ),
            ]),
            element("USTaxesAmt", s.passiveTax),
            element("TotalTaxAmt", s.passiveTax),
          ]),
          element("FuncCurDsallwFrgnTotalTaxAmt", s.passiveTax),
          element("USdollarDsallwFrgnTotalTaxAmt", s.passiveTax),
        ]
        : []),
      elements("Frm5471SchESubpartFIncomeGrp", [
        element("TotalTaxInUSDollarsAmt", 0),
        element("TotalCurrentAccumulatedEPAmt", 0),
        element("BalanceTxsPaidOrAccruedAmt", 0),
      ]),
      elements("Frm5471SchETestedIncomeGrp", [
        element("TotalTaxInUSDollarsAmt", tax),
        element("TotalCurrentAccumulatedEPAmt", tax),
        element("BalanceTxsPaidOrAccruedAmt", tax),
        element("RedOtherTxsNotDeemedPdAmt", -tax),
      ]),
    ]);
  }
  if (s.passiveGross > 0) {
    throw Error(
      "Owned US-source passive Schedule Q needs complete unit detail, but canonical v5.4 CountryCd excludes US; no authoritative native mapping is retained. Foreign export remains guarded",
    );
  }
  const totalGross = s.salesGross + s.passiveGross + s.testedGross,
    totalNet = s.salesNet + s.passiveNet + s.testedNet;
  const total = (
    gross: number,
    net: number,
    assets = 0,
    tax = 0,
    interest = 0,
  ) => [
    element("TotalGrossIncomeAmt", gross),
    interest ? element("TotalOtherInterestExpnsAmt", interest) : "",
    tax ? element("TotalOtherCurrentYearTaxAmt", tax) : "",
    element("TotalNetIncomeAmt", net),
    assets ? element("TotalAverageAssetValueAmt", assets) : "",
    element("TotalNetIncmAfterLossAllocnAmt", net),
  ];
  const unit = (
    gross: number,
    net: number,
    assets = 0,
    tax = 0,
    country = cfc.country_of_incorporation as string,
    interest = 0,
  ) => [
    element("RowId", 1),
    elements("QBUName", [
      element("BusinessNameLine1Txt", cfc.foreign_corp_name),
    ]),
    element("CountryCd", country === "US" ? undefined : country),
    element("GrossIncomeAmt", gross),
    interest ? element("OtherInterestExpenseAmt", interest) : "",
    tax ? element("OtherCurrentYearTaxesAmt", tax) : "",
    element("NetIncomeAmt", net),
    assets ? element("AverageAssetValueAmt", assets) : "",
    element("NetIncmAfterLossAllocnAmt", net),
  ];
  return elements(tag, [
    ...head,
    category === "PAS" ? element("PassiveCategoryIncomeGroupCd", "iii") : "",
    category !== "GEN" && s.passiveGross > 0
      ? element("USSourceIncomeInd", "X")
      : "",
    category !== "PAS" ? element("ForeignSourceIncomeInd", "X") : "",
    s.passiveGross > 0
      ? elements(
        "TotalDivIntRntsRyltsAnntsGrp",
        total(
          s.passiveGross,
          s.passiveNet,
          s.passiveAverageAssets,
          s.passiveTax,
          s.passiveInterest,
        ),
      )
      : "",
    s.passiveGross > 0
      ? elements(
        "DivIntRntsRyltsAnntsGrp",
        unit(
          s.passiveGross,
          s.passiveNet,
          s.passiveAverageAssets,
          s.passiveTax,
          "US",
          s.passiveInterest,
        ),
      )
      : "",
    s.salesGross > 0
      ? elements(
        "TotFrgnBaseCoSalesIncmGrp",
        total(s.salesGross, s.salesNet, 0, 0, s.salesInterest),
      )
      : "",
    s.salesGross > 0
      ? elements(
        "FrgnBaseCoSalesIncmGrp",
        unit(
          s.salesGross,
          s.salesNet,
          0,
          0,
          cfc.country_of_incorporation,
          s.salesInterest,
        ),
      )
      : "",
    s.testedGross > 0
      ? elements("TotalTestedIncomeGrp", [
        element("TotalGrossIncomeAmt", s.testedGross),
        element("TotalOtherInterestExpnsAmt", s.testedInterest),
        element("TotalOtherExpensesAmt", s.testedExpenses),
        element("TotalOtherCurrentYearTaxAmt", s.testedTaxes),
        element("TotalNetIncomeAmt", s.testedNet),
        element("TotalAllowedFrgnTaxCreditAmt", s.testedTaxes),
        element("TotalAverageAssetValueAmt", s.testedAverageAssets),
        element("TotalNetIncmAfterLossAllocnAmt", s.testedNet),
      ])
      : "",
    s.testedGross > 0
      ? elements("TestedIncomeGrp", [
        element("RowId", 1),
        elements("QBUName", [
          element("BusinessNameLine1Txt", cfc.foreign_corp_name),
        ]),
        element("CountryCd", cfc.country_of_incorporation),
        element("GrossIncomeAmt", s.testedGross),
        element("OtherInterestExpenseAmt", s.testedInterest),
        element("OtherExpenseAmt", s.testedExpenses),
        element("OtherCurrentYearTaxesAmt", s.testedTaxes),
        element("NetIncomeAmt", s.testedNet),
        element("ForeignTaxesCreditAllowedAmt", s.testedTaxes),
        element("AverageAssetValueAmt", s.testedAverageAssets),
        element("NetIncmAfterLossAllocnAmt", s.testedNet),
      ])
      : "",
    elements("CFCTotalIncomeGrp", [
      element("TotalGrossIncomeAmt", totalGross),
      element("TotalOtherInterestExpnsAmt", s.totalInterest),
      element("TotalOtherExpensesAmt", s.testedExpenses),
      element("TotalOtherCurrentYearTaxAmt", s.testedTaxes + s.passiveTax),
      element("TotalNetIncomeAmt", totalNet),
      element("TotalAllowedFrgnTaxCreditAmt", s.testedTaxes),
      element("TotalNetIncmAfterLossAllocnAmt", totalNet),
    ]),
  ]);
}
export function owned5471AdditionalSchedules(
  cfc: F5471Item,
  name: string | undefined,
  tag: OwnedScheduleTag,
) {
  return cfc.owned_worksheet_source
    ? owned5471Categories(cfc).slice(1).map((category) =>
      buildOwned5471Schedule(cfc, name, tag, category)
    )
    : [];
}
