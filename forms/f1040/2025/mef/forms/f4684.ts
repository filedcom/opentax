import { element, elements } from "../../../mef/xml.ts";
import {
  casualtyLossLines,
  inputSchema,
} from "../../../nodes/intermediate/forms/form4684/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function parseDate(value: string | undefined, field: string): Date {
  if (!value) throw new Error(`Form 4684 business casualty needs ${field}`);
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Form 4684 ${field} is not a valid date`);
  }
  return date;
}

function buildIRS4684(fields: Input, context?: MefBuildContext): string {
  if (Array.isArray(fields) && fields.length === 0) return "";
  const input = inputSchema.parse(fields);
  const hasPersonal = [
    input.personal_fmv_before,
    input.personal_fmv_after,
    input.personal_basis,
    input.personal_insurance,
  ].some((value) => value !== undefined && value !== 0);
  const hasBusiness = [
    input.business_fmv_before,
    input.business_fmv_after,
    input.business_basis,
    input.business_insurance,
  ].some((value) => value !== undefined && value !== 0);
  if (!hasPersonal && !hasBusiness) return "";
  if (hasPersonal) {
    throw new Error(
      "Form 4684 personal casualty MeF needs property and disaster details",
    );
  }
  if (
    input.business_is_section_1231 !== true ||
    input.business_fmv_before === undefined ||
    input.business_fmv_after === undefined ||
    input.business_basis === undefined ||
    !input.business_property_description ||
    !input.business_property_location ||
    !input.business_casualty_description
  ) {
    throw new Error(
      "Form 4684 business casualty MeF needs one documented long-term business property",
    );
  }
  const before = input.business_fmv_before;
  const after = input.business_fmv_after;
  const basis = input.business_basis;
  const insurance = input.business_insurance ?? 0;
  if (
    [before, after, basis, insurance].some((value) =>
      !Number.isSafeInteger(value)
    )
  ) {
    throw new Error(
      "Form 4684 business casualty amounts must be whole dollars",
    );
  }
  const acquired = parseDate(input.business_acquired_date, "acquisition date");
  const casualty = parseDate(input.business_casualty_date, "casualty date");
  if (casualty.getUTCFullYear() !== 2025) {
    throw new Error("Form 4684 casualty date must be in tax year 2025");
  }
  const anniversary = new Date(acquired);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  if (casualty <= anniversary) {
    throw new Error(
      "Form 4684 long-term business property must be held more than one year",
    );
  }
  const lines = casualtyLossLines(before, after, basis, insurance);
  if (lines.loss <= 0) {
    throw new Error(
      "Form 4684 business casualty MeF needs a positive loss for this reporting path",
    );
  }
  if (context?.pending) {
    const linked = context.pending.form4797;
    if (
      !linked || typeof linked !== "object" || Array.isArray(linked) ||
      (linked as Record<string, unknown>).ordinary_gain_form4684 !== -lines.loss
    ) {
      throw new Error("Form 4684 line 38a must match Form 4797 line 14");
    }
  }
  const property = [
    input.business_property_description,
    input.business_property_location,
    input.business_acquired_date,
  ].join("; ");
  return elements("IRS4684", [
    elements("BusinessProperties", [
      element("PropertyDesc", property),
      element("CostOrAdjustedBasisAmt", basis),
      element("InsuranceOrOthReimbursementAmt", insurance),
      element("FairMarketValueBeforeTheftAmt", before),
      element("FairMarketValueAfterTheftAmt", after),
      element("NetFairMarketValueAmt", lines.fmvDecline),
      element("SmllrOfCostOrNetFairMrktVlAmt", lines.cappedLoss),
      element("NetBusinessPropertyLossAmt", lines.loss),
    ]),
    element("TotalBusPropertyTheftLossAmt", lines.loss),
    elements("LongTermTheftProperty", [
      element("CasualtyOrTheftDesc", input.business_casualty_description),
      element("TradeOrRentalPropertyAmt", lines.loss),
    ]),
    element("LongTermTradeOrBusinessTotAmt", lines.loss),
    element("LongTermPropertyTotalLossesAmt", lines.loss),
    elements("LongTermPropNetGainOrLossGrp", [
      element("LongTermPropNetGainOrLossAmt", -lines.loss),
    ]),
  ]);
}

export const form4684: MefFormDescriptor<"form4684", Input> = {
  pendingKey: "form4684",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4684.pdf",
  build(fields, context) {
    return buildIRS4684(fields, context);
  },
};
