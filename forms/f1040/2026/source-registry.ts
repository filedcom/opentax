import { government_payments_2026 } from "./inputs/government-payments.ts";
import { f8615_2026 } from "./inputs/child-tax.ts";
import { form8615 } from "../nodes/intermediate/forms/taxes/investments/form8615/index.ts";
import { business_2026 } from "./nodes/business.ts";
import { capital_carryover_2026 } from "./nodes/capital-carryover.ts";
import { capital_gains_2026 } from "./nodes/capital-gains.ts";
import { f8863_2026 } from "./nodes/f8863.ts";
import { form2441_2026 } from "./inputs/dependent-care.ts";
import { f2441_2026 } from "./nodes/f2441.ts";
import { schedule3_2026 } from "./nodes/schedule3.ts";
import { eitc_2026 } from "./nodes/eitc.ts";
import { f8812_2026 } from "./nodes/f8812.ts";
import { social_security_2026 } from "./inputs/social-security.ts";
import { student_loan_interest_2026 } from "./inputs/student-loan-interest.ts";
import { buildStartNode } from "../start.ts";
import { inputNodes } from "./inputs.ts";
import { general_2026 } from "./inputs/general.ts";
import { investments_2026 } from "./inputs/investments.ts";
import { f3921_2026 } from "./inputs/f3921.ts";
import { cash_charity_2026 } from "./inputs/cash-charity.ts";
import { mortgage_interest_2026 } from "./inputs/mortgage-interest.ts";
import { educator_expenses_2026 } from "./inputs/educator-expenses.ts";
import { moving_expenses_2026 } from "./inputs/moving-expenses.ts";
import { vehicle_loan_interest_2026 } from "./inputs/vehicle-loan-interest.ts";
import { w2_2026 } from "./inputs/w2.ts";
import { form4137_2026 } from "./inputs/form4137.ts";
import { form8919_2026 } from "./inputs/form8919.ts";
import { ct2_2026 } from "./inputs/ct2.ts";
import { income_tax_2026 } from "./nodes/income-tax.ts";
import { form6251_2026 } from "./nodes/form6251.ts";
import { form8960_2026 } from "./nodes/form8960.ts";
import { form8959_2026 } from "./nodes/form8959.ts";
import { schedule_a_2026 } from "./nodes/schedule-a.ts";
import { schedule2_2026 } from "./nodes/schedule2.ts";
import { agi_2026 } from "./nodes/agi.ts";
import { standard_deduction_2026 } from "./nodes/standard_deduction.ts";
import { schedule1_2026 } from "./nodes/schedule1.ts";
import { schedule1a_2026 } from "./nodes/schedule1a.ts";
import { f1040_2026_node } from "./nodes/f1040.ts";
import { schedule3a } from "./nodes/schedule3a.ts";

/** Connected 2026 source graph; unfinished credit/activity receivers remain
 * pending. This is not a FormDefinition or a supported filing catalog entry. */
export const sourceRegistry2026 = {
  // This year joins issued wages and owner identities inside its business node.
  start: buildStartNode(inputNodes, { routeLegacyJointSeOwners: false }),
  general: general_2026,
  government_payments: government_payments_2026,
  f8615: f8615_2026,
  form8615,
  schedule_c: business_2026,
  capital_gains: capital_gains_2026,
  capital_loss_carryover: capital_carryover_2026,
  form2441: form2441_2026,
  f2441: f2441_2026,
  f8863: f8863_2026,
  f8812: f8812_2026,
  eitc: eitc_2026,
  ssa1099: social_security_2026,
  student_loan_interest: student_loan_interest_2026,
  investment_income: investments_2026,
  f3921: f3921_2026,
  cash_charity: cash_charity_2026,
  mortgage_interest: mortgage_interest_2026,
  educator_expenses: educator_expenses_2026,
  f3903: moving_expenses_2026,
  vehicle_loan_interest: vehicle_loan_interest_2026,
  w2: w2_2026,
  form4137: form4137_2026,
  form8919: form8919_2026,
  ct2: ct2_2026,
  income_tax_calculation: income_tax_2026,
  form6251: form6251_2026,
  form8960: form8960_2026,
  form8959: form8959_2026,
  schedule_a: schedule_a_2026,
  schedule2: schedule2_2026,
  schedule3: schedule3_2026,
  agi_aggregator: agi_2026,
  standard_deduction: standard_deduction_2026,
  schedule1: schedule1_2026,
  schedule1a: schedule1a_2026,
  f1040: f1040_2026_node,
  schedule3a,
};
