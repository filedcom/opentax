import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule_d } from "../../aggregation/schedule_d/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { allocateOtherPassivePrior4797, form8582 } from "../form8582/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { normalizeArray } from "../../../utils.ts";
import { form8949, Form8949Part } from "../form8949/index.ts";
import {
  calculateInvestment1245Disposition,
  investment1245DispositionSchema,
} from "./investment_1245.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 4797 accepts pre-computed amounts from Drake screen 4797 and from
// schedule_e (disposed_properties indicator). The engine does not re-derive
// per-line recapture arithmetic — that computation happens outside and the
// results are passed in as the appropriate aggregates.

export const k1Section1231RowSchema = z.object({
  source: z.enum(["partnership", "s_corp"]),
  entity_name: z.string().min(1),
  gain_loss: z.number(),
}).strict();
export type K1Section1231Row = z.infer<typeof k1Section1231RowSchema>;

// Source transactions for a Schedule E passive activity. This deliberately
// describes only direct, no-recapture sales on Form 4797 lines 2 and 10;
// Part III recapture needs its own property-level calculation.
export const passivePropertySaleSchema = z.object({
  activity_id: z.string().trim().min(1).max(64),
  activity_name: z.string().min(1),
  part: z.enum(["I", "II"]),
  property_description: z.string().min(1),
  acquired_on: z.string().date(),
  sold_on: z.string().date(),
  gross_sales_price: z.number().int().nonnegative(),
  cost_or_other_basis: z.number().int().nonnegative(),
  depreciation_allowed: z.literal(0),
  // A complete disposition has separate §469(g) release rules. The mixed
  // current-gain/PAL path below is for a retained passive activity only.
  entire_activity_interest_disposed: z.boolean().optional(),
  buyer_unrelated: z.boolean().optional(),
  fully_taxable: z.boolean().optional(),
  installment_method: z.boolean().optional(),
  disposition_document_reference: z.string().trim().min(1).optional(),
}).strict().superRefine((sale, ctx) => {
  const gain = sale.gross_sales_price - sale.cost_or_other_basis;
  const acquired = new Date(`${sale.acquired_on}T00:00:00Z`);
  const anniversary = new Date(Date.UTC(
    acquired.getUTCFullYear() + 1,
    acquired.getUTCMonth(),
    acquired.getUTCDate(),
  ));
  const sold = new Date(`${sale.sold_on}T00:00:00Z`);
  if (
    sale.sold_on < "2025-01-01" || sale.sold_on > "2025-12-31" ||
    sold <= acquired ||
    (sale.part === "I" && sold <= anniversary) ||
    (sale.part === "II" && sold > anniversary) ||
    !Number.isSafeInteger(gain) || gain <= 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 4797 passive sale needs a positive 2025 gain and the holding period for its part",
    });
  }
});
export type PassivePropertySale = z.infer<typeof passivePropertySaleSchema>;

export function passiveSaleGain(sale: PassivePropertySale): number {
  return sale.gross_sales_price - sale.cost_or_other_basis;
}

export function samePassiveSale(
  left: PassivePropertySale,
  right: PassivePropertySale,
): boolean {
  return left.activity_id === right.activity_id &&
    left.activity_name === right.activity_name &&
    left.part === right.part &&
    left.property_description === right.property_description &&
    left.acquired_on === right.acquired_on &&
    left.sold_on === right.sold_on &&
    left.gross_sales_price === right.gross_sales_price &&
    left.cost_or_other_basis === right.cost_or_other_basis &&
    left.depreciation_allowed === right.depreciation_allowed &&
    left.entire_activity_interest_disposed ===
      right.entire_activity_interest_disposed &&
    left.buyer_unrelated === right.buyer_unrelated &&
    left.fully_taxable === right.fully_taxable &&
    left.installment_method === right.installment_method &&
    left.disposition_document_reference ===
      right.disposition_document_reference;
}

/** The only complete-disposition sale currently supported is a single,
 * direct, fully taxable no-recapture transaction. The Schedule E source must
 * separately establish that all of the activity's interests were sold. */
export function isQualifiedEntireSale(sale: PassivePropertySale): boolean {
  return sale.entire_activity_interest_disposed === true &&
    sale.buyer_unrelated === true &&
    sale.fully_taxable === true &&
    sale.installment_method === false &&
    !!sale.disposition_document_reference;
}

