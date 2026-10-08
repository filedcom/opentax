import { z } from "zod";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import {
  form8949,
  Form8949Part,
  transactionSchema as form8949TransactionSchema,
} from "../../../../intermediate/forms/income/investments/form8949/index.ts";

export enum Form7217PropertyTreatment {
  Section732Property = "section732_property",
  Section731cMarketableSecurityTreatedAsMoney =
    "section731c_marketable_security_treated_as_money",
}

const propertySchema = z.object({
  description: z.string().min(1),
  section_732c_class: z.enum(["inventory_or_receivable", "other_property"])
    .optional(),
  // Cash is excluded from Part II; section 731(c) securities treated as money
  // still enter its property-basis rows and separately appear on line 5b.
  property_treatment: z.nativeEnum(Form7217PropertyTreatment).optional(),
  section_731c_reduction_amount: z.number().nonnegative().optional(),
  partnership_basis_before_distribution: z.number().nonnegative().optional(),
  section_732d_basis_adjustment: z.boolean().optional(),
  section_732f_basis_adjustment: z.boolean().optional(),
  section_734b_basis_adjustment: z.boolean().optional(),
  section_743b_basis_adjustment: z.boolean().optional(),
  fair_market_value: z.number().nonnegative().optional(),
  partner_basis_after_section_732: z.number().nonnegative().optional(),
});

const section731GainSourceSchema = z.object({
  k1_document_reference: z.string().trim().min(1),
  k1_box19_statement_reference: z.string().trim().min(1),
  k1_box19_statement_distribution_date: z.string().date(),
  k1_partner_ssn: z.string().regex(/^(?:\d{9}|\d{3}-\d{2}-\d{4})$/),
  k1_partnership_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  k1_box19_code_a_cash: z.number().nonnegative(),
  k1_box19_code_d_deemed_cash: z.number().nonnegative(),
  k1_box19_code_c_property_basis: z.number().nonnegative(),
  k1_box19_code_c_property_fmv: z.number().nonnegative(),
  k1_box19_code_b_section737_property: z.literal(0),
  k1_box19_code_f_service_cash: z.literal(0),
  k1_box19_code_g_service_property: z.literal(0),
  outside_basis_workpaper_reference: z.string().trim().min(1),
  outside_basis_workpaper_as_of_date: z.string().date(),
  opening_outside_basis: z.number().nonnegative(),
  increases_before_distribution: z.number().nonnegative(),
  decreases_before_distribution: z.number().nonnegative(),
  partnership_interest_acquired_date: z.string().date(),
  entire_interest_has_one_holding_period: z.literal(true),
  not_section707_disguised_sale: z.literal(true),
}).strict();

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
  section_732c_allocation_workpaper_reference: z.string().trim().min(1)
    .optional(),
  section_731_capital_gain_source: section731GainSourceSchema.optional(),
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

function allocateWholeDollars(
  total: number,
  weights: readonly number[],
): number[] {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isSafeInteger(total) || total < 0 || weightTotal <= 0) {
    throw new Error(
      "Form 7217 section 732(c) allocation needs whole-dollar basis and positive FMV",
    );
  }
  const shares = weights.map((weight, index) => ({
    index,
    exact: total * weight / weightTotal,
  }));
  const allocated = shares.map(({ exact }) => Math.floor(exact));
  let remainder = total - allocated.reduce((sum, value) => sum + value, 0);
  shares.sort((a, b) =>
    (b.exact - Math.floor(b.exact)) -
      (a.exact - Math.floor(a.exact)) || a.index - b.index
  );
  for (const share of shares) {
    if (remainder-- <= 0) break;
    allocated[share.index]++;
  }
  return allocated;
}

function reduceSection732cClass(
  expected: number[],
  properties: Form7217Item["distributed_properties"],
  indices: readonly number[],
  reduction: number,
): void {
  if (reduction === 0) return;
  const depreciation = indices.map((index) =>
    Math.max(
      0,
      expected[index] - properties[index].fair_market_value!,
    )
  );
  const first = Math.min(
    reduction,
    depreciation.reduce((sum, amount) => sum + amount, 0),
  );
  if (first > 0) {
    allocateWholeDollars(first, depreciation).forEach((cut, position) => {
      expected[indices[position]] -= cut;
    });
  }
  const remaining = reduction - first;
  if (remaining > 0) {
    allocateWholeDollars(
      remaining,
      indices.map((index) => expected[index]),
    ).forEach((cut, position) => {
      expected[indices[position]] -= cut;
    });
  }
}

/** Bounded section 732(c) allocation: class basis, depreciation/basis for
 * decreases, and appreciation/FMV for liquidating increases. */
