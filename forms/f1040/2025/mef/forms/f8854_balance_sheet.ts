import { element, elements } from "../../../mef/xml.ts";
import {
  type BalanceSheet,
  balanceSheetSchema,
  calculateBalanceSheet,
} from "../../../nodes/inputs/f8854/balance-sheet.ts";
import {
  type F8854Input,
  inputSchema,
} from "../../../nodes/inputs/f8854/index.ts";

export type Form8854BalanceSheetStatementIds = {
  partnership?: string;
  ownedTrust?: string;
  nongrantorTrust?: string;
  otherAssets?: string;
  otherLiabilities?: string;
};

const statementNames = {
  partnership: "PartnershipInterestStatement",
  ownedTrust: "OwnedTrustValueStatement",
  nongrantorTrust: "NongrantorTrustsBeneficialInterestStatement",
  otherAssets: "OtherAssetsNotIncludedStatement",
  otherLiabilities: "OtherLiabilitiesStatement",
} as const;

function pairXml(
  tag: string,
  pair: { fair_market_value: number; us_adjusted_basis: number } | undefined,
  attrs?: Record<string, string>,
): string {
  if (!pair) return "";
  return elements(tag, [
    element("FairMarketValueAmt", pair.fair_market_value),
    element("USAdjustedBasisAmt", pair.us_adjusted_basis),
  ], attrs);
}

function totalPair(
  rows: readonly { fair_market_value: number; us_adjusted_basis: number }[],
) {
  return {
    fair_market_value: sumMoney(rows.map((row) => row.fair_market_value)),
    us_adjusted_basis: sumMoney(rows.map((row) => row.us_adjusted_basis)),
  };
}

function sumMoney(values: readonly number[]): number {
  const totalCents = values.reduce(
    (sum, value) => sum + BigInt(Math.round(value * 100)),
    0n,
  );
  if (totalCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Form 8854 statement total exceeds safe cent precision");
  }
  return Number(totalCents) / 100;
}

function linkedAttrs(
  hasRows: boolean,
  id: string | undefined,
  name: string,
  phase: "discover" | "link",
): Record<string, string> | undefined {
  if (phase === "link" && hasRows && !id) {
    throw new Error(`Form 8854 ${name} requires a linked statement document`);
  }
  if (!hasRows && id) {
    throw new Error(`Form 8854 ${name} cannot link an empty statement`);
  }
  return id
    ? { referenceDocumentId: id, referenceDocumentName: name }
    : undefined;
}

function businessName(tag: string, name: string): string {
  return elements(tag, [element("BusinessNameLine1Txt", name)]);
}

/** Native Section B statement fragments, each returned only for populated detail. */
export function buildForm8854BalanceSheetStatements(rawSheet: BalanceSheet) {
  const sheet = balanceSheetSchema.parse(rawSheet);
  return {
    partnership: sheet.partnership_interests.length
      ? elements(
        "PartnershipInterestStatement",
        sheet.partnership_interests.map((row) =>
          elements("PartnershipInterestGrp", [
            businessName("BusinessName", row.partnership_name),
            element("EIN", row.ein),
            element("FairMarketValueAmt", row.fair_market_value),
            element("USAdjustedBasisAmt", row.us_adjusted_basis),
          ])
        ),
      )
      : "",
    ownedTrust: sheet.owned_trust_assets.length
      ? elements(
        "OwnedTrustValueStatement",
        sheet.owned_trust_assets.map((row) =>
          elements("AssetsHeldByTrSect671679Grp", [
            businessName("TrustName", row.trust_name),
            element("TrustEIN", row.trust_ein),
            element("Desc", row.asset_description),
            element("FairMarketValueAmt", row.fair_market_value),
            element("USAdjustedBasisAmt", row.us_adjusted_basis),
          ])
        ),
      )
      : "",
    nongrantorTrust: sheet.nongrantor_trust_interests.length
      ? elements(
        "NongrantorTrBeneficialIntStmt",
        sheet.nongrantor_trust_interests.map((row) =>
          elements("NongrantorTrBeneficialIntGrp", [
            element("TrustEIN", row.trust_ein),
            businessName("TrustName", row.trust_name),
            element("FairMarketValueAmt", row.fair_market_value),
            element("USAdjustedBasisAmt", row.us_adjusted_basis),
          ])
        ),
      )
      : "",
    otherAssets: sheet.other_assets.length
      ? elements(
        "OtherAssetsNotIncludedStmt",
        sheet.other_assets.map((row) =>
          elements("OtherAssetsNotIncludedGrp", [
            element("Desc", row.description),
            element("FairMarketValueAmt", row.fair_market_value),
            element("USAdjustedBasisAmt", row.us_adjusted_basis),
          ])
        ),
      )
      : "",
    otherLiabilities: sheet.other_liabilities.length
      ? elements(
        "OtherLiabilitiesStatement",
        sheet.other_liabilities.map((row) =>
          elements("OtherLiabilityGrp", [
            element("Desc", row.description),
            element("Amt", row.amount),
          ])
        ),
      )
      : "",
  };
}

