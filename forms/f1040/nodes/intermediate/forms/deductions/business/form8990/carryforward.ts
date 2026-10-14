import { z } from "zod";
import {
  assertCalculatedLimitForBusiness,
  type CalculatedBoundedForm8990Limit,
} from "./limit.ts";
import {
  assertFinalizedBoundedForm8990Return,
  type FinalizedBoundedForm8990Return,
} from "./final-reconciliation.ts";

export const priorCarryforwardSchema = z.object({
  tax_year: z.literal(2024),
  filed_form8990_document_reference: z.string().trim().min(1),
  filed_taxpayer_ssn: z.string().trim().min(1),
  filed_line31_disallowed_business_interest: z.number().int().finite()
    .nonnegative().max(999_999_999_999_999),
}).strict();

export type PriorFiledForm8990Carryforward = z.infer<
  typeof priorCarryforwardSchema
>;

const priorBrand = Symbol("Form8990Reviewed2024Carryforward");

export interface ReviewedZeroPriorForm8990Carryforward {
  readonly [priorBrand]: true;
  readonly sourceTaxYear: 2024;
  readonly targetTaxYear: 2025;
  readonly sourceDocumentReference: string;
  readonly taxpayerSsn: string;
  readonly sourceLine31: 0;
  readonly targetLine2: 0;
}

export function assertReviewedZeroPriorForm8990Carryforward(
  prior: ReviewedZeroPriorForm8990Carryforward,
): void {
  if (
    prior[priorBrand] !== true || prior.sourceLine31 !== 0 ||
    prior.targetLine2 !== 0
  ) {
    throw new Error(
      "Form 8990 line 2 needs a reviewed zero prior-year carryforward",
    );
  }
}

/** The bounded route admits only a reviewed, filed zero 2024 line 31. */
export function proveZeroPriorForm8990Carryforward(
  raw: unknown,
  currentGeneral: unknown,
): ReviewedZeroPriorForm8990Carryforward {
  const prior = priorCarryforwardSchema.parse(raw);
  const current = z.object({
    taxpayer_ssn: z.string().trim().min(1),
  }).passthrough().parse(currentGeneral);
  if (prior.filed_taxpayer_ssn !== current.taxpayer_ssn) {
    throw new Error(
      "Form 8990 prior filed form taxpayer differs from current return",
    );
  }
  if (prior.filed_line31_disallowed_business_interest !== 0) {
    throw new Error(
      "Form 8990 bounded route does not yet calculate prior disallowed interest",
    );
  }
  return {
    [priorBrand]: true,
    sourceTaxYear: 2024,
    targetTaxYear: 2025,
    sourceDocumentReference: prior.filed_form8990_document_reference,
    taxpayerSsn: current.taxpayer_ssn,
    sourceLine31: 0,
    targetLine2: 0,
  };
}

const nextBrand = Symbol("Form8990Unfiled2025CarryforwardWorkpaper");

export interface UnfiledForm8990CarryforwardWorkpaper {
  readonly [nextBrand]: true;
  readonly status: "unfiled-workpaper";
  readonly sourceTaxYear: 2025;
  readonly targetTaxYear: 2026;
  readonly businessReference: string;
  readonly sourceLine31: number;
  readonly targetLine2: number;
  readonly prior2024Form8990Reference: string;
}

/** Explicit next-year record, intentionally not persisted or filed. */
export function projectUnfiledForm8990Carryforward(args: {
  readonly prior: ReviewedZeroPriorForm8990Carryforward;
  readonly limit: CalculatedBoundedForm8990Limit;
  readonly finalized: FinalizedBoundedForm8990Return;
}): UnfiledForm8990CarryforwardWorkpaper {
  const { prior, limit, finalized } = args;
  assertReviewedZeroPriorForm8990Carryforward(prior);
  if (prior.targetLine2 !== limit.line2) {
    throw new Error(
      "Form 8990 current line 2 lacks reviewed prior-year source",
    );
  }
  assertFinalizedBoundedForm8990Return(finalized);
  assertCalculatedLimitForBusiness(
    limit,
    finalized.businessReference,
    finalized.originalInterestExpense,
  );
  if (limit.line31 !== finalized.disallowedInterestExpense) {
    throw new Error(
      "Form 8990 carryforward differs from finalized disallowance",
    );
  }
  return {
    [nextBrand]: true,
    status: "unfiled-workpaper",
    sourceTaxYear: 2025,
    targetTaxYear: 2026,
    businessReference: finalized.businessReference,
    sourceLine31: limit.line31,
    targetLine2: limit.line31,
    prior2024Form8990Reference: prior.sourceDocumentReference,
  };
}
