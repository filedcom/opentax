import { eitc } from "./eitc.ts";
import { cccLoanStatement } from "./ccc_loan_statement.ts";
import { cccLoanAccrualStatement } from "./ccc_loan_accrual_statement.ts";
import { cropInsuranceDeferralStatement } from "./crop_insurance_deferral_statement.ts";
import { jointOccupancyStatement } from "./joint_occupancy_statement.ts";
import { irs1040 } from "./f1040.ts";
import { f1099r } from "./f1099r.ts";
import { form1116 } from "./f1116.ts";
import { form2210f } from "./f2210f_box_b.ts";
import { form1116ScheduleB } from "./f1116_schedule_b.ts";
import { form2439 } from "./f2439.ts";
import { form1116DirectExpenseStatement } from "./f1116_direct_expense_statement.ts";
import { form1116OtherDeductionsStatement } from "./f1116_other_deductions_statement.ts";
import { form1116AlternativeCompensationStatement } from "./f1116_alternative_compensation_statement.ts";
import { form2441 } from "./f2441.ts";
import { form2555 } from "./f2555.ts";
import { form3800 } from "./f3800.ts";
import { form4137 } from "./f4137.ts";
import { form4255 } from "./f4255.ts";
import { form4136 } from "./f4136.ts";
import { form4136DieselGovernmentSalesStatement } from "./f4136_diesel_government_sales_statement.ts";
import { form4136KeroseneGovernmentSalesStatement } from "./f4136_kerosene_government_sales_statement.ts";
import { form4136EmulsionBlendingStatement } from "./f4136_emulsion_blending_statement.ts";
import { form4136CreditCardUsersStatement } from "./f4136_credit_card_users_statement.ts";
import { form4562 } from "./f4562.ts";
import { form461 } from "./f461.ts";
import { form965a } from "./f965a.ts";
import { form965aNetAdjustmentTransferStatement } from "./f965a_net_adjustment_transfer_statement.ts";
import { form965aMultipleTransfereeStatement } from "./f965a_multiple_transferee_statement.ts";
import { form4684 } from "./f4684.ts";
import { form4797 } from "./f4797.ts";
import { form4835 } from "./f4835.ts";
import { form4952 } from "./f4952.ts";
import { form4972 } from "./f4972.ts";
import { form5329 } from "./f5329.ts";
import { form5695 } from "./f5695.ts";
import { form5884 } from "./f5884.ts";
import { form5884ControlledGroupStatement } from "./f5884_controlled_group_statement.ts";
import { form5884DeductionDifferentiationStatement } from "./f5884_deduction_differentiation_stmt.ts";
import { form6198 } from "./f6198.ts";
import { form4835AtRisk } from "./f4835_at_risk.ts";
import { form6251 } from "./f6251.ts";
import { form6252 } from "./f6252.ts";
import { form6781 } from "./f6781.ts";
import { form7206 } from "./f7206.ts";
import { form7217 } from "./f7217.ts";
import { form7203StockLoss } from "./f7203_stock_loss.ts";
import { scheduleEStockLoss } from "./schedule_e_stock_loss.ts";
import { form8283 } from "./f8283.ts";
import { form8283VehicleStatement } from "./f8283_vehicle_statement.ts";
import { form8283FmvReductionStatement } from "./f8283_fmv_reduction_statement.ts";
import { form8396 } from "./f8396.ts";
import { form8582 } from "./f8582.ts";
import { form8582cr } from "./f8582cr.ts";
import { form8606 } from "./f8606.ts";
import { form8611 } from "./f8611.ts";
import { form8615 } from "./f8615.ts";
import { form8621 } from "./f8621.ts";
import { form8621ExcessStatement } from "./f8621_excess_statement.ts";
import { form8814 } from "./f8814.ts";
import { childTaxableInterestStatement } from "./child_taxable_interest_statement.ts";
import { form8815 } from "./f8815.ts";
import { form8824 } from "./f8824.ts";
import { form8826 } from "./f8826_draft.ts";
import { form8820 } from "./f8820.ts";
import { form8820ControlledGroupStatement } from "./f8820_controlled_group_statement.ts";
import { form8829 } from "./f8829.ts";
import { form8834 } from "./f8834.ts";
import { form8839 } from "./f8839.ts";
import { form8835 } from "./f8835.ts";
import { form8853 } from "./f8853.ts";
import { form8854 } from "./f8854.ts";
import { form8854Annual } from "./f8854_annual.ts";
import { form8854NativeStatements } from "./f8854_native_statements.ts";
import { form8859 } from "./f8859.ts";
import { form8862 } from "./f8862.ts";
import { form8863 } from "./f8863.ts";
import { form8874 } from "./f8874.ts";
import { form8880 } from "./f8880.ts";
import { form8888 } from "./f8888.ts";
import { form8889 } from "./f8889.ts";
import { form8911 } from "./f8911.ts";
import { form8912 } from "./f8912.ts";
import { form8911ScheduleA } from "./f8911_schedule_a.ts";
import { form8936 } from "./f8936.ts";
import { form8936ScheduleA } from "./f8936_schedule_a.ts";
import { form8919 } from "./f8919.ts";
import { form8949 } from "./f8949.ts";
import { form8959 } from "./f8959.ts";
import { form8960 } from "./f8960.ts";
import { form8962 } from "./f8962.ts";
import { form8978 } from "./f8978.ts";
import { form8978ScheduleA } from "./f8978_schedule_a.ts";
import { anyOtherTaxesStatement } from "./any_other_taxes_statement.ts";
import { schedule1OtherIncomeStatement } from "./schedule1_other_income_statement.ts";
import { form8990 } from "./f8990.ts";
import { form8995 } from "./f8995.ts";
import { form8995a } from "./f8995a.ts";
import { form8995aScheduleA } from "./f8995a_schedule_a.ts";
import { form8995aScheduleB } from "./f8995a_schedule_b.ts";
import { form8995aScheduleC } from "./f8995a_schedule_c.ts";
import { form8995aScheduleD } from "./f8995a_schedule_d.ts";
import { form982 } from "./f982.ts";
import { schedule1 } from "./schedule1.ts";
import { schedule1a } from "./schedule1a.ts";
import { schedule2 } from "./schedule2.ts";
import { schedule3 } from "./schedule3.ts";
import { schedule8812 } from "./schedule_8812.ts";
import { scheduleA } from "./schedule_a.ts";
import { scheduleB } from "./schedule_b.ts";
import { scheduleC } from "./schedule_c.ts";
import { scheduleD } from "./schedule_d.ts";
import { scheduleE } from "./schedule_e.ts";
import { scheduleF } from "./schedule_f.ts";
import { scheduleH } from "./schedule_h.ts";
import { scheduleJ } from "./schedule_j.ts";
import { scheduleLep } from "./schedule_lep.ts";
import { scheduleR } from "./schedule_r.ts";
import { scheduleSE } from "./schedule_se.ts";
import { w2 } from "./w2.ts";
import { w2g } from "./w2g.ts";
import { fecRecord, wagesNotShownSchedule } from "./foreign_employer_wages.ts";

