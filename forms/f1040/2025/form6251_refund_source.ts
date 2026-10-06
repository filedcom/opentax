import { inputSchema as form1099GSourceSchema } from "../nodes/inputs/f1099g/index.ts";

/** Bind line 2b to the complete reviewed state-income-tax refund inventory and final return. */
export function assertForm6251RefundSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const claimed = fields.line2b_tax_refund;
  const parsed = form1099GSourceSchema.safeParse(pending?.f1099g);
  const refunds = parsed.success
    ? parsed.data.f1099gs.filter((item) =>
      (item.box_2_state_refund ?? 0) > 0 ||
      (item.box_2_taxable_recovery_verified_amount ?? 0) > 0
    )
    : [];
  if (
    (claimed === undefined || claimed === null || claimed === 0) &&
    refunds.length === 0
  ) return;

  const totalRefund = refunds.reduce(
    (sum, refund) => sum + (refund.box_2_taxable_recovery_verified_amount ?? 0),
    0,
  );
  const schedule1 = pending?.schedule1 as Record<string, unknown> | undefined;
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const primarySsn = typeof form1040?.taxpayer_ssn === "string"
    ? form1040.taxpayer_ssn.replaceAll("-", "")
    : undefined;
  const spouseSsn = typeof form1040?.spouse_ssn === "string"
    ? form1040.spouse_ssn.replaceAll("-", "")
    : undefined;
  const additionalIncome = schedule1?.line10_total_additional_income;
  const totalIncome = form1040?.line9_total_income;
  const adjustments = form1040?.line10_adjustments;
  const agi = form1040?.line11_agi;
  const deductions = form1040?.line14_deductions_qbi_total;
  const senior = form1040?.schedule1a_line37_senior_deduction ?? 0;
  const regularIncome = fields.regular_tax_income;
  const amt = fields.line11_amt;
  const line16 = form1040?.line16_income_tax;
  const line17 = form1040?.line17_additional_taxes ?? 0;
  const sourceConflict = !parsed.success || refunds.length < 1 ||
    refunds.some((refund) =>
      !refund.payer_name?.trim() ||
      !/^\d{9}$/.test(refund.payer_tin?.replace(/[-\s]/g, "") ?? "") ||
      !refund.recipient_tin ||
      (refund.recipient_tin.replaceAll("-", "") !== primarySsn &&
        !(form1040?.filing_status === "mfj" &&
          refund.recipient_tin.replaceAll("-", "") === spouseSsn)) ||
      !refund.box_2_recovery_workpaper_reference?.trim() ||
      ((refund.box_2_taxable_recovery_verified_amount ?? 0) > 0 &&
        refund.box_2_prior_year_itemized !== true) ||
      (refund.box_3_tax_year !== undefined && refund.box_3_tax_year !== 2024) ||
      refund.box_8_trade_or_business === true ||
      (refund.box_1_unemployment ?? 0) !== 0 ||
      (refund.box_1_repaid ?? 0) !== 0 ||
      (refund.box_4_federal_withheld ?? 0) !== 0 ||
      (refund.box_5_rtaa ?? 0) !== 0 ||
      (refund.box_6_taxable_grants ?? 0) !== 0 ||
      (refund.box_7_agriculture ?? 0) !== 0 ||
      (refund.box_9_market_gain ?? 0) !== 0 ||
      (refund.box_11_state_withheld ?? 0) !== 0
    ) ||
    (refunds.length > 1 &&
      (refunds.some((refund) => !refund.source_document_reference) ||
        new Set(refunds.map((refund) => refund.source_document_reference))
            .size !== refunds.length ||
        new Set(refunds.map((refund) =>
            [
              refund.payer_tin?.replace(/[-\s]/g, ""),
              refund.recipient_tin?.replaceAll("-", ""),
              refund.box_3_tax_year ?? 2024,
            ].join("|")
          )).size !== refunds.length ||
        refunds.some((refund) =>
          refund.box_2_recovery_workpaper_reference !==
            refunds[0].box_2_recovery_workpaper_reference
        )));
  const sourceError = () =>
    new Error(
      "Form 6251 line 2b needs reviewed 1099-G state-income-tax refunds from the complete source inventory matching Schedule 1 and finalized Form 1040",
    );
  if (sourceConflict) throw sourceError();
  if (totalRefund === 0 && (claimed ?? 0) === 0) {
    if ((schedule1?.line1_state_refund ?? 0) !== 0) throw sourceError();
    const sourceAmt = amt ?? 0;
    if (
      typeof sourceAmt !== "number" || !Number.isInteger(sourceAmt) ||
      sourceAmt < 0 ||
      (schedule2?.line2_amt ?? 0) !== sourceAmt ||
      typeof (line17 ?? 0) !== "number" || (line17 as number) < sourceAmt
    ) throw sourceError();
    return;
  }
  if (
    typeof claimed !== "number" || !Number.isInteger(claimed) || claimed <= 0 ||
    claimed !== totalRefund ||
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
    typeof amt !== "number" || !Number.isInteger(amt) || amt < 0 ||
    (schedule2?.line2_amt ?? 0) !== amt ||
    typeof line16 !== "number" ||
    typeof line17 !== "number" || line17 < amt ||
    form1040?.line18_total_tax_before_credits !== line16 + line17
  ) {
    throw sourceError();
  }
}
