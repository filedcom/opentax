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
    open_account_net_advance_amount?: number;
  },
) {
  return note.cash_advance_amount +
    (note.second_formal_note?.cash_advance_amount ?? 0) +
    (note.open_account_net_advance_amount ?? 0);
}
