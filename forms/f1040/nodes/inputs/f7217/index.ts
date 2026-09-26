import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";

const propertySchema = z.object({
  description: z.string().min(1),
  partnership_basis_before_distribution: z.number().nonnegative().optional(),
  section_732d_basis_adjustment: z.boolean().optional(),
  section_732f_basis_adjustment: z.boolean().optional(),
  section_734b_basis_adjustment: z.boolean().optional(),
  section_743b_basis_adjustment: z.boolean().optional(),
  fair_market_value: z.number().nonnegative().optional(),
  partner_basis_after_section_732: z.number().nonnegative().optional(),
});

const itemSchema = z.object({
  partnership_name: z.string().min(1),
  partnership_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  distribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  complete_liquidation: z.boolean().optional(),
  section_751b_sale_or_exchange: z.boolean().optional(),
  partner_adjusted_basis_before_distribution: z.number().nonnegative(),
  cash_received: z.number().nonnegative().optional(),
  marketable_securities_fmv: z.number().nonnegative().optional(),
  us_tax_required_on_gain: z.boolean().optional(),
  distributed_properties: z.array(propertySchema).min(1),
});

export const inputSchema = z.object({
  form7217s: z.array(itemSchema).min(1),
});

export type Form7217Item = z.infer<typeof itemSchema>;
export type Form7217Input = z.infer<typeof inputSchema>;

export interface Form7217Amounts {
  readonly totalPartnershipBasis: number;
  readonly cashAndSecurities: number;
  readonly smallerBasisAndCash: number;
  readonly recognizedGain: number;
  readonly remainingPartnerBasis: number;
  readonly basisAllocatedToProperty: number;
  readonly totalDistributedPropertyFMV: number | undefined;
  readonly totalPartnerBasisAfterSection732: number | undefined;
}

export function computeForm7217Amounts(item: Form7217Item): Form7217Amounts {
  const totalPartnershipBasis = item.distributed_properties.reduce(
    (sum, property) =>
      sum + (property.partnership_basis_before_distribution ?? 0),
    0,
  );
  const cash = item.cash_received ?? 0;
  const cashAndSecurities = cash + (item.marketable_securities_fmv ?? 0);
  const smallerBasisAndCash = Math.min(
    item.partner_adjusted_basis_before_distribution,
    cashAndSecurities,
  );
  const recognizedGain = cashAndSecurities - smallerBasisAndCash;
  const remainingPartnerBasis = Math.max(
    0,
    item.partner_adjusted_basis_before_distribution - cash,
  );
  const basisAllocatedToProperty = item.complete_liquidation
    ? remainingPartnerBasis
    : Math.min(totalPartnershipBasis, remainingPartnerBasis);
  const hasFMV = item.distributed_properties.some((property) =>
    property.fair_market_value !== undefined
  );
  const hasPartnerBasis = item.distributed_properties.some((property) =>
    property.partner_basis_after_section_732 !== undefined
  );
  return {
    totalPartnershipBasis,
    cashAndSecurities,
    smallerBasisAndCash,
    recognizedGain,
    remainingPartnerBasis,
    basisAllocatedToProperty,
    totalDistributedPropertyFMV: hasFMV
      ? item.distributed_properties.reduce(
        (sum, property) => sum + (property.fair_market_value ?? 0),
        0,
      )
      : undefined,
    totalPartnerBasisAfterSection732: hasPartnerBasis
      ? item.distributed_properties.reduce(
        (sum, property) =>
          sum + (property.partner_basis_after_section_732 ?? 0),
        0,
      )
      : undefined,
  };
}

export function assertNoUnroutedGain(item: Form7217Item): void {
  if (computeForm7217Amounts(item).recognizedGain > 0) {
    throw new Error(
      "Form 7217 recognized gain needs a downstream Schedule D or Form 4797 route",
    );
  }
}

class F7217Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f7217";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: Form7217Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    input.form7217s.forEach(assertNoUnroutedGain);
    return { outputs: [] };
  }
}

export const f7217 = new F7217Node();
