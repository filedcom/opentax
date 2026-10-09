import { notePrincipalRepaid } from "./repayment-inventory.ts";
/** Whole-dollar filing projection retains the exact statutory pro-rata fractions.
 * The total loss remains the independently limited PartIII total, never a sum
 * that increases it through per-column rounding. */
export function allocateTwoDebtReductions(
  loss: number,
  first: number,
  second: number,
) {
  if (
    ![loss, first, second, first + second].every(Number.isSafeInteger) ||
    Math.min(loss, first, second) < 0 || loss > first + second
  ) {
    throw Error(
      "Debt reduction needs exact current whole-dollar capacity and limited loss",
    );
  }
  const total = first + second;
  if (total === 0) {
    return {
      first: 0,
      second: 0,
      firstBasis: 0,
      secondBasis: 0,
      exact: [{ numerator: "0", denominator: "1" }, {
        numerator: "0",
        denominator: "1",
      }],
    };
  }
  const d = BigInt(total), n = BigInt(loss) * BigInt(first);
  if (
    [
      n,
      BigInt(loss) * BigInt(second),
      BigInt(first) * d - n,
      BigInt(second) * d - BigInt(loss) * BigInt(second),
    ].some((x) => x > BigInt(Number.MAX_SAFE_INTEGER))
  ) {
    throw Error(
      "Exact debt allocation metadata exceeds safe whole-number representation",
    );
  }
  const filedFirst = Number((2n * n + d) / (2n * d));
  const filedSecond = loss - filedFirst;
  if (filedFirst > first || filedSecond > second || filedSecond < 0) {
    throw Error("Filed pro-rata reduction exceeds an owned debt");
  }
  return {
    first: filedFirst,
    second: filedSecond,
    firstBasis: first - filedFirst,
    secondBasis: second - filedSecond,
    exact: [{ numerator: n.toString(), denominator: d.toString() }, {
      numerator: (BigInt(loss) * BigInt(second)).toString(),
      denominator: d.toString(),
    }],
  };
}

export function totalCurrentDebtAdvances(
  note: {
    cash_advance_amount: number;
    second_formal_note?: { cash_advance_amount: number };
    additional_formal_notes?: readonly { cash_advance_amount: number }[];
    open_account_net_advance_amount?: number;
  },
) {
  return note.cash_advance_amount +
    (note.second_formal_note?.cash_advance_amount ?? 0) +
    (note.additional_formal_notes ?? []).reduce(
      (n, r) => n + r.cash_advance_amount,
      0,
    ) +
    (note.open_account_net_advance_amount ?? 0);
}

/** Exact three-debt allocation; largest fractional remainders settle only the
 * whole-dollar filing projection. Raw source fractions remain unchanged. */
export function allocateThreeDebtReductions(
  loss: number,
  capacities: readonly number[],
) {
  const total = capacities.reduce((a, b) => a + b, 0);
  if (
    capacities.length !== 3 ||
    ![loss, total, ...capacities].every(Number.isSafeInteger) ||
    Math.min(loss, ...capacities) < 0 || loss > total
  ) {
    throw Error(
      "Three debt columns need exact individually owned capacities and limited loss",
    );
  }
  const denominator = BigInt(total || 1),
    nums = capacities.map((c) => BigInt(c) * BigInt(loss));
  const basisNums = capacities.map((c, i) => BigInt(c) * denominator - nums[i]);
  if (
    [...nums, ...basisNums].some((n) => n > BigInt(Number.MAX_SAFE_INTEGER))
  ) throw Error("Exact three-debt metadata exceeds safe representation");
  const filed = nums.map((n) => Number(n / denominator));
  let remaining = loss - filed.reduce((a, b) => a + b, 0);
  const ranked = nums.map((n, i) => ({ i, remainder: n % denominator })).sort((
    a,
    b,
  ) =>
    a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1
  );
  for (const r of ranked) {
    if (!remaining) break;
    filed[r.i]++;
    remaining--;
  }
  if (remaining || filed.some((n, i) => n > capacities[i])) {
    throw Error("Filed three-debt allocation exceeds capacity");
  }
  return {
    filed,
    exact: nums.map((n, i) => ({
      numerator: Number(n),
      basisNumerator: Number(basisNums[i]),
      denominator: Number(denominator),
    })),
    basis: capacities.map((c, i) => c - filed[i]),
  };
}

/** General source-bound inventory; preserves exact ratios and the fixed filed total. */
export function allocateDebtInventory(
  loss: number,
  capacities: readonly number[],
) {
  const total = capacities.reduce((a, b) => a + b, 0);
  if (
    !capacities.length ||
    ![loss, total, ...capacities].every(Number.isSafeInteger) ||
    Math.min(loss, ...capacities) < 0 || loss > total
  ) {
    throw Error(
      "Debt inventory needs exact individually owned capacities and limited loss",
    );
  }
  const d = BigInt(total || 1),
    nums = capacities.map((c) => BigInt(c) * BigInt(loss));
  const basisNums = capacities.map((c, i) => BigInt(c) * d - nums[i]);
  if (
    [...nums, ...basisNums].some((n) => n > BigInt(Number.MAX_SAFE_INTEGER))
  ) throw Error("Exact debt inventory metadata exceeds safe representation");
  const filed = nums.map((n) => Number(n / d));
  let remaining = loss - filed.reduce((a, b) => a + b, 0);
  const ranked = nums.map((n, i) => ({ i, remainder: n % d })).sort((a, b) =>
    a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1
  );
  for (const r of ranked) {
    if (!remaining) break;
    filed[r.i]++;
    remaining--;
  }
  if (remaining || filed.some((v, i) => v > capacities[i])) {
    throw Error("Filed inventory allocation exceeds capacity");
  }
  return {
    filed,
    basis: capacities.map((c, i) => c - filed[i]),
    exact: nums.map((n, i) => ({
      numerator: Number(n),
      basisNumerator: Number(basisNums[i]),
      denominator: Number(d),
    })),
  };
}
export function additionalPrincipalRepayments(
  note: {
    additional_formal_notes?: readonly {
      principal_repayment?: { amount: number };
      principal_repayments?: readonly { amount: number }[];
    }[];
  } | undefined,
) {
  return (note?.additional_formal_notes ?? []).reduce(
    (n, r) => n + notePrincipalRepaid(r),
    0,
  );
}
