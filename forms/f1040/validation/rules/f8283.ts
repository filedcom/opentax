/**
 * MeF Business Rules: F8283
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 18 rules (18 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, dateYearEqOrNext, eqStr, hasValue, ifThen, ssnNotEqual, } from "../../../../core/validation/mod.ts";

export const F8283_RULES: readonly RuleDef[] = [
  rule(
    "F8283-006-02",
    "reject",
    "data_mismatch",
    dateYearEqOrNext("ContributionDt", "TaxYr"),
    "The year of the 'ContributionDt' in \"Contributions of Motor Vehicles, Boats, and Airplanes Statement\" [ContributionsOfMotorVehiclesBoatsAndAirplanesStatement] must equal the 'TaxYr' year in the Return Header or the year immediately following the 'TaxYr' in the Return Header.",
  ),
  rule(
    "F8283-007-02",
    "reject",
    "data_mismatch",
    dateYearEqOrNext("SaleDt", "TaxYr"),
    "The year of the 'SaleDt' in \"Contributions of Motor Vehicles, Boats, and Airplanes Statement\" [ContributionsOfMotorVehiclesBoatsAndAirplanesStatement] must equal the 'TaxYr' in the Return Header or the year immediately following the 'TaxYr' in the Return Header.",
  ),
  rule(
    "F8283-011-01",
    "reject",
    "missing_document",
    ifThen(eqStr("DonatedPropertyRestrictionInd", "Yes"), hasValue("RestrictedUseStatement")),
    "If Form 8283, 'DonatedPropertyRestrictionInd' has a choice of \"Yes\" indicated, then \"Restricted Use Statement\" [RestrictedUseStatement] must be present in the return.",
  ),
  rule(
    "F8283-012-01",
    "reject",
    "missing_document",
    ifThen(eqStr("DonatedPropertyRightsGivenInd", "Yes"), hasValue("RestrictedUseStatement")),
    "If Form 8283, 'DonatedPropertyRightsGivenInd' has a choice of \"Yes\" indicated, then \"Restricted Use Statement\" [RestrictedUseStatement] must be present in the return.",
  ),
  rule(
    "F8283-013-01",
    "reject",
    "missing_document",
    ifThen(eqStr("DonatedPropertyLimitingRstrInd", "Yes"), hasValue("RestrictedUseStatement")),
    "If Form 8283, 'DonatedPropertyLimitingRstrInd' has a choice of \"Yes\" indicated, then \"Restricted Use Statement\" [RestrictedUseStatement] must be present in the return.",
  ),
  rule(
    "F8283-025",
    "reject",
    "missing_data",
    ifThen(hasValue("ContributionsOfMotorVehiclesBoatsAndAirplanesStatement"), hasValue("VehicleInd")),
    "If Form 8283, 'ContributionsOfMotorVehiclesBoatsAndAirplanesStatement' is attached to 'PropertyInformation', then 'VehicleInd' must be checked.",
  ),
  rule(
    "F8283-027",
    "reject",
    "missing_data",
    ifThen(hasValue("ContemporaneousWrittenAcknowledgmentStatement"), hasValue("VehicleInd")),
    "If Form 8283, 'ContemporaneousWrittenAcknowledgmentStatement' is attached to 'PropertyInformation', then 'VehicleInd' must be checked.",
  ),
  rule(
    "F8283-029-02",
    "reject",
    "missing_document",
    alwaysPass,
    "If Form 8283, 'DonatedPropertyVehicleInd' is checked, then a binary attachment with Description beginning with 'Form1098C' or 'DoneeOrganizationContemporaneousWrittenAcknowledgment' must be attached to Form 8283 or the 'Form1098CPaperDocumentInd' in the Return Header must have a choice of 'Yes' indicated.",
  ),
  rule(
    "F8283-030",
    "reject",
    "missing_document",
    ifThen(hasValue("VehicleInd"), any(hasValue("ContributionsOfMotorVehiclesBoatsAndAirplanesStatement"), hasValue("ContemporaneousWrittenAcknowledgmentStatement"))),
    "If Form 8283, 'VehicleInd' is checked, then 'ContributionsOfMotorVehiclesBoatsAndAirplanesStatement' or 'ContemporaneousWrittenAcknowledgmentStatement' must be attached to 'PropertyInformation'.",
  ),
  rule(
    "F8283-031-01",
    "reject",
    "missing_document",
    alwaysPass,
    "If Form 8283 'VehicleInd' is checked, then a binary attachment with description beginning with 'Form1098C' or 'DoneeOrganizationContemporaneousWrittenAcknowledgment' must be attached to Form 8283.",
  ),
  rule(
    "F8283-032-02",
    "reject",
    "missing_document",
    alwaysPass,
    "If Form 8283, [ 'DonatedPropertyVehicleInd' in 'InformationOnDonatedProperty' ] is checked, then a binary attachment with description beginning with [ \"Form1098C\" or \"DoneeOrganizationContemporaneousWrittenAcknowledgment\" ] must be attached to Form 8283.",
  ),
  rule(
    "F8283-033-01",
    "reject",
    "missing_document",
    alwaysPass,
    "If Form 8283, 'VehicleInd' is checked, then a binary attachment with description beginning with [ \"Form1098C\" or \"DoneeOrganizationContemporaneousWrittenAcknowledgment\" ] must be attached to Form 8283.",
  ),
  rule(
    "F8283-034-01",
    "reject",
    "missing_data",
    ifThen(hasValue("VIN"), hasValue("DonatedPropertyVehicleInd")),
    "If Form 8283, 'VIN' has a value, then 'DonatedPropertyVehicleInd' must be checked for the corresponding vehicle.",
  ),
  rule(
    "F8283-035-01",
    "reject",
    "missing_data",
    ifThen(hasValue("DonatedPropertyVehicleInd"), hasValue("VIN")),
    "If Form 8283, 'DonatedPropertyVehicleInd' is checked, then 'VIN' must have a value for the corresponding vehicle.",
  ),
  rule(
    "F8283-036",
    "reject",
    "missing_document",
    alwaysPass,
    "In each 'InformationOnDonatedProperty' on Form 8283, if 'DonatedPropertyVehicleInd' is checked, then [ContributionsOfMotorVehiclesBoatsAndAirplanesStatement] or [ContemporaneousWrittenAcknowledgmentStatement] must be attached to 'DonatedPropertyVehicleInd'.",
  ),
  rule(
    "F8283-037",
    "reject",
    "missing_document",
    ifThen(hasValue("OriginalNoncashSSN"), ssnNotEqual("OriginalNoncashSSN", "PrimarySSN")),
    "If Form 8283, 'OriginalNoncashSSN' has a value, then it must not be the same as [ 'PrimarySSN' or SpouseSSN' ] in the Return Header.",
  ),
  rule(
    "F8283-041",
    "reject",
    "missing_document",
    ifThen(hasValue("AppraiserSignedDt"), alwaysPass),
    "If Form 8283, 'AppraiserSignedDt' has a value, then a binary attachment with description \"Form 8283 appraiser signature document\" must be present in the return.",
  ),
  rule(
    "F8283-042",
    "reject",
    "missing_document",
    ifThen(hasValue("DoneeName"), alwaysPass),
    "If Form 8283, 'DoneeName' has a value, then a binary attachment with description \"Form 8283 Donee signature document\" must be present in the return.",
  ),
];
