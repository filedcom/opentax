import {
  benefitElection2026Schema,
  calculateBenefitElectionSources2026,
  type PriorBenefitAllocation2026,
  priorBenefitPayment2026Schema,
} from "./social-security-election.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  inputSchema as sharedStatementsSchema,
  itemSchema as sharedStatementSchema,
} from "../../nodes/inputs/income/retirement/ssa1099/index.ts";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const money = z.number().finite().min(-Number.MAX_SAFE_INTEGER / 1000).max(
  Number.MAX_SAFE_INTEGER / 1000,
).refine(
  (n) => Math.abs(n * 100 - Math.round(n * 100)) < .00001,
  "Benefit records need amounts in dollars and cents",
);
const positiveMoney = money.refine((n) => n >= 0, "Amount must be nonnegative");
const digits = (s: string) => s.replaceAll("-", "");
const key = (s: string) => s.trim().toUpperCase();
const cents = (n: number) => Math.round(n * 100);

/** Current issued copies only. Signed box 5 and form-specific withholding are
 * reconciled by the shared 2025 statement validator below. */
export const socialSecurityStatement2026Schema = sharedStatementSchema
  .innerType()
  .extend({
    tax_year: z.literal(2026),
    is_rrb: z.boolean(),
    payer_name: reference,
    recipient_tin: z.string().regex(/^(?:\d{3}-?\d{2}-?\d{4}|XXX-XX-\d{4})$/),
    recipient_name: reference,
    recipient: z.enum(["taxpayer", "spouse"]),
    recipient_identity_review_reference: reference,
    claim_number: reference,
    source_document_reference: reference,
    current_copy_review_reference: reference,
    corrected: z.boolean(),
    replaces_statement_references: z.array(reference),
    box3_gross_benefits: positiveMoney,
    box4_repaid: positiveMoney,
    box5_net_benefits: money,
    box6_federal_withheld: positiveMoney.optional(),
    rrb_box10_federal_withheld: positiveMoney.optional(),
    // Included in box 3; retain without adding again or netting against box 5.
    workers_compensation_offset_in_box3: positiveMoney,
    medicare_premiums_paid: positiveMoney,
    no_prior_year_lump_sum_payments: z.boolean(),
    prior_year_payments: z.array(priorBenefitPayment2026Schema).max(42)
      .optional(),
    rrb_box7_prior_year_benefits: positiveMoney.optional(),
    rrb_box8_second_prior_year_benefits: positiveMoney.optional(),
    rrb_box9_earlier_year_benefits: positiveMoney.optional(),
    no_disability_repayment_to_employer_or_insurer: z.literal(true),
  }).strict();

export const socialSecurityClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  statements: z.array(socialSecurityStatement2026Schema).min(1).max(100),
  lump_sum_election: benefitElection2026Schema.optional(),
  inventory_record_reference: reference,
  all_current_statements_and_repayments_included: z.literal(true),
  worksheet_scope_review: z.object({
    record_reference: reference,
    no_savings_bond_interest_exclusion: z.literal(true),
    no_adoption_benefit_exclusion: z.literal(true).optional(),
    adoption_inventory_reference: reference.optional(),
    no_foreign_housing_deduction: z.literal(true),
    no_puerto_rico_or_american_samoa_excluded_income: z.literal(true),
    no_ira_contribution_requiring_coordinated_benefits_worksheet: z.literal(
      true,
    ),
  }).strict().superRefine((v, ctx) => {
    if (
      (v.no_adoption_benefit_exclusion === true) ===
        (v.adoption_inventory_reference !== undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Social Security needs either no adoption exclusion or the actual adoption inventory review",
      });
    }
  }),
}).strict();
export const socialSecuritySource2026Schema = socialSecurityClaim2026Schema
  .extend({
    filing_status: z.nativeEnum(FilingStatus),
    taxpayer_ssn: tin,
    spouse_ssn: tin.optional(),
  }).strict();
export type SocialSecuritySource2026 = z.infer<
  typeof socialSecuritySource2026Schema
>;

