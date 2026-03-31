/**
 * MeF Business Rules: FPYMT
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 13 rules (13 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, all, formPresent, gt, hasValue, ifThen, notGtNum, } from "../../../../core/validation/mod.ts";

export const FPYMT_RULES: readonly RuleDef[] = [
  rule(
    "FPYMT-045-02",
    "reject",
    "incorrect_data",
    alwaysPass,
    "'EstimatedPaymentDueDt' in the IRS ES Payment Record must not be the same as another IRS ES Payment Record filed with the same return.",
  ),
  rule(
    "FPYMT-057-03",
    "reject",
    "incorrect_data",
    ifThen(hasValue("PaymentAmt"), all(gt("PaymentAmt", 0), notGtNum("PaymentAmt", 99999999))),
    "In IRS Payment Record or IRS ES Payment Record or IRS 965 Payment Record, 'PaymentAmt' must be greater than zero, but less than or equal to $99,999,999.",
  ),
  rule(
    "FPYMT-071-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "'RequestedPaymentDt' in the IRS Payment Record must not be more than 5 days prior to the received date.",
  ),
  rule(
    "FPYMT-072-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If the return is received on or before the due date of the return, then the 'RequestedPaymentDt' in the IRS Payment Record must be on the due date or before the due date.",
  ),
  rule(
    "FPYMT-074-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If the return is received after the due date of the return, then the 'RequestedPaymentDt' in the IRS Payment Record must not be later than the date the return was received.",
  ),
  rule(
    "FPYMT-086",
    "reject",
    "incorrect_data",
    alwaysPass,
    "'EstimatedPaymentDueDt' in the IRS ES Payment Record must not be more than 5 days prior to the received date.",
  ),
  rule(
    "FPYMT-087",
    "reject",
    "incorrect_data",
    alwaysPass,
    "'EstimatedPaymentDueDt' in the IRS ES Payment Record must not be more than one year after the received date.",
  ),
  rule(
    "FPYMT-088-11",
    "reject",
    "incorrect_data",
    alwaysPass,
    "'EstimatedPaymentDueDt' in the IRS ES Payment Record must be 04/15/2026 or 06/15/2026 or 09/15/2026 or 01/15/2027.",
  ),
  rule(
    "FPYMT-089",
    "reject",
    "incorrect_data",
    alwaysPass,
    "'PaymentAmt' in the IRS Payment Record must not be more than 200% of 'OwedAmt'. If a value is not provided for 'OwedAmt', treat that value as zero.",
  ),
  rule(
    "FPYMT-097",
    "reject",
    "missing_document",
    ifThen(hasValue("IRS965PaymentRecord"), formPresent("form965A")),
    "If IRS 965 Payment Record is present in the return, then Form 965-A must also be present in the return.",
  ),
  rule(
    "FPYMT-099",
    "reject",
    "incorrect_data",
    alwaysPass,
    "'RequestedPaymentDt' in the IRS 965 Payment Record must not be more than 5 days prior to the received date.",
  ),
  rule(
    "FPYMT-100",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If the return is received on or before the due date of the return, then the 'RequestedPaymentDt' in the IRS 965 Payment Record must be on the due date or before the due date.",
  ),
  rule(
    "FPYMT-101",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If the return is received after the due date of the return, then the 'RequestedPaymentDt' in the IRS 965 Payment Record must not be later than the date the return was received.",
  ),
];
