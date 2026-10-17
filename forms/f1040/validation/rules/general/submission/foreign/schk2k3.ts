/**
 * MeF Business Rules: SCHK2K3
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 14 rules (14 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../../../../core/validation/types.ts";
import { rule, referencedByExactlyOne, } from "../../../../../../../core/validation/mod.ts";

const PARTNERSHIP_K2K3 = [
  "IRS1065ScheduleK2",
  "IRS1065ScheduleK3",
  "IRS8865ScheduleK2",
  "IRS8865ScheduleK3",
];
const K2K3_PARENTS = [...PARTNERSHIP_K2K3, "IRS1120SScheduleK2", "IRS1120SScheduleK3"];

export const SCHK2K3_RULES: readonly RuleDef[] = [
  rule(
    "SCHK2K3-001",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchedulesK2K31118ScheduleIStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K31118ScheduleIStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-002",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3AddnlDtPFICShrAcqStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3AdditionalDatesPFICSharesAcquiredStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-003",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3Bss10PctOwnNonCFCStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3Basis10PercentOwnedNoncontrolledForeignCorporationStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-004",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3BasisInStockOfCFCStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3BasisInStockOfControlledForeignCorporationStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-005",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3DistriOwnrChainStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3DistributionOwnershipChainStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-006",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3FrgnTaxTranslationStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3ForeignTaxTranslationStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-007",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3HighTxdIncmSch1And2Stmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3HighTaxedIncomeSchedules1And2Statement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-008",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3LoanTransactionsStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3LoanTransactionsStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-009",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3NIIPTEPSch3And4Stmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3NetInvestmentIncomePTEPSchedules3And4Statement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-010",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3OtherDeductionsStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3OtherDeductionsStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-011",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3OtherIntntlItemsStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3OtherInternationalItemsStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-012",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3PersonalPropSoldStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3PersonalPropertySoldStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-013",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3Sect743bBasisAdjStmt", ...PARTNERSHIP_K2K3),
    "If [SchedulesK2K3Section743bBasisAdjustmentsStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK2K3-014",
    "reject",
    "incorrect_data",
    referencedByExactlyOne("SchK2K3SplitterArrngmStmt", ...K2K3_PARENTS),
    "If [SchedulesK2K3SplitterArrangementsStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-2 (Form 1065) or Schedule K-3 (Form 1065) or Schedule K-2 (Form 1120-S) or Schedule K-3 (Form 1120-S) or Schedule K-2 (Form 8865) or Schedule K-3 (Form 8865).",
  ),
];