function assertSection732cAllocation(
  item: Form7217Item,
  amounts: Form7217Amounts,
): void {
  if (item.distributed_properties.length < 2) {
    return;
  }
  // Section 731(c) securities need their separate deemed-money basis rules.
  // The existing zero-reduction security route is outside this class allocator.
  if (
    item.distributed_properties.some((property) =>
      property.property_treatment !==
        Form7217PropertyTreatment.Section732Property
    )
  ) return;
  if (amounts.basisAllocatedToProperty === amounts.totalPartnershipBasis) {
    if (
      item.distributed_properties.some((property) =>
        property.partner_basis_after_section_732 !==
          property.partnership_basis_before_distribution
      )
    ) {
      throw new Error(
        "Form 7217 Part II property basis differs without a section 732(c) aggregate adjustment",
      );
    }
    return;
  }
  if (
    !item.section_732c_allocation_workpaper_reference ||
    item.distributed_properties.some((property) =>
      property.section_732c_class === undefined ||
      !Number.isSafeInteger(property.partnership_basis_before_distribution) ||
      !Number.isSafeInteger(property.fair_market_value) ||
      !Number.isSafeInteger(property.partner_basis_after_section_732)
    ) ||
    !Number.isSafeInteger(amounts.basisAllocatedToProperty)
  ) {
    throw new Error(
      "Form 7217 multi-property distribution needs a classified section 732(c) basis-allocation workpaper",
    );
  }
  const properties = item.distributed_properties;
  const other = properties.map((property, index) => ({ property, index }))
    .filter(({ property }) => property.section_732c_class === "other_property");
  const extra = amounts.basisAllocatedToProperty -
    amounts.totalPartnershipBasis;
  const expected = properties.map((property) =>
    property.partnership_basis_before_distribution!
  );
  if (extra < 0) {
    const inventory = properties.flatMap((property, index) =>
      property.section_732c_class === "inventory_or_receivable" ? [index] : []
    );
    const otherIndices = other.map(({ index }) => index);
    const inventoryBasis = inventory.reduce(
      (sum, index) => sum + expected[index],
      0,
    );
    const inventoryReduction = Math.max(
      0,
      inventoryBasis - amounts.basisAllocatedToProperty,
    );
    if (inventoryReduction > 0) {
      reduceSection732cClass(
        expected,
        properties,
        inventory,
        inventoryReduction,
      );
    }
    reduceSection732cClass(
      expected,
      properties,
      otherIndices,
      -extra - inventoryReduction,
    );
  } else {
    if (!item.complete_liquidation) {
      throw new Error(
        "Form 7217 nonliquidating distribution cannot increase section 732 property basis",
      );
    }
    if (extra > 0 && other.length === 0) {
      throw new Error(
        "Form 7217 section 732(c) basis increase needs other property",
      );
    }
    const appreciation = other.map(({ property }) =>
      Math.max(
        0,
        property.fair_market_value! -
          property.partnership_basis_before_distribution!,
      )
    );
    const totalAppreciation = appreciation.reduce(
      (sum, value) => sum + value,
      0,
    );
    const appreciationExtra = Math.min(extra, totalAppreciation);
    const appreciatedShares = appreciationExtra > 0
      ? allocateWholeDollars(appreciationExtra, appreciation)
      : other.map(() => 0);
    const remaining = extra - appreciationExtra;
    const fmvShares = remaining > 0
      ? allocateWholeDollars(
        remaining,
        other.map(({ property }) => property.fair_market_value!),
      )
      : other.map(() => 0);
    other.forEach(({ index }, position) => {
      expected[index] += appreciatedShares[position] + fmvShares[position];
    });
  }
  if (
    properties.some((property, index) =>
      property.partner_basis_after_section_732 !== expected[index]
    )
  ) {
    throw new Error(
      "Form 7217 Part II property basis conflicts with section 732(c) allocation",
    );
  }
}

function actualDate(date: string): Date | undefined {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ? undefined
    : parsed;
}

export function section731Form8949Transaction(
  item: Form7217Item,
): z.infer<typeof form8949TransactionSchema> | undefined {
  const amounts = computeForm7217Amounts(item);
  const source = item.section_731_capital_gain_source;
  if (amounts.recognizedGain === 0) {
    if (source) {
      throw new Error(
        "Form 7217 section 731 gain source has no recognized gain",
      );
    }
    return undefined;
  }
  if (!source) {
    throw new Error(
      "Form 7217 recognized gain needs K-1, outside-basis, and downstream Form 8949 source",
    );
  }
  const acquired = actualDate(source.partnership_interest_acquired_date);
  const distributed = actualDate(item.distribution_date);
  if (
    !acquired || !distributed || acquired >= distributed ||
    item.us_tax_required_on_gain !== true ||
    (item.marketable_securities_fmv ?? 0) !== 0 ||
    source.k1_partnership_ein.replaceAll("-", "") !==
      item.partnership_ein.replaceAll("-", "") ||
    source.k1_box19_statement_distribution_date !== item.distribution_date ||
    source.outside_basis_workpaper_as_of_date !== item.distribution_date ||
    source.k1_box19_code_a_cash + source.k1_box19_code_d_deemed_cash !==
      (item.cash_received ?? 0) ||
    source.k1_box19_code_c_property_basis !==
      amounts.totalPartnershipBasis ||
    source.k1_box19_code_c_property_fmv !==
      amounts.totalDistributedPropertyFMV ||
    source.opening_outside_basis + source.increases_before_distribution -
          source.decreases_before_distribution !==
      item.partner_adjusted_basis_before_distribution
  ) {
    throw new Error(
      "Form 7217 section 731 gain must reconcile to exact K-1 box 19 cash/property, outside basis, and capital holding-period source",
    );
  }
  const oneYearLater = new Date(acquired);
  oneYearLater.setUTCFullYear(oneYearLater.getUTCFullYear() + 1);
  const longTerm = distributed > oneYearLater;
  return {
    part: longTerm ? Form8949Part.F : Form8949Part.C,
    description: `Section 731 distribution from ${item.partnership_name}`,
    source_transaction_id: `f7217:${
      item.partnership_ein.replaceAll("-", "")
    }:${item.distribution_date}`,
    date_acquired: source.partnership_interest_acquired_date,
    date_sold: item.distribution_date,
    proceeds: item.cash_received ?? 0,
    cost_basis: item.partner_adjusted_basis_before_distribution,
    gain_loss: amounts.recognizedGain,
    is_long_term: longTerm,
  };
}

