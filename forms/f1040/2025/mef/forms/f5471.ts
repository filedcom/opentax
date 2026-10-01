import { element, elements } from "../../../mef/xml.ts";
import type { FilerAddress } from "../../../mef/header.ts";
import type { F5471Item } from "../../../nodes/inputs/f5471/index.ts";
import { projectForm8992Source } from "../../form8992_source.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

function usAddress(address: FilerAddress): string {
  return elements("USAddress", [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("StateAbbreviationCd", address.state),
    element("ZIPCd", address.zip.replaceAll("-", "")),
  ]);
}

function foreignAddress(
  address: F5471Item["form5471_identity"]["foreign_address"],
): string {
  return elements("ForeignAddress", [
    element("AddressLine1Txt", address.line1),
    element("CityNm", address.city),
    element("CountryCd", address.country_code),
    element("ForeignPostalCd", address.postal_code),
  ]);
}

export const form5471: MefFormDescriptor<"f5471_parent", unknown> = {
  pendingKey: "f5471_parent",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) throw new Error("Form 5471 needs final filer identity");
    if (context.filer.address.foreignCountry) {
      throw new Error("Bounded Form 5471 parent needs a U.S. filer address");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    const id = cfc.form5471_identity;
    const i = cfc.schedule_i;
    const g = cfc.schedule_g;
    const cfcAddress = id.foreign_address;
    return elements("IRS5471", [
      element("TaxYearBeginDt", id.cfc_tax_year_begin),
      element("TaxYearEndDt", id.cfc_tax_year_end),
      elements("PersonFilingThisReturn", [
        element("PersonNm", shareholderName),
        usAddress(context.filer.address),
      ]),
      element("FilerTaxYearBeginDt", id.filer_tax_year_begin),
      element("FilerTaxYearEndDt", id.filer_tax_year_end),
      element("SSN", cfc.shareholder_tin),
      element("CategoryOfFiler4Ind", "X"),
      element("CategoryOfFiler5aInd", "X"),
      element("VotingStockOwnedPct", "1.00000"),
      elements("ForeignCorporation", [
        elements("BusinessName", [
          element("BusinessNameLine1Txt", cfc.foreign_corp_name),
        ]),
        foreignAddress(cfcAddress),
      ]),
      element("EmployerEIN", cfc.foreign_corp_ein),
      cfc.foreign_corp_reference_id
        ? elements("ForeignEntityIdentificationGrp", [
          element("ForeignEntityReferenceIdNum", cfc.foreign_corp_reference_id),
        ])
        : "",
      element("CountryUnderWhoseLawsIncCd", cfc.country_of_incorporation),
      element("IncorporationDt", id.incorporation_date),
      element(
        "PrincipalPlaceOfBusCountryCd",
        id.principal_business_country_code,
      ),
      element(
        "PrincipalBusinessActivityCd",
        id.principal_business_activity_code,
      ),
      element(
        "PrincipalBusinessActivityDesc",
        id.principal_business_activity_description,
      ),
      element("FunctionalCurrencyCd", cfc.functional_currency),
      elements("FrgnCorpStatutoryOrResidentAgt", [
        elements("BusinessName", [
          element("BusinessNameLine1Txt", id.statutory_agent_business_name),
        ]),
        foreignAddress(cfcAddress),
      ]),
      elements("PersonWithRecordsCustody", [
        elements("BusinessName", [
          element("BusinessNameLine1Txt", id.books_custodian_business_name),
        ]),
        foreignAddress(cfcAddress),
      ]),
      elements("IRS5471ScheduleA", [
        elements("StockOfTheForeignCorporation", [
          element("StockClassDesc", id.stock_class_description),
          element(
            "AnnualAcctPeriodBeginShareCnt",
            id.total_outstanding_shares_begin,
          ),
          element(
            "AnnualAcctPeriodEndShareCnt",
            id.total_outstanding_shares_end,
          ),
        ]),
      ]),
      elements("IRS5471ScheduleB", [
        elements("USShareholdersOfForeignCorp", [
          element("PersonNm", shareholderName),
          usAddress(context.filer.address),
          element("ShareholderSSN", cfc.shareholder_tin),
          elements("ForeignCorporationStocks", [
            element("StockClassDesc", id.stock_class_description),
            element("AnnualAcctPeriodBeginShareCnt", id.direct_shares_begin),
            element("AnnualAcctPeriodEndShareCnt", id.direct_shares_end),
          ]),
          element("ProRataShareSubpartFIncomeRt", "1.00000"),
        ]),
        elements("DirectShareholdersForeignCorp", [
          element("PersonNm", shareholderName),
          usAddress(context.filer.address),
          element("ShareholderSSN", cfc.shareholder_tin),
          elements("ForeignCorporationStocks", [
            element("StockClassDesc", id.stock_class_description),
            element("AnnualAcctPeriodBeginShareCnt", id.direct_shares_begin),
            element("AnnualAcctPeriodEndShareCnt", id.direct_shares_end),
          ]),
        ]),
      ]),
      elements("IRS5471ScheduleG", [
        element(
          "Owns10PctOrMoreFrgnPrtshpInd",
          String(g.q1_foreign_partnership),
        ),
        element("FrgnCorpOwnsInterestInTrustInd", String(g.q2_trust)),
        element(
          "FrgnCorpOwnsForeignEntityInd",
          String(g.q3a_foreign_entity_or_branch),
        ),
        element("OneOrMoreQBUInd", String(g.q3b_different_currency_qbu)),
        element("BaseErosionPaymentBenefitInd", String(g.q4a_base_erosion)),
        element(
          "NondedIntRoyaltyUndSect267AInd",
          String(g.q5a_disallowed_267a),
        ),
        element("FDIIBenefitsClaimInd", String(g.q6a_fdii)),
        element("FrgnCorpPartcpCostShrInd", String(g.q7_cost_sharing)),
        element("PurchaseStockOrSecuritiesInd", String(g.q8_triangular_stock)),
        element(
          "IntangiblePropertyReceivedInd",
          String(g.q9a_intangible_property),
        ),
        element(
          "ExpatriatedFrgnSubsidiaryInd",
          String(g.q10_expatriated_subsidiary),
        ),
        element(
          "ReportableTransactionPrtcptInd",
          String(g.q11_reportable_transaction),
        ),
        element(
          "FrgnTaxDisqualifiedSec901mInd",
          String(g.q12_disqualified_901m_tax),
        ),
        element("ForeignTaxSection909Ind", String(g.q13_section909_tax)),
        element("AnswerYesAnyQuestionInd", String(g.q14_special_exceptions)),
        element(
          "DisallowedInterestExpenseInd",
          String(g.q15_disallowed_interest),
        ),
        element(
          "CfwdPrevDsallwIntExpenseInd",
          String(g.q16_interest_carryforward),
        ),
        element(
          "ExtraordinaryReductionInd",
          String(g.q17a_extraordinary_reduction),
        ),
        element("SafeHavenRtRegsRtIntAFRInd", String(g.q18a_safe_haven_rate)),
        element(
          "RtIntSafeHavenRegsAFRInd",
          String(g.q18b_outside_safe_haven_rate),
        ),
        element("RltdPrtyLoansFnddDistriInd", String(g.q19a_covered_debt)),
        element("PayOrAccrueTopUpTaxInd", String(g.q20a_top_up_tax)),
        element("EarningsProfitsSect304Ind", String(g.q21a_section304_ep)),
      ]),
      elements("IRS5471ScheduleI", [
        elements("ShareholderInformation", [
          element("ShareholderPersonNm", shareholderName),
          element("ShareholderSSN", cfc.shareholder_tin),
        ]),
        element("SubpartFLowTierCFCRcvdAmt", i.line1a),
        element("SubpartFHybridDivRcvdAmt", i.line1b),
        element("SubpartFIncmTieredEDAmt", i.line1c),
        element("SubpartFIncmTieredERAmt", i.line1d),
        element("SubpartFPHCIncomeAmt", i.line1e),
        element("SubpartFSalesIncomeAmt", i.line1f),
        element("SubpartFServicesIncomeAmt", i.line1g),
        element("OtherSubpartFNotIncludedAmt", i.line1h),
        element("EarningsInvestedInUSPropAmt", i.line2_us_property),
        element("FactoringIncomeAmt", i.line4_factoring),
        element("Sect245AEligibleDividendsAmt", i.line5a_eligible_dividends),
        element(
          "ExtraordinaryDispositionAmt",
          i.line5b_extraordinary_disposition,
        ),
        element("ExtraordinaryReductionAmt", i.line5c_extraordinary_reduction),
        element("Section245AeDividendsAmt", i.line5d_hybrid_dividends),
        element("DividendsNotReportedAmt", i.line5e_other_dividends),
        element("ExchangeGainOrLossOnDistriAmt", i.line6_exchange_gain_or_loss),
        element("IncomeBlockedInd", "false"),
        element("IncomeUnblockedInd", "false"),
        element("EDAccountInd", "false"),
        element("TotHybridDeductionAccountsAmt", i.hybrid_deduction_accounts),
      ]),
    ]);
  },
};
