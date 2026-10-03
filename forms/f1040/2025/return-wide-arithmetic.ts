import { schedule2Part1Total } from "../nodes/intermediate/aggregation/schedule2/index.ts";

/** Line 3a is the qualified portion of ordinary dividends on line 3b. */
export function assertQualifiedDividendSubset(
  fields: Readonly<Record<string, unknown>>,
): void {
  const qualified = fields.line3a_qualified_dividends ?? 0;
  const ordinary = fields.line3b_ordinary_dividends ?? 0;
  if (
    typeof qualified !== "number" || !Number.isFinite(qualified) ||
    typeof ordinary !== "number" || !Number.isFinite(ordinary) ||
    qualified < 0 || ordinary < 0 || qualified > ordinary
  ) {
    throw new Error(
      "Form 1040 line 3a qualified dividends must be included in line 3b ordinary dividends",
    );
  }
}

/** Require final balance lines when the tax and payment totals determine them. */
export function assertFinalBalanceProjection(
  fields: Readonly<Record<string, unknown>>,
): void {
  const tax = fields.line24_total_tax;
  const payments = fields.line33_total_payments;
  if (typeof tax !== "number" || typeof payments !== "number") return;
  if (!Number.isFinite(tax) || !Number.isFinite(payments)) {
    throw new Error("Form 1040 final tax and payment totals must be finite");
  }
  const balance = Math.round(payments) - Math.round(tax);
  const penalty = fields.line38_underpayment_penalty ?? 0;
  if (typeof penalty !== "number" || !Number.isFinite(penalty) || penalty < 0) {
    throw new Error("Form 1040 line 38 penalty must be nonnegative");
  }
  const overpayment = Math.max(0, balance);
  const owed = Math.max(0, -balance + penalty);
  if (
    overpayment > 0 &&
    fields.line34_overpayment !== overpayment
  ) {
    throw new Error("Form 1040 line 34 must report the full overpayment");
  }
  if (owed > 0 && fields.line37_amount_owed !== owed) {
    throw new Error("Form 1040 line 37 must report the amount owed");
  }
  const refund = fields.line35a_refund ?? 0;
  const applied = fields.line36_applied_to_2026_estimated_tax ?? 0;
  if (
    typeof refund !== "number" || !Number.isFinite(refund) || refund < 0 ||
    typeof applied !== "number" || !Number.isFinite(applied) || applied < 0 ||
    Math.abs(refund + applied + Math.min(overpayment, penalty) - overpayment) >=
      0.01
  ) {
    throw new Error(
      "Form 1040 lines 35a and 36 must allocate the overpayment after penalty",
    );
  }
}

