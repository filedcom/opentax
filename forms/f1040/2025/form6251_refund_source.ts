import { inputSchema as form1099GSourceSchema } from "../nodes/inputs/f1099g/index.ts";

/** Bind line 2b to one reviewed state-income-tax refund and the final return. */
export function assertForm6251RefundSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const claimed = fields.line2b_tax_refund;
  const parsed = form1099GSourceSchema.safeParse(pending?.f1099g);
  const refunds = parsed.success
    ? parsed.data.f1099gs.filter((item) =>
      (item.box_2_taxable_recovery_verified_amount ?? 0) > 0
    )
    : [];
  if (
    (claimed === undefined || claimed === null || claimed === 0) &&
    refunds.length === 0
  ) return;

  const refund = refunds[0];
  const schedule1 = pending?.schedule1 as Record<string, unknown> | undefined;
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const additionalIncome = schedule1?.line10_total_additional_income;
  const totalIncome = form1040?.line9_total_income;
  const adjustments = form1040?.line10_adjustments;
  const agi = form1040?.line11_agi;
  const deductions = form1040?.line14_deductions_qbi_total;
  const senior = form1040?.schedule1a_line37_senior_deduction ?? 0;
  const regularIncome = fields.regular_tax_income;
  const amt = fields.line11_amt;
  const line16 = form1040?.line16_income_tax;
  const line17 = form1040?.line17_additional_taxes;
  if (
    !parsed.success || refunds.length !== 1 ||
    parsed.data.f1099gs.length !== 1 ||
    !refund ||
    !refund.payer_name?.trim() || !refund.payer_tin?.trim() ||
    !refund.recipient_tin ||
    (refund.recipient_tin !== form1040?.taxpayer_ssn &&
      !(form1040?.filing_status === "mfj" &&
        refund.recipient_tin === form1040?.spouse_ssn)) ||
    !refund.box_2_recovery_workpaper_reference ||
    refund.box_2_prior_year_itemized !== true ||
    (refund.box_3_tax_year !== undefined && refund.box_3_tax_year !== 2024) ||
    refund.box_8_trade_or_business === true ||
    (refund.box_1_unemployment ?? 0) !== 0 ||
    (refund.box_1_repaid ?? 0) !== 0 ||
    (refund.box_4_federal_withheld ?? 0) !== 0 ||
    (refund.box_5_rtaa ?? 0) !== 0 ||
    (refund.box_6_taxable_grants ?? 0) !== 0 ||
    (refund.box_7_agriculture ?? 0) !== 0 ||
    (refund.box_9_market_gain ?? 0) !== 0 ||
    (refund.box_11_state_withheld ?? 0) !== 0 ||
    typeof claimed !== "number" || !Number.isInteger(claimed) || claimed <= 0 ||
    claimed !== refund.box_2_taxable_recovery_verified_amount ||
    schedule1?.line1_state_refund !== claimed ||
    typeof additionalIncome !== "number" ||
    form1040?.line8_additional_income !== additionalIncome ||
    typeof totalIncome !== "number" ||
    typeof adjustments !== "number" ||
    typeof agi !== "number" || agi !== totalIncome - adjustments ||
    typeof deductions !== "number" ||
    typeof senior !== "number" ||
    typeof regularIncome !== "number" ||
    regularIncome !== agi - (deductions - senior) ||
    typeof amt !== "number" || amt <= 0 ||
    schedule2?.line2_amt !== amt ||
    typeof line16 !== "number" ||
    typeof line17 !== "number" || line17 < amt ||
    form1040?.line18_total_tax_before_credits !== line16 + line17
  ) {
    throw new Error(
      "Form 6251 line 2b needs one reviewed 1099-G state-income-tax refund matching Schedule 1 and finalized Form 1040",
    );
  }
}
