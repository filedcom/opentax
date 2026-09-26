/**
 * Form 8912 (Rev. December 2024) Parts I and II for an individual with no
 * pass-through CREB credit. Part III/IV source amounts must be reconciled
 * separately to Forms 1097-BTC and bond-level rows.
 * https://www.irs.gov/pub/irs-pdf/f8912.pdf
 */
export type Form8912BondType =
  | "CREB"
  | "NEW_CREB"
  | "QECB"
  | "QZAB"
  | "QSCB"
  | "BAB";

export type Form8912ReportedBond = {
  readonly bondType: Form8912BondType;
  readonly creditAmount: number;
  readonly issuerElectedDirectPayment: boolean;
  readonly isPassThroughCrebCredit: boolean;
};

export type Form8912UnreportedBond = {
  readonly bondType: Form8912BondType;
  readonly creditBaseAmount: number;
  readonly creditRate: number;
  readonly creditAllowancePercentage: number;
  readonly issuerElectedDirectPayment: boolean;
  readonly isPassThroughCrebCredit: boolean;
};

export type Form8912SourceLines = {
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
  readonly line4: number;
  readonly hasPassThroughCrebCredit: boolean;
};

export type Form8912PartIVBondLines = {
  readonly line18d: number;
  readonly line18f: number;
  readonly line20: number;
};

export type Form8912BondInterest = {
  readonly creditInterest: number;
  readonly purchaseAccruedInterestRecoveredAsBasis: number;
  readonly saleAccruedInterest: number;
  readonly taxableInterest: number;
};

/** Carryforwards are not a second payment of deemed interest. */
export function calculateForm8912BondInterest(
  currentYearCredit: number,
  purchaseAccruedInterest: number,
  saleAccruedInterest: number,
): Form8912BondInterest {
  for (
    const [name, amount] of [
      ["current-year credit", currentYearCredit],
      ["purchase accrued interest", purchaseAccruedInterest],
      ["sale accrued interest", saleAccruedInterest],
    ] as const
  ) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Form 8912 ${name} must be a nonnegative finite amount`);
    }
  }
  if (purchaseAccruedInterest > currentYearCredit) {
    throw new Error(
      "Form 8912 purchase accrued interest cannot exceed current-year bond credit",
    );
  }
  return {
    creditInterest: currentYearCredit,
    purchaseAccruedInterestRecoveredAsBasis: purchaseAccruedInterest,
    saleAccruedInterest,
    taxableInterest: currentYearCredit - purchaseAccruedInterest +
      saleAccruedInterest,
  };
}

export function calculateForm8912PartIVBond(
  bond: Form8912UnreportedBond,
): Form8912PartIVBondLines {
  if (bond.issuerElectedDirectPayment) {
    throw new Error(
      "Form 8912 holder cannot claim an issuer direct-payment bond",
    );
  }
  for (
    const amount of [
      bond.creditBaseAmount,
      bond.creditRate,
      bond.creditAllowancePercentage,
    ]
  ) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(
        "Form 8912 bond inputs must be nonnegative finite amounts",
      );
    }
  }
  if (bond.creditRate > 1 || bond.creditAllowancePercentage > 1.25) {
    throw new Error(
      "Form 8912 credit rate cannot exceed 100%, and allowance percentage cannot exceed 125%",
    );
  }
  if (bond.bondType === "BAB" && bond.creditRate !== 0.35) {
    throw new Error("Form 8912 build America bond credit rate must be 35%");
  }
  if (bond.bondType === "BAB" && bond.creditAllowancePercentage !== 1) {
    throw new Error(
      "Form 8912 build America bond uses a 100% allowance percentage",
    );
  }
  const line18d = bond.creditBaseAmount * bond.creditRate;
  const line18f = line18d * bond.creditAllowancePercentage;
  return {
    line18d,
    line18f,
    line20: bond.bondType === "NEW_CREB" || bond.bondType === "QECB"
      ? line18f * 0.7
      : line18f,
  };
}

export function calculateForm8912SourceLines(
  reportedBonds: readonly Form8912ReportedBond[],
  unreportedBonds: readonly Form8912UnreportedBond[],
  carryforward: number,
): Form8912SourceLines {
  if (!Number.isFinite(carryforward) || carryforward < 0) {
    throw new Error(
      "Form 8912 carryforward must be a nonnegative finite amount",
    );
  }
  let line1 = 0;
  let line2 = 0;
  let hasPassThroughCrebCredit = false;
  for (const bond of reportedBonds) {
    if (bond.issuerElectedDirectPayment) {
      throw new Error(
        "Form 8912 holder cannot claim an issuer direct-payment bond",
      );
    }
    if (!Number.isFinite(bond.creditAmount) || bond.creditAmount < 0) {
      throw new Error(
        "Form 8912 reported credit must be a nonnegative finite amount",
      );
    }
    line1 += bond.creditAmount;
    hasPassThroughCrebCredit ||= bond.isPassThroughCrebCredit;
  }
  for (const bond of unreportedBonds) {
    line2 += calculateForm8912PartIVBond(bond).line20;
    hasPassThroughCrebCredit ||= bond.bondType === "CREB" &&
      bond.isPassThroughCrebCredit;
  }
  return {
    line1,
    line2,
    line3: carryforward,
    line4: line1 + line2 + carryforward,
    hasPassThroughCrebCredit,
  };
}

export type Form8912IndividualLimitInput = {
  readonly line1Form1097BtcCredit: number;
  readonly line2PartIVCredit: number;
  readonly line3QualifiedBondCarryforward: number;
  readonly form1040Line16: number;
  readonly schedule2Line1z: number;
  readonly form6251Line11: number;
  readonly foreignTaxCredit: number;
  readonly priorAllowableCredits: number;
  readonly form3800AllowedCredit: number;
  readonly priorYearMinimumTaxCredit: number;
  readonly hasPassThroughCrebCredit: boolean;
};

export type Form8912FinalizedReturnLines = {
  readonly form1040Line16: number;
  readonly form1040Line19: number;
  readonly schedule2Line1z: number;
  readonly form6251Line11: number;
  readonly schedule3Line1: number;
  readonly schedule3Line6a: number;
  readonly schedule3Line6b: number;
  readonly schedule3Line6k: number;
  readonly schedule3Line8: number;
  readonly form3800AllowedCredit: number;
};

/**
 * Build Form 8912 Part II from *finalized* filed return lines. Schedule 3 line 8
 * includes every nonrefundable credit; remove lines 1, 6a, 6b, and 6k to get
 * the specified line 10b group without counting this bond credit against itself.
 * The caller must supply an independently finalized Form 3800 allowed amount.
 */
export function deriveForm8912IndividualLimitInput(
  source: Form8912SourceLines,
  lines: Form8912FinalizedReturnLines,
): Form8912IndividualLimitInput {
  if (
    Math.abs(source.line4 - source.line1 - source.line2 - source.line3) >
      0.000001
  ) {
    throw new Error(
      "Form 8912 source line 4 must reconcile to lines 1 through 3",
    );
  }
  for (const [name, value] of Object.entries(lines)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Form 8912 finalized ${name} must be a nonnegative finite amount`,
      );
    }
  }
  if (
    Math.abs(lines.schedule3Line6a - lines.form3800AllowedCredit) > 0.000001
  ) {
    throw new Error(
      "Form 8912 Schedule 3 line 6a must reconcile to allowed Form 3800 credit",
    );
  }
  const excluded = lines.schedule3Line1 + lines.schedule3Line6a +
    lines.schedule3Line6b + lines.schedule3Line6k;
  const otherSchedule3Credits = lines.schedule3Line8 - excluded;
  if (otherSchedule3Credits < -0.000001) {
    throw new Error(
      "Form 8912 Schedule 3 line 8 is smaller than its excluded credits",
    );
  }
  return {
    line1Form1097BtcCredit: source.line1,
    line2PartIVCredit: source.line2,
    line3QualifiedBondCarryforward: source.line3,
    form1040Line16: lines.form1040Line16,
    schedule2Line1z: lines.schedule2Line1z,
    form6251Line11: lines.form6251Line11,
    foreignTaxCredit: lines.schedule3Line1,
    priorAllowableCredits: lines.form1040Line19 +
      Math.max(0, otherSchedule3Credits),
    form3800AllowedCredit: lines.form3800AllowedCredit,
    priorYearMinimumTaxCredit: lines.schedule3Line6b,
    hasPassThroughCrebCredit: source.hasPassThroughCrebCredit,
  };
}

