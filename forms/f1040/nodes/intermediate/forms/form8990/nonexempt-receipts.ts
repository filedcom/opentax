import { z } from "zod";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import type { ProvisionalScheduleCInterestPass } from "./two-stage.ts";

const filedAmount = z.number().int().finite().nonnegative().max(
  999_999_999_999_999,
);

export const priorFiledScheduleCSchema = z.object({
  tax_year: z.union([z.literal(2022), z.literal(2023), z.literal(2024)]),
  business_reference: z.string().trim().min(1),
  filed_schedule_c_document_reference: z.string().trim().min(1),
  filed_tax_period_start: z.string().date(),
  filed_tax_period_end: z.string().date(),
  filed_line1_gross_receipts: filedAmount,
  filed_line2_returns_and_allowances: filedAmount,
  filed_line3_net_receipts: filedAmount,
}).strict().superRefine((entry, context) => {
  if (
    entry.filed_tax_period_start !== `${entry.tax_year}-01-01` ||
    entry.filed_tax_period_end !== `${entry.tax_year}-12-31`
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Form 8990 lower-bound proof requires a full calendar-year filed Schedule C",
    });
  }
  if (
    entry.filed_line1_gross_receipts -
        entry.filed_line2_returns_and_allowances !==
      entry.filed_line3_net_receipts
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Filed Schedule C line 3 must equal line 1 less line 2 returns and allowances",
    });
  }
});

export type PriorFiledScheduleCReceipt = z.infer<
  typeof priorFiledScheduleCSchema
>;

const nonexemptBrand = Symbol("Form8990NonexemptPriorReceipts");

export interface NonexemptPriorReceiptsProof {
  readonly [nonexemptBrand]: true;
  readonly businessReference: string;
  readonly totalPriorThreeYearScheduleCNetReceiptsLowerBound: number;
  readonly averagePriorThreeYearScheduleCNetReceiptsLowerBound: number;
  readonly sourceDocuments: readonly PriorFiledScheduleCReceipt[];
}

/**
 * Filed full-year Schedule C line 3 (line 1 less line 2 returns/allowances)
 * provides a same-business §448(c) receipts lower bound. Other eligible
 * receipts, predecessors, and controlled-group aggregation may increase the
 * total, but are never inferred from this source.
 */
export function proveNonexemptPriorReceipts(
  provisional: ProvisionalScheduleCInterestPass,
  raw: unknown,
): NonexemptPriorReceiptsProof {
  const documents = z.array(priorFiledScheduleCSchema).length(3).parse(raw);
  const years = new Set(documents.map((entry) => entry.tax_year));
  const references = new Set(
    documents.map((entry) => entry.filed_schedule_c_document_reference),
  );
  if (years.size !== 3 || references.size !== 3) {
    throw new Error(
      "Form 8990 needs distinct filed Schedule C sources for 2022-2024",
    );
  }
  if (
    documents.some((entry) =>
      entry.business_reference !== provisional.interest.businessReference
    )
  ) {
    throw new Error(
      "Form 8990 prior receipts are not for the identified business",
    );
  }
  const total = documents.reduce(
    (sum, entry) => sum + entry.filed_line3_net_receipts,
    0,
  );
  const average = total / 3;
  if (average <= CONFIG_BY_YEAR[2025].smallBizGrossReceipts) {
    throw new Error(
      "Form 8990 prior receipts do not establish nonexempt status",
    );
  }
  return {
    [nonexemptBrand]: true,
    businessReference: provisional.interest.businessReference,
    totalPriorThreeYearScheduleCNetReceiptsLowerBound: total,
    averagePriorThreeYearScheduleCNetReceiptsLowerBound: average,
    sourceDocuments: documents,
  };
}
