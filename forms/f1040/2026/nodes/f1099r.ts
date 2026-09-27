import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { agi_aggregator } from "../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { f1040_2026_node } from "./f1040.ts";
import { schedule2_2026 } from "./schedule2.ts";

const amount = z.number().finite().nonnegative();

/** Final 2026 box labels; unmodeled box facts are rejected by strict parsing. */
export const f1099rItem2026Schema = z.object({
  payer_name: z.string().min(1),
  payer_ein: z.string().regex(/^\d{9}$/),
  recipient: z.enum(["taxpayer", "spouse"]),
  box1_gross_distribution: amount,
  box2a_taxable_amount: amount,
  box2b_taxable_not_determined: z.boolean().optional(),
  box2b_total_distribution: z.boolean().optional(),
  box3_capital_gain: amount.optional(),
  box4_federal_withheld: amount.optional(),
  box7a_codes: z.array(z.string().regex(/^[0-9A-Z]$/)).min(1).max(2),
  box7b_ira_sep_simple: z.boolean(),
  box7c_trump_account: z.boolean().optional(),
  box7d_earnings_on_excess_contributions: amount.optional(),
  box8a_other: amount.optional(),
  box8b_pct_annuity_contract: z.number().finite().min(0).max(100).optional(),
  early_distribution_tax_facts: z.object({
    full_amount_subject_to_ten_percent: z.literal(true),
    simple_ira_in_first_two_years: z.boolean(),
  }).strict().optional(),
}).strict();

export const f1099rInput2026Schema = z.object({
  statements: z.array(f1099rItem2026Schema).min(1),
}).strict();

class F1099rNode2026 extends TaxNode<typeof f1099rInput2026Schema> {
  readonly nodeType = "f1099r";
  readonly inputSchema = f1099rInput2026Schema;
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    agi_aggregator,
    schedule2_2026,
  ]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof f1099rInput2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Form 1099-R requires f1040:2026 context");
    }
    const { statements } = this.inputSchema.parse(rawInput);
    let iraGross = 0;
    let pensionGross = 0;
    let withheld = 0;
    let earlyTaxable = 0;
    const hasEarlyDistribution = statements.some((statement) =>
      statement.box7a_codes.length === 1 && statement.box7a_codes[0] === "1"
    );
    if (
      hasEarlyDistribution &&
      statements.some((statement) =>
        statement.box7a_codes.length !== 1 ||
        statement.box7a_codes[0] !== "1"
      )
    ) {
      throw new Error(
        "TY2026 code 1 direct tax needs all 1099-R statements to qualify; mixed codes need Form 5329 review",
      );
    }
    for (const statement of statements) {
      if (
        statement.box7a_codes.length !== 1 ||
        !["1", "7"].includes(statement.box7a_codes[0]) ||
        statement.box7c_trump_account === true ||
        (statement.box7d_earnings_on_excess_contributions ?? 0) > 0 ||
        (statement.box3_capital_gain ?? 0) > 0 ||
        (statement.box8a_other ?? 0) > 0 ||
        statement.box8b_pct_annuity_contract !== undefined ||
        statement.box2b_taxable_not_determined === true ||
        statement.box2a_taxable_amount !== statement.box1_gross_distribution
      ) {
        throw new Error(
          "TY2026 Form 1099-R distribution needs its code, basis, or special-account calculation route",
        );
      }
      if (statement.box7a_codes[0] === "1") {
        if (!statement.early_distribution_tax_facts) {
          throw new Error(
            "TY2026 code 1 direct tax needs full-tax and SIMPLE-period facts",
          );
        }
        if (
          statement.early_distribution_tax_facts.simple_ira_in_first_two_years
        ) {
          throw new Error(
            "TY2026 early SIMPLE IRA distribution needs the 25% Form 5329 route",
          );
        }
      } else if (statement.early_distribution_tax_facts) {
        throw new Error(
          "TY2026 normal distribution cannot claim early-tax facts",
        );
      }
      if (statement.box7b_ira_sep_simple) {
        iraGross += statement.box1_gross_distribution;
      } else {
        pensionGross += statement.box1_gross_distribution;
      }
      withheld += statement.box4_federal_withheld ?? 0;
      if (statement.box7a_codes[0] === "1") {
        earlyTaxable += statement.box2a_taxable_amount;
      }
    }
    const outputs: NodeOutput[] = [];
    if (iraGross > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        line4b_ira_taxable: iraGross,
      }));
    }
    if (pensionGross > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        line5b_pension_taxable: pensionGross,
      }));
    }
    if (earlyTaxable > 0) {
      outputs.push(this.outputNodes.output(schedule2_2026, {
        line5_form5329_early_tax: Math.round(earlyTaxable * 0.1),
      }));
    }
    if (iraGross > 0) {
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line4a_ira_gross: iraGross,
        line4b_ira_taxable: iraGross,
        ...(pensionGross > 0 && {
          line5a_pension_gross: pensionGross,
          line5b_pension_taxable: pensionGross,
        }),
        ...(withheld > 0 && { line25b_withheld_1099: withheld }),
      }));
    } else if (pensionGross > 0) {
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line5a_pension_gross: pensionGross,
        line5b_pension_taxable: pensionGross,
        ...(withheld > 0 && { line25b_withheld_1099: withheld }),
      }));
    } else if (withheld > 0) {
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line25b_withheld_1099: withheld,
      }));
    }
    outputs.push({
      nodeType: this.nodeType,
      fields: {
        statements,
        ira_gross: iraGross,
        pension_gross: pensionGross,
        withholding: withheld,
        early_taxable: earlyTaxable,
      },
    });
    return { outputs };
  }
}

export const f1099r_2026 = new F1099rNode2026();
