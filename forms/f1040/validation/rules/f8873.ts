/**
 * MeF Business Rules: F8873
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 11 rules (11 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8873_RULES: readonly RuleDef[] = [
  rule(
    "F8873-004-01",
    "reject",
    "missing_document",
    ifThen(hasValue("UnderSection942a3BoxInd"), hasValue("Section942a3Schedule")),
    "If Form 8873, Line 1 'UnderSection942a3BoxInd' checkbox is checked, then \"Section 942(a)(3) Schedule\" [Section942a3Schedule] must be attached to Line 1.",
  ),
  rule(
    "F8873-005-01",
    "reject",
    "missing_document",
    ifThen(hasValue("TransInLieuOfFSCPrvsnBoxInd"), hasValue("TransactionsInLieuOfTheFSCProvisionsSchedule")),
    "If Form 8873, Line 2 'TransInLieuOfFSCPrvsnBoxInd' checkbox is checked, then \"Transactions In Lieu Of The FSC Provision Schedule\" [TransactionsInLieuOfTheFSCProvisionsSchedule] must be attached to Line 2.",
  ),
  rule(
    "F8873-006-01",
    "reject",
    "missing_document",
    ifThen(hasValue("AggregateOnTabularSchBoxInd"), hasValue("TabularScheduleOfTransactions")),
    "If Form 8873, Line 5c (1)(b) 'AggregateOnTabularSchBoxInd' checkbox is checked, then \"Tabular Schedule Of Transactions\" [TabularScheduleOfTransactions] must be attached to Form 8873.",
  ),
  rule(
    "F8873-007-01",
    "reject",
    "missing_document",
    ifThen(hasValue("TabularSchOfTransactionsBoxInd"), hasValue("TabularScheduleOfTransactions")),
    "If Form 8873, Line 5c (1)(c) 'TabularSchOfTransactionsBoxInd' checkbox is checked, then \"Tabular Schedule Of Transactions\" [TabularScheduleOfTransactions] must be attached to Form 8873.",
  ),
  rule(
    "F8873-008-01",
    "reject",
    "missing_document",
    ifThen(hasValue("GroupOfTransactionsBoxInd"), hasValue("TabularScheduleOfTransactions")),
    "If Form 8873, Line 5c(2) 'GroupOfTransactionsBoxInd, checkbox is checked, then \"Tabular Schedule Of Transactions\" [TabularScheduleOfTransactions] must be attached to Form 8873.",
  ),
  rule(
    "F8873-009-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("Section263AForeignTradeIncmAmt"), hasValue("AdditionalSection263ACostsUnderCostofGoodsSoldSchedule")),
    "If Form 8873, Line 17d(a) 'Section263AForeignTradeIncmAmt' has a non-zero value, then \"Additional Section 263A Costs Under Cost Of Goods Sold Schedule\" [AdditionalSection263ACostsUnderCostofGoodsSoldSchedule] must be attached to Line 17d(a).",
  ),
  rule(
    "F8873-010-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("Sect263AFrgnSaleLeasingIncmAmt"), hasValue("AdditionalSection263ACostsUnderCostofGoodsSoldSchedule")),
    "If Form 8873, Line 17d(b) 'Sect263AFrgnSaleLeasingIncmAmt' has a non-zero value, then \"Additional Section 263A Costs Under Cost of Goods Sold Schedule\" [AdditionalSection263ACostsUnderCostofGoodsSoldSchedule] must be attached to Line 17d(b).",
  ),
  rule(
    "F8873-011-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("OtherCostsForeignTradeIncmAmt"), hasValue("OtherCostsUnderCostofGoodsSoldSchedule")),
    "If Form 8873, Line 17e(a) 'OtherCostsForeignTradeIncmAmt' has a non-zero value, then \"Other Costs Under Cost Of Goods Sold Schedule\" [OtherCostsUnderCostofGoodsSoldSchedule] must be attached to Line 17e(a).",
  ),
  rule(
    "F8873-012-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("OthCostsFrgnSaleLeasingIncmAmt"), hasValue("OtherCostsUnderCostofGoodsSoldSchedule")),
    "If Form 8873, Line 17e(b) 'OthCostsFrgnSaleLeasingIncmAmt' has a non-zero value, then \"Other Costs Under Cost Of Goods Sold Schedule\" [OtherCostsUnderCostofGoodsSoldSchedule] must be attached to Line 17e(b).",
  ),
  rule(
    "F8873-013-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("DeductionsForeignTradeIncmAmt"), hasValue("OtherExpensesAndDeductionsSchedule")),
    "If Form 8873, Line 19(a) 'DeductionsForeignTradeIncmAmt' has a non-zero value, then \"Other Expenses And Deductions Schedule\" [OtherExpensesAndDeductionsSchedule] must be attached to Line 19(a).",
  ),
  rule(
    "F8873-014-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("DedFrgnSaleLeasingIncmAmt"), hasValue("OtherExpensesAndDeductionsSchedule")),
    "If Form 8873, Line 19(b) 'DedFrgnSaleLeasingIncmAmt' has a non-zero value, then \"Other Expenses And Deductions Schedule\" [OtherExpensesAndDeductionsSchedule] must be attached to Line 19(b).",
  ),
];
