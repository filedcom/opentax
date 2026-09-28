import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  output,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form_1116,
  IncomeCategory,
} from "../../intermediate/forms/form_1116/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { form4952 } from "../../intermediate/forms/form4952/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { sellerFinancedBuyerSchema } from "../../../seller_financed_buyer.ts";

export const itemSchema = z.object({
  payer_name: z.string().min(1),
  payer_tin: z.string().optional(),
  seller_financed: z.boolean().optional(),
  buyer_used_as_personal_residence: z.boolean().optional(),
  seller_financed_buyer: sellerFinancedBuyerSchema.optional(),
  box1: z.number().nonnegative().optional(),
  // Affirm that this payer's taxable interest is from property held for
  // investment and is not already in Form 4952's manual "other" income.
  investment_property_for_form4952: z.boolean().optional(),
  box2: z.number().nonnegative().optional(),
  box3: z.number().nonnegative().optional(),
  box4: z.number().nonnegative().optional(),
  box5: z.number().nonnegative().optional(),
  box6: z.number().nonnegative().optional(),
  box7: z.string().optional(),
  foreign_source_interest_usd: z.number().nonnegative().optional(),
  foreign_tax_irs_country_code: z.string().length(2).optional(),
  foreign_tax_source_document_reference: z.string().trim().min(1).optional(),
  box8: z.number().nonnegative().optional(),
  box9: z.number().nonnegative().optional(),
  box10: z.number().nonnegative().optional(),
  box11: z.number().nonnegative().optional(),
  // IRC §171 amortization election: taxpayer must affirmatively elect to amortize
  // bond premium against taxable interest. When false (default), box11 is ignored.
  elect_bond_premium_amortization: z.boolean().optional(),
  box12: z.number().nonnegative().optional(),
  box13: z.number().nonnegative().optional(),
  box14: z.string().optional(),
  box15: z.string().optional(),
  box16: z.string().optional(),
  box17: z.number().nonnegative().optional(),
  nominee_interest: z.number().nonnegative().optional(),
  accrued_interest_paid: z.number().nonnegative().optional(),
  non_taxable_oid_adjustment: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f1099ints: z.array(itemSchema).min(1),
});

type INTItem = z.infer<typeof itemSchema>;
type INTInput = z.infer<typeof inputSchema>;

function validateIntItem(item: INTItem): void {
  const box8 = item.box8 ?? 0;
  const box9 = item.box9 ?? 0;
  const box13 = item.box13 ?? 0;
  if (box9 > box8) {
    throw new Error(
      `INT validation error: box9 (${box9}) cannot exceed box8 (${box8}) — box9 is a subset of box8`,
    );
  }
  if (box13 > box8) {
    throw new Error(
      `INT validation error: box13 (${box13}) cannot exceed box8 (${box8}) — bond premium on tax-exempt cannot exceed tax-exempt interest`,
    );
  }
  if (item.seller_financed) {
    if (item.buyer_used_as_personal_residence === undefined) {
      throw new Error(
        "INT validation error: seller-financed interest needs the buyer's personal-residence answer",
      );
    }
    if (
      item.buyer_used_as_personal_residence && !item.seller_financed_buyer
    ) {
      throw new Error(
        "INT validation error: personal-residence seller financing needs structured buyer name, SSN, and address",
      );
    }
    if (
      (item.box1 ?? 0) <= 0 || (item.box3 ?? 0) > 0 || (item.box10 ?? 0) > 0
    ) {
      throw new Error(
        "INT validation error: seller-financed interest must be a positive box 1 amount",
      );
    }
  } else if (
    item.seller_financed_buyer ||
    item.buyer_used_as_personal_residence !== undefined
  ) {
    throw new Error(
      "INT validation error: seller-financed buyer facts require the seller-financed flag",
    );
  }
  if (computeTaxableInterestNet(item) < 0) {
    throw new Error(
      "INT validation error: interest adjustments cannot exceed reported taxable interest",
    );
  }
}

function computeTaxableInterestNet(item: INTItem): number {
  // Box 11 (bond premium) only offsets interest when taxpayer has made the
  // IRC §171 amortization election. Without the election, bond premium is not deductible.
  const bondPremium = item.elect_bond_premium_amortization === true
    ? (item.box11 ?? 0)
    : 0;
  return (item.box1 ?? 0) +
    (item.box3 ?? 0) +
    (item.box10 ?? 0) -
    bondPremium -
    (item.box12 ?? 0) -
    (item.nominee_interest ?? 0) -
    (item.accrued_interest_paid ?? 0) -
    (item.non_taxable_oid_adjustment ?? 0);
}