// XSD-required element sequence from ReturnData1040.xsd.
// Any reordering here must stay in sync with the sequence in that XSD or
// xmllint will report "This element is not expected" errors.
export const ALL_MEF_FORMS = [
  // 1. IRS1040 (required)
  irs1040,
  // Schedule 1-A follows Schedule 1 and precedes Schedule 2 in TY2025.
  schedule1,
  schedule1a,
  schedule2,
  schedule3,
  schedule8812,
  // 6-7. Schedule A, Schedule B
  scheduleA,
  scheduleB,
  // 8. Schedule C
  scheduleC,
  // 9. Schedule D
  scheduleD,
  scheduleE,
  scheduleEStockLoss,
  // 11. Schedule EIC (eitc)
  eitc,
  // 12. Schedule F
  scheduleF,
  // 13. Schedule H
  scheduleH,
  // Schedule J follows H and precedes LEP in TY2025 ReturnData1040.xsd.
  scheduleJ,
  // Schedule LEP follows H/J and precedes R in TY2025 ReturnData1040.xsd.
  scheduleLep,
  // Schedule R follows Schedule LEP and precedes Schedule SE in ReturnData.
  scheduleR,
  // 16. Schedule SE
  scheduleSE,
  form7203StockLoss,
  // 18. Form 461
  form461,
  // Form 965-A is the cumulative section 965 liability and payment record.
  form965a,
  // 22. Form 982
  form982,
  // 25. Form 1099-R (one document per distribution statement)
  f1099r,
  // 26. Form 1116
  form1116,
  // Form 1116 Schedule B follows Form 1116 in ReturnData1040.xsd.
  form1116ScheduleB,
  // Form 2210-F follows Form 2210 and precedes Form 2439 in ReturnData1040.xsd.
  form2210f,
  // One native document per payer-issued Form 2439 with positive box 2.
  form2439,
  // Form 2441
  form2441,
  // Form 2555
  form2555,
  // Form 3800 is one document after Form 2555 in ReturnData1040.xsd.
  form3800,
  // Form 4136 precedes Form 4137 in ReturnData1040.xsd.
  form4136,
  // Form 4137
  form4137,
  // Form 4255 follows Form 4137 in ReturnData1040.xsd.
  form4255,
  // Form 4562
  form4562,
  // Form 4684
  form4684,
  // Form 4797
  form4797,
  form4835,
  // Form 4952
  form4952,
  // Form 4972
  form4972,
  // Form 5329
  form5329,
  // Form 5695
  form5695,
  // Form 5884
  form5884,
  // Form 6198
  form6198,
  form4835AtRisk,
  // Form 6251
  form6251,
  // Form 6252
  form6252,
  // Form 6781
  form6781,
  // Form 7206
  form7206,
  // Form 7217 (one document per distribution date)
  form7217,
  // Form 8283
  form8283,
  // Form 8396
  form8396,
  // Form 8582
  form8582,
  // Form 8582-CR
  form8582cr,
  // Form 8606
  form8606,
  // Form 8611, one document per building.
  form8611,
  // Form 8615
  form8615,
  // Form 8621, one document per PFIC/QEF holding.
  form8621,
  // Form 8814 (one document per child)
  form8814,
  // Form 8815
  form8815,
  // Form 8820
  form8820,
  // Form 8824
  form8824,
  // Form 8826 only for self-earned disabled access credit.
  form8826,
  // Form 8829
  form8829,
  form8834,
  // Form 8835 is one document per qualified facility.
  form8835,
  // Form 8839
  form8839,
  // Form 8853
  form8853,
  // Initial Form 8854 follows Form 8853 in ReturnData1040.xsd.
  form8854,
  form8854Annual,
  form8859,
  // Form 8862
  form8862,
  // Form 8863
  form8863,
  form8874,
  // Form 8880
  form8880,
  // Form 8888 refund allocation precedes Form 8889 in ReturnData1040.xsd.
  form8888,
  // Form 8889
  form8889,
  // Form 8911
  form8911,
  form8912,
  // Form 8919
  form8919,
  // Form 8911 Schedule A follows Form 8919 in ReturnData1040.xsd.
  form8911ScheduleA,
  // Form 8936 and one Schedule A per clean vehicle follow Form 8911 Schedule A.
  form8936,
  form8936ScheduleA,
  // Form 8949
  form8949,
  // Form 8959 (must come after 8949 per XSD sequence)
  form8959,
  // Form 8960
  form8960,
  // Form 8962
  form8962,
  // Form 8978 and its linked Schedule A follow Form 8962 in ReturnData1040.xsd.
  form8978,
  form8978ScheduleA,
  // Form 8990
  form8990,
  // Form 8995
  form8995,
  // Form 8995A
  form8995a,
  form8995aScheduleA,
  form8995aScheduleB,
  form8995aScheduleC,
  form8995aScheduleD,
  // Form W-2 wage statements (one document per employer)
  w2,
  // Form W-2G withholding statements follow W-2 in ReturnData1040.xsd.
  w2g,
  fecRecord,
  // Schedule 1 line 8z statement precedes the Schedule 2 line 17z statement.
  schedule1OtherIncomeStatement,
  // Schedule 2 line 17z statement precedes WagesNotShownSchedule in ReturnData.
  anyOtherTaxesStatement,
  wagesNotShownSchedule,
  // Form 4835 line 4a statement follows wage statements in ReturnData1040.xsd.
  cccLoanAccrualStatement,
  cccLoanStatement,
  cropInsuranceDeferralStatement,
  // Form 965-A native statements follow the farm statements in ReturnData.
  form965aNetAdjustmentTransferStatement,
  form965aMultipleTransfereeStatement,
  // Form 1116 line 1b and Part I deduction statements precede joint occupancy.
  form1116AlternativeCompensationStatement,
  form1116DirectExpenseStatement,
  form1116OtherDeductionsStatement,
  form4136EmulsionBlendingStatement,
  form4136CreditCardUsersStatement,
  form4136DieselGovernmentSalesStatement,
  form4136KeroseneGovernmentSalesStatement,
  // Form 5695 supporting document follows W-2 in ReturnData1040.xsd.
  jointOccupancyStatement,
  // Form 5884 controlled-group statements follow the Form 5695 statement.
  form5884ControlledGroupStatement,
  form5884DeductionDifferentiationStatement,
  // Form 8283 vehicle acknowledgment follows numbered forms and other
  // supporting statements in ReturnData1040.xsd.
  form8283VehicleStatement,
  // Form 8283 Section A column (h) FMV-reduction explanations follow the
  // vehicle statement in ReturnData1040.xsd.
  form8283FmvReductionStatement,
  // Form 8621 Part V holding-period computation statements follow numbered forms.
  form8621ExcessStatement,
  // Form 8814 line 1a nominee and interest-adjustment statement.
  childTaxableInterestStatement,
  // Form 8820 controlled-group allocation follows Form 8814 statements.
  form8820ControlledGroupStatement,
  // Form 8854 native roots follow Form 8820 controlled-group statements.
  form8854NativeStatements,
] as const;
