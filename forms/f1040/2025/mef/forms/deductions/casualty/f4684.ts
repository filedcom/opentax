import { element, elements } from "../../../../../mef/xml.ts";
import {
  casualtyLossLines,
  inputSchema,
  PersonalCasualtyKind,
  personalSectionA,
} from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";
import type {
  PersonalCasualty,
  PersonalCasualtyLines,
  SectionASummary,
} from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";
import { personalLine18 } from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/line18.ts";
import type { MefBuildContext, MefFormDescriptor } from "../../../form-descriptor.ts";

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

function personalForm(
  form: PersonalCasualtyLines,
  summary: SectionASummary | undefined,
  line17: number | undefined,
  line18: number | undefined,
): string {
  const { casualty } = form;
  const declared = casualty.kind !== PersonalCasualtyKind.NotFederallyDeclared;
  return elements("IRS4684", [
    declared ? element("FederallyDeclaredDisasterDesc", casualty.description) : "",
    declared ? element("FederallyDeclaredDisasterInd", "X") : "",
    element("FEMADisasterDeclarationNum", casualty.fema_declaration_number),
    ...casualty.properties.map((property, index) => {
      const lines = form.properties[index];
      return elements("PersonalUseProperties", [
        element("PropertyDesc", property.property_type),
        elements("USAddress", [
          element("AddressLine1Txt", property.address_line1),
          element("CityNm", property.city),
          element("StateAbbreviationCd", property.state),
          element("ZIPCd", property.zip),
        ]),
        element("AcquiredDt", property.acquired_date),
        element("CostOrOtherBasisAmt", property.basis),
        element("InsuranceOrOthReimbursementAmt", property.insurance),
        element("GainFromCasualtyOrTheftAmt", lines.line4Gain),
        ...(lines.line4Gain === undefined
          ? [
            element("FairMarketValueBeforeTheftAmt", property.fmv_before),
            element("FairMarketValueAfterTheftAmt", property.fmv_after),
            element("NetFairMarketValueAmt", lines.line7FmvDecline),
            element("SmllrOfAdjOrNetFairMrktVlAmt", lines.line8Smaller),
            element("PropertyMinusInsuranceValueAmt", lines.line9Loss),
          ]
          : []),
      ]);
    }),
    element("TotalPrsnlPropertyTheftLossAmt", form.line10),
    element("CasualtyOrTheftLossLimitAmt", form.line11),
    element("NetCasualtyOrTheftLossAmt", form.line12),
    ...(summary
      ? [
        element("TotalCasualtyAndTheftGainAmt", summary.line13),
        element("TotalNetCasualtyOrTheftLossAmt", summary.line14),
        element("TotalTheftGainLessTotalLossAmt", summary.line15),
        element("TotalLossLessTotalTheftGainAmt", summary.line16),
        element("TenPercentOfAGIAmt", line17),
        element("CalcAdjGroIncmMnsTotNetLossAmt", line18),
      ]
      : []),
  ]);
}

function numberField(record: unknown, key: string): number | undefined {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return undefined;
  }
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

/** One Form 4684 per casualty through line 12; the first carries lines 13
 * through 18 (Form 4684, Section A; business rule F4684-003-02). */
function agiLimitedLines(
  line16: number | undefined,
  pending: MefBuildContext["pending"],
) {
  if (line16 === undefined) return undefined;
  const agi = numberField(pending?.f1040, "line11_agi");
  if (agi === undefined) {
    throw new Error("Form 4684 line 17 needs Form 1040 line 11b");
  }
  return personalLine18(line16, agi);
}

function buildPersonalIRS4684(
  casualties: readonly PersonalCasualty[],
  context?: MefBuildContext,
): readonly string[] {
  const summary = personalSectionA(casualties);
  const pending = context?.pending;
  const limited = agiLimitedLines(summary.line16, pending);
  if (pending) {
    const scheduleA = pending.schedule_a;
    const itemizing = numberField(pending.f1040, "line12e_itemized_deductions") !==
      undefined;
    const line15 = numberField(scheduleA, "line_15_casualty_theft_loss") ?? 0;
    const nqdl = numberField(scheduleA, "net_qualified_disaster_loss") ?? 0;
    if (
      (itemizing && line15 !== (limited?.line18 ?? 0)) ||
      nqdl !== summary.line15 ||
      (numberField(pending.standard_deduction, "net_qualified_disaster_loss") ??
          0) !== summary.line15
    ) {
      throw new Error(
        "Form 4684 lines 15 and 18 must match Schedule A and the standard deduction",
      );
    }
  }
  return summary.forms.map((form, index) =>
    personalForm(
      form,
      index === 0 ? summary : undefined,
      limited?.line17,
      limited?.line18,
    )
  );
}

function buildIRS4684(
  fields: Input,
  context?: MefBuildContext,
): string | readonly string[] {
  if (Array.isArray(fields) && fields.length === 0) return "";
  const input = inputSchema.parse(fields);
  const hasBusiness = [
    input.business_fmv_before,
    input.business_fmv_after,
    input.business_basis,
    input.business_insurance,
  ].some((value) => value !== undefined && value !== 0);
  if (input.personal_casualties) {
    if (hasBusiness) {
      throw new Error(
        "Form 4684 with both personal-use and business casualties needs Section A and B on separate forms",
      );
    }
    return buildPersonalIRS4684(input.personal_casualties, context);
  }
  if (!hasBusiness) return "";
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

export const form4684: MefFormDescriptor<
  "form4684",
  Input,
  string | readonly string[]
> = {
  pendingKey: "form4684",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4684.pdf",
  build(fields, context) {
    return buildIRS4684(fields, context);
  },
};