export function calculateSocialSecuritySources2026(
  raw: SocialSecuritySource2026,
) {
  const input = socialSecuritySource2026Schema.parse(raw);
  const allocations: PriorBenefitAllocation2026[] = [];
  const seenClaims = new Set<string>();
  const issuedRefs = new Set(
    input.statements.map((s) => key(s.source_document_reference)),
  );
  const replacedRefs = new Set<string>();
  const sharedStatements = input.statements.map((s) => {
    const owner = s.recipient === "taxpayer"
      ? input.taxpayer_ssn
      : input.spouse_ssn;
    if (
      !owner ||
      (s.recipient === "spouse" && input.filing_status !== FilingStatus.MFJ)
    ) {
      throw new Error(
        "Benefit recipient must belong to this return; spouse benefits require MFJ",
      );
    }
    const ownerTin = digits(owner);
    if (
      s.recipient_tin.startsWith("XXX-XX-")
        ? !ownerTin.endsWith(s.recipient_tin.slice(-4))
        : digits(s.recipient_tin) !== ownerTin
    ) {
      throw new Error(
        "Benefit statement recipient does not match the reviewed return owner",
      );
    }
    const claim = JSON.stringify([s.is_rrb, ownerTin, key(s.claim_number)]);
    if (seenClaims.has(claim)) {
      throw new Error("Benefit claim repeats a current issued copy");
    }
    seenClaims.add(claim);
    if (s.corrected !== (s.replaces_statement_references.length > 0)) {
      throw new Error(
        "Corrected benefit statement needs its superseded copy references",
      );
    }
    for (const ref of s.replaces_statement_references) {
      if (issuedRefs.has(key(ref)) || replacedRefs.has(key(ref))) {
        throw new Error(
          "Superseded benefit copy is included or replaced more than once",
        );
      }
      replacedRefs.add(key(ref));
    }
    if (
      cents(s.workers_compensation_offset_in_box3) >
        cents(s.box3_gross_benefits)
    ) {
      throw new Error(
        "Workers compensation offset must already be included in box 3",
      );
    }
    if (
      s.is_rrb
        ? s.rrb_box10_federal_withheld === undefined
        : s.box6_federal_withheld === undefined
    ) {
      throw new Error(
        "Benefit statement needs the form-specific withholding box, including zero",
      );
    }
    const priorPayments = s.prior_year_payments ?? [];
    if (s.no_prior_year_lump_sum_payments !== (priorPayments.length === 0)) {
      throw new Error(
        "Prior benefit payments need a complete year allocation consistent with the review answer",
      );
    }
    const seenYears = new Set<number>();
    for (const payment of priorPayments) {
      if (seenYears.has(payment.benefit_year)) {
        throw new Error("Benefit statement repeats a prior-year allocation");
      }
      seenYears.add(payment.benefit_year);
      allocations.push({
        ...payment,
        recipient_tin: ownerTin,
        statement_reference: s.source_document_reference,
      });
    }
    if (
      priorPayments.reduce((sum, p) => sum + cents(p.amount_in_box3), 0) >
        cents(s.box3_gross_benefits)
    ) {
      throw new Error(
        "Prior benefit payments must already be included in box 3",
      );
    }
    const rrbAmounts = [
      s.rrb_box7_prior_year_benefits,
      s.rrb_box8_second_prior_year_benefits,
      s.rrb_box9_earlier_year_benefits,
    ];
    if (!s.is_rrb && rrbAmounts.some((n) => n !== undefined)) {
      throw new Error("SSA statement cannot contain RRB prior-year boxes");
    }
    if (
      s.is_rrb &&
      (priorPayments.length || rrbAmounts.some((n) => n !== undefined))
    ) {
      const grouped = [2025, 2024, 0].map((year) =>
        priorPayments.filter((p) =>
          year ? p.benefit_year === year : p.benefit_year < 2024
        ).reduce((sum, p) => sum + cents(p.amount_in_box3), 0)
      );
      if (
        rrbAmounts.some((n, i) => n === undefined || cents(n) !== grouped[i])
      ) {
        throw new Error(
          "RRB boxes 7, 8 and 9 need a complete matching year allocation",
        );
      }
    }
    return { ...s, recipient_tin: ownerTin };
  });
  // Reuse box 3/4/5 equality, duplicate reference, and SSA/RRB withholding rules.
  sharedStatementsSchema.parse({ ssas: sharedStatements });
  const netCents = input.statements.reduce(
    (sum, s) => sum + cents(s.box5_net_benefits),
    0,
  );
  const withheldCents = input.statements.reduce((sum, s) =>
    sum + cents(
      s.is_rrb ? s.rrb_box10_federal_withheld! : s.box6_federal_withheld!,
    ), 0);
  if (!Number.isSafeInteger(netCents) || !Number.isSafeInteger(withheldCents)) {
    throw new Error(
      "Benefit statement totals exceed the supported amount range",
    );
  }
  // Offset signed copies across both owners first; do not reject a single
  // negative statement when another statement absorbs the repayment.
  if (netCents < 0) {
    throw new Error(
      "Negative combined benefits need repayment deduction or credit review",
    );
  }
  if (allocations.length !== 0 && !input.lump_sum_election) {
    throw new Error(
      "Prior-year benefit payments need an explicit election method review",
    );
  }
  if (allocations.length === 0 && input.lump_sum_election) {
    throw new Error("Lump-sum election has no prior-year benefit payments");
  }
  const election = input.lump_sum_election
    ? calculateBenefitElectionSources2026(
      input.lump_sum_election,
      allocations,
      netCents / 100,
    )
    : undefined;
  return {
    source_input: input,
    lump_sum_election: election,
    net_benefits: netCents / 100,
    federal_withholding: withheldCents / 100,
    medicare_premiums_paid: input.statements.reduce(
      (sum, s) => sum + cents(s.medicare_premiums_paid),
      0,
    ) / 100,
  };
}
