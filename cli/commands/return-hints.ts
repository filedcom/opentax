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

/** A K-1 box 1-3 amount with no stated passive status flows to Schedule E as
 * nonpassive. Passive amounts go through Form 8582 instead (2025 Instructions
 * for Form 8582, Who Must File; Instructions for Schedule E, Part II). */
function k1ParticipationHints(pending: Pending): string[] {
  const sources = [
    ["k1_partnership", "k1_partnerships", "partnership_name", "Form 1065"],
    ["k1_s_corp", "k1_s_corps", "corporation_name", "Form 1120-S"],
  ] as const;
  const boxes = [
    ["box1", "box1_ordinary_business"],
    ["box2", "box2_rental_re"],
    ["box3", "box3_other_rental"],
  ] as const;
  return sources.flatMap(([node, key, nameKey, form]) => {
    const items = pending[node]?.[key];
    if (!Array.isArray(items)) return [];
    return items.flatMap((item: Record<string, unknown>) => {
      const review = item["eic_passive_activity_review"] as
        | Record<string, unknown>
        | undefined;
      const unstated = boxes.filter(([box, amountKey]) =>
        num(item[amountKey]) !== 0 && review?.[box] === undefined
      ).map(([box]) => box);
      if (unstated.length === 0) return [];
      return [
        `Schedule K-1 (${form}) ${String(item[nameKey] ?? "")} ${
          unstated.join(", ")
        } has no passive or nonpassive status, so it was treated as nonpassive and reported in full on Schedule E. If the activity is passive, set eic_passive_activity_review ${
          unstated.map((box) => `${box}: "passive"`).join(", ")
        } so Form 8582 limits it with the other passive activities.`,
      ];
    });
  });
}

/** An MFS filer's benefits use the lived-with-spouse rule (no base amount,
 * up to 85% taxable) unless they lived apart all year (2025 Form 1040
 * instructions, Social Security Benefits Worksheet, lines 6a-6b). */
function mfsSocialSecurityHints(pending: Pending): string[] {
  const agi = pending["agi_aggregator"] ?? {};
  if (
    agi["filing_status"] !== "mfs" || num(agi["line6a_ss_gross"]) <= 0 ||
    agi["mfs_lived_with_spouse"] !== undefined
  ) return [];
  return [
    "Married filing separately with Social Security benefits: the return assumed you lived with your spouse at some time in 2025, so there is no base amount and up to 85% of benefits is taxable. If you lived apart all year, set mfs_spouse_lived_with_taxpayer to false on general.",
  ];
}

/** Claims the entered facts point to but the return does not make. */
export function returnHints(pending: Pending): string[] {
  return [
    ...seniorDeductionSsnHints(pending),
    ...scheduleRDisabilityHints(pending),
    ...form4952Hints(pending),
    ...k1ParticipationHints(pending),
    ...mfsSocialSecurityHints(pending),
  ];
}
