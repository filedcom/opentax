import { FilingStatus } from "../../../../../mef/header.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import { ForeignAssetType } from "../../../../../nodes/inputs/general/foreign/f8938/index.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
import {
  isPartVAccount,
  projectForm8938,
  type TaxSummaryRow,
} from "./f8938_projection.ts";
import { assertForm8938ReturnReconciliation } from "./f8938_reconciliation.ts";

const statusCode = {
  single: FilingStatus.Single,
  mfj: FilingStatus.MarriedFilingJointly,
  mfs: FilingStatus.MarriedFilingSeparately,
  hoh: FilingStatus.HeadOfHousehold,
  qw: FilingStatus.QualifyingSurvivingSpouse,
} as const;

const taxGroupTag = {
  interest: "InterestSumGrp",
  dividends: "DividendSumGrp",
  royalties: "RoyaltySumGrp",
  other_income: "OtherIncomeSumGrp",
  gain_loss: "GainLossSumGrp",
  deduction: "DeductionSumGrp",
  credit: "CreditSumGrp",
} as const;

function taxSummaryGroup(tag: string, rows: readonly TaxSummaryRow[]): string {
  return elements(
    tag,
    rows.map((row) =>
      elements(taxGroupTag[row.kind], [
        element("ReportedOnFormOrScheduleAmt", row.amount),
        ...row.formLocations.map((location) =>
          element("WhereReportedFormAndLineTxt", location)
        ),
        ...row.scheduleLocations.map((location) =>
          element("WhereReportedSchAndLineTxt", location)
        ),
      ])
    ),
  );
}

type ProjectedAsset = ReturnType<
  typeof projectForm8938
>["input"]["assets"][number];
const check = (tag: string, value: boolean) =>
  value ? element(tag, "true") : "";
const businessName = (value: string) =>
  elements("BusinessName", [element("BusinessNameLine1Txt", value)]);
const foreignAddress = (
  address: ProjectedAsset["institution_or_issuer_address"],
) =>
  elements("ForeignAddress", [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("ProvinceOrStateNm", address.province_or_state),
    element("CountryCd", address.country),
    element("ForeignPostalCd", address.postal_code),
  ]);
const exchangeRate = (asset: ProjectedAsset): string[] => [
  element(
    "ExchangeRateUsedInd",
    asset.currency_code === "USD" ? "false" : "true",
  ),
  element(
    "ForeignCurrencyDesc",
    asset.currency_code === "USD" ? undefined : asset.currency_code,
  ),
  element(
    "ExchangeRt",
    asset.currency_code === "USD"
      ? undefined
      : String(asset.year_end_exchange_rate_usd_per_unit),
  ),
  element(
    "SourceOfExchangeRateUsedTxt",
    asset.currency_code === "USD" ||
      /U\.S\. Treasury|Fiscal Service/i.test(asset.exchange_rate_source)
      ? undefined
      : asset.exchange_rate_source,
  ),
];

function accountGroup(asset: ProjectedAsset): string {
  return elements("ForeignFinclAccountGrp", [
    check(
      "DepositAccountTypeInd",
      asset.asset_type === ForeignAssetType.DepositAccount,
    ),
    check(
      "CustodialAccountTypeInd",
      asset.asset_type === ForeignAssetType.CustodialAccount,
    ),
    element("IdentifyingDesignationNum", asset.asset_identifier),
    check(
      "AccountOpenedDuringTaxYearInd",
      !!asset.opened_or_acquired_date?.startsWith("2025-"),
    ),
    check("AccountClosedDuringTaxYearInd", !!asset.closed_or_disposed_date),
    check("JointlyOwnedWithSpouseInd", asset.owner === "joint_with_spouse"),
    check("NoTaxItemReportedInd", asset.tax_items.length === 0),
    element("MaxAccountValueDurTYAmt", asset.maximum_value_usd),
    ...exchangeRate(asset),
    businessName(asset.institution_or_issuer_name),
    foreignAddress(asset.institution_or_issuer_address),
  ]);
}

function otherValue(asset: ProjectedAsset): string {
  const value = asset.maximum_value_usd;
  if (value <= 50_000) return check("MaxValueDuringTY0To50000Ind", true);
  if (value <= 100_000) return check("MaxValueDurTY50001To100000Ind", true);
  if (value <= 150_000) return check("MaxValueDurTY100001To150000Ind", true);
  if (value <= 200_000) return check("MaxValueDurTY150001To200000Ind", true);
  return element("MaxValueDurTYMoreMaxAmt", value);
}

