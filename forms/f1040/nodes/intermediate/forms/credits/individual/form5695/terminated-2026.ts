// From 2026, Form 5695 only carries a residential clean energy credit forward:
// IRC §25D(h) as amended by P.L. 119-21 §70506 denies the credit for
// expenditures made after December 31, 2025, and IRC §25C(i) as amended by
// §70505 denies the home improvement credit for property placed in service
// after December 31, 2025 (draft 2026 Form 5695 lines 1-4 and instructions).
const CARRYFORWARD_FIELDS: ReadonlySet<string> = new Set([
  "prior_year_carryforward",
  "part_i_tax_limit",
]);

export function assertCarryforwardOnly(
  input: Readonly<Record<string, unknown>>,
  taxYear: number,
): void {
  if (taxYear < 2026) return;
  const terminated = Object.keys(input).filter((key) =>
    input[key] !== undefined && !CARRYFORWARD_FIELDS.has(key)
  );
  if (terminated.length > 0) {
    throw new Error(
      `TY${taxYear} Form 5695 allows only the 2025 residential clean energy carryforward; the §25C and §25D credits ended after 2025 (P.L. 119-21 §§70505-70506): ${
        terminated.sort().join(", ")
      }`,
    );
  }
}
