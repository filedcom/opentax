import { element, elements } from "../../../mef/xml.ts";
import {
  calculateInstallmentSale,
  installmentSaleDate,
  isLongTermInstallmentSale,
} from "../../../nodes/intermediate/forms/form6252/calculation.ts";
import {
  type F6252Input,
  type F6252Item,
  inputSchema,
} from "../../../nodes/intermediate/forms/form6252/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = F6252Input;

// Most elements are derived form lines, not direct input-to-XML mappings.
export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

export function validateFiledForm6252(input: F6252Item) {
  if (
    !input.property_description || !input.date_acquired || !input.date_sold ||
    input.selling_price_determinable !== true ||
    input.sold_to_related_party !== false
  ) {
    throw new Error(
      "Form 6252 needs property, dates, determinable price, and unrelated-party confirmation",
    );
  }
  if ((input.depreciation_recapture ?? 0) > 0) {
    throw new Error(
      "Form 6252 depreciation recapture needs the linked Form 4797 Part III property detail",
    );
  }
  if ((input.depreciation_allowed ?? 0) > 0) {
    throw new Error(
      "Form 6252 depreciated property needs section 1245/1250 and unrecaptured gain treatment",
    );
  }
  const sold = installmentSaleDate(input.date_sold, "sale date");
  if (
    sold.getUTCFullYear() < 2025 &&
    input.payments_received_prior_years === undefined
  ) {
    throw new Error(
      "Form 6252 later-year sale needs prior-year payment history",
    );
  }
  const lines = calculateInstallmentSale(input);
  if (sold.getUTCFullYear() === 2025) {
    if (lines.line23 !== 0) {
      throw new Error(
        "Form 6252 year-of-sale filing cannot have prior-year payments",
      );
    }
    if (lines.line22 >= lines.line18) {
      throw new Error(
        "Form 6252 year-of-sale filing needs a payment after the sale year",
      );
    }
  }
  const isLongTerm = isLongTermInstallmentSale(input);
  if (input.is_long_term !== undefined && input.is_long_term !== isLongTerm) {
    throw new Error(
      "Form 6252 is_long_term conflicts with actual holding period",
    );
  }
  if (input.is_capital_asset === false && !isLongTerm) {
    throw new Error(
      "Form 6252 short-term business property needs Form 4797 Part II detail",
    );
  }
  return lines;
}

function buildIRS6252(input: F6252Item): string {
  const lines = validateFiledForm6252(input);
  return elements("IRS6252", [
    element("PropertyDesc", input.property_description),
    element("AcquiredDt", input.date_acquired),
    element("SoldDt", input.date_sold),
    element("PropertySoldToRelatedPartyInd", "false"),
    element("TotSellPrcTYSaleOrOthDisposInd", "true"),
    element("SellingPriceIncludingMortgAmt", lines.line5),
    element("MortgageIndebtednessAmt", lines.line6),
    element("SellingPriceLessMortgIndbtAmt", lines.line7),
    element("CostOrOtherBasisPropSoldAmt", lines.line8),
    element("DepreciationAllowedAmt", lines.line9),
    element("AdjustedBasisAmt", lines.line10),
    element("CommissionsOtherExpnsOfSaleAmt", lines.line11),
    element("TotalSectionPropertyAmt", lines.line12),
    element("SumOfAdjBssCommIncmRcptrAmt", lines.line13),
    element("SumLessAdjBssCommIncmRcptrAmt", lines.line14),
    element("ExcludedGainAmt", lines.line15),
    element("GrossProfitAmt", lines.line16),
    element("NetAdjBasisCommIncmRcptrAmt", lines.line17),
    element("ContractPriceAmt", lines.line18),
    element("GrossProfitRatioPct", lines.line19.toFixed(5)),
    element("YearOfSaleAmt", lines.line20),
    element("PaymentsReceivedCurrentYearAmt", lines.line21),
    element("SumYearOfSaleAndPymtsRcvdAmt", lines.line22),
    element("PaymentsReceivedPriorYearsAmt", lines.line23),
    lines.line24 > 0 ? element("InstallmentSaleIncomeAmt", lines.line24) : "",
    element("OrdinaryIncomePartAmt", lines.line25),
    element("InstalSaleLessOrdnryIncmAmt", lines.line26),
  ]);
}

export function validateDestinations(
  items: readonly F6252Item[],
  context?: MefBuildContext,
): void {
  if (!context?.pending) return;
  const totals = items.reduce((sum, item) => {
    const gain = calculateInstallmentSale(item).line26;
    if (item.is_capital_asset === false) {
      return { ...sum, business: sum.business + gain };
    }
    return isLongTermInstallmentSale(item)
      ? { ...sum, longTerm: sum.longTerm + gain }
      : { ...sum, shortTerm: sum.shortTerm + gain };
  }, { longTerm: 0, shortTerm: 0, business: 0 });
  const schedule = context.pending.schedule_d;
  const scheduleFields =
    schedule && typeof schedule === "object" && !Array.isArray(schedule)
      ? schedule as Record<string, unknown>
      : {};
  const business = context.pending.form4797;
  const businessFields =
    business && typeof business === "object" && !Array.isArray(business)
      ? business as Record<string, unknown>
      : {};
  if (
    totals.longTerm > 0 &&
      scheduleFields.gain_form6252_lt !== totals.longTerm ||
    totals.shortTerm > 0 && scheduleFields.gain_form6252_st !== totals.shortTerm
  ) {
    throw new Error("Form 6252 line 26 must match its Schedule D gain source");
  }
  if (totals.business > 0 && businessFields.gain_form6252 !== totals.business) {
    throw new Error("Form 6252 line 26 must match Form 4797 line 4");
  }
}

export const form6252: MefFormDescriptor<"form6252", Input, readonly string[]> =
  {
    pendingKey: "form6252",
    FIELD_MAP,
    pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6252.pdf",
    build(fields, context) {
      if (Array.isArray(fields) && fields.length === 0) return [];
      const { f6252s } = inputSchema.parse(fields);
      const documents = f6252s.map(buildIRS6252);
      validateDestinations(f6252s, context);
      return documents;
    },
  };
