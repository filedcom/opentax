import { z } from "zod";
import { FilingStatus, TS } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const jointDistributionReviewSchema = z.object({
  filing_due_date: z.enum(["2026-04-15", "2026-10-15"]),
  extension_confirmation_ref: z.string().trim().min(1).optional(),
  reviewed_distribution_sources_ref: z.string().trim().min(1),
  entries: z.array(
    z.object({
      recipient: z.nativeEnum(TS),
      received_date: z.string().date(),
      qualifying_amount: z.number().positive(),
      source_document_ref: z.string().trim().min(1),
      filed_jointly_in_distribution_year: z.boolean().optional(),
      distribution_year_return_ref: z.string().trim().min(1).optional(),
      plans_joint_2026: z.boolean().optional(),
      plan_reference_2026: z.string().trim().min(1).optional(),
    }).strict(),
  ),
  no_other_qualifying_distributions_in_lookback: z.literal(true),
}).strict().superRefine((review, context) => {
  if (
    review.filing_due_date === "2026-10-15" &&
      !review.extension_confirmation_ref ||
    review.filing_due_date === "2026-04-15" &&
      review.extension_confirmation_ref
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8880 extended due date needs its extension confirmation",
    });
  }
  for (const [index, entry] of review.entries.entries()) {
    const year = entry.received_date.slice(0, 4);
    const inWindow = entry.received_date >= "2023-01-01" &&
      entry.received_date < review.filing_due_date;
    const prior = year === "2023" || year === "2024";
    const future = year === "2026";
    if (
      !inWindow ||
      (prior && (
        entry.filed_jointly_in_distribution_year === undefined ||
        !entry.distribution_year_return_ref ||
        entry.plans_joint_2026 !== undefined ||
        entry.plan_reference_2026 !== undefined
      )) ||
      (year === "2025" && (
        entry.filed_jointly_in_distribution_year !== undefined ||
        entry.distribution_year_return_ref !== undefined ||
        entry.plans_joint_2026 !== undefined ||
        entry.plan_reference_2026 !== undefined
      )) ||
      (future && (
        entry.plans_joint_2026 === undefined ||
        !entry.plan_reference_2026 ||
        entry.filed_jointly_in_distribution_year !== undefined ||
        entry.distribution_year_return_ref !== undefined
      ))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries", index],
        message:
          "Form 8880 distribution needs in-window date and year-specific joint-filing evidence",
      });
    }
  }
});

const w2DeferralEntrySchema = z.object({
  employee_ssn: z.string().regex(/^(?:\d{9}|\d{3}-\d{2}-\d{4})$/),
  code: z.enum(["D", "E", "F", "G", "H", "S", "AA", "BB", "EE"]),
  amount: z.number().nonnegative(),
  governmental_457b: z.literal(true).optional(),
  employee_elective_amount: z.number().nonnegative().optional(),
  employee_split_review_ref: z.string().trim().min(1).optional(),
}).strict().superRefine((entry, context) => {
  const hasSplit = entry.governmental_457b !== undefined ||
    entry.employee_elective_amount !== undefined ||
    entry.employee_split_review_ref !== undefined;
  if (entry.code === "G") {
    if (
      entry.governmental_457b !== true ||
      entry.employee_elective_amount === undefined ||
      entry.employee_elective_amount > entry.amount ||
      !entry.employee_split_review_ref
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Form 8880 code G needs a reviewed governmental 457(b) employee-elective split",
      });
    }
  } else if (hasSplit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8880 code G split facts belong only on code G",
    });
  }
});

export function eligibleW2DeferralAmount(
  entry: z.infer<typeof w2DeferralEntrySchema>,
): number {
  if (entry.code !== "G") return entry.amount;
  return w2DeferralEntrySchema.parse(entry).employee_elective_amount!;
}

