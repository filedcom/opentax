/**
 * MeF Business Rules: F8621
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 12 rules (12 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, formPresent, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8621_RULES: readonly RuleDef[] = [
  rule(
    "F8621-007-01",
    "reject",
    "missing_data",
    hasValue("SSN"),
    "Form 8621 'SSN' must have a value.",
  ),
  rule(
    "F8621-017-02",
    "reject",
    "missing_data",
    ifThen(hasNonZero("OrdinaryIncomeFromQEFAmt"), hasNonZero("TotalOtherIncomeAmt")),
    "If Form 8621, 'OrdinaryIncomeFromQEFAmt' has a non-zero value, then Schedule 1 (Form 1040), 'TotalOtherIncomeAmt' must have a non-zero value.",
  ),
  rule(
    "F8621-018-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("NetLongTermCapitalGainAmt"), formPresent("schedule_d")),
    "If Form 8621, Part III, Line 7c 'NetLongTermCapitalGainAmt' has a non-zero value, then Schedule D (1040) must be present in the return.",
  ),
  rule(
    "F8621-019-01",
    "reject",
    "missing_data",
    ifThen(hasValue("DeemedDividendElectionInd"), hasNonZero("TotalExcessDistributionAmt")),
    "If Form 8621, Line E 'DeemedDividendElectionInd' checkbox is checked, then Line 15e 'TotalExcessDistributionAmt' must have a non-zero value.",
  ),
  rule(
    "F8621-020-01",
    "reject",
    "missing_data",
    ifThen(hasValue("ElectToExtndTmForPymtOfTxInd"), hasNonZero("ProRataLessCashAndPortionAmt")),
    "If Form 8621, Line B 'ElectToExtndTmForPymtOfTxInd' checkbox is checked, then Line 8e 'ProRataLessCashAndPortionAmt' must have a non-zero value.",
  ),
  rule(
    "F8621-021-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("ProRataLessCashAndPortionAmt"), hasNonZero("DeferredTaxAmt")),
    "If Form 8621, Line 8e 'ProRataLessCashAndPortionAmt' has a non-zero value, then Line 9c 'DeferredTaxAmt' must have a non-zero value.",
  ),
  rule(
    "F8621-022-01",
    "reject",
    "missing_data",
    ifThen(hasValue("ElectToRcgnzGainOnPFICSaleInd"), hasNonZero("GainLossFromDisposOfStkAmt")),
    "If Form 8621, Line F 'ElectToRcgnzGainOnPFICSaleInd' checkbox is checked, then Line 15f 'GainLossFromDisposOfStkAmt' must have a non-zero value.",
  ),
  rule(
    "F8621-023-02",
    "reject",
    "missing_data",
    ifThen(any(hasNonZero("TotalExcessDistributionAmt"), hasNonZero("GainLossFromDisposOfStkAmt")), hasValue("TaxationOfExcessDistributionStmt")),
    "If Form 8621, Part V, Line 15e 'TotalExcessDistributionAmt' or 15f 'GainLossFromDisposOfStkAmt' has an amount greater than zero, then \"Taxation Of Excess Distribution Statement\" [TaxationOfExcessDistributionStmt] must be attached to Form 8621.",
  ),
  rule(
    "F8621-024",
    "reject",
    "missing_data",
    ifThen(hasValue("DeemedDivElectSec1297ePFICInd"), hasValue("DeemedDivElectSec1297ePFICStmt")),
    "If Form 8621, Part II, line G 'DeemedDivElectSec1297ePFICInd' checkbox is checked, then 'DeemedDivElectSec1297ePFICStmt' must be attached to Part II, line G.",
  ),
  rule(
    "F8621-025",
    "reject",
    "missing_data",
    ifThen(hasValue("DeemedDivElectFrmrPFICInd"), hasValue("DeemedDivElectRespectFormerPFICStmt")),
    "If Form 8621, Part II, line H 'DeemedDivElectFrmrPFICInd' checkbox is checked, then 'DeemedDivElectRespectFormerPFICStmt' must be attached to Part II, line H.",
  ),
  rule(
    "F8621-026-02",
    "reject",
    "missing_data",
    any(hasValue("PFICOrQEFEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "F8621, 'PFICOrQEFEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
  rule(
    "F8621-027-01",
    "reject",
    "missing_data",
    ifThen(hasValue("DeemedDividendElectionInd"), hasValue("DeemedDividendElectionStatement")),
    "If Form 8621, Part II, Line E 'DeemedDividendElectionInd' checkbox is checked, then \"Deemed Dividend Election Statement\" [DeemedDividendElectionStatement] must be attached to Part II, Line E.",
  ),
];
