import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Forms 965-A, 965-C, 965-D, 965-E: §965 Transition Tax (Repatriation)
// IRC §965 (TCJA 2017): US shareholders of certain foreign corporations owed tax on
// previously untaxed accumulated foreign earnings. Taxpayers who elected installment
// payment under IRC §965(h) pay over 8 years:
//   Years 1–5: 8% per year
//   Year 6:    15%
//   Year 7:    20%
//   Year 8:    25%
// TY2025 is the 8th (final) installment year for the original 2017 inclusion.
// Current-year installment (Form 965-A Part II col (k)) → Schedule 2 line 9.

// Transfer agreement type — which Form 965-X was filed, if any
export enum TransferAgreementType {
  // No transfer agreement
  NONE = "NONE",
  // Form 965-C: Transfer agreement under §965(h)(3) — installment transferee
  C = "C",
  // Form 965-D: Transfer agreement under §965(i)(2) — S corp deferral transferee
  D = "D",
  // Form 965-E: Consent agreement under §965(i)(4)(D) — triggered deferral
  E = "E",
}

// Per-item schema — each Form 965-A row covers one inclusion year's liability
export const itemSchema = z.object({
  // Tax year of the original §965(a) inclusion (Form 965-A Part I col (a))
  // Typically "2017" or "2018" — the year the transition tax was assessed
  tax_year_of_inclusion: z.string(),
  // Net §965 tax liability: tax with §965 minus tax without §965
  // Form 965-A Part I col (d); IRC §965(h)(1)
  net_965_tax_liability: z.number().nonnegative(),
  // Whether the taxpayer elected to pay in installments under IRC §965(h)
  // Form 965-A Part I col (g) checkbox
  installment_election: z.boolean(),
  // Current-year installment payment (Form 965-A Part II col (k))
  // This amount flows to Schedule 2 line 9
  current_year_installment: z.number().nonnegative(),
  // Transfer agreement type — which companion form was filed, if any
  // Form 965-C, 965-D, or 965-E; informational metadata (does not change amount)
  transfer_agreement_type: z.nativeEnum(TransferAgreementType).optional(),
  // S corporation deferred §965 tax liability (Form 965-A Part III col (g))
  // Informational — deferred until triggering event under IRC §965(i)
  s_corp_deferred_amount: z.number().nonnegative().optional(),
  // Remaining unpaid installment balance at end of tax year (Form 965-A Part II col (j))
  // Informational — does not route to Schedule 2
  remaining_balance: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f965s: z.array(itemSchema).min(1),
});

type F965Item = z.infer<typeof itemSchema>;
type F965Items = F965Item[];

// Sum of all current-year installment payments across all inclusion years
function totalCurrentYearInstallment(items: F965Items): number {
  return items.reduce((sum, item) => sum + (item.current_year_installment ?? 0), 0);
}

// Route total current-year installment to Schedule 2 line 9 if nonzero
function schedule2Output(items: F965Items) {
  const total = totalCurrentYearInstallment(items);
  if (total === 0) return [];
  return [output(schedule2, { line9_965_net_tax_liability: total })];
}

class F965Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f965";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: schedule2Output(parsed.f965s) };
  }
}

export const f965 = new F965Node();