/** IRS8854 Part II Section B in 2025v5.4 schema order. */
export function buildForm8854BalanceSheet(
  rawInput: F8854Input,
  statementIds: Form8854BalanceSheetStatementIds = {},
  phase: "discover" | "link" = "link",
): string {
  const input = inputSchema.parse(rawInput);
  const sheet = input.balance_sheet;
  const totals = calculateBalanceSheet(sheet);
  const partnershipAttrs = linkedAttrs(
    sheet.partnership_interests.length > 0,
    statementIds.partnership,
    statementNames.partnership,
    phase,
  );
  const ownedTrustAttrs = linkedAttrs(
    sheet.owned_trust_assets.length > 0,
    statementIds.ownedTrust,
    statementNames.ownedTrust,
    phase,
  );
  const nongrantorTrustAttrs = linkedAttrs(
    sheet.nongrantor_trust_interests.length > 0,
    statementIds.nongrantorTrust,
    statementNames.nongrantorTrust,
    phase,
  );
  const otherAssetsAttrs = linkedAttrs(
    sheet.other_assets.length > 0,
    statementIds.otherAssets,
    statementNames.otherAssets,
    phase,
  );
  const otherLiabilitiesAttrs = linkedAttrs(
    sheet.other_liabilities.length > 0,
    statementIds.otherLiabilities,
    statementNames.otherLiabilities,
    phase,
  );
  const simpleLines = [
    ["CashIncludingBankDepositsGrp", sheet.cash_and_bank_deposits],
    ["MrktblStockSecIssdByUSCoGrp", sheet.marketable_us_securities],
    ["MrktblStockSecIssdFrgnCoGrp", sheet.marketable_foreign_securities],
    ["NonmrktblStockSecIssdUSCoGrp", sheet.nonmarketable_us_securities],
    ["NonmrktblStockSecIssdFrgnCoGrp", sheet.nonmarketable_foreign_securities],
  ] as const;
  const laterSimpleLines = [
    ["IntangiblesUsedInUSGrp", sheet.intangibles_used_in_us],
    ["IntangiblesUsedOutsideUSGrp", sheet.intangibles_used_outside_us],
    ["LoansToUSPersonsGrp", sheet.loans_to_us_persons],
    ["LoansToForeignPersonsGrp", sheet.loans_to_foreign_persons],
    ["RealPropertyLocatedInUSGrp", sheet.us_real_property],
    ["RealPropertyLocatedOutsdUSGrp", sheet.foreign_real_property],
    ["BusinessPropertyInUSGrp", sheet.us_business_property],
    ["BusinessPropertyOutsideUSGrp", sheet.foreign_business_property],
  ] as const;
  return elements("InitialExptrtStmtBalSheetGrp", [
    ...simpleLines.map(([tag, pair]) => pairXml(tag, pair)),
    ...sheet.foreign_cfc_securities_within_line5.map((row) =>
      elements("SepStateStockIssdFrgnCoGrp", [
        element("FairMarketValueAmt", row.fair_market_value),
        element("USAdjustedBasisAmt", row.us_adjusted_basis),
        element("ForeignEntityDesc", row.foreign_entity_description),
      ])
    ),
    pairXml(
      "PensionsOrSmlrRetireArrngmGrp",
      sheet.pensions_and_retirement_arrangements,
    ),
    pairXml(
      "DeferredCompensationStkOptGrp",
      sheet.deferred_compensation_and_stock_options,
    ),
    pairXml(
      "TotalPartnershipInterestGrp",
      sheet.partnership_interests.length
        ? totalPair(sheet.partnership_interests)
        : undefined,
      partnershipAttrs,
    ),
    pairXml(
      "TotAssetsHeldByTrSect671679Grp",
      sheet.owned_trust_assets.length
        ? totalPair(sheet.owned_trust_assets)
        : undefined,
      ownedTrustAttrs,
    ),
    sheet.nongrantor_trust_interests.length
      ? elements("TotNongrantorTrBnfclIntGrp", [
        element(
          "FairMarketValueAmt",
          totalPair(sheet.nongrantor_trust_interests).fair_market_value,
        ),
      ], nongrantorTrustAttrs)
      : "",
    ...laterSimpleLines.map(([tag, pair]) => pairXml(tag, pair)),
    pairXml(
      "TotalOtherAssetsNotIncludedGrp",
      sheet.other_assets.length ? totalPair(sheet.other_assets) : undefined,
      otherAssetsAttrs,
    ),
    pairXml("TotalAssetsDetail", {
      fair_market_value: totals.totalAssetsFairMarketValue,
      us_adjusted_basis: totals.totalAssetsUsAdjustedBasis,
    }),
    element(
      "InstallmentObligLiabilityAmt",
      sheet.installment_obligations_liability,
    ),
    element("MortgageLiabilityAmt", sheet.mortgage_liability),
    sheet.other_liabilities.length
      ? element(
        "OtherLiabilityAmt",
        sumMoney(sheet.other_liabilities.map((row) => row.amount)),
        otherLiabilitiesAttrs,
      )
      : "",
    element("TotalLiabilityAmt", totals.totalLiabilities),
    element("NetWorthAmt", totals.netWorth),
  ]);
}