export const inputSchema = z.object({
  // Indicator from schedule_e: count of rental properties marked disposed_of=true.
  // Does not drive computation on its own — actual sale data must also be present.
  disposed_properties: z.number().int().nonnegative().optional(),

  // Part I — Section 1231 net gain or loss (Form 4797, line 7 / line 9 after
  // nonrecaptured §1231 loss recapture). Positive = net §1231 gain before
  // prior-loss offset. Negative = net §1231 LOSS treated as ordinary income
  // under IRC §1231(a)(2) — NOT routed to Schedule D.
  section_1231_gain: z.union([z.number(), z.array(z.number())]).optional(),
  // Part I line 4 source, included in section_1231_gain rather than added to it.
  gain_form6252: z.number().nonnegative().optional(),
  // Part I line 5 source, included in section_1231_gain.
  gain_form8824: z.number().nonnegative().optional(),
  // Form 4797 Part I line 2, one source row per Schedule K-1.
  k1_1231_rows: z.array(k1Section1231RowSchema).optional(),
  passive_property_sales: z.array(passivePropertySaleSchema).optional(),
  passive_activity_sources: form8582.inputSchema.shape.activities,
  passive_disposed_activity_ids: z.array(z.string().trim().min(1).max(64))
    .optional(),
  investment_1245_dispositions: z.array(investment1245DispositionSchema)
    .min(1).max(4).optional(),

  // Part I line 8 — prior-year nonrecaptured §1231 losses that must be
  // recaptured as ordinary income before any remaining §1231 gain is treated
  // as long-term capital gain. Always entered as a non-negative value.
  nonrecaptured_1231_loss: z.number().nonnegative().optional(),

  // Additional ordinary gain or loss whose source-line breakdown is not yet
  // supplied. The MeF builder rejects a nonzero aggregate because it cannot
  // assign it to Part II lines 10 through 16 without those source facts.
  ordinary_gain: z.number().optional(),

  // Source-specific amounts. The Form 6252 line 12 recapture requires Form
  // 4797 Part III property detail in MeF, not the line 15 installment amount.
  ordinary_gain_form4684: z.number().optional(),
  recapture_form6252: z.number().nonnegative().optional(),

  // Informational — §1245 depreciation recapture (Part III, line 25).
  // Included in ordinary_gain; retained for audit trail.
  recapture_1245: z.number().nonnegative().optional(),

  // Informational — §1250 additional depreciation recapture (Part III, line 26).
  // Included in ordinary_gain; retained for audit trail.
  recapture_1250: z.number().nonnegative().optional(),

  // Unrecaptured §1250 gain from the Unrecaptured §1250 Gain Worksheet.
  // This is the portion of §1250 gain subject to the 25% rate (IRC §1(h)(1)(D))
  // — distinct from recapture_1250 (which is ordinary income already in ordinary_gain).
  // Routes to Schedule D line 19 → income_tax_calculation for 25% rate tier.
  unrecaptured_section_1250_gain: z.number().nonnegative().optional(),
});

type Form4797Input = z.infer<typeof inputSchema>;

function activeRentalMixedSale(input: Form4797Input): boolean {
  const sales = input.passive_property_sales ?? [];
  const activities = input.passive_activity_sources ?? [];
  if (
    !sales.length ||
    !activities.some((activity) =>
      activity.activity_type === "A" &&
      (activity.prior_unallowed_4797_part1 > 0 ||
        activity.prior_unallowed_4797_part2 > 0)
    )
  ) return false;
  const activity = activities[0];
  if (
    activities.length !== 1 || activity.activity_type !== "A" ||
    activity.prior_active_participation !== true ||
    activity.reporting_form !== "schedule_e" ||
    sales.some((sale) =>
      sale.activity_id !== activity.activity_id ||
      sale.activity_name !== activity.name ||
      sale.entire_activity_interest_disposed !== false ||
      !(input.passive_disposed_activity_ids ?? []).includes(
        sale.activity_id,
      )
    ) ||
    (input.nonrecaptured_1231_loss ?? 0) !== 0 ||
    (input.unrecaptured_section_1250_gain ?? 0) !== 0
  ) {
    throw new Error(
      "Form 4797 active-rental PAL sale needs one retained, linked Schedule E activity with prior active participation and no separate recapture",
    );
  }
  return true;
}

