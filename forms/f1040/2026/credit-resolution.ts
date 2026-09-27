/** Credit calculations that precede the final TY2026 Schedule 8812 credit limit. */

function amount(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`TY2026 credit resolution needs nonnegative ${name}`);
  }
  return value;
}

export interface WorksheetB2026Input {
  /** Schedule 8812 line 12 after the child-credit phaseout. */
  readonly schedule8812Line12: number;
  readonly qualifyingChildrenUnder17: number;
  /** Earned Income Worksheet line 7, already reconciled to its source facts. */
  readonly earnedIncomeWorksheetLine7: number;
  readonly bonaFidePuertoRicoResident: boolean;
  readonly filesForm2555: boolean;
  /** Additional Medicare/RRTA worksheet amount, if that worksheet applies. */
  readonly line7WithheldSocialSecurityMedicareRrta?: number;
  readonly schedule1Line15: number;
  readonly schedule2Line16c: number;
  readonly schedule2Line17c: number;
  readonly form1040Line27aEic: number;
  readonly schedule3Line11ExcessSocialSecurityRrta: number;
}

/** 2026 Schedule 8812 Credit Limit Worksheet B, lines 1–14. */
export function calculateCreditLimitWorksheetB2026(input: WorksheetB2026Input) {
  const line1 = amount(input.schedule8812Line12, "Schedule 8812 line 12");
  if (
    !Number.isInteger(input.qualifyingChildrenUnder17) ||
    input.qualifyingChildrenUnder17 <= 0 || input.filesForm2555
  ) {
    throw new Error(
      "TY2026 Worksheet B requires a qualifying child and no Form 2555",
    );
  }
  const line2 = input.qualifyingChildrenUnder17 * 1_700;
  const line3 = amount(
    input.earnedIncomeWorksheetLine7,
    "earned-income worksheet line 7",
  );
  const line4 = Math.max(0, line3 - 2_500);
  const line5 = Math.round(line4 * 0.15);
  const needsPayrollBranch = line5 < line1 &&
    (line2 >= 5_100 || input.bonaFidePuertoRicoResident);
  if (
    needsPayrollBranch &&
    input.line7WithheldSocialSecurityMedicareRrta === undefined
  ) {
    throw new Error("TY2026 Worksheet B needs payroll tax line 7");
  }
  const line7 = needsPayrollBranch
    ? amount(
      input.line7WithheldSocialSecurityMedicareRrta!,
      "payroll tax line 7",
    )
    : 0;
  const line8 = needsPayrollBranch
    ? amount(input.schedule1Line15, "Schedule 1 line 15") +
      amount(input.schedule2Line16c, "Schedule 2 line 16c") +
      amount(input.schedule2Line17c, "Schedule 2 line 17c")
    : 0;
  const line9 = line7 + line8;
  const line10 = needsPayrollBranch
    ? amount(input.form1040Line27aEic, "Form 1040 line 27a") +
      amount(
        input.schedule3Line11ExcessSocialSecurityRrta,
        "Schedule 3 line 11",
      )
    : 0;
  const line11 = Math.max(0, line9 - line10);
  const line12 = Math.max(line5, line11);
  const line13 = Math.min(line2, line12);
  const line14 = Math.max(0, line1 - line13);
  return {
    line1,
    line2,
    line3,
    line4,
    line5,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
    needsPayrollBranch,
  };
}

export interface Form5695Carryforward2026Input {
  readonly carryforwardFrom2025Line16: number;
  readonly form1040Line18: number;
  /** Calculated Worksheet B line 14 when B applies; otherwise calculated 1040 line 19. */
  readonly earlierChildCredit: number;
  readonly schedule3Line6lForm8978: number;
  readonly schedule3Line1ForeignTax: number;
  readonly schedule3Line2DependentCare: number;
  readonly schedule3Line6dElderlyDisabled: number;
  readonly schedule3Line3Education: number;
  readonly schedule3Line4RetirementSavings: number;
  readonly schedule3Line6mPreviouslyOwnedVehicle: number;
  readonly schedule3Line6fCleanVehicle: number;
  readonly schedule3Line6gMortgageInterest: number;
  readonly schedule3Line6cAdoption: number;
  readonly schedule3Line6hDcHomebuyer: number;
}

/** Pinned 2026 Form 5695 lines 1–4 and its credit limit worksheet. */
export function calculateForm5695Carryforward2026(
  input: Form5695Carryforward2026Input,
) {
  const line1 = amount(
    input.carryforwardFrom2025Line16,
    "2025 Form 5695 line 16 carryforward",
  );
  if (line1 === 0) {
    throw new Error("TY2026 Form 5695 needs a 2025 carryforward");
  }
  const priorCredits = [
    input.schedule3Line6lForm8978,
    input.schedule3Line1ForeignTax,
    input.schedule3Line2DependentCare,
    input.schedule3Line6dElderlyDisabled,
    input.schedule3Line3Education,
    input.schedule3Line4RetirementSavings,
    input.schedule3Line6mPreviouslyOwnedVehicle,
    input.schedule3Line6fCleanVehicle,
    input.earlierChildCredit,
    input.schedule3Line6gMortgageInterest,
    input.schedule3Line6cAdoption,
    input.schedule3Line6hDcHomebuyer,
  ].reduce(
    (sum, value, index) => sum + amount(value, `earlier credit ${index + 1}`),
    0,
  );
  const line2 = Math.max(
    0,
    amount(input.form1040Line18, "Form 1040 line 18") - priorCredits,
  );
  const line3 = Math.min(line1, line2);
  const line4 = line1 - line3;
  return {
    line1_carryforward: line1,
    line2_limit: line2,
    line3_credit: line3,
    line4_to_2027: line4,
    priorCredits,
  };
}