export const inputSchema = z.object({
  // IRA contributions (traditional + Roth) per person
  ira_contributions_taxpayer: z.number().nonnegative().optional(),
  ira_contributions_spouse: z.number().nonnegative().optional(),
  // Reject the old combined W-2 amount. Its owner cannot be inferred on MFJ.
  elective_deferrals: z.never().optional(),
  w2_deferral_entries: z.array(w2DeferralEntrySchema).optional(),
  elective_deferrals_taxpayer: z.number().nonnegative().optional(),
  elective_deferrals_spouse: z.number().nonnegative().optional(),
  // Disqualifying distributions received in the test period
  distributions_taxpayer: z.number().nonnegative().optional(),
  distributions_spouse: z.number().nonnegative().optional(),
  joint_distribution_review: jointDistributionReviewSchema.optional(),
  joint_2025_distribution_review: z.never().optional(),
  joint_prior_year_distribution_review: z.never().optional(),
  // AGI and filing status for credit rate determination
  agi: z.number().optional(),
  foreign_agi_addback: z.number().nonnegative().optional(),
  filing_status: z.nativeEnum(FilingStatus).optional(),
  taxpayer_ssn: z.string().optional(),
  spouse_ssn: z.string().optional(),
  taxpayer_dob: z.string().optional(),
  spouse_dob: z.string().optional(),
  taxpayer_student_five_months: z.boolean().optional(),
  spouse_student_five_months: z.boolean().optional(),
  taxpayer_claimed_as_dependent: z.boolean().optional(),
  spouse_claimed_as_dependent: z.boolean().optional(),
  // A manual tax-capacity value is not a source. The sink computes this limit.
  income_tax_liability: z.never().optional(),
});

export type Form8880Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns the credit rate (as a decimal) based on AGI and filing status.
// Returns 0 if AGI exceeds the upper limit for the filing status.
function creditRate(
  agi: number,
  status: FilingStatus,
  agiSingle: { rate50: number; rate20: number; rate10: number },
  agiHoh: { rate50: number; rate20: number; rate10: number },
  agiMfj: { rate50: number; rate20: number; rate10: number },
): number {
  if (status === FilingStatus.MFJ) {
    if (agi <= agiMfj.rate50) return 0.50;
    if (agi <= agiMfj.rate20) return 0.20;
    if (agi <= agiMfj.rate10) return 0.10;
    return 0;
  }
  if (status === FilingStatus.HOH) {
    if (agi <= agiHoh.rate50) return 0.50;
    if (agi <= agiHoh.rate20) return 0.20;
    if (agi <= agiHoh.rate10) return 0.10;
    return 0;
  }
  // Single, MFS
  if (agi <= agiSingle.rate50) return 0.50;
  if (agi <= agiSingle.rate20) return 0.20;
  if (agi <= agiSingle.rate10) return 0.10;
  return 0;
}

// Returns eligible contribution for one person after distributions and cap.
// Line 3 = max(Line 1 - Line 2, 0); Line 4 = min(Line 3, contributionCap).
function eligibleContribution(
  contributions: number,
  distributions: number,
  contributionCap: number,
): number {
  const line3 = Math.max(0, contributions - distributions);
  return Math.min(line3, contributionCap);
}

function distributionColumns(input: Form8880Input): {
  taxpayer: number;
  spouse: number;
} {
  const review = input.joint_distribution_review;
  if (input.filing_status !== FilingStatus.MFJ) {
    if (review || (input.distributions_spouse ?? 0) > 0) {
      throw new Error(
        "Form 8880 spouse distributions need a joint-return source",
      );
    }
    return {
      taxpayer: input.distributions_taxpayer ?? 0,
      spouse: 0,
    };
  }
  if (
    input.distributions_taxpayer !== undefined ||
    input.distributions_spouse !== undefined
  ) {
    throw new Error(
      "Form 8880 joint distribution scalars need distribution-year joint-filing facts for both columns",
    );
  }
  if (!review) return { taxpayer: 0, spouse: 0 };
  const refs = review.entries.map((entry) => entry.source_document_ref);
  if (new Set(refs).size !== refs.length) {
    throw new Error(
      "Form 8880 joint distribution source references must be distinct",
    );
  }
  const jointStatusByYear = new Map<string, boolean>();
  for (const entry of review.entries) {
    const year = entry.received_date.slice(0, 4);
    if (year === "2025") continue;
    const joint = year === "2026"
      ? entry.plans_joint_2026
      : entry.filed_jointly_in_distribution_year;
    const previous = jointStatusByYear.get(year);
    if (previous !== undefined && previous !== joint) {
      throw new Error(
        "Form 8880 joint filing status conflicts within a distribution year",
      );
    }
    jointStatusByYear.set(year, joint === true);
  }
  return review.entries.reduce(
    (columns, entry) => {
      const year = entry.received_date.slice(0, 4);
      const joint = year === "2025" ||
        (year === "2026"
          ? entry.plans_joint_2026 === true
          : entry.filed_jointly_in_distribution_year === true);
      return {
        taxpayer: columns.taxpayer +
          (joint || entry.recipient === TS.T ? entry.qualifying_amount : 0),
        spouse: columns.spouse +
          (joint || entry.recipient === TS.S ? entry.qualifying_amount : 0),
      };
    },
    { taxpayer: 0, spouse: 0 },
  );
}

