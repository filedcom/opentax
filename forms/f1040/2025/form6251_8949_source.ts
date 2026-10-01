import { inputSchema as form8949SourceSchema } from "../nodes/inputs/f8949/index.ts";

type BasisRow = {
  source_transaction_id: string;
  part: string;
  proceeds: number;
  regular_basis: number;
  amt_basis: number;
  regular_gain: number;
  amt_gain: number;
};

function hasFiledHoldingPeriod(transaction: {
  part: string;
  date_acquired: string;
  date_sold: string;
}): boolean {
  const parse = (date: string): Date | undefined => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString().slice(0, 10) === date ? parsed : undefined;
  };
  const acquired = parse(transaction.date_acquired);
  const sold = parse(transaction.date_sold);
  if (
    !acquired || !sold || !transaction.date_sold.startsWith("2025-") ||
    sold <= acquired
  ) return false;
  const anniversary = new Date(acquired);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  const longTerm = sold > anniversary;
  return ["A", "B", "C"].includes(transaction.part)
    ? !longTerm
    : ["D", "E", "F"].includes(transaction.part) && longTerm;
}

/** Replay every identified AMT basis row against the retained Form 8949 input. */
export function assertForm6251Form8949Source(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const raw = fields.line2k_8949_basis_dispositions;
  if (raw === undefined) {
    const source = form8949SourceSchema.safeParse(pending?.f8949);
    const hasBasisDifference = source.success && source.data.f8949s.some(
      (transaction) =>
        transaction.amt_cost_basis !== undefined &&
        transaction.amt_cost_basis !== transaction.cost_basis,
    );
    if ((fields.line2k_disposition ?? 0) !== 0 || hasBasisDifference) {
      throw new Error(
        "Form 6251 line 2k needs retained Form 8949 AMT basis dispositions",
      );
    }
    return;
  }
  const rows = (Array.isArray(raw) ? raw : [raw]) as BasisRow[];
  const source = form8949SourceSchema.safeParse(pending?.f8949);
  const calculatedDifference = rows.reduce(
    (sum, row) => sum + row.amt_gain - row.regular_gain,
    0,
  );
  if (
    !source.success || rows.length === 0 ||
    fields.line2k_disposition !== calculatedDifference ||
    source.data.f8949s.length !== rows.length ||
    new Set(rows.map((row) => row.source_transaction_id)).size !==
      rows.length ||
    new Set(source.data.f8949s.map((row) => row.source_transaction_id)).size !==
      rows.length ||
    source.data.f8949s.some((transaction) => {
      const row = rows.find((candidate) =>
        candidate.source_transaction_id === transaction.source_transaction_id
      );
      return !row || row.part !== transaction.part ||
        !hasFiledHoldingPeriod(transaction) ||
        row.proceeds !== transaction.proceeds ||
        row.regular_basis !== transaction.cost_basis ||
        row.amt_basis !== transaction.amt_cost_basis ||
        row.regular_gain !== transaction.proceeds - transaction.cost_basis ||
        row.amt_gain !== transaction.proceeds - transaction.amt_cost_basis! ||
        (transaction.adjustment_codes ?? "") !== "" ||
        (transaction.adjustment_amount ?? 0) !== 0 ||
        (transaction.wash_sale_loss ?? 0) !== 0 ||
        transaction.loss_not_allowed === true ||
        (transaction.accrued_market_discount ?? 0) !== 0 ||
        (transaction.ordinary_income_portion ?? 0) !== 0 ||
        transaction.qsbs_code !== undefined ||
        transaction.qsbs_amount !== undefined;
    })
  ) {
    throw new Error(
      "Form 6251 line 2k needs every AMT basis row to match the retained, unadjusted Form 8949 source and its 2025 holding period",
    );
  }
}
