import { element, elements } from "../../../mef/xml.ts";
import {
  type F8854Input,
  inputSchema,
  partISchema,
} from "../../../nodes/inputs/f8854/index.ts";
import type { z } from "zod";

type PartI = z.infer<typeof partISchema>;

function addressXml(
  tag: "USAddress" | "ForeignAddress" | "ForeignResidenceAddress",
  address: PartI["mailing_address"],
): string {
  if (address.kind === "US") {
    if (tag !== "USAddress") throw new Error("Form 8854 address type mismatch");
    return elements(tag, [
      element("AddressLine1Txt", address.line1),
      element("AddressLine2Txt", address.line2),
      element("CityNm", address.city),
      element("StateAbbreviationCd", address.state),
      element("ZIPCd", address.zip),
    ]);
  }
  if (tag === "USAddress") throw new Error("Form 8854 address type mismatch");
  return elements(tag, [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("ProvinceOrStateNm", address.province_or_state),
    element("CountryCd", address.country_code),
    element("ForeignPostalCd", address.postal_code),
  ]);
}

/** IRS8854 Part I children in 2025v5.4 XSD order. Not a filing document. */
export function buildForm8854PartI(rawInput: F8854Input): string {
  const input = inputSchema.parse(rawInput);
  return buildForm8854PartIFields(input.part_i, "INITIAL");
}

/** Shared Part I fields for initial and annual 2025 MeF documents. */
export function buildForm8854PartIFields(
  rawPartI: PartI,
  statementKind: "INITIAL" | "ANNUAL",
): string {
  const partI = partISchema.parse(rawPartI);
  const addressTag = partI.mailing_address.kind === "US"
    ? "USAddress"
    : "ForeignAddress";
  const notification = partI.notification;
  const notificationXml = notification.kind === "CITIZEN_STATE_DEPARTMENT"
    ? elements("ExptrtNotificationCitizenGrp", [
      element("ExptrtNotificationCitizenInd", "X"),
      element("ExptrtNotifToDeptOfStateDt", notification.date),
    ])
    : notification.kind === "LTR_HOMELAND_SECURITY"
    ? elements("ExptrtNotifLongTermResidentGrp", [
      element("ExptrtNotifLongTermResidentInd", "X"),
      element("ExptrtNotifToDeptHomelandSecDt", notification.date),
    ])
    : elements("ExptrtNotifLongTermDualResGrp", [
      element("ExptrtNotifLongTermDualResInd", "X"),
      element("ExptrtNotifLongTermDualResDt", notification.date),
    ]);

  return [
    elements("AfterExptrtMailAddrPhoneGrp", [
      addressXml(addressTag, partI.mailing_address),
      partI.telephone.kind === "US"
        ? element("USTelephoneNum", partI.telephone.number)
        : element("ForeignPhoneNum", partI.telephone.number),
    ]),
    partI.foreign_residence_address
      ? addressXml("ForeignResidenceAddress", partI.foreign_residence_address)
      : "",
    element(
      "ForeignTaxResidenceCountryCd",
      partI.foreign_tax_residence_country_code,
    ),
    statementKind === "INITIAL"
      ? element("InitialExptrtStmtSpcfdYrInd", "X")
      : element("AnnualExptrtStmtBfrSpcfdYrInd", "X"),
    notificationXml,
    ...partI.citizenships.map((citizenship) =>
      elements("CountryCitizenshipGrp", [
        element("CitizenCountryCd", citizenship.country_code),
        element("CitizenshipDt", citizenship.acquired_date),
      ])
    ),
    partI.us_citizenship_acquisition === "BIRTH"
      ? element("USCitizenByBirthInd", "X")
      : partI.us_citizenship_acquisition === "NATURALIZATION"
      ? element("USCitizenByNaturalizationInd", "X")
      : "",
    element("LawfulPermanentResidentDt", partI.lawful_permanent_resident_date),
    element(
      "LawfulPrmnntResRescindDt",
      partI.lawful_permanent_resident_rescinded_date,
    ),
    element(
      "RelinquishedPermanentResCardDt",
      partI.permanent_resident_card_relinquished_date,
    ),
  ].join("");
}