/** Replay final Form 1040 tax and payment subtotals before native/PDF export. */
export function assertReturnWideArithmetic(
  fields: Record<string, unknown>,
): void {
  const amount = (key: string): number | undefined => {
    const value = fields[key];
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  };
  const matches = (filed: number, expected: number): boolean =>
    Math.abs(filed - expected) < 0.01;

  // A direct descriptor call may provide only a subtotal. Replay the filed
  // components when at least one component row accompanies that subtotal.
  const components = (keys: readonly string[]): number | undefined => {
    let present = false;
    let total = 0;
    for (const key of keys) {
      const value = fields[key];
      if (value === undefined || value === null) continue;
      if (typeof value === "number" && Number.isFinite(value)) {
        total += value;
      } else if (
        Array.isArray(value) &&
        value.every((item) => typeof item === "number" && Number.isFinite(item))
      ) {
        total += value.reduce((sum: number, item: number) => sum + item, 0);
      } else {
        return undefined;
      }
      present = true;
    }
    return present ? total : undefined;
  };

  const line1z = amount("line1z_total_wages");
  const wages = components([
    "line1a_wages",
    "line1b_household_wages",
    "line1c_unreported_tips",
    "line1d_medicaid_waiver",
    "line1e_taxable_dep_care",
    "line1f_taxable_adoption_benefits",
    "line1g_wages_8919",
    "line1h_other_earned",
  ]);
  if (line1z !== undefined && wages !== undefined && !matches(line1z, wages)) {
    throw new Error("Form 1040 line 1z differs from lines 1a through 1h");
  }

  const incomeComponents = components([
    "line2b_taxable_interest",
    "line3b_ordinary_dividends",
    "line4b_ira_taxable",
    "line5b_pension_taxable",
    "line6b_ss_taxable",
    "line7_capital_gain",
    "line7a_cap_gain_distrib",
    "line8_additional_income",
  ]);
  const line9 = amount("line9_total_income");
  if (
    line9 !== undefined &&
    (line1z !== undefined || wages !== undefined ||
      incomeComponents !== undefined) &&
    !matches(
      line9,
      (line1z ?? wages ?? 0) + (incomeComponents ?? 0),
    )
  ) {
    throw new Error("Form 1040 line 9 differs from its income lines");
  }

  const line10 = amount("line10_adjustments");
  const line11 = amount("line11_agi");
  if (
    line9 !== undefined && line10 !== undefined && line11 !== undefined &&
    !matches(line11, line9 - line10)
  ) {
    throw new Error("Form 1040 line 11 differs from lines 9 and 10");
  }

  const line12 = amount("line12c_deduction_total");
  const line14 = amount("line14_deductions_qbi_total");
  if (
    line12 !== undefined && line14 !== undefined &&
    !matches(
      line14,
      line12 + (amount("line13_qbi_deduction") ?? 0) +
        (amount("line13b_additional_deductions") ?? 0),
    )
  ) {
    throw new Error("Form 1040 line 14 differs from lines 12 and 13");
  }
  const line15 = amount("line15_taxable_income");
  if (
    line11 !== undefined && line14 !== undefined && line15 !== undefined &&
    !matches(line15, Math.max(0, line11 - line14))
  ) {
    throw new Error("Form 1040 line 15 differs from lines 11 and 14");
  }

  const line18 = amount("line18_total_tax_before_credits");
  const line16 = amount("line16_income_tax");
  if (
    line18 !== undefined && line16 !== undefined &&
    !matches(line18, line16 + (amount("line17_additional_taxes") ?? 0))
  ) {
    throw new Error("Form 1040 line 18 differs from lines 16 and 17");
  }

  const line21 = amount("line21_credits_total");
  if (
    line21 !== undefined &&
    !matches(
      line21,
      (amount("line19_child_tax_credit") ?? 0) +
        (amount("line20_nonrefundable_credits") ?? 0),
    )
  ) {
    throw new Error("Form 1040 line 21 differs from lines 19 and 20");
  }

  const line22 = amount("line22_tax_after_credits");
  if (
    line22 !== undefined && line18 !== undefined && line21 !== undefined &&
    !matches(line22, Math.max(0, line18 - line21))
  ) {
    throw new Error("Form 1040 line 22 differs from lines 18 and 21");
  }
  const line24 = amount("line24_total_tax");
  if (
    line24 !== undefined && line22 !== undefined &&
    !matches(line24, line22 + (amount("line23_other_taxes") ?? 0))
  ) {
    throw new Error("Form 1040 line 24 differs from lines 22 and 23");
  }

  const withholdingKeys = [
    "line25a_w2_withheld",
    "line25b_withheld_1099",
    "line25c_total",
  ] as const;
  const withholdingComponents = withholdingKeys.reduce(
    (sum, key) => sum + (amount(key) ?? 0),
    0,
  );
  const line25d = amount("line25d_total_withholding");
  if (
    line25d !== undefined &&
    !matches(line25d, withholdingComponents)
  ) {
    throw new Error("Form 1040 line 25d differs from lines 25a through 25c");
  }

  const refundableKeys = [
    "line27_eitc",
    "line28_actc",
    "line29_refundable_aoc",
    "line30_refundable_adoption",
    "line31_additional_payments",
  ] as const;
  const refundableComponents = refundableKeys.reduce(
    (sum, key) => sum + (amount(key) ?? 0),
    0,
  );
  const line32 = amount("line32_refundable_credits_total");
  if (
    line32 !== undefined &&
    !matches(line32, refundableComponents)
  ) {
    throw new Error("Form 1040 line 32 differs from lines 27 through 31");
  }
  const line33 = amount("line33_total_payments");
  const paymentKeys = [
    ...withholdingKeys,
    "line25d_total_withholding",
    "line26_estimated_tax",
    ...refundableKeys,
    "line32_refundable_credits_total",
  ];
  if (
    line33 !== undefined &&
    paymentKeys.some((key) => amount(key) !== undefined) &&
    !matches(
      line33,
      (line25d ?? withholdingComponents) +
        (amount("line26_estimated_tax") ?? 0) +
        (line32 ?? refundableComponents),
    )
  ) {
    throw new Error("Form 1040 line 33 differs from withholding and payments");
  }

  if (line24 !== undefined && line33 !== undefined) {
    const balance = Math.round(line33) - Math.round(line24);
    const overpayment = amount("line34_overpayment");
    if (
      overpayment !== undefined &&
      !matches(overpayment, Math.max(0, balance))
    ) {
      throw new Error("Form 1040 line 34 differs from tax and payments");
    }
    const owed = amount("line37_amount_owed");
    if (
      owed !== undefined &&
      !matches(
        owed,
        Math.max(0, -balance + (amount("line38_underpayment_penalty") ?? 0)),
      )
    ) {
      throw new Error("Form 1040 line 37 differs from balance and penalty");
    }
  }

  const overpayment = amount("line34_overpayment");
  const refund = amount("line35a_refund");
  if (overpayment !== undefined && refund !== undefined) {
    const applied = amount("line36_applied_to_2026_estimated_tax") ?? 0;
    const penalty = amount("line38_underpayment_penalty") ?? 0;
    if (
      !matches(
        refund + applied + Math.min(overpayment, penalty),
        overpayment,
      )
    ) {
      throw new Error(
        "Form 1040 lines 35a, 36, and 38 do not reconcile to line 34",
      );
    }
  }
}

