import { reconcileForm8911BusinessFiling } from "./f8911_source.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import {
  computeForm8911Amounts,
  computePersonalCreditAmounts,
  type F8911Input,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

type Input = Partial<F8911Input> & Record<string, unknown>;

export const form8911: MefFormDescriptor<"f8911", Input> = {
  pendingKey: "f8911",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8911.pdf",
  build(fields, context = {}) {
    if (Object.keys(fields).length === 0) return "";
    const raw = fields as F8911Input;
    const business = (raw.properties ?? [raw]).some((p) =>
      (p.business_use_pct ?? 0) > 0
    );
    if (business) {
      if (!context.pending) {
        throw new Error(
          "Form 8911 business credit requires the Form 3800 path and reconciled filing sources",
        );
      }
      reconcileForm8911BusinessFiling(raw, context.pending);
      return buildForm8911CreditXml(raw);
    }
    const amounts = computePersonalCreditAmounts(raw);
    if (!amounts || amounts.allowedCredit === 0) return "";
    return buildForm8911CreditXml(fields as F8911Input);
  },
};

/** Parent presentation; the registered descriptor reconciles business filing sources. */
export function buildForm8911CreditXml(input: F8911Input): string {
  const { personal: amounts, businessCredit, properties } =
    computeForm8911Amounts(input);
  if (businessCredit === 0 && (!amounts || amounts.allowedCredit === 0)) {
    return "";
  }
  return elements("IRS8911", [
    element(
      "TotQlfyAltFuelVehRefuelPropCnt",
      properties.length,
    ),
    ...(businessCredit > 0
      ? [
        element("BusInvstUseRefuelingPropCrAmt", businessCredit),
        element("BusinessInvstUsePartOfCrAmt", businessCredit),
      ]
      : []),
    ...(amounts
      ? [
        element("PrsnlUseRefuelingPropCrAmt", amounts.tentativeCredit),
        element("RegularTaxBeforeCreditsAmt", amounts.regularTaxBeforeCredits),
        element("ForeignTaxCreditAmt", amounts.foreignTaxCredit),
        element("CertainAllowableCreditsAmt", amounts.certainAllowableCredits),
        element("TotalTaxCreditsAmt", amounts.totalOtherCredits),
        element("NetRegularTaxAmt", amounts.netRegularTax),
        ...(amounts.netRegularTax > 0
          ? [
            element("TentativeMinimumTaxAmt", amounts.tentativeMinimumTax),
            element("AdjustedRegularTaxAmt", amounts.adjustedRegularTax),
            ...(amounts.adjustedRegularTax > 0
              ? [element("TotalPersonalUsePartOfCrAmt", amounts.allowedCredit)]
              : []),
          ]
          : []),
      ]
      : []),
  ]);
}
