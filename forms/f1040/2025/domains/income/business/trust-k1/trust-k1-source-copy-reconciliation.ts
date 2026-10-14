import type { FilerIdentity } from "../../../../../mef/header.ts";
import { inputSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_trust/index.ts";
import {
  parseTrustK1PrintedAmount,
  type ReviewedTrustK1NativeCopy,
  reviewTrustK1NativeCopies,
} from "./trust-k1-native-copy-review.ts";

const directFields = [
  [12, "box1_interest"],
  [13, "box2a_ordinary_dividends"],
  [14, "box2b_qualified_dividends"],
  [15, "box3_net_st_cap_gain"],
  [16, "box4a_net_lt_cap_gain"],
  [17, "box4b_28pct_rate_gain"],
  [18, "box4c_unrecaptured_1250"],
  [19, "box5_other_portfolio"],
  [20, "box6_ordinary_business"],
  [21, "box7_rental_real_estate"],
  [22, "box8_other_rental"],
  [29, "box10_estate_tax_deduction"],
] as const;

export interface TrustK1RequiredStatement {
  readonly box: string;
  readonly sourceReference?: string;
}
export interface ReconciledTrustK1SourceCopy extends ReviewedTrustK1NativeCopy {
  /** Directly printed numeric facts match public input; statements remain separate. */
  readonly directPrintedFactsMatched: true;
  readonly sourceDocumentReference: string;
  readonly requiredStatements: readonly TrustK1RequiredStatement[];
}

function cents(value: number): number {
  const result = Math.round(value * 100);
  if (
    !Number.isSafeInteger(result) || Math.abs(value * 100 - result) > 0.000001
  ) {
    throw Error(
      "Trust K-1 copy reconciliation needs exact cent-precision source facts",
    );
  }
  return result;
}
function same(actual: number, expected: number | undefined, label: string) {
  if (cents(actual) !== cents(expected ?? 0)) {
    throw Error(`Trust K-1 printed ${label} differs from public source facts`);
  }
}

/** Reconcile the entire directly modeled copy, not just codeB. This does not
 * validate statement contents, execute the tax graph or authorize an export. */
export async function reconcileTrustK1SourceCopies(
  rawSource: unknown,
  filer: FilerIdentity,
  documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
  transcriptions: readonly unknown[],
): Promise<readonly ReconciledTrustK1SourceCopy[]> {
  const source = inputSchema.parse(rawSource);
  const copies = await reviewTrustK1NativeCopies(
    rawSource,
    filer,
    documents,
    transcriptions,
  );
  return copies.map((copy) => {
    const row = source.k1_trusts.find((item) =>
      item.box13_code_b_issued_copy_review?.pdf_reference === copy.pdfReference
    )!;
    const values = copy.canonicalFields;
    const text = (n: number) => String(values[`f1_${n}[0]`] ?? "").trim();
    const number = (n: number) =>
      text(n) ? parseTrustK1PrintedAmount(text(n)) : 0;
    const normalized = (s: string) =>
      s.trim().toUpperCase().replace(/\s+/g, " ");
    if (normalized(text(7)) !== normalized(row.estate_trust_name) || !text(8)) {
      throw Error(
        "Trust K-1 printed trust name must match source and fiduciary header must be retained",
      );
    }
    for (const [field, key] of directFields) same(number(field), row[key], key);
    const statements: TrustK1RequiredStatement[] = [];
    const requireStatement = (box: string, sourceReference?: string) => {
      if (
        !statements.some((s) =>
          s.box === box && s.sourceReference === sourceReference
        )
      ) {
        statements.push({
          box,
          ...(sourceReference ? { sourceReference } : {}),
        });
      }
    };
    const rows = (start: number, count: number, box: string) =>
      Array.from({ length: count }, (_, index) => {
        const code = text(start + index * 2).toUpperCase();
        const amount = text(start + index * 2 + 1);
        if (!code && !amount) return undefined;
        if (code.includes("*")) requireStatement(`${box}:${code}`);
        return {
          code: code.replace(/\*/g, ""),
          amount: parseTrustK1PrintedAmount(amount),
        };
      }).filter((entry) => entry !== undefined);
    const box9 = rows(23, 3, "9");
    if (box9.length) {
      throw Error(
        "Trust K-1 printed box9 needs a coded public source and activity-limit route",
      );
    }
    const box11 = rows(30, 5, "11");
    if (box11.some((entry) => !["A", "C", "D"].includes(entry.code))) {
      throw Error(
        "Trust K-1 printed box11 contains an unmodeled public source code",
      );
    }
    for (
      const [code, key, reference] of [
        [
          "A",
          "box11_code_a_section67e_excess_deduction",
          "box11_code_a_statement_reference",
        ],
        [
          "C",
          "box11_code_c_short_term_capital_loss_carryover",
          "box11_code_c_statement_reference",
        ],
        [
          "D",
          "box11_code_d_long_term_capital_loss_carryover",
          "box11_code_d_statement_reference",
        ],
      ] as const
    ) {
      same(
        box11.filter((entry) => entry.code === code).reduce(
          (sum, entry) => sum + entry.amount,
          0,
        ),
        row[key],
        `box11:${code}`,
      );
      if (row[key] !== undefined) {
        requireStatement(`11:${code}`, row[reference]);
      }
    }
    if (row.box11_final_k1 && values["c1_1[0]"] !== true) {
      throw Error(
        "Trust K-1 source final-year deduction needs its printed final K1 indicator",
      );
    }
    const box12 = rows(40, 5, "12");
    if (box12.some((entry) => entry.code !== "A")) {
      throw Error(
        "Trust K-1 printed box12 contains an unmodeled public source code",
      );
    }
    same(
      box12.reduce((sum, entry) => sum + entry.amount, 0),
      row.box12_code_a_amt_adjustment,
      "box12:A",
    );
    const box13 = rows(50, 3, "13");
    if (box13.some((entry) => !["B", "ZZ"].includes(entry.code))) {
      throw Error(
        "Trust K-1 printed box13 contains an unmodeled public source code",
      );
    }
    same(
      box13.filter((entry) => entry.code === "B").reduce(
        (sum, entry) => sum + entry.amount,
        0,
      ),
      row.box13_code_b_backup_withholding,
      "box13:B",
    );
    same(
      box13.filter((entry) => entry.code === "ZZ").reduce(
        (sum, entry) => sum + entry.amount,
        0,
      ),
      (row.box13_code_zz_new_markets_credit ?? 0) +
        (row.box13_code_zz_disabled_access_credit ?? 0),
      "box13:ZZ",
    );
    if (row.box13_code_zz_new_markets_credit !== undefined) {
      requireStatement(
        "13:ZZ:new-markets",
        row.box13_code_zz_new_markets_statement_reference,
      );
    }
    if (row.box13_code_zz_disabled_access_credit !== undefined) {
      requireStatement(
        "13:ZZ:disabled-access",
        row.box13_code_zz_disabled_access_statement_reference,
      );
    }
    const box14 = rows(56, 6, "14");
    if (box14.some((entry) => entry.code !== "B")) {
      throw Error(
        "Trust K-1 printed box14 needs its complete coded source and supplementary information",
      );
    }
    same(
      box14.reduce((sum, entry) => sum + entry.amount, 0),
      row.box14_foreign_tax,
      "box14:B",
    );
    if (
      box14.length || [
        "box14_foreign_tax",
        "box14_foreign_income",
        "box14_foreign_income_category",
        "box14_foreign_deductions",
        "box14_foreign_deductions_explanation",
        "box14_foreign_tax_irs_country_code",
        "box14_foreign_tax_paid_or_accrued_date",
        "box14_foreign_tax_kind",
        "box14_foreign_tax_credit_method",
      ].some((key) => row[key as keyof typeof row] !== undefined)
    ) {
      requireStatement("14:B:foreign-tax-information");
    }
    if (
      row.box14_code_m_clean_electricity_investment_information !== undefined
    ) {
      throw Error(
        "Trust K-1 codeM information needs its full statement/native-copy route",
      );
    }
    for (const activity of row.box6_8_activity_statement ?? []) {
      requireStatement(activity.box, activity.statement_reference);
    }
    return {
      ...copy,
      directPrintedFactsMatched: true as const,
      sourceDocumentReference: row.source_document_reference!,
      requiredStatements: Object.freeze(
        statements.map((s) => Object.freeze(s)),
      ),
    };
  });
}
