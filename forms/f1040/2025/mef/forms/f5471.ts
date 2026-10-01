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
      elements("IRS5471ScheduleB", [
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