/** Keep each filed Form 7217 to one identified date and complete Part II basis. */
export function assertForm7217FilingSource(input: Form7217Input): void {
  const dates = new Set<string>();
  const gainStatementReferences = new Set<string>();
  for (const item of input.form7217s) {
    const timestamp = Date.parse(`${item.distribution_date}T00:00:00.000Z`);
    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !==
        item.distribution_date ||
      !item.distribution_date.startsWith("2025-")
    ) {
      throw new Error("Form 7217 needs an actual 2025 distribution date");
    }
    const key = `${
      item.partnership_ein.replace(/\D/g, "")
    }:${item.distribution_date}`;
    if (dates.has(key)) {
      throw new Error(
        "Form 7217 needs one aggregate filing record per partnership and distribution date",
      );
    }
    dates.add(key);
    const statement = item.section_731_capital_gain_source
      ?.k1_box19_statement_reference;
    if (statement) {
      if (gainStatementReferences.has(statement)) {
        throw new Error(
          "Form 7217 section 731 gain needs a distinct dated K-1 statement per distribution",
        );
      }
      gainStatementReferences.add(statement);
    }
    if (
      typeof item.complete_liquidation !== "boolean" ||
      typeof item.section_751b_sale_or_exchange !== "boolean"
    ) {
      throw new Error(
        "Form 7217 needs explicit Part I liquidation and section 751(b) answers",
      );
    }
    if (item.section_751b_sale_or_exchange === true) {
      throw new Error(
        "Form 7217 section 751(b) sale or exchange needs the gain/loss statement and downstream tax route",
      );
    }
    if (
      item.distributed_properties.some((property) =>
        property.property_treatment === undefined ||
        property.partnership_basis_before_distribution === undefined ||
        property.fair_market_value === undefined ||
        property.partner_basis_after_section_732 === undefined
      )
    ) {
      throw new Error(
        "Form 7217 Part II needs classified property with partnership basis, FMV, and partner basis",
      );
    }
    if (
      item.distributed_properties.every((property) =>
        property.property_treatment ===
          Form7217PropertyTreatment.Section731cMarketableSecurityTreatedAsMoney
      )
    ) {
      throw new Error(
        "Form 7217 is not filed for a distribution of only money or marketable securities treated as money",
      );
    }
    const securitiesFMV = item.distributed_properties.reduce(
      (sum, property) =>
        sum +
        (property.property_treatment ===
            Form7217PropertyTreatment
              .Section731cMarketableSecurityTreatedAsMoney
          ? property.fair_market_value ?? 0
          : 0),
      0,
    );
    if (
      item.distributed_properties.some((property) =>
        property.property_treatment ===
          Form7217PropertyTreatment
            .Section731cMarketableSecurityTreatedAsMoney &&
        property.section_731c_reduction_amount !== 0
      ) ||
      item.distributed_properties.some((property) =>
        property.property_treatment ===
          Form7217PropertyTreatment.Section732Property &&
        (property.section_731c_reduction_amount ?? 0) !== 0
      )
    ) {
      throw new Error(
        "Form 7217 marketable-security route needs an explicit zero section 731(c) reduction",
      );
    }
    if (
      Math.round(securitiesFMV) !==
        Math.round(item.marketable_securities_fmv ?? 0)
    ) {
      throw new Error(
        "Form 7217 line 5b marketable securities must match their Part II FMV rows",
      );
    }
    section731Form8949Transaction(item);
    const amounts = computeForm7217Amounts(item);
    assertSection732cAllocation(item, amounts);
    if (
      Math.round(amounts.totalPartnerBasisAfterSection732 ?? -1) !==
        Math.round(amounts.basisAllocatedToProperty)
    ) {
      throw new Error(
        "Form 7217 Part II partner basis total must equal Part I line 10",
      );
    }
  }
}

class F7217Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f7217";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8949]);

  compute(_ctx: NodeContext, rawInput: Form7217Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    assertForm7217FilingSource(input);
    return {
      outputs: input.form7217s.flatMap((item) => {
        const transaction = section731Form8949Transaction(item);
        return transaction
          ? [this.outputNodes.output(form8949, { transaction })]
          : [];
      }),
    };
  }
}

export const f7217 = new F7217Node();
