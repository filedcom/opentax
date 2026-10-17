export function schedule1ActivityNotForProfitTotal(fields: object): number {
  const source = fields as Readonly<Record<string, unknown>>;
  const kIncome = source.line8j_f1099k_hobby_income;
  if (
    kIncome !== undefined &&
    (typeof kIncome !== "number" || !Number.isFinite(kIncome) || kIncome < 0)
  ) {
    throw new Error("Schedule 1 line 8j 1099-K income is invalid");
  }
  const rows = source.f1099nec_nonbusiness_sources;
  if (rows === undefined) return (kIncome as number | undefined) ?? 0;
  if (!Array.isArray(rows)) {
    throw new Error("Schedule 1 1099-NEC nonbusiness sources must be rows");
  }
  const necTotal = rows.reduce((sum: number, value: unknown) => {
    if (!value || typeof value !== "object") {
      throw new Error("Schedule 1 1099-NEC nonbusiness source is invalid");
    }
    const row = value as Record<string, unknown>;
    if (
      typeof row.payer_name !== "string" || !row.payer_name.trim() ||
      typeof row.payer_tin !== "string" || !/^\d{9}$/.test(row.payer_tin) ||
      typeof row.recipient_tin !== "string" ||
      !/^\d{9}$/.test(row.recipient_tin) ||
      typeof row.description !== "string" || !row.description.trim() ||
      typeof row.amount !== "number" || !Number.isSafeInteger(row.amount) ||
      row.amount <= 0
    ) {
      throw new Error("Schedule 1 1099-NEC nonbusiness source is invalid");
    }
    return sum + row.amount;
  }, 0);
  return ((kIncome as number | undefined) ?? 0) + necTotal;
}