function otherGroup(asset: ProjectedAsset): string {
  const isEntity = asset.asset_type === ForeignAssetType.ForeignStock ||
    asset.asset_type === ForeignAssetType.ForeignEntityInterest ||
    asset.asset_type === ForeignAssetType.ForeignTrustInterest;
  return elements("OtherForeignAssetGrp", [
    element("AssetDesc", asset.description),
    element("IdentifyingDesignationNum", asset.asset_identifier),
    element(
      "AcquiredDt",
      asset.opened_or_acquired_date?.startsWith("2025-")
        ? asset.opened_or_acquired_date
        : undefined,
    ),
    element("DisposedOfDt", asset.closed_or_disposed_date),
    check("JointlyOwnedWithSpouseInd", asset.owner === "joint_with_spouse"),
    check("NoTaxItemReportedInd", asset.tax_items.length === 0),
    otherValue(asset),
    ...exchangeRate(asset),
    isEntity
      ? elements("EntityName", [
        element("BusinessNameLine1Txt", asset.institution_or_issuer_name),
      ])
      : "",
    check("PartnershipInd", asset.foreign_entity_type === "partnership"),
    check("CorporationInd", asset.foreign_entity_type === "corporation"),
    check("TrustInd", asset.foreign_entity_type === "trust"),
    check("EstateInd", asset.foreign_entity_type === "estate"),
    isEntity ? foreignAddress(asset.institution_or_issuer_address) : "",
    !isEntity
      ? elements("AssetNotStockOfForeignEntGrp", [
        businessName(asset.institution_or_issuer_name),
        check("IssuerInd", asset.issuer_or_counterparty_role === "issuer"),
        check(
          "CounterpartyInd",
          asset.issuer_or_counterparty_role === "counterparty",
        ),
        check(
          "IndividualInd",
          asset.issuer_or_counterparty_type === "individual",
        ),
        check(
          "PartnershipInd",
          asset.issuer_or_counterparty_type === "partnership",
        ),
        check(
          "CorporationInd",
          asset.issuer_or_counterparty_type === "corporation",
        ),
        check("TrustInd", asset.issuer_or_counterparty_type === "trust"),
        check("EstateInd", asset.issuer_or_counterparty_type === "estate"),
        check(
          "USPersonInd",
          asset.issuer_or_counterparty_is_us_person === true,
        ),
        check(
          "ForeignPersonInd",
          asset.issuer_or_counterparty_is_us_person === false,
        ),
        foreignAddress(asset.institution_or_issuer_address),
      ])
      : "",
  ]);
}

/** Staged IRS8938.xsd projection; intentionally absent from ALL_MEF_FORMS. */
export const form8938: MefFormDescriptor<"f8938", unknown> = {
  pendingKey: "f8938",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8938.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    if (context?.phase === "final") {
      assertForm8938ReturnReconciliation(raw, context);
    }
    const projected = projectForm8938(raw);
    if (
      context?.filer &&
      context.filer.filingStatus !== statusCode[projected.input.filing_status]
    ) {
      throw new Error("Form 8938 filing status differs from filed return");
    }
    const { summary } = projected;
    return elements("IRS8938", [
      element("CalendarYr", 2025),
      element("SpcfdIndividualInd", "true"),
      element("ForeignDepositAcctCnt", summary.partI.depositAccountCount),
      element(
        "MaxAllFrgnDepositAcctValueAmt",
        summary.partI.depositMaximumValueUsd,
      ),
      element("ForeignCustodialAcctCnt", summary.partI.custodialAccountCount),
      element(
        "MaxAllFrgnCstdAcctValueAmt",
        summary.partI.custodialMaximumValueUsd,
      ),
      element(
        "AnyDepOrCstdAcctClosedDurTYInd",
        summary.partI.anyAccountClosed ? "true" : "false",
      ),
      element("ForeignAssetCnt", summary.partII.otherAssetCount),
      element("MaxAllFrgnAssetValueAmt", summary.partII.otherMaximumValueUsd),
      element(
        "AnyFrgnAssetAcqOrSoldDurTYInd",
        summary.partII.anyAssetOpenedOrClosed ? "true" : "false",
      ),
      taxSummaryGroup("ForeignFinclAccountSumGrp", projected.taxItems.account),
      taxSummaryGroup("OtherForeignAssetSumGrp", projected.taxItems.other),
      element("Form3520Cnt", summary.partIV["3520"]),
      element("Form3520ACnt", summary.partIV["3520-A"]),
      element("Form5471Cnt", summary.partIV["5471"]),
      element("Form8621Cnt", summary.partIV["8621"]),
      element("Form8865Cnt", summary.partIV["8865"]),
      ...projected.accounts.filter(isPartVAccount).map(accountGroup),
      ...projected.otherAssets.map(otherGroup),
    ]);
  },
};
