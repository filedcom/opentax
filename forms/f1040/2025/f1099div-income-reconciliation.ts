import { inputSchema } from "../nodes/inputs/f1099div/index.ts";
import { inputSchema as partnershipSchema } from "../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpSchema } from "../nodes/inputs/k1_s_corp/index.ts";
import { inputSchema as trustSchema } from "../nodes/inputs/k1_trust/index.ts";

/** Keep issued dividends and each retained K-1 portfolio amount on Form 1040. */
export function assertDividendIncomeSources(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const copies = pending.f1099div === undefined
    ? []
    : inputSchema.parse(pending.f1099div).f1099divs;
  const ordinary = copies.reduce(
    (sum, row) =>
      sum + row.box1a -
      (row.isNominee ? row.nominee_distribution?.box1a ?? 0 : 0),
    0,
  );
  const qualified = copies.reduce(
    (sum, row) =>
      sum + (row.box1b ?? 0) -
      (row.isNominee ? row.nominee_distribution?.box1b ?? 0 : 0),
    0,
  );
  const partnerships = pending.k1_partnership === undefined
    ? []
    : partnershipSchema.parse(pending.k1_partnership).k1_partnerships;
  const sCorps = pending.k1_s_corp === undefined
    ? []
    : sCorpSchema.parse(pending.k1_s_corp).k1_s_corps;
  const trusts = pending.k1_trust === undefined
    ? []
    : trustSchema.parse(pending.k1_trust).k1_trusts;
  const k1Ordinary = partnerships.reduce(
    (sum, row) => sum + (row.box6a_ordinary_dividends ?? 0),
    0,
  ) + sCorps.reduce(
    (sum, row) => sum + (row.box5a_ordinary_dividends ?? 0),
    0,
  ) + trusts.reduce(
    (sum, row) => sum + (row.box2a_ordinary_dividends ?? 0),
    0,
  );
  const k1Qualified = partnerships.reduce(
    (sum, row) => sum + (row.box6b_qualified_dividends ?? 0),
    0,
  ) + sCorps.reduce(
    (sum, row) => sum + (row.box5b_qualified_dividends ?? 0),
    0,
  ) + trusts.reduce(
    (sum, row) => sum + (row.box2b_qualified_dividends ?? 0),
    0,
  );
  const line3b = fields.line3b_ordinary_dividends ?? 0;
  const line3a = fields.line3a_qualified_dividends ?? 0;
  if (
    typeof line3b !== "number" || !Number.isFinite(line3b) ||
    line3b + 0.01 < ordinary
  ) {
    throw new Error(
      "Form 1040 line 3b omits sourced Form 1099-DIV ordinary dividends",
    );
  }
  if (line3b + 0.01 < ordinary + k1Ordinary) {
    throw new Error("Form 1040 line 3b omits sourced K-1 ordinary dividends");
  }
  if (
    typeof line3a !== "number" || !Number.isFinite(line3a) ||
    line3a + 0.01 < qualified
  ) {
    throw new Error(
      "Form 1040 line 3a omits sourced Form 1099-DIV qualified dividends",
    );
  }
  if (line3a + 0.01 < qualified + k1Qualified) {
    throw new Error("Form 1040 line 3a omits sourced K-1 qualified dividends");
  }
}
