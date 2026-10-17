const LINE_1E_CAP_CENTS = 500_000;

function toCents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || amount < 0 ||
    !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 line 1e source needs nonnegative cents");
  }
  return value;
}

function allocateIntegerShares(
  amounts: readonly number[],
  target: number,
): number[] {
  if (
    !Number.isSafeInteger(target) || target < 0 ||
    amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)
  ) {
    throw new Error("Form 3800 line 1e allocation needs safe whole units");
  }
  const total = amounts.reduce((sum, amount) => sum + BigInt(amount), 0n);
  if (BigInt(target) > total) {
    throw new Error("Form 3800 line 1e allocation exceeds source credits");
  }
  if (BigInt(target) === total) return [...amounts];
  if (total === 0n) return amounts.map(() => 0);

  const shares = amounts.map((amount, index) => {
    const numerator = BigInt(amount) * BigInt(target);
    return {
      index,
      amount: Number(numerator / total),
      remainder: numerator % total,
    };
  });
  let remaining = target -
    shares.reduce((sum, share) => sum + share.amount, 0);
  for (
    const share of [...shares].sort((left, right) =>
      left.remainder === right.remainder
        ? left.index - right.index
        : left.remainder > right.remainder
        ? -1
        : 1
    )
  ) {
    if (remaining === 0) break;
    share.amount++;
    remaining--;
  }
  return shares.map((share) => share.amount);
}

/** Allocate the single Form 3800 line 1e cap across identified source credits. */
export function allocateDisabledAccessLine1eCredits(
  amounts: readonly number[],
): number[] {
  const cents = amounts.map(toCents);
  const total = cents.reduce((sum, amount) => sum + BigInt(amount), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Form 3800 line 1e source total exceeds safe cents");
  }
  if (total <= BigInt(LINE_1E_CAP_CENTS)) return [...amounts];
  return allocateIntegerShares(cents, LINE_1E_CAP_CENTS).map((value) =>
    value / 100
  );
}

/**
 * Limit current-year passive and nonpassive line 1e credits together.
 * Form 8582-CR source amounts are whole dollars; nonpassive source rows retain
 * cents. The passive class receives its nearest whole-dollar pro-rata share,
 * then each class is apportioned by largest remainder. This is a rounding
 * policy for the IRS's pro-rata rule, not a claim of IRS business-rule approval.
 */
export function allocateMixedDisabledAccessCredits(
  passiveWholeDollars: readonly number[],
  nonpassiveAmounts: readonly number[],
): { passive: number[]; nonpassive: number[] } {
  if (
    passiveWholeDollars.some((amount) =>
      !Number.isSafeInteger(amount) || amount < 0
    )
  ) {
    throw new Error("Passive Form 8826 credit needs whole dollars");
  }
  const nonpassiveCents = nonpassiveAmounts.map(toCents);
  const passiveCents = passiveWholeDollars.reduce(
    (sum, amount) => sum + BigInt(amount) * 100n,
    0n,
  );
  const nonpassiveTotal = nonpassiveCents.reduce(
    (sum, amount) => sum + BigInt(amount),
    0n,
  );
  const total = passiveCents + nonpassiveTotal;
  if (total <= BigInt(LINE_1E_CAP_CENTS)) {
    return {
      passive: [...passiveWholeDollars],
      nonpassive: [...nonpassiveAmounts],
    };
  }
  const passiveTarget = Number(
    (passiveCents * 5_000n + total / 2n) / total,
  );
  const nonpassiveTargetCents = LINE_1E_CAP_CENTS - passiveTarget * 100;
  return {
    passive: allocateIntegerShares(passiveWholeDollars, passiveTarget),
    nonpassive: allocateIntegerShares(
      nonpassiveCents,
      nonpassiveTargetCents,
    ).map((value) => value / 100),
  };
}
