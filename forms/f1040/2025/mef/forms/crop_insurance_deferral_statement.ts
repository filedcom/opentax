import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm4835Lines,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import {
  computeGrossIncome,
  inputSchema as scheduleFInputSchema,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import type { CropInsuranceDeferralDetails } from "../../../nodes/intermediate/forms/farm_elections.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function cropStatement(
  details: CropInsuranceDeferralDetails,
  context: MefBuildContext,
): string {
  const filer = context.filer;
  if (!filer || filer.address.foreignCountry) {
    throw new Error(
      "Crop insurance statement requires a domestic filer name and address",
    );
  }
  return elements("PostponementCropInsDsstrStmt", [
    elements("BusinessName", [
      element("BusinessNameLine1Txt", filer.fullName ?? filer.nameLine1),
    ]),
    elements("USAddress", [
      element("AddressLine1Txt", filer.address.line1),
      element("AddressLine2Txt", filer.address.line2),
      element("CityNm", filer.address.city),
      element("StateAbbreviationCd", filer.address.state),
      element("ZIPCd", filer.address.zip),
    ]),
    element(
      "SectionChoiceStatementTxt",
      "I elect to postpone eligible crop insurance proceeds under IRC section 451(f) and Treasury Regulation section 1.451-6.",
    ),
    element(
      "NormalBusPracticeStatementTxt",
      `Under my normal business practice, ${details.normal_practice_next_year_percent}% of income from the damaged crops would have been included in gross income in a tax year after 2025.`,
    ),
    ...details.damaged_crops.map((damage) =>
      elements("DestructionOrDamageCropsGrp", [
        element("DestructionOrDamageDt", damage.damage_date),
        element("DestructionOrDamageCauseTxt", damage.cause),
        element("DestroyedOrDamagedCropDsc", damage.crop),
      ])
    ),
    ...details.payments.map((payment) =>
      elements("InsurancePaymentsForCropGrp", [
        element("DestroyedOrDamagedCropDsc", payment.crop),
        elements("InsurancePaymentGrp", [
          element("Dt", payment.received_date),
          element("Amt", payment.amount),
        ]),
        elements("InsuranceCarrierName", [
          element("BusinessNameLine1Txt", payment.carrier),
        ]),
      ])
    ),
  ]);
}

export const cropInsuranceDeferralStatement: MefFormDescriptor<
  "crop_insurance_deferral_statement",
  Record<string, unknown>,
  readonly string[]
> = {
  pendingKey: "crop_insurance_deferral_statement",
  sourcePendingKeys: ["f4835", "schedule_f"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/publications/p225",
  build(_fields, context) {
    const source = context?.pending?.f4835;
    const f4835s = source === undefined
      ? []
      : form4835InputSchema.parse(source).f4835s;
    const rentalStatements = f4835s.flatMap((item) => {
      calculateForm4835Lines(item);
      if (item.defer_crop_insurance !== true) return [];
      const details = item.crop_insurance_deferral_details;
      if (!details || !context) {
        throw new Error("Form 4835 crop insurance statement needs details");
      }
      return [cropStatement(details, context)];
    });
    const farmSource = context?.pending?.schedule_f;
    const farms = farmSource === undefined
      ? []
      : scheduleFInputSchema.parse(farmSource).schedule_fs;
    const ownerStatements = farms.flatMap((item) => {
      computeGrossIncome(item);
      if (item.line6c_defer_crop_insurance !== true) return [];
      const details = item.line6c_crop_insurance_deferral_details;
      if (!details || !context) {
        throw new Error("Schedule F crop insurance statement needs details");
      }
      return [cropStatement(details, context)];
    });
    return [...rentalStatements, ...ownerStatements];
  },
};
