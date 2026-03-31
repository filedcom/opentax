/**
 * MeF Business Rules: F3468
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 16 rules (16 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, all, any, eqNum, eqStr, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F3468_RULES: readonly RuleDef[] = [
  rule(
    "F3468-012-02",
    "reject",
    "missing_data",
    ifThen(hasNonZero("CertHistoricStructureCrAmt"), any(hasValue("NPSProjectNum"), hasValue("PassThroughEntityEIN"))),
    "If Form 3468, 'CertHistoricStructureCrAmt' has a non-zero value, then 'NPSProjectNum' or 'PassThroughEntityEIN' must be present.",
  ),
  rule(
    "F3468-013-01",
    "reject",
    "missing_data",
    ifThen(hasValue("NPSProjectNum"), hasValue("NPSApprovalDt")),
    "If Form 3468, 'NPSProjectNum' has a value, then 'NPSApprovalDt' must have a value.",
  ),
  rule(
    "F3468-014-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("OtherCertifiedHistStrctrCrAmt"), any(hasValue("NPSProjectNum"), hasValue("PassThroughEntityEIN"))),
    "If Form 3468, 'OtherCertifiedHistStrctrCrAmt' has a non-zero value, then 'NPSProjectNum' or 'PassThroughEntityEIN' must be present.",
  ),
  rule(
    "F3468-027",
    "reject",
    "incorrect_data",
    ifThen(hasValue("QlfyInvAdvncEgyProjProp48CPct"), any(all(hasValue("ProjWageRqrSect48Ce5And6Ind"), eqNum("QlfyInvAdvncEgyProjProp48CPct", 0.30)), all(hasValue("ProjWageRqrNotStsfdInd"), eqNum("QlfyInvAdvncEgyProjProp48CPct", 0.06)))),
    "If Form 3468, 'QlfyInvAdvncEgyProjProp48CPct' has a value, then it must be [.30, if 'ProjWageRqrSect48Ce5And6Ind' is checked] or [.06, if 'ProjWageRqrNotStsfdInd' is checked].",
  ),
  rule(
    "F3468-028-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("NetOutLss1MWACOrStsfdWgReqPct"), any(all(any(eqStr("NetOutLess1MWOrThermalEgyCd", "Yes"), hasValue("ProjWageRqrSect48a10And11Ind")), eqNum("NetOutLss1MWACOrStsfdWgReqPct", 0.30)), eqNum("NetOutLss1MWACOrStsfdWgReqPct", 0.06))),
    "If Form 3468, 'NetOutLss1MWACOrStsfdWgReqPct' has a value, then it must be [.30 if 'NetOutLess1MWOrThermalEgyCd' is yes or 'ProjWageRqrSect48a10And11Ind' is checked] or [otherwise .06].",
  ),
  rule(
    "F3468-029-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("NetOutLss1MWACOrStsfdWgReqPct"), any(all(any(eqStr("NetOutLess1MWOrThermalEgyCd", "Yes"), hasValue("ProjWageRqrSect48a10And11Ind")), eqNum("NetOutLss1MWACOrStsfdWgReqPct", 0.10)), eqNum("NetOutLss1MWACOrStsfdWgReqPct", 0.02))),
    "If Form 3468, 'NetOutLss1MWACOrStsfdWgReqPct' has a value in the 'QualifiedMicroturbinePropCrGrp' then it must be [.10 if 'NetOutLess1MWOrThermalEgyCd' is yes or 'ProjWageRqrSect48a10And11Ind' is checked] or [otherwise .02].",
  ),
  rule(
    "F3468-030-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("DomContentBonusCreditPct"), any(all(hasValue("DomContentCrStsfdPctInd"), eqNum("DomContentBonusCreditPct", 0.10)), all(hasValue("DomContentCrNotStsfdPctInd"), eqNum("DomContentBonusCreditPct", 0.02)))),
    "If Form 3468, 'DomContentBonusCreditPct' has a value, then it must be [.10 if 'DomContentCrStsfdPctInd' is checked] or [.02 if 'DomContentCrNotStsfdPctInd' is checked].",
  ),
  rule(
    "F3468-031-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("EnergyComBonusCreditPct"), any(all(hasValue("EgyComBonusCrStsfdPctInd"), eqNum("EnergyComBonusCreditPct", 0.10)), all(hasValue("EgyComBonusCrNotStsfdPctInd"), eqNum("EnergyComBonusCreditPct", 0.02)))),
    "If Form 3468, 'EnergyComBonusCreditPct' has a value, then it must be [.10 if 'EgyComBonusCrStsfdPctInd' is checked] or [.02 if 'EgyComBonusCrNotStsfdPctInd' is checked].",
  ),
  rule(
    "F3468-032-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 3468, 'LowIncmSolarWindBonusCrPct' has a value, then it must be [.10 if 'SolarWindCrComSect45DeInd' or 'SolarWindCrComIndianLandInd' is checked] or [.20 if 'SolarWindCrComRsdntlBldgInd' or 'SolarWindCrComEconomicBnftInd' is checked] or [.00 if 'SolarWindCrComNotQlfyInd', 'ACNameplateCapKWQty', 'WindEnergyPropOrFacilityInd', or 'NameplateCapKWQty' is checked and it is more than 5 MW ac].",
  ),
  rule(
    "F3468-033-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("NetOutLss1MWStsfdWgReqSectAPct"), any(all(hasValue("ProjWageRqrSect48a10And11Ind"), eqNum("NetOutLss1MWStsfdWgReqSectAPct", 0.06)), all(hasValue("ProjWageRqrNotStsfdInd"), eqNum("NetOutLss1MWStsfdWgReqSectAPct", 0.012)))),
    "If Form 3468, 'NetOutLss1MWStsfdWgReqSectAPct' in the 'ClnHydrgnProdFcltsEgyPropCrGrp' has a value, then it must equal [.06, if 'ProjWageRqrSect48a10And11Ind' is checked] or [.012, if 'ProjWageRqrNotStsfdInd' is checked].",
  ),
  rule(
    "F3468-034",
    "reject",
    "incorrect_data",
    ifThen(hasValue("NetOutLss1MWStsfdWgReqSectBPct"), any(all(hasValue("ProjWageRqrSect48a10And11Ind"), eqNum("NetOutLss1MWStsfdWgReqSectBPct", 0.075)), all(hasValue("ProjWageRqrNotStsfdInd"), eqNum("NetOutLss1MWStsfdWgReqSectBPct", 0.015)))),
    "If Form 3468, Part VI, 'NetOutLss1MWStsfdWgReqSectBPct' in the 'ClnHydrgnProdFcltsEgyPropCrGrp' has a value, then it must be equal [.075, if 'ProjWageRqrSect48a10And11Ind' is checked] or [.015, if 'ProjWageRqrNotStsfdInd' is checked].",
  ),
  rule(
    "F3468-035-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("NetOutLss1MWStsfdWgReqSectCPct"), any(all(hasValue("ProjWageRqrSect48a10And11Ind"), eqNum("NetOutLss1MWStsfdWgReqSectCPct", 0.10)), all(hasValue("ProjWageRqrNotStsfdInd"), eqNum("NetOutLss1MWStsfdWgReqSectCPct", 0.02)))),
    "If Form 3468, 'NetOutLss1MWStsfdWgReqSectCPct' in the 'ClnHydrgnProdFcltsEgyPropCrGrp' has a value, then it must equal [.10, if ' ProjWageRqrSect48a10And11Ind' is checked] or [.02, if 'ProjWageRqrNotStsfdInd' is checked].",
  ),
  rule(
    "F3468-036-01",
    "reject",
    "missing_data",
    ifThen(any(eqStr("SolarWindCrComSect45DeInd", "Yes"), eqStr("SolarWindCrComIndianLandInd", "Yes"), eqStr("SolarWindCrComRsdntlBldgInd", "Yes"), eqStr("SolarWindCrComEconomicBnftInd", "Yes")), hasValue("Section48eOr48EhControlNum")),
    "If Form 3468, 'SolarWindCrComSect45DeInd', 'SolarWindCrComIndianLandInd', 'SolarWindCrComRsdntlBldgInd', 'SolarWindCrComEconomicBnftInd' has a choice of \"Yes\" indicated, then 'Section48eOr48EhControlNum' must be present.",
  ),
  rule(
    "F3468-037",
    "reject",
    "missing_data",
    ifThen(eqStr("InvstCreditLesseeSect48dInd", "Yes"), hasValue("LessorBusinessName")),
    "If Form 3468, 'InvstCreditLesseeSect48dInd' has a choice of 'Yes' indicated, then 'LessorBusinessName', 'LessorUSAddress' or 'LessorForeignAddress', 'PropertyDesc', 'TreatedAsAcquiredPropertyAmt', 'Sect48dCreditRegs1501InclsnAmt' must have a value.",
  ),
  rule(
    "F3468-038",
    "reject",
    "missing_data",
    ifThen(eqStr("Prior170hDeductionInd", "Yes"), hasValue("Prior170hDeductionNPSProjNum")),
    "If Form 3468, 'Prior170hDeductionInd' is yes, then 'Prior170hDeductionNPSProjNum' must be present.",
  ),
  rule(
    "F3468-040",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 3468, 'Section48eOr48EhControlNum' has a value, then it must be exactly 9 digits in length.",
  ),
];
