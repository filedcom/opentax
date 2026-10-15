import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { standard_deduction_2026 } from "../nodes/standard_deduction.ts";
import { scheduleA } from "../../nodes/inputs/deductions/itemized/schedule_a/index.ts";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const money = z.number().finite().nonnegative();
export const cashGift2026Schema = z.object({
  tax_year: z.literal(2026),
  contribution_id: reference,
  donor_ssn: tin,
  contribution_date: z.string().date().refine(
    (value) => value.startsWith("2026-"),
    "Contribution must be paid during 2026",
  ),
  donee_name: reference,
  donee_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  recipient_class: z.enum([
    "section170b1A",
    "supporting_organization",
    "donor_advised_fund",
    "other_qualified",
    "not_qualified",
  ]),
  organization_classification_reference: reference,
  payment_method: z.enum([
    "cash",
    "check",
    "credit_card",
    "debit_card",
    "electronic_transfer",
    "payroll",
  ]),
  amount_paid: money,
  goods_or_services_value: money,
  payment_record_reference: reference,
  from_ira_qualified_charitable_distribution: z.boolean(),
  state_local_credit_or_reimbursement_amount: money,
  acknowledgment: z.object({
    record_reference: reference,
    received_by_earlier_of_filing_or_extended_due_date: z.literal(true),
    goods_services_or_intangible_religious_benefits_described: z.literal(true),
  }).strict().optional(),
}).strict();
export const inputSchema = z.object({
  // Shared start router uses the first field as the repeated-record key.
  cash_gifts: z.array(cashGift2026Schema).default([]),
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
}).strict();

/** Cash-source owner; Schedule A and §170(p) share each contribution identity. */
class CashCharity2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "cash_charity";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([standard_deduction_2026, scheduleA]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Cash charity needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (input.cash_gifts.length === 0) return { outputs: [] };
    const owners = new Set([input.taxpayer_ssn.replaceAll("-", "")]);
    if (input.filing_status === FilingStatus.MFJ) {
      if (
        !input.spouse_ssn || owners.has(input.spouse_ssn.replaceAll("-", ""))
      ) throw new Error("Joint charity needs distinct spouse identity");
      owners.add(input.spouse_ssn.replaceAll("-", ""));
    }
    const ids = new Set<string>();
    const rows = input.cash_gifts.map((gift) => {
      if (!owners.has(gift.donor_ssn.replaceAll("-", ""))) {
        throw new Error("Cash gift donor does not belong to this return");
      }
      if (ids.has(gift.contribution_id)) {
        throw new Error("Duplicate cash contribution identity");
      }
      ids.add(gift.contribution_id);
      if (gift.goods_or_services_value > gift.amount_paid) {
        throw new Error("Cash gift benefit value exceeds payment");
      }
      if (gift.state_local_credit_or_reimbursement_amount > 0) {
        throw new Error(
          "Cash gift with a credit or reimbursement needs a separate deduction-reduction review",
        );
      }
      const charitableAmount = gift.amount_paid - gift.goods_or_services_value;
      const excluded = gift.from_ira_qualified_charitable_distribution
        ? "excluded_qcd"
        : gift.recipient_class === "not_qualified"
        ? "unqualified_recipient"
        : undefined;
      if (!excluded && charitableAmount >= 250 && !gift.acknowledgment) {
        throw new Error(
          "Cash contribution of $250 or more requires contemporaneous acknowledgment",
        );
      }
      const eligible = excluded === undefined &&
        gift.recipient_class === "section170b1A";
      return {
        ...gift,
        charitable_amount: charitableAmount,
        nonitemizer_eligible_amount: eligible ? charitableAmount : 0,
        nonitemizer_exclusion: excluded ??
          (eligible ? undefined : "recipient_excluded_from_170p"),
      };
    });
    const eligible = rows.reduce(
      (sum, row) => sum + row.nonitemizer_eligible_amount,
      0,
    );
    if (!Number.isFinite(eligible) || eligible > Number.MAX_SAFE_INTEGER) {
      throw new Error("Cash gifts exceed amount range");
    }
    return {
      outputs: [
        {
          nodeType: "standard_deduction",
          fields: { nonitemizer_cash_contributions: eligible },
        },
        // No net Schedule A amount is asserted here: category limits, the 2026
        // floor and carryforwards belong to that receiving source calculator.
        { nodeType: "schedule_a", fields: { cash_gift_sources_2026: rows } },
        { nodeType: this.nodeType, fields: { reviewed_cash_gifts_2026: rows } },
      ],
    };
  }
}
export const cash_charity_2026 = new CashCharity2026Node();