function mixedPassiveAllocation(input: Form4797Input) {
  const sales = input.passive_property_sales ?? [];
  const activities = input.passive_activity_sources ?? [];
  const hasPrior4797 = activities.some((activity) =>
    activity.prior_unallowed_4797_part1 > 0 ||
    activity.prior_unallowed_4797_part2 > 0
  );
  if (sales.length === 0 || !hasPrior4797) return undefined;
  if (
    activities.length === 0 ||
    activities.some((activity) => activity.activity_type !== "B") ||
    new Set(activities.map((activity) => activity.activity_id)).size !==
      activities.length ||
    sales.some((sale) =>
      sale.entire_activity_interest_disposed !== false ||
      activities.filter((activity) =>
          activity.activity_id === sale.activity_id &&
          activity.name === sale.activity_name
        ).length !== 1 ||
      !(input.passive_disposed_activity_ids ?? []).includes(
        sale.activity_id,
      )
    )
  ) {
    throw new Error(
      "Form 4797 mixed passive gain and prior PAL needs one retained other-passive Schedule E activity per sale",
    );
  }
  const currentSales = sales.map((sale) => ({
    activity_id: sale.activity_id,
    activity_name: sale.activity_name,
    part: sale.part,
    gain: passiveSaleGain(sale),
  }));
  const currentIncome = activities.reduce(
    (sum, activity) => sum + Math.max(0, activity.current_net),
    0,
  );
  const currentLoss = activities.reduce(
    (sum, activity) => sum + Math.max(0, -activity.current_net),
    0,
  );
  const priorUnallowed = activities.reduce(
    (sum, activity) =>
      sum + activity.prior_unallowed_operating +
      activity.prior_unallowed_4797_part1 +
      activity.prior_unallowed_4797_part2,
    0,
  );
  return allocateOtherPassivePrior4797(form8582.inputSchema.parse({
    activities,
    current_income: currentIncome,
    current_loss: currentLoss,
    prior_unallowed: priorUnallowed,
    has_other_passive: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: currentSales,
  }));
}

