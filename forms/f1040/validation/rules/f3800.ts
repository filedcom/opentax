/**
 * MeF Business Rules: F3800
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 185 rules (5 implemented, 180 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, hasNonZero, hasValue, noValue, ifThen, all, any, lt, not, formPresent, } from "../../../../core/validation/mod.ts";

export const F3800_RULES: readonly RuleDef[] = [
  rule(
    "F3800-406-01",
    "reject",
    "math_error",
    ifThen(hasNonZero("Frm8882CYAggrgtAmtGrp_OthThnCrTrnsfrElectCrNoLmtAmt"), lt("Frm8882CYAggrgtAmtGrp_OthThnCrTrnsfrElectCrNoLmtAmt", 150001)),
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' from 'Frm8882CYAggrgtAmtGrp' has a non-zero value, then 'OthThnCrTrnsfrElectCrNoLmtAmt' from 'Frm8882CYAggrgtAmtGrp' must be less than 150,001.",
  ),
  rule(
    "F3800-407-01",
    "reject",
    "math_error",
    ifThen(hasNonZero("Frm8882CYAggrgtAmtGrp_OthThnCrTrnsfrElectCrBfrLmtAmt"), lt("Frm8882CYAggrgtAmtGrp_OthThnCrTrnsfrElectCrBfrLmtAmt", 150001)),
    "If any Form 3800, 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8882CYAggrgtAmtGrp' has a non-zero value, then 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8882CYAggrgtAmtGrp' must be less than 150,001.",
  ),
  rule(
    "F3800-408",
    "reject",
    "math_error",
    ifThen(hasNonZero("Form8882CYCreditsGrp_GeneralBusCrFromNnPssvActyAmt"), lt("Form8882CYCreditsGrp_GeneralBusCrFromNnPssvActyAmt", 150001)),
    "If Form 3800, Part III, Line 1k column (e) 'GeneralBusCrFromNnPssvActyAmt' from 'Form8882CYCreditsGrp' has a non-zero value, then Part III, Line 1k column (e) 'GeneralBusCrFromNnPssvActyAmt' from 'Form8882CYCreditsGrp' must be less than 150,001.",
  ),
  rule(
    "F3800-409",
    "reject",
    "missing_data",
    alwaysPass, // requires checking across many Part III Line 1a–1zz column (e) fields
    "If there is a non-zero value on Part III, Line 2 column (e) 'GeneralBusCrFromNnPssvActyAmt' from 'GenBusCYCreditsSubTotGrp', then one of the lines from Part III, Line 1a thru 1zz column (e) must have a non-zero value.",
  ),
  rule(
    "F3800-410",
    "reject",
    "missing_data",
    ifThen(hasNonZero("GenBusCYCreditsSubTotGrp_GeneralBusCrFromNnPssvActyAmt"), hasValue("GeneralBusCrFromNnPssvActyAmt")),
    "If Form 3800, Part III Line 2 column (e) 'GeneralBusCrFromNnPssvActyAmt' from 'GenBusCYCreditsSubTotGrp' has a non- zero value, then Form 3800, Part I, line 1 'GeneralBusCrFromNnPssvActyAmt' must have a value.",
  ),
  rule(
    "F3800-416",
    "reject",
    "missing_data",
    alwaysPass, // requires checking across many Part III 4a–4z column (e) fields
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' from 'GenBusCYCreditsSubTot2Grp' has non-zero value, then one of the lines from Part III, 4a -4z column (e) must have a non-zero value.",
  ),
  rule(
    "F3800-417-01",
    "reject",
    "missing_data",
    alwaysPass, // requires checking across many Part III 4a–4z column (d) fields
    "If Form 3800, 'CrSubjToPassiveActyLmtAmt' from 'GenBusCYCreditsSubTot2Grp' has a non-zero value, then one of the lines from Part III, 4a -4z column (d) must have a non-zero value.",
  ),
  rule(
    "F3800-418-01",
    "reject",
    "missing_data",
    alwaysPass, // requires checking across many Part IV 4a–4z column (i) fields
    "If Form 3800, 'CarryforwardGeneralBusCrAmt' from 'CYOtherSpcfdCreditsSubTotGrp', has non-zero value, then one of the lines from Part IV, 4a -4z column (i) must have a non-zero value.",
  ),
  rule(
    "F3800-424",
    "reject",
    "missing_data",
    ifThen(hasNonZero("GenBusCYCreditsSubTot2Grp_GeneralBusCrFromNnPssvActyAmt"), hasValue("AllwGenBusCrFromNonPssvActyAmt")),
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' of 'GenBusCYCreditsSubTot2Grp' has a non-zero value, then 'AllwGenBusCrFromNonPssvActyAmt' must have a value.",
  ),
  rule(
    "F3800-426-02",
    "reject",
    "missing_data",
    ifThen(hasNonZero("Tot8844OthSpcfdGBCOrESBCAmtGrp_TotalGeneralBusCreditsAppTxAmt"), hasNonZero("AllwGenAndEligSmllBusCfwdCrAmt")),
    "If Form 3800, 'TotalGeneralBusCreditsAppTxAmt' of 'Tot8844OthSpcfdGBCOrESBCAmtGrp' has a non-zero value, then 'AllwGenAndEligSmllBusCfwdCrAmt' must have a non-zero value.",
  ),
  rule(
    "F3800-429",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check of PassThroughEntityEIN within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form3468PartIICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-430-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm3468PartIICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-433",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form7207CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 7207 must be present in the return.",
  ),
  rule(
    "F3800-434-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm7207CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 7207 must be present in the return.",
  ),
  rule(
    "F3800-437",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form6765CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 6765 musst be present in the return.",
  ),
  rule(
    "F3800-438-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm6765CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 6765 must be present in the return.",
  ),
  rule(
    "F3800-441",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form3468PartIIICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-442-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm3468PartIIICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-445",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8826CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8826 must be present in the return.",
  ),
  rule(
    "F3800-446-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8826CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8826 must be present in the return.",
  ),
  rule(
    "F3800-447",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8835PartIICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8835 must be present in the return.",
  ),
  rule(
    "F3800-448-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8835PartIICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8835 must be present in the return.",
  ),
  rule(
    "F3800-451-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm7210CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 7210 must be present in the return.",
  ),
  rule(
    "F3800-452",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form7210CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 7210 must be present in the return.",
  ),
  rule(
    "F3800-453",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8820CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8820 must be present in the return.",
  ),
  rule(
    "F3800-454-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8820CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8820 must be present in the return.",
  ),
  rule(
    "F3800-455",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8874CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8874 must be present in the return.",
  ),
  rule(
    "F3800-456-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8874CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8874 must be present in the return.",
  ),
  rule(
    "F3800-457",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8881PartICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8881 must be present in the return.",
  ),
  rule(
    "F3800-458-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8881PartICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8881 must be present in the return.",
  ),
  rule(
    "F3800-459",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8882CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8882 must be present in the return.",
  ),
  rule(
    "F3800-460-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8882CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8882 must be present in the return.",
  ),
  rule(
    "F3800-461",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8864CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8864 must be present in the return.",
  ),
  rule(
    "F3800-462-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8864CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8864 must be present in the return.",
  ),
  rule(
    "F3800-463",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8896CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8896 must be present in the return.",
  ),
  rule(
    "F3800-464-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8896CYAggrgtAmtGrp' has a non-zero value and the 'PassThroughEntityEIN' does not have a value, then Form 8896 must be present in the return.",
  ),
  rule(
    "F3800-465",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8906CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8906 must be present in the return.",
  ),
  rule(
    "F3800-466-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8906CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8906 must be present in the return.",
  ),
  rule(
    "F3800-467-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm3468PartIVCYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-469",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form3468PartIVCYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-471",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8908CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8908 must be present in the return.",
  ),
  rule(
    "F3800-472-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8908CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8908 must be present in the return.",
  ),
  rule(
    "F3800-475-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8911PartICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8911 must be present in the return.",
  ),
  rule(
    "F3800-476-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8911PartICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8911 must be present in the return.",
  ),
  rule(
    "F3800-477",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check + binary attachment verification
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' from 'Form8830CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then binary attachment with Description 'Form8830' must be present in the return.",
  ),
  rule(
    "F3800-479-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check + binary attachment verification
    "If Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8830CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then binary attachment with Description 'Form8830' must be present in the return.",
  ),
  rule(
    "F3800-483",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8932CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8932 must be present in the return.",
  ),
  rule(
    "F3800-484-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8932CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8932 must be present in the return.",
  ),
  rule(
    "F3800-485",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8933CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8933 must be present in the return.",
  ),
  rule(
    "F3800-486-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8933CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8933 must be present in the return.",
  ),
  rule(
    "F3800-489",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8936PartIICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8936 must be present in the return.",
  ),
  rule(
    "F3800-490-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8936PartIICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8936 must be present in the return.",
  ),
  rule(
    "F3800-491",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8936PartVCYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8936 must be present in the return.",
  ),
  rule(
    "F3800-492-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8936PartVCYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8936 must be present in the return.",
  ),
  rule(
    "F3800-493",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check + binary attachment verification
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' from 'Form8904CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then binary attachment with Description 'Form8904' must be present in the return.",
  ),
  rule(
    "F3800-497",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8881PartIICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8881 must be present in the return.",
  ),
  rule(
    "F3800-499-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8881PartIICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8881 must be present in the return.",
  ),
  rule(
    "F3800-501",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8881PartIIICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8881 must be present in the return.",
  ),
  rule(
    "F3800-503-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8881PartIIICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8881 must be present in the return.",
  ),
  rule(
    "F3800-505",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Frm8864SAFCYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8864 must be present in the return.",
  ),
  rule(
    "F3800-506-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8864SAFCYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8864 must be present in the return.",
  ),
  rule(
    "F3800-507-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check + binary attachment verification
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'GenBusOtherCrCYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then a binary attachment with Description beginning with 'Other3800PartVLine1zz' must be present in the return.",
  ),
  rule(
    "F3800-508",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check + binary attachment verification
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'GenBusCYOtherCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then a binary attachment with description beginning with \"Other3800PartIIILine1zz\" must be present in the return.",
  ),
  rule(
    "F3800-509",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8844CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8844 must be present in the return.",
  ),
  rule(
    "F3800-510-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8844CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8844 must be present in the return.",
  ),
  rule(
    "F3800-511",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form3468PartVICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-512-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm3468PartVICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-515",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form5884CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 5884 must be present in the return.",
  ),
  rule(
    "F3800-516-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm5884CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 5884 must be present in the return.",
  ),
  rule(
    "F3800-517",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form6478CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 6478 must be present in the return.",
  ),
  rule(
    "F3800-518-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm6478CYSpcfdCrAggrgtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 6478 must be present in the return.",
  ),
  rule(
    "F3800-519",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8586CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8586 must be present in the return.",
  ),
  rule(
    "F3800-520-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8586CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8586 must be present in the return.",
  ),
  rule(
    "F3800-521-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8835PartIICYSpcfdAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8835 must be present in the return.",
  ),
  rule(
    "F3800-522",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Frm8835PartIICYSpcfdCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8835 must be present in the return.",
  ),
  rule(
    "F3800-523",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8846CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8846 must be present in the return.",
  ),
  rule(
    "F3800-524-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8846CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8846 must be present in the return.",
  ),
  rule(
    "F3800-525",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8900CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8900 must be present in the return.",
  ),
  rule(
    "F3800-526-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8900CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8900 must be present in the return.",
  ),
  rule(
    "F3800-527",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8941CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8941 must be present in the return.",
  ),
  rule(
    "F3800-528-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8941CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8941 must be present in the return.",
  ),
  rule(
    "F3800-529-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm6765ESBCYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 6765 must be present in the return.",
  ),
  rule(
    "F3800-530",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form6765ESBCYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 6765 must be present in the return.",
  ),
  rule(
    "F3800-531",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form8994CYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8994 must be present in the return.",
  ),
  rule(
    "F3800-532-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8994CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 8994 must be present in the return.",
  ),
  rule(
    "F3800-533",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'Form3468PartVIICYCreditsGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-535-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm3468PartVIICYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then Form 3468 must be present in the return.",
  ),
  rule(
    "F3800-537",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check + binary attachment verification
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' in 'GenBusOtherSpecifiedCYCrGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then a binary attachment with description beginning with \"Other3800PartIIILine4z\" must be present in the return.",
  ),
  rule(
    "F3800-538-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check + binary attachment verification
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'GenBusOthSpcfdCrCYAggrgtAmtGrp' has a non-zero value and the corresponding column 'PassThroughEntityEIN' does not have a value, then a binary attachment with Description beginning with 'Other3800PartVLine4z' must be present in the return.",
  ),
  rule(
    "F3800-541-01",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check + binary attachment verification
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm8904CYAggrgtAmtGrp' has a non-zero value and the corresponding 'PassThroughEntityEIN' does not have a value, then binary attachment with Description 'Form8904' must be present in the return.",
  ),
  rule(
    "F3800-545",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' from 'Form7218PartIICYCreditsGrp' has a non-zero value and the corresponding column 'PassThroughEntityEIN' does not have a value, then 'Form 7218' must be present in the return.",
  ),
  rule(
    "F3800-546",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm7218PartIICYAggrgtAmtGrp' has a non-zero value and the corresponding column 'PassThroughEntityEIN' does not have a value, then Form 7218 must be present in the return.",
  ),
  rule(
    "F3800-549",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' from 'Form7213PartIICYCreditsGrp' has a non-zero value and the corresponding column 'PassThroughEntityEIN' does not have a value, then Form7213 must be present in the return.",
  ),
  rule(
    "F3800-550",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm7213PartIICYAggrgtAmtGrp' has a non-zero value and the corresponding column 'PassThroughEntityEIN' does not have a value, then Form 7213 must be present in the return.",
  ),
  rule(
    "F3800-551",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If Form 3800, 'GeneralBusCrFromNnPssvActyAmt' from 'Form7211PartIICYCreditsGrp' has a non-zero value and the corresponding column 'PassThroughEntityEIN' does not have a value, then 'Form7211' must be present in the return.",
  ),
  rule(
    "F3800-552",
    "reject",
    "missing_document",
    alwaysPass, // requires per-item check within repeating group
    "If any Form 3800, 'OthThnCrTrnsfrElectCrNoLmtAmt' or 'OthThnCrTrnsfrElectCrBfrLmtAmt' from 'Frm7211PartIICYAggrgtAmtGrp' has a non-zero value and the corresponding column 'PassThroughEntityEIN' does not have a value, then 'Form7211' must be present in the return.",
  ),
  rule(
    "F3800-555",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form7207CYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-556",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form3468PartIIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-557",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form8835PartIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-558",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form7210CYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-559",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form7218PartIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-560",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form8911PartICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-561",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form7213PartIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-562",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form3468PartVCYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-563",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form8933CYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-564",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form7211PartIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-565",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Form3468PartVICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-566",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CreditTransferElectionAmt' from 'Frm8835PartIICYSpcfdCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-567",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm7207CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-568",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm3468PartIIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-569",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm8835PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-570",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm7210CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-571",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm7218PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-572",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm8911PartICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-573",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm7213PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-574",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm3468PartVCYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-575",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm8933CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-576",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm7211PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-577",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm3468PartVICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-578",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrSoldBfrLmtAmt' from 'Frm8835PartIICYSpcfdAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-579",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm7207CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-580",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm3468PartIIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-581",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm8835PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-582",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm7210CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-583",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm7218PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-584",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm8911PartICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-585",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm7213PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-586",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm3468PartVCYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-587",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm8933CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-588",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm7211PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-589",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm3468PartVICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-590",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'CrTrnsfrElectCrPrchsBfrLmtAmt' from 'Frm8835PartIICYSpcfdAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-591",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form7207CYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-592",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form3468PartIIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-593",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form7210CYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-594",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form3468PartIVCYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-595",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form7218PartIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-596",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form8911PartICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-597",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form7213PartIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-598",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form3468PartVCYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-599",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form8933CYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-600",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form8936PartVCYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-601",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form7211PartIICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-602",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Form3468PartVICYCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-603",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm8835PartIICYSpcfdCreditsGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-606",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm7207CYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-607",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm3468PartIIICYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-608",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm7210CYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-609",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm3468PartIVCYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-610",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm7218PartIICYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-611",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm8911PartICYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-612",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm7213PartIICYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-613",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm3468PartVCYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-614",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm8933CYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-615",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm8936PartVCYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-616",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm7211PartIICYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-618",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm3468PartVICYAggrgtAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-619",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within repeating aggregate group
    "If Form 3800, 'NetElectivePymtElectionAmt' from 'Frm8835PartIICYSpcfdAmtGrp' has a non-zero value, then the 'ElectivePaymentRegistrationNum' must have a value.",
  ),
  rule(
    "F3800-622",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm7207CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-623",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm3468PartIIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-624",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm7210CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-625",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm3468PartIVCYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-626",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm7218PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-627",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm8911PartICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-628",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm7213PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-629",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm3468PartVCYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-630",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm8933CYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-631",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm8936PartVCYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-632",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm7211PartIICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-633",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm3468PartVICYAggrgtAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-634",
    "reject",
    "missing_document",
    alwaysPass, // requires binary attachment verification
    "If Form 3800, 'ElectivePaymentRegistrationNum' from 'Frm8835PartIICYSpcfdAmtGrp' has a value, then binary attachment with Description \"Transfer Election Statement\" must be present in the return.",
  ),
  rule(
    "F3800-635",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check: CreditTransferElectionAmt < 0 or NetElectivePymtElectionAmt non-zero within group
    "In 'Form7207CYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-636",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form3468PartIIICYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-637",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form8835PartIICYCreditsGrp' on Form 3800, if 'CreditTransferElectionAmt' has a value less than zero, then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-638",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form7210CYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-639",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form3468PartIVCYCreditsGrp' on Form 3800, if 'NetElectivePymtElectionAmt' has a non-zero value, then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-640",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form7218PartIICYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-641",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form8911PartICYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-642",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form7213PartIICYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-643",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form3468PartVCYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-644",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form8933CYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-645",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form8936PartVCYCreditsGrp' on Form 3800, if 'NetElectivePymtElectionAmt' has a non-zero value, then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-646",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form7211PartIICYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-647",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Form3468PartVICYCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
  rule(
    "F3800-648",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item check within group
    "In 'Frm8835PartIICYSpcfdCreditsGrp' on Form 3800, if [ 'CreditTransferElectionAmt' has a value less than zero ] or [ 'NetElectivePymtElectionAmt' has a non-zero value ], then [ 'ElectivePaymentRegistrationNum' or 'TransferRegistrationNum' ] must have a value.",
  ),
];
