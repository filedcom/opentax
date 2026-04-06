/**
 * MeF Business Rules: F7204
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 6 rules (3 implemented, 3 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, allDistinct, alwaysPass, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F7204_RULES: readonly RuleDef[] = [
  rule(
    "F7204-001",
    "reject",
    "missing_document",
    ifThen(hasValue("AttorneyOrAgentInd"), hasValue("Form2848_BinaryAttachment")),
    "If Form 7204, 'AttorneyOrAgentInd' is checked, then a binary attachment with description \"Form 2848\" must be present in the return.",
  ),
  rule(
    "F7204-002",
    "reject",
    "missing_document",
    alwaysPass, // requires checking either TrusteeInd or ExecutorAdminOtherFiduciaryInd, then binary attachment "Form 56"
    "If Form 7204, 'TrusteeInd' or 'ExecutorAdminOtherFiduciaryInd' is checked, then a binary attachment with description \"Form 56\" must be present in the return.",
  ),
  rule(
    "F7204-003",
    "reject",
    "missing_document",
    hasValue("7204SignaturePage_BinaryAttachment"),
    "A Binary attachment with the description \"7204SignaturePage\" must be present in the return.",
  ),
  rule(
    "F7204-004",
    "reject",
    "missing_document",
    alwaysPass, // requires checking ExecutorAdminOtherFiduciaryInd, then binary attachment "Court Certificate" or "Letter Of Testamentary"
    "If Form 7204, 'ExecutorAdminOtherFiduciaryInd' is checked, then a binary attachment with description \"Court Certificate\" or \"Letter Of Testamentary\" must be present in the return.",
  ),
  rule(
    "F7204-005",
    "reject",
    "missing_document",
    ifThen(hasValue("TrusteeInd"), hasValue("TrustInstrument_BinaryAttachment")),
    "If Form 7204, 'TrusteeInd' is checked, then a binary attachment with the description \"Trust Instrument\" must be present in the return.",
  ),
  rule(
    "F7204-006",
    "reject",
    "missing_document",
    allDistinct("ContestedFrgnIncmTxRefIdNum"),
    "The same 'ContestedFrgnIncmTxRefIdNum' must not appear on two or more instances of Form 7204 present in the return.",
  ),
];