function normalizeSsn(ssn: string | undefined): string | undefined {
  const digits = ssn?.replaceAll("-", "");
  return digits && /^\d{9}$/.test(digits) ? digits : undefined;
}

export function assertEligibleContributor(
  owner: "taxpayer" | "spouse",
  dob: string | undefined,
  studentFiveMonths: boolean | undefined,
  claimedAsDependent: boolean | undefined,
): void {
  const parsedDate = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)
    ? new Date(`${dob}T00:00:00Z`)
    : undefined;
  if (
    !parsedDate || Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dob ||
    studentFiveMonths === undefined || claimedAsDependent === undefined
  ) {
    throw new Error(
      `Form 8880 ${owner} contribution needs birth date, five-month student answer, and dependent-claim answer`,
    );
  }
  if (dob > "2008-01-01" || studentFiveMonths || claimedAsDependent) {
    throw new Error(`Form 8880 ${owner} is not eligible for the 2025 credit`);
  }
}

export function ownedDeferrals(input: Form8880Input): {
  taxpayer: number;
  spouse: number;
} {
  const entries = input.w2_deferral_entries ?? [];
  if (entries.length === 0) {
    return {
      taxpayer: input.elective_deferrals_taxpayer ?? 0,
      spouse: input.elective_deferrals_spouse ?? 0,
    };
  }
  const taxpayerSsn = normalizeSsn(input.taxpayer_ssn);
  const spouseSsn = normalizeSsn(input.spouse_ssn);
  if (!taxpayerSsn) {
    throw new Error(
      "Form 8880 W-2 deferrals need the taxpayer's nine-digit SSN",
    );
  }
  if (spouseSsn === taxpayerSsn) {
    throw new Error("Form 8880 taxpayer and spouse SSNs must differ");
  }
  let taxpayer = 0;
  let spouse = 0;
  for (const entry of entries) {
    const employeeSsn = normalizeSsn(entry.employee_ssn);
    if (employeeSsn === taxpayerSsn) {
      taxpayer += eligibleW2DeferralAmount(entry);
    } else if (spouseSsn && employeeSsn === spouseSsn) {
      if (input.filing_status !== FilingStatus.MFJ) {
        throw new Error(
          "Form 8880 spouse W-2 deferrals require a joint return",
        );
      }
      spouse += eligibleW2DeferralAmount(entry);
    } else {
      throw new Error(
        "Form 8880 W-2 employee SSN does not match the taxpayer or joint-filing spouse",
      );
    }
  }
  if (taxpayer > 0 && input.elective_deferrals_taxpayer !== undefined) {
    throw new Error(
      "Form 8880 taxpayer deferrals conflict with W-2 source entries",
    );
  }
  if (spouse > 0 && input.elective_deferrals_spouse !== undefined) {
    throw new Error(
      "Form 8880 spouse deferrals conflict with W-2 source entries",
    );
  }
  return {
    taxpayer: taxpayer + (input.elective_deferrals_taxpayer ?? 0),
    spouse: spouse + (input.elective_deferrals_spouse ?? 0),
  };
}

export type Form8880Calculation =
  | { readonly credit: 0; readonly calculatedZero: true }
  | {
    readonly credit: number;
    readonly calculatedZero: false;
    readonly printFields: Readonly<Record<string, number | string>>;
  };