function totalSection1231(input: Form4797Input): number {
  return normalizeArray(input.section_1231_gain).reduce(
    (sum, gain) => sum + gain,
    0,
  ) + (input.passive_property_sales ?? []).filter((sale) =>
    sale.part === "I"
  ).reduce((sum, sale) => sum + passiveSaleGain(sale), 0);
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns true if the input contains any computable sale data.
function hasSaleData(input: Form4797Input): boolean {
  return (
    totalSection1231(input) !== 0 ||
    (input.passive_property_sales?.length ?? 0) > 0 ||
    (input.k1_1231_rows?.length ?? 0) > 0 ||
    (input.ordinary_gain !== undefined && input.ordinary_gain !== 0) ||
    (input.ordinary_gain_form4684 !== undefined &&
      input.ordinary_gain_form4684 !== 0) ||
    (input.recapture_form6252 !== undefined && input.recapture_form6252 !== 0)
  );
}

// Compute the amount of §1231 gain recaptured as ordinary income under IRC
// §1231(c) due to prior-year nonrecaptured §1231 losses (Part I, line 8).
// Returns the lesser of the gross §1231 gain or the prior loss balance.
// Only applies when the gross gain is positive.
function recapturedAsOrdinary(grossGain: number, priorLoss: number): number {
  if (grossGain <= 0 || priorLoss <= 0) return 0;
  return Math.min(grossGain, priorLoss);
}

// Compute the net §1231 gain that flows to Schedule D line 11 as a long-term
// capital gain. Returns 0 when the entire gain is recaptured as ordinary income
// or when the gross gain is non-positive.
function netSection1231GainForScheduleD(
  grossGain: number,
  priorLoss: number,
): number {
  if (grossGain <= 0) return 0;
  return Math.max(0, grossGain - priorLoss);
}

// Build Schedule D output for Part I §1231 net gain only.
// A positive net gain (after prior loss recapture) flows to Sch D line 11.
// A §1231 LOSS is ordinary income per IRC §1231(a)(2) — NOT routed here.
function scheduleDOutput(
  grossGain: number,
  priorLoss: number,
): NodeOutput | null {
  if (grossGain <= 0) return null;
  const ltGain = netSection1231GainForScheduleD(grossGain, priorLoss);
  if (ltGain === 0) return null;
  return output(schedule_d, { line_11_form2439: ltGain });
}

// Compute total ordinary income/loss for Schedule 1 and agi_aggregator.
// Two sources:
//   1. §1231 net LOSS — fully ordinary per IRC §1231(a)(2)
//   2. Portion of §1231 net GAIN recaptured as ordinary (prior §1231 loss rule)
//   3. Part II net ordinary gain or loss
function ordinaryAmount(
  grossGain: number,
  priorLoss: number,
  ordinaryGain: number,
): number {
  if (grossGain < 0) {
    // Net §1231 loss: treated as ordinary under IRC §1231(a)(2)
    return grossGain + ordinaryGain;
  }
  // Net §1231 gain: only the recaptured portion is ordinary here
  return recapturedAsOrdinary(grossGain, priorLoss) + ordinaryGain;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form4797IntermediateNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4797";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_d,
    schedule1,
    agi_aggregator,
    form8582,
    form8949,
  ]);

  compute(_ctx: NodeContext, rawInput: Form4797Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const investmentSales = input.investment_1245_dispositions ?? [];
    if (investmentSales.length > 0) {
      if (
        new Set(investmentSales.map((sale) => sale.property_id)).size !==
          investmentSales.length ||
        Object.entries(input).some(([key, value]) =>
          key !== "investment_1245_dispositions" && value !== undefined &&
          (Array.isArray(value) ? value.length > 0 : value !== 0)
        )
      ) {
        throw new Error(
          "Form 4797 investment section 1245 dispositions need distinct properties and no overlapping aggregate or passive source",
        );
      }
      const calculated = investmentSales.map(
        calculateInvestment1245Disposition,
      );
      const ordinary = calculated.reduce(
        (total, sale) => total + sale.ordinaryRecapture,
        0,
      );
      return {
        outputs: [
          output(schedule1, { line4_other_gains: ordinary }),
          output(agi_aggregator, { line4_other_gains: ordinary }),
          ...calculated.filter((sale) => sale.excessCapitalGain > 0).map((
            sale,
          ) =>
            output(form8949, {
              transaction: {
                part: Form8949Part.F,
                description: "From Form 4797",
                source_transaction_id: sale.sale.property_id,
                form4797_property_id: sale.sale.property_id,
                from_form4797_investment_1245: true,
                date_acquired: "",
                date_sold: "",
                proceeds: sale.excessCapitalGain,
                cost_basis: 0,
                gain_loss: sale.excessCapitalGain,
                is_long_term: true,
              },
            })
          ),
        ],
      };
    }
    const passiveSales = input.passive_property_sales ?? [];
    const entireSale = passiveSales.find((sale) =>
      sale.entire_activity_interest_disposed === true
    );
    if (
      entireSale && (
        passiveSales.length !== 1 || !isQualifiedEntireSale(entireSale) ||
        entireSale.part !== "II" ||
        (input.passive_activity_sources?.length ?? 0) > 1 ||
        input.passive_activity_sources?.some((activity) =>
          activity.activity_id !== entireSale.activity_id ||
          activity.name !== entireSale.activity_name ||
          activity.activity_type !== "B" ||
          (activity.prior_unallowed_operating <= 0 &&
            !(activity.prior_unallowed_operating === 0 &&
              activity.current_net < 0 &&
              activity.prior_year_8582_source === undefined &&
              activity.prior_unallowed_4797_part1 === 0 &&
              activity.prior_unallowed_4797_part2 === 0 &&
              activity.first_year_activity_source?.activity_acquired_on ===
                entireSale.acquired_on &&
              activity.first_year_activity_source?.activity_id ===
                entireSale.activity_id &&
              activity.first_year_activity_source?.activity_name ===
                entireSale.activity_name &&
              entireSale.acquired_on >= "2025-01-01" &&
              entireSale.acquired_on <= "2025-12-31")) ||
          activity.prior_unallowed_4797_part1 !== 0 ||
          activity.prior_unallowed_4797_part2 !== 0
        ) ||
        input.passive_disposed_activity_ids?.length !== 1 ||
        input.passive_disposed_activity_ids[0] !== entireSale.activity_id
      )
    ) {
      throw new Error(
        "Form 4797 entire passive disposition needs one fully taxable unrelated-party Part II sale and its Schedule E source",
      );
    }
    if (
      new Set(passiveSales.map((sale) => JSON.stringify(sale))).size !==
        passiveSales.length
    ) {
      throw new Error("Form 4797 duplicate passive property sale source");
    }

    // The aggregate legacy amounts cannot be reconciled to these property
    // rows, so never allow them to describe the same Form 4797 part.
    if (
      (input.passive_property_sales ?? []).some((sale) => sale.part === "I") &&
      (input.section_1231_gain !== undefined ||
        input.gain_form6252 !== undefined ||
        input.gain_form8824 !== undefined ||
        (input.k1_1231_rows?.length ?? 0) > 0)
    ) {
      throw new Error(
        "Form 4797 passive Part I sales cannot overlap aggregate Part I sources",
      );
    }
    if (
      (input.passive_property_sales ?? []).some((sale) => sale.part === "II") &&
      (input.ordinary_gain !== undefined ||
        input.ordinary_gain_form4684 !== undefined ||
        input.recapture_form6252 !== undefined)
    ) {
      throw new Error(
        "Form 4797 passive Part II sales cannot overlap aggregate Part II sources",
      );
    }

    if (!hasSaleData(input)) {
      return { outputs: [] };
    }

    const activeRentalSale = activeRentalMixedSale(input);
    const allocation = activeRentalSale
      ? undefined
      : mixedPassiveAllocation(input);
    const saleGains = passiveSales.map((sale) => ({
      activity_id: sale.activity_id,
      activity_name: sale.activity_name,
      part: sale.part,
      gain: passiveSaleGain(sale),
      ...(sale.entire_activity_interest_disposed !== undefined
        ? {
          entire_activity_interest_disposed:
            sale.entire_activity_interest_disposed,
        }
        : {}),
    }));

    const grossGain = totalSection1231(input) -
      (allocation?.allowedPartI ?? 0);
    const priorLoss = input.nonrecaptured_1231_loss ?? 0;
    const partIIOrdinaryGain = (input.ordinary_gain ?? 0) +
      (input.ordinary_gain_form4684 ?? 0) +
      (input.recapture_form6252 ?? 0) +
      (input.passive_property_sales ?? []).filter((sale) => sale.part === "II")
        .reduce((sum, sale) => sum + passiveSaleGain(sale), 0) -
      (allocation?.allowedPartII ?? 0);
    const unrecaptured1250 = input.unrecaptured_section_1250_gain ?? 0;

    const outputs: NodeOutput[] = [];
    if (activeRentalSale) {
      outputs.push(output(form8582, {
        has_current_4797_transaction: true,
        current_4797_sale_gains: saleGains,
      }));
      outputs.push(output(schedule_d, {
        pending_active_4797: true,
        line_11_form2439: grossGain,
      }));
      outputs.push(output(agi_aggregator, {
        pal_pending_active_4797: true,
        pal_current_4797_gain: saleGains.reduce(
          (sum, sale) => sum + sale.gain,
          0,
        ),
        line4_other_gains: partIIOrdinaryGain,
      }));
      return { outputs };
    }
    if (!entireSale || (input.passive_activity_sources?.length ?? 0) === 1) {
      outputs.push(output(form8582, {
        has_current_4797_transaction: true,
        ...(saleGains.length > 0 ? { current_4797_sale_gains: saleGains } : {}),
      }));
    }
    if (
      saleGains.length > 0 &&
      (!entireSale || (input.passive_activity_sources?.length ?? 0) === 1)
    ) {
      outputs.push(output(agi_aggregator, {
        pal_current_4797_gain: saleGains.reduce(
          (sum, sale) => sum + sale.gain,
          0,
        ),
        ...(allocation
          ? {
            pal_4797_preapplied_loss: allocation.allowedPartI +
              allocation.allowedPartII,
          }
          : {}),
      }));
    }

    // Schedule D: §1231 net gain → LT capital gain (line 11)
    const sdOut = scheduleDOutput(grossGain, priorLoss);
    if (sdOut !== null) outputs.push(sdOut);

    // Schedule 1 / AGI: §1231 net loss (ordinary) + recaptured gain + Part II
    const ordinary = ordinaryAmount(grossGain, priorLoss, partIIOrdinaryGain);
    if (ordinary !== 0) {
      outputs.push(output(schedule1, { line4_other_gains: ordinary }));
      outputs.push(output(agi_aggregator, { line4_other_gains: ordinary }));
    }

    // Unrecaptured §1250 gain → Schedule D line 19 → 25% rate tier in QDCGT worksheet
    // IRC §1(h)(1)(D); Form 4797 / Unrecaptured §1250 Gain Worksheet
    if (unrecaptured1250 > 0) {
      outputs.push(
        output(schedule_d, { line19_unrecaptured_1250: unrecaptured1250 }),
      );
    }

    if (Array.isArray(input.section_1231_gain)) {
      outputs.push({
        nodeType: this.nodeType,
        fields: { section_1231_gain: grossGain },
      });
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form4797 = new Form4797IntermediateNode();