function scheduleBOutput(item: INTItem): NodeOutput {
  const gross = (item.box1 ?? 0) + (item.box3 ?? 0) + (item.box10 ?? 0);
  const bondPremium =
    (item.elect_bond_premium_amortization === true ? item.box11 ?? 0 : 0) +
    (item.box12 ?? 0);
  return output(schedule_b, {
    interest_detail: {
      payer_name: item.payer_name,
      gross,
      net: computeTaxableInterestNet(item),
      nominee: item.nominee_interest ?? 0,
      accrued: item.accrued_interest_paid ?? 0,
      oid_adjustment: item.non_taxable_oid_adjustment ?? 0,
      bond_premium: bondPremium,
      ...(item.buyer_used_as_personal_residence && item.seller_financed_buyer
        ? { seller_financed_buyer: item.seller_financed_buyer }
        : {}),
    },
    box3_us_obligations: item.box3,
  });
}

class F1099intNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099int";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b,
    schedule1,
    f1040,
    form6251,
    form_1116,
    agi_aggregator,
    form4952,
  ]);

  compute(_ctx: NodeContext, input: INTInput): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099ints: int1099s } = parsed;

    for (const item of int1099s) {
      validateIntItem(item);
    }

    const totalBox2 = int1099s.reduce((sum, item) => sum + (item.box2 ?? 0), 0);
    const totalBox4 = int1099s.reduce((sum, item) => sum + (item.box4 ?? 0), 0);
    const totalBox6 = int1099s.reduce((sum, item) => sum + (item.box6 ?? 0), 0);
    const totalBox9 = int1099s.reduce((sum, item) => sum + (item.box9 ?? 0), 0);
    const totalTaxExempt = int1099s.reduce(
      (sum, item) => sum + (item.box8 ?? 0) - (item.box13 ?? 0),
      0,
    );

    const outputs: NodeOutput[] = int1099s.map(scheduleBOutput);

    for (const item of int1099s) {
      if (item.investment_property_for_form4952 !== true) continue;
      const interest = computeTaxableInterestNet(item);
      if (interest < 0) {
        throw new Error(
          "1099-INT investment-property interest is negative after adjustments",
        );
      }
      if (interest > 0) {
        outputs.push(this.outputNodes.output(form4952, {
          source_1099_interest: interest,
        }));
      }
      if ((item.box9 ?? 0) > 0) {
        outputs.push(this.outputNodes.output(form4952, {
          source_private_activity_bond_interest: item.box9!,
        }));
      }
    }

    if (totalBox2 > 0) {
      outputs.push(
        this.outputNodes.output(schedule1, {
          line18_early_withdrawal: totalBox2,
        }),
      );
    }

    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {};
    if (totalBox4 > 0) f1040Fields.line25b_withheld_1099 = totalBox4;
    if (totalTaxExempt > 0) f1040Fields.line2a_tax_exempt = totalTaxExempt;
    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(
        this.outputNodes.output(
          f1040,
          f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
        ),
      );
    }
    if (totalTaxExempt > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        tax_exempt_interest: totalTaxExempt,
      }));
    }

    if (totalBox9 > 0) {
      outputs.push(
        this.outputNodes.output(form6251, { line2g_pab_interest: totalBox9 }),
      );
    }

    if (totalBox6 > 0) {
      const taxedItems = int1099s.filter((item) => (item.box6 ?? 0) > 0);
      for (const item of taxedItems) {
        if (
          item.foreign_source_interest_usd === undefined ||
          item.foreign_source_interest_usd <= 0 ||
          item.foreign_source_interest_usd > (item.box1 ?? 0) ||
          !item.foreign_tax_irs_country_code
        ) {
          throw new Error(
            "1099-INT foreign tax needs verified foreign-source interest and an IRS country code",
          );
        }
      }
      outputs.push(this.outputNodes.output(form_1116, {
        foreign_tax_items: taxedItems.map((item) => ({
          foreign_tax_paid: item.box6!,
          foreign_gross_income: item.foreign_source_interest_usd!,
          income_category: IncomeCategory.Passive,
          irs_country_code: item.foreign_tax_irs_country_code,
          foreign_income_source_document_reference:
            item.foreign_tax_source_document_reference,
          tax_kind: ForeignTaxKind.Interest,
          tax_credit_method: ForeignTaxCreditMethod.Paid,
          tax_reported_on_1099: true,
        })),
      }));
    }

    return { outputs };
  }
}

export const f1099int = new F1099intNode();