/** Match attached Schedule totals to the final return after graph execution. */
export function assertReturnScheduleJoins(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (!pending) return;
  const amount = (row: Record<string, unknown>, key: string): number => {
    const value = row[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };
  const record = (key: string): Record<string, unknown> | undefined => {
    const value = pending[key];
    return value !== null && typeof value === "object" &&
        !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  };
  const match = (filed: number, source: number, label: string): void => {
    if (Math.abs(filed - source) >= 0.01) {
      throw new Error(`Form 1040 ${label} differs from its attached Schedule`);
    }
  };

  const schedule1 = record("schedule1");
  if (schedule1) {
    const income = schedule1.line10_total_additional_income;
    if (typeof income === "number") {
      match(amount(fields, "line8_additional_income"), income, "line 8");
    }
    const adjustments = schedule1.line26_total_adjustments;
    if (typeof adjustments === "number") {
      match(amount(fields, "line10_adjustments"), adjustments, "line 10");
    }
  }

  const scheduleB = record("schedule_b");
  if (scheduleB && typeof scheduleB.print_line4_total === "number") {
    match(
      amount(fields, "line2b_taxable_interest"),
      scheduleB.print_line4_total,
      "line 2b",
    );
  }

  const schedule1a = record("schedule1a");
  if (schedule1a && typeof schedule1a.line38_total === "number") {
    match(
      amount(fields, "line13b_additional_deductions"),
      schedule1a.line38_total,
      "line 13b",
    );
  }

  const schedule2 = record("schedule2");
  if (schedule2) {
    match(
      amount(fields, "line17_additional_taxes"),
      schedule2Part1Total(schedule2),
      "line 17",
    );
  }

  const schedule3 = record("schedule3");
  if (schedule3) {
    const nonrefundableCredits = schedule3.line8_total;
    if (typeof nonrefundableCredits === "number") {
      match(
        amount(fields, "line20_nonrefundable_credits"),
        nonrefundableCredits,
        "line 20",
      );
    }
    // The graph retains cents for Schedule 3 and Form 1040 arithmetic. Both
    // export paths print whole dollars, so compare their filed amounts here.
    match(
      Math.round(amount(fields, "line31_additional_payments")),
      Math.round(amount(schedule3, "line15_total")),
      "line 31",
    );
  }
}