export type Form8912IndividualLimitLines = {
  readonly line4: number;
  readonly line7: number;
  readonly line8: number;
  readonly line9: number;
  readonly line10a: number;
  readonly line10b: number;
  readonly line10c: number;
  readonly line10d: number;
  readonly line10e: number;
  readonly line11: number;
  readonly line12: number;
  readonly unusedCredit: number;
};

export function calculateForm8912IndividualLimit(
  input: Form8912IndividualLimitInput,
): Form8912IndividualLimitLines {
  for (const [name, value] of Object.entries(input)) {
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Form 8912 ${name} must be a nonnegative finite amount`);
    }
  }
  if (input.hasPassThroughCrebCredit) {
    throw new Error(
      "Form 8912 pass-through CREB credit needs its separate taxable-income limit",
    );
  }
  const line4 = input.line1Form1097BtcCredit + input.line2PartIVCredit +
    input.line3QualifiedBondCarryforward;
  const line7 = input.form1040Line16 + input.schedule2Line1z;
  const line8 = input.form6251Line11;
  const line9 = line7 + line8;
  const line10a = input.foreignTaxCredit;
  const line10b = input.priorAllowableCredits;
  const line10c = input.form3800AllowedCredit;
  const line10d = input.priorYearMinimumTaxCredit;
  const line10e = line10a + line10b + line10c + line10d;
  const line11 = Math.max(0, line9 - line10e);
  const line12 = Math.min(line4, line11);
  return {
    line4,
    line7,
    line8,
    line9,
    line10a,
    line10b,
    line10c,
    line10d,
    line10e,
    line11,
    line12,
    unusedCredit: line4 - line12,
  };
}