export function calculateForm8880(
  ctx: NodeContext,
  input: Form8880Input,
  capacity: number,
): Form8880Calculation {
  const cfg = CONFIG_BY_YEAR[ctx.taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
  const parsed = inputSchema.parse(input);
  if (!Number.isFinite(capacity) || capacity < 0) {
    throw new Error("Form 8880 needs a finite sourced tax-liability limit");
  }
  const deferrals = ownedDeferrals(parsed);
  const distributions = distributionColumns(parsed);
  if (
    parsed.filing_status !== undefined &&
    parsed.filing_status !== FilingStatus.MFJ &&
    ((parsed.ira_contributions_spouse ?? 0) > 0 || deferrals.spouse > 0)
  ) {
    throw new Error("Form 8880 spouse contributions require a joint return");
  }

  // Part I — per-person eligible contributions
  const tContributions = (parsed.ira_contributions_taxpayer ?? 0) +
    deferrals.taxpayer;
  const tEligible = eligibleContribution(
    tContributions,
    distributions.taxpayer,
    cfg.saversCreditContributionCap,
  );

  const sContributions = (parsed.ira_contributions_spouse ?? 0) +
    deferrals.spouse;
  const sEligible = eligibleContribution(
    sContributions,
    distributions.spouse,
    cfg.saversCreditContributionCap,
  );

  // Part II — credit computation
  const totalEligible = tEligible + sEligible; // Line 7
  if (totalEligible === 0) {
    return { credit: 0, calculatedZero: true };
  }

  if (
    parsed.agi === undefined || parsed.filing_status === undefined
  ) {
    throw new Error(
      "Form 8880 positive credit needs sourced AGI and filing status",
    );
  }

  // Pub. 590-A refigures Form 8880 line 8 by adding back foreign exclusions.
  const agi = parsed.agi + (parsed.foreign_agi_addback ?? 0);
  const status = parsed.filing_status;
  const rate = creditRate(
    agi,
    status,
    cfg.saversCreditAgiSingle,
    cfg.saversCreditAgiHoh,
    cfg.saversCreditAgiMfj,
  );
  if (rate === 0) {
    return { credit: 0, calculatedZero: true };
  }

  const rawCredit = totalEligible * rate; // Line 8

  // Line 11/12 — limit by sourced tax liability.
  const credit = Math.min(rawCredit, capacity);

  if (credit <= 0) {
    return { credit: 0, calculatedZero: true };
  }

  if (status === FilingStatus.MFJ && !parsed.joint_distribution_review) {
    throw new Error(
      "Form 8880 positive joint credit needs one reviewed 2023-through-prefiling-2026 distribution ledger",
    );
  }

  if (tEligible > 0) {
    assertEligibleContributor(
      "taxpayer",
      parsed.taxpayer_dob,
      parsed.taxpayer_student_five_months,
      parsed.taxpayer_claimed_as_dependent,
    );
  }
  if (sEligible > 0) {
    assertEligibleContributor(
      "spouse",
      parsed.spouse_dob,
      parsed.spouse_student_five_months,
      parsed.spouse_claimed_as_dependent,
    );
  }

  // ── Self-emit Form 8880 line values for the PDF builder ──────────────────
  // Only reached when a nonzero credit exists. Reviewed zero-credit sources
  // emit an outcome marker but no print lines, keeping the PDF absent while
  // letting MeF distinguish a completed calculation from a missing one.
  // Line 9 is a decimal rate and must print as a string.
  const printFields: Record<string, number | string> = {
    print_line1a_ira: parsed.ira_contributions_taxpayer ?? 0,
    print_line2a_deferrals: deferrals.taxpayer,
    print_line3a_total: tContributions,
    print_line4a_distributions: distributions.taxpayer,
    print_line5a: Math.max(
      0,
      tContributions - distributions.taxpayer,
    ),
    print_line6a_eligible: tEligible,
    print_line7_total_eligible: totalEligible,
    print_line8_agi: agi,
    print_line9_rate: rate.toFixed(1),
    print_line10_raw_credit: rawCredit,
    print_line12_credit: credit,
  };
  printFields.print_line11_tax_liability = capacity;
  if (
    sEligible > 0 || (parsed.ira_contributions_spouse ?? 0) > 0 ||
    deferrals.spouse > 0 || distributions.spouse > 0
  ) {
    printFields.print_line1b_ira = parsed.ira_contributions_spouse ?? 0;
    printFields.print_line2b_deferrals = deferrals.spouse;
    printFields.print_line3b_total = sContributions;
    printFields.print_line4b_distributions = distributions.spouse;
    printFields.print_line5b = Math.max(
      0,
      sContributions - distributions.spouse,
    );
    printFields.print_line6b_eligible = sEligible;
  }
  return { credit, calculatedZero: false, printFields };
}
