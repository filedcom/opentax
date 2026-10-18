type Pending = Readonly<Record<string, Record<string, unknown>>>;

function num(value: unknown): number {
  if (Array.isArray(value)) return typeof value[0] === "number" ? value[0] : 0;
  return typeof value === "number" ? value : 0;
}

/** Taxable disability income of a filer under 65 can qualify for the credit
 * for the elderly or the disabled (2025 Schedule R, Part I boxes 2, 4, 5, 6
 * and 9; Part II). The physician's statement is kept with the filer's
 * records, not filed (Instructions for Schedule R, Part II). */
function scheduleRDisabilityHints(pending: Pending): string[] {
  if (pending["schedule_r"] !== undefined) return [];
  const items = pending["f1099r"]?.["f1099rs"];
  if (!Array.isArray(items)) return [];
  const ages = pending["schedule1a"] ?? {};
  const owners = new Set(
    items.flatMap((item: Record<string, unknown>) => {
      if (item["disability_flag"] !== true) return [];
      const owner = item["ts"] === "S" ? "spouse" : "taxpayer";
      return ages[`${owner}_age_65_or_older`] === false ? [owner] : [];
    }),
  );
  return [...owners].map((owner) =>
    `Form 1099-R disability income for the ${owner}, who is under 65: Schedule R may give a credit for the elderly or the disabled. Add schedule_r with ${owner}_disabled, ${owner}_disability_income and ${owner}_disability_evidence. The physician's statement is kept with the filer's records, not filed with the return; one from an earlier year (1983 or earlier, or signed on line B) is physician_statement "prior_year" with prior_year_line_b_or_1983_verified (Part II). See 'opentax node template schedule_r --full'.`
  );
}

/** A filer 65 or older whose SSN is not confirmed valid gets no Schedule 1-A
 * senior deduction (2025 Schedule 1-A instructions, Part V, Valid SSN). */
function seniorDeductionSsnHints(pending: Pending): string[] {
  const schedule1a = pending["schedule1a"] ?? {};
  const status = schedule1a["filing_status"];
  if (status === undefined || status === "mfs") return [];
  const owners = status === "mfj"
    ? (["taxpayer", "spouse"] as const)
    : (["taxpayer"] as const);
  return owners.filter((owner) =>
    schedule1a[`${owner}_age_65_or_older`] === true &&
    schedule1a[`${owner}_has_valid_ssn`] !== true
  ).map((owner) =>
    `Schedule 1-A senior deduction not claimed for the ${owner}: Part V needs an SSN valid for employment and issued before the return's due date. If so, set ${owner}_ssn_valid_for_employment and ${owner}_ssn_issued_before_due_date to true on general.`
  );
}

/** Schedule A line 9 is figured on Form 4952 unless the expense is within
 * interest and ordinary dividends minus qualified dividends, with no other
 * investment expenses and no 2024 disallowed interest (2025 Instructions for
 * Schedule A, Line 9, Exception). */
function form4952Hints(pending: Pending): string[] {
  if (pending["form4952"] !== undefined) return [];
  const expense = num(pending["schedule_a"]?.["line_9_investment_interest"]);
  if (expense <= 0) return [];
  const f1040 = pending["f1040"] ?? {};
  const income = Math.max(
    0,
    num(f1040["line2b_taxable_interest"]) +
      num(f1040["line3b_ordinary_dividends"]) -
      num(f1040["line3a_qualified_dividends"]),
  );
  if (expense <= income) return [];
  return [
    `Schedule A line 9 investment interest ($${expense.toLocaleString()}) is more than taxable interest plus ordinary dividends minus qualified dividends ($${income.toLocaleString()}), so Form 4952 figures the deduction and any election to treat qualified dividends or net capital gain as investment income (Instructions for Schedule A, line 9). Enter it as form4952, not schedule_a line_9_investment_interest. See 'opentax node template form4952 --full'.`,
  ];
}

/** Claims the entered facts point to but the return does not make. */
export function returnHints(pending: Pending): string[] {
  return [
    ...seniorDeductionSsnHints(pending),
    ...scheduleRDisabilityHints(pending),
    ...form4952Hints(pending),
  ];
}
