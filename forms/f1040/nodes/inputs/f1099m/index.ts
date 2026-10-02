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
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { schedule1a } from "../../intermediate/forms/schedule1a/index.ts";
import { scheduleE as schedule_e } from "../schedule_e/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
import { form8960 } from "../../intermediate/forms/form8960/index.ts";
import { form4952 } from "../../intermediate/forms/form4952/index.ts";
import { form8919 } from "../../intermediate/forms/form8919/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ---------------------------------------------------------------------------
// Routing constants
// ---------------------------------------------------------------------------

const RENTS_ROUTING = ["schedule_e", "schedule_c"] as const;
const ROYALTIES_ROUTING = ["schedule_e", "schedule_c"] as const;
const OTHER_INCOME_ROUTING = [
  "prizes_awards",
  "other_income",
  "schedule_c",
  "schedule_f",
  "form_8919",
  "excluded",
] as const;

type RentsRouting = typeof RENTS_ROUTING[number];
type RoyaltiesRouting = typeof ROYALTIES_ROUTING[number];
type OtherIncomeRouting = typeof OTHER_INCOME_ROUTING[number];

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const tinSchema = z.string()
  .regex(
    /^(?:\d{9}|\d{2}-\d{7}|\d{3}-\d{2}-\d{4})$/,
    "TIN must be 9 digits, XX-XXXXXXX, or XXX-XX-XXXX",
  )
  .transform((tin) => tin.replaceAll("-", ""));

export const itemSchema = z.object({
  // Required identifiers
  payer_name: z.string().min(1).max(40),
  payer_tin: tinSchema,
  recipient_tin: tinSchema,
  // Optional identifiers
  account_number: z.string().max(20).optional(),
  multi_form_code: z.number().int().min(1).optional(),
  // Box 1 — Rents
  box1_rents: z.number().nonnegative().optional(),
  box1_rents_routing: z.enum(RENTS_ROUTING).optional(),
  // Box 2 — Royalties
  box2_royalties: z.number().nonnegative().optional(),
  box2_royalties_routing: z.enum(ROYALTIES_ROUTING).optional(),
  // Affirm portfolio investment property, not ordinary-course business or a
  // passive activity. The same box 2 amount is reported on Schedule E.
  box2_nonpassive_portfolio_investment_for_form4952_verified: z.literal(true)
    .optional(),
  // Box 3 — Other income
  box3_other_income: z.number().nonnegative().optional(),
  box3_other_income_routing: z.enum(OTHER_INCOME_ROUTING).optional(),
  box3_other_income_description: z.string().trim().min(1).max(100).optional(),
  qualified_tips_box3_review: z.object({
    amount: z.number().int().positive(),
    occupation_code: z.string().regex(/^\d{3}$/),
    occupation_review_reference: z.string().trim().min(1),
    tip_records_reference: z.string().trim().min(1),
    included_in_box3: z.literal(true),
    no_other_allocable_deductions: z.literal(true),
    no_other_allocable_deductions_review_reference: z.string().trim().min(1),
  }).strict().optional(),
  // When true, box3_other_income is also investment income subject to NIIT (IRC §1411).
  // Use for brokerage-sourced income (e.g., income from terminated investment accounts).
  // Defaults false — prizes, settlements, and other non-investment income are not NII.
  box3_niit_applicable: z.boolean().optional(),
  // Box 4 — Federal withholding
  box4_federal_withheld: z.number().nonnegative().optional(),
  // Box 5 — Fishing boat proceeds → Schedule C
  box5_fishing_boat: z.number().nonnegative().optional(),
  // Box 6 — Medical payments → Schedule C
  box6_medical_payments: z.number().nonnegative().optional(),
  // Box 7 — Direct sales indicator (checkbox — informational only)
  box7_direct_sales: z.boolean().optional(),
  // Box 8 — Substitute payments → Schedule 1 Line 8z
  box8_substitute_payments: z.number().int().nonnegative().optional(),
  // Box 9 — Crop insurance → Schedule F (unless deferred under IRC §451(d))
  box9_crop_insurance: z.number().nonnegative().optional(),
  box9_crop_insurance_deferred: z.boolean().optional(),
  farm_id: z.string().min(1).optional(),
  // Box 10 reports gross proceeds paid to an attorney, including client funds.
  box10_attorney_proceeds: z.number().nonnegative().optional(),
  box10_attorney_fee_receipts: z.number().nonnegative().optional(),
  box10_attorney_client_funds: z.number().nonnegative().optional(),
  box10_attorney_business_reference: z.string().trim().min(1).optional(),
  box10_allocation_review_reference: z.string().trim().min(1).optional(),
  schedule_c_business_reference: z.string().trim().min(1).optional(),
  // Box 11 — Fish purchased → Schedule C
  box11_fish_purchased: z.number().nonnegative().optional(),
  // Box 12 — §409A deferrals (informational only — no current-year income if plan compliant)
  box12_section_409a_deferrals: z.number().nonnegative().optional(),
  // Box 13 — FATCA checkbox (informational only)
  box13_fatca: z.boolean().optional(),
  // Box 14 — Reserved for future use in TY2025 (not accepted)
  // Box 15 — NQDC §409A failure → Schedule 1 Line 8z + Schedule 2 Line 17h
  box15_nqdc: z.number().nonnegative().optional(),
  // Boxes 16–18 — State info only (no federal impact)
  box16_state_tax_withheld: z.number().nonnegative().optional(),
  box17_state_payer_id: z.string().optional(),
  box18_state_income: z.number().nonnegative().optional(),
}).superRefine((item, ctx) => {
  if (
    item.qualified_tips_box3_review &&
    (item.box3_other_income_routing !== "schedule_c" ||
      !item.schedule_c_business_reference ||
      item.box3_niit_applicable === true ||
      item.qualified_tips_box3_review.amount > (item.box3_other_income ?? 0))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["qualified_tips_box3_review"],
      message:
        "1099-MISC qualified tips need non-NIIT Schedule C income included in box 3",
    });
  }
  if ((item.box3_other_income ?? 0) > 0 && !item.box3_other_income_routing) {
    ctx.addIssue({
      code: "custom",
      path: ["box3_other_income_routing"],
      message:
        "Positive 1099-MISC box 3 income requires an explicit income classification",
    });
  }
  if (
    (item.box3_other_income ?? 0) > 0 &&
    item.box3_other_income_routing === "other_income" &&
    !item.box3_other_income_description
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["box3_other_income_description"],
      message:
        "1099-MISC box 3 other income needs a reviewed payment description",
    });
  }
  if (
    (item.box3_other_income ?? 0) > 0 &&
    item.box3_other_income_routing === "schedule_f" && !item.farm_id
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["farm_id"],
      message: "1099-MISC box 3 farm income needs a Schedule F farm reference",
    });
  }
  const grossAttorneyProceeds = item.box10_attorney_proceeds ?? 0;
  if (
    (grossAttorneyProceeds > 0 ||
      item.box10_attorney_fee_receipts !== undefined ||
      item.box10_attorney_client_funds !== undefined) &&
    (grossAttorneyProceeds <= 0 ||
      item.box10_attorney_fee_receipts === undefined ||
      item.box10_attorney_client_funds === undefined ||
      item.box10_attorney_fee_receipts + item.box10_attorney_client_funds !==
        grossAttorneyProceeds)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["box10_attorney_proceeds"],
      message:
        "1099-MISC box 10 needs reviewed fee and client-fund amounts that equal gross proceeds",
    });
  }
  if (
    (item.box10_attorney_fee_receipts ?? 0) > 0 &&
    !item.box10_attorney_business_reference
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["box10_attorney_business_reference"],
      message:
        "1099-MISC box 10 retained fees need a Schedule C business reference",
    });
  }
  if (grossAttorneyProceeds > 0 && !item.box10_allocation_review_reference) {
    ctx.addIssue({
      code: "custom",
      path: ["box10_allocation_review_reference"],
      message: "1099-MISC box 10 allocation needs a reviewed source reference",
    });
  }
  if (
    ((item.box3_other_income_routing === "schedule_c" &&
      (item.box3_other_income ?? 0) > 0) ||
      (item.box1_rents_routing === "schedule_c" &&
        (item.box1_rents ?? 0) > 0) ||
      (item.box2_royalties_routing === "schedule_c" &&
        (item.box2_royalties ?? 0) > 0) ||
      (item.box5_fishing_boat ?? 0) > 0 ||
      (item.box6_medical_payments ?? 0) > 0 ||
      (item.box11_fish_purchased ?? 0) > 0) &&
    !item.schedule_c_business_reference
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["schedule_c_business_reference"],
      message:
        "1099-MISC business receipts need a Schedule C business reference",
    });
  }
});

export const inputSchema = z.object({
  f1099ms: z.array(itemSchema),
});

type M99Item = z.infer<typeof itemSchema>;
type M99Input = z.infer<typeof inputSchema>;

export function assertDistinct1099MCopies(items: readonly M99Item[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.account_number) continue;
    const key = JSON.stringify([
      item.payer_tin,
      item.recipient_tin,
      item.account_number.trim(),
      item.multi_form_code ?? null,
    ]);
    if (seen.has(key)) {
      throw new Error(
        "1099-MISC repeats the same payer, recipient, account, and form code; corrected copies need a reviewed single current row",
      );
    }
    seen.add(key);
  }
}

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

const NQDC_EXCISE_RATE = 0.20;

function totalOf(items: M99Item[], field: keyof M99Item): number {
  return items.reduce(
    (sum, item) => sum + ((item[field] as number | undefined) ?? 0),
    0,
  );
}

function rentalIncomeForScheduleE(items: M99Item[]): number {
  return items
    .filter((i) => (i.box1_rents_routing ?? "schedule_e") === "schedule_e")
    .reduce((s, i) => s + (i.box1_rents ?? 0), 0);
}

function royaltiesForScheduleE(items: M99Item[]): number {
  return items
    .filter((i) => (i.box2_royalties_routing ?? "schedule_e") === "schedule_e")
    .reduce((s, i) => s + (i.box2_royalties ?? 0), 0);
}

function prizesAwardsTotal(items: M99Item[]): number {
  return items
    .filter((i) => i.box3_other_income_routing === "prizes_awards")
    .reduce((s, i) => s + (i.box3_other_income ?? 0), 0);
}

function otherIncomeTotal(items: M99Item[]): number {
  return items
    .filter((i) => i.box3_other_income_routing === "other_income")
    .reduce((s, i) => s + (i.box3_other_income ?? 0), 0);
}

function scheduleCReceiptSources(items: M99Item[]) {
  return items.flatMap((item) => {
    const amounts = [
      [
        "box3_other_income",
        item.box3_other_income_routing === "schedule_c"
          ? item.box3_other_income
          : 0,
      ],
      [
        "box1_rents",
        item.box1_rents_routing === "schedule_c" ? item.box1_rents : 0,
      ],
      [
        "box2_royalties",
        item.box2_royalties_routing === "schedule_c" ? item.box2_royalties : 0,
      ],
      ["box5_fishing_boat", item.box5_fishing_boat],
      ["box6_medical_payments", item.box6_medical_payments],
      ["box11_fish_purchased", item.box11_fish_purchased],
    ] as const;
    return amounts.flatMap(([box, amount]) =>
      (amount ?? 0) > 0
        ? [{
          business_reference: item.schedule_c_business_reference!,
          payer_tin: item.payer_tin,
          recipient_tin: item.recipient_tin,
          box,
          amount: amount!,
        }]
        : []
    );
  });
}

function scheduleEOutput(items: M99Item[]): NodeOutput | null {
  const rental = rentalIncomeForScheduleE(items);
  const royalty = royaltiesForScheduleE(items);
  if (rental <= 0 && royalty <= 0) return null;
  const schedEInput: Partial<z.infer<typeof schedule_e["inputSchema"]>> = {};
  if (rental > 0) schedEInput.rental_income = rental;
  if (royalty > 0) schedEInput.royalty_income = royalty;
  return output(
    schedule_e,
    schedEInput as AtLeastOne<z.infer<typeof schedule_e["inputSchema"]>>,
  );
}

function niitIncomeTotal(items: M99Item[]): number {
  return items
    .filter((i) =>
      i.box3_niit_applicable === true &&
      i.box3_other_income_routing !== "form_8919"
    )
    .reduce((s, i) => s + (i.box3_other_income ?? 0), 0);
}

function schedule1Output(items: M99Item[]): NodeOutput | null {
  const prizes = prizesAwardsTotal(items);
  const other = otherIncomeTotal(items);
  const substitute = totalOf(items, "box8_substitute_payments");
  const nqdc = totalOf(items, "box15_nqdc");

  const s1Input: Partial<z.infer<typeof schedule1["inputSchema"]>> = {};
  if (prizes > 0) s1Input.line8i_prizes_awards = prizes;
  if (other > 0) {
    s1Input.f1099m_box3_other_income_sources = items.flatMap((item) =>
      item.box3_other_income_routing === "other_income" &&
        (item.box3_other_income ?? 0) > 0
        ? [{
          payer_name: item.payer_name,
          payer_tin: item.payer_tin,
          recipient_tin: item.recipient_tin,
          description: item.box3_other_income_description!,
          amount: item.box3_other_income!,
        }]
        : []
    );
  }
  if (substitute > 0) {
    s1Input.line8z_substitute_payments = substitute;
    s1Input.f1099m_box8_substitute_sources = items.flatMap((item) =>
      (item.box8_substitute_payments ?? 0) > 0
        ? [{
          payer_name: item.payer_name,
          payer_tin: item.payer_tin,
          recipient_tin: item.recipient_tin,
          amount: item.box8_substitute_payments!,
        }]
        : []
    );
  }
  if (nqdc > 0) s1Input.line8z_nqdc = nqdc;
  if (Object.keys(s1Input).length === 0) return null;
  return output(
    schedule1,
    s1Input as AtLeastOne<z.infer<typeof schedule1["inputSchema"]>>,
  );
}

// ---------------------------------------------------------------------------
// Node class
// ---------------------------------------------------------------------------

class F1099mNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099m";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_c,
    schedule1a,
    schedule_e,
    schedule_f,
    schedule1,
    schedule2,
    agi_aggregator,
    f1040,
    form8960,
    form4952,
    form8919,
  ]);

  compute(_ctx: NodeContext, input: M99Input): NodeResult {
    const { f1099ms: m99s } = inputSchema.parse(input);
    assertDistinct1099MCopies(m99s);
    if (m99s.length === 0) return { outputs: [] };

    // Direct node callers can bypass inputSchema, so do not silently turn an
    // unidentified box 3 amount into prizes and awards.
    if (
      m99s.some((item) =>
        (item.box3_other_income ?? 0) > 0 && !item.box3_other_income_routing
      )
    ) {
      throw new Error(
        "Positive 1099-MISC box 3 income requires an explicit income classification",
      );
    }

    const outputs: NodeOutput[] = [];

    const portfolioRoyalty = m99s.reduce((total, item) => {
      if (
        item.box2_nonpassive_portfolio_investment_for_form4952_verified !== true
      ) return total;
      const royalty = item.box2_royalties ?? 0;
      if (
        royalty <= 0 ||
        item.box2_royalties_routing === "schedule_c"
      ) {
        throw new Error(
          "1099-MISC Form 4952 portfolio royalty needs positive box 2 income routed to Schedule E",
        );
      }
      return total + royalty;
    }, 0);
    if (portfolioRoyalty > 0) {
      outputs.push(this.outputNodes.output(form4952, {
        source_1099_royalties: portfolioRoyalty,
      }));
    }

    const form8919Sources = m99s.flatMap((item) => {
      const amount = item.box3_other_income ?? 0;
      if (item.box3_other_income_routing !== "form_8919" || amount === 0) {
        return [];
      }
      if (item.box3_niit_applicable === true) {
        throw new Error(
          "1099-MISC wages routed to Form 8919 cannot be NIIT income",
        );
      }
      return [{
        kind: "1099misc" as const,
        recipient_ssn: item.recipient_tin,
        payer_name: item.payer_name,
        payer_tin: item.payer_tin,
        amount,
      }];
    });
    if (form8919Sources.length > 0) {
      outputs.push(this.outputNodes.output(form8919, {
        form1099_sources: form8919Sources,
      }));
    }

    // f1040 line25b — federal withholding (always aggregated)
    const totalWithheld = totalOf(m99s, "box4_federal_withheld");
    if (totalWithheld > 0) {
      outputs.push(
        this.outputNodes.output(f1040, {
          line25b_withheld_1099: totalWithheld,
        }),
      );
    }

    // schedule_e — rents (typical) + royalties (investment)
    const schedE = scheduleEOutput(m99s);
    if (schedE) outputs.push(schedE);

    // schedule_c — fishing boat + medical + fish purchased + rents (substantial services) + royalties (trade/business)
    const miscReceiptSources = scheduleCReceiptSources(m99s);
    const attorneyFeeSources = m99s.flatMap((item) =>
      (item.box10_attorney_fee_receipts ?? 0) > 0
        ? [{
          business_reference: item.box10_attorney_business_reference!,
          payer_tin: item.payer_tin,
          recipient_tin: item.recipient_tin,
          amount: item.box10_attorney_fee_receipts!,
          allocation_review_reference: item.box10_allocation_review_reference!,
        }]
        : []
    );
    if (miscReceiptSources.length > 0 || attorneyFeeSources.length > 0) {
      outputs.push(this.outputNodes.output(schedule_c, {
        ...(miscReceiptSources.length > 0 && {
          f1099m_receipt_sources: miscReceiptSources,
        }),
        ...(attorneyFeeSources.length > 0 && {
          attorney_fee_sources: attorneyFeeSources,
        }),
      } as AtLeastOne<z.infer<typeof schedule_c.inputSchema>>));
    }
    const qualifiedTips = m99s.flatMap((item) =>
      item.qualified_tips_box3_review
        ? [{
          source_form: "1099misc" as const,
          business_reference: item.schedule_c_business_reference!,
          recipient_ssn: item.recipient_tin,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin,
          source_amount: item.box3_other_income!,
          amount: item.qualified_tips_box3_review.amount,
          occupation_code: item.qualified_tips_box3_review.occupation_code,
          occupation_review_reference:
            item.qualified_tips_box3_review.occupation_review_reference,
          tip_records_reference:
            item.qualified_tips_box3_review.tip_records_reference,
          included_in_source_amount:
            item.qualified_tips_box3_review.included_in_box3,
          no_other_allocable_deductions:
            item.qualified_tips_box3_review.no_other_allocable_deductions,
          no_other_allocable_deductions_review_reference:
            item.qualified_tips_box3_review
              .no_other_allocable_deductions_review_reference,
        }]
        : []
    );
    if (qualifiedTips.length > 0) {
      outputs.push(this.outputNodes.output(schedule1a, {
        qualified_trade_business_tips: qualifiedTips,
      }));
    }

    // schedule1 — prizes, other income, substitute payments, NQDC ordinary income
    const sched1 = schedule1Output(m99s);
    if (sched1) outputs.push(sched1);

    // Schedule 1 is a print-only sink, so the same classified income must
    // reach AGI without collapsing line 8i prizes into line 8z other income.
    const prizes = prizesAwardsTotal(m99s);
    const substitute = totalOf(m99s, "box8_substitute_payments");
    const nqdc = totalOf(m99s, "box15_nqdc");
    const other = otherIncomeTotal(m99s);
    const agiIncome = {
      ...(prizes > 0 ? { line8i_prizes_awards: prizes } : {}),
      ...(substitute > 0 ? { line8z_substitute_payments: substitute } : {}),
      ...(nqdc > 0 ? { line8z_nqdc: nqdc } : {}),
      ...(other > 0 ? { line8z_f1099m_box3_other: other } : {}),
    };
    if (prizes > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        ...agiIncome,
        line8i_prizes_awards: prizes,
      }));
    } else if (substitute > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        ...agiIncome,
        line8z_substitute_payments: substitute,
      }));
    } else if (nqdc > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        ...agiIncome,
        line8z_nqdc: nqdc,
      }));
    } else if (other > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        line8z_f1099m_box3_other: other,
      }));
    }

    // Schedule F line 6a shows received proceeds even when tax is deferred.
    const farmCropSources = m99s.flatMap((item) => {
      const amount = item.box9_crop_insurance ?? 0;
      if (amount === 0) return [];
      if (!item.farm_id) {
        throw new Error("1099-MISC crop insurance requires farm_id");
      }
      return [{
        farm_id: item.farm_id,
        kind: "1099m_crop_insurance" as const,
        amount,
        ...(item.box9_crop_insurance_deferred === true
          ? { deferred: true }
          : {}),
      }];
    });
    const farmBox3Sources = m99s.flatMap((item) =>
      item.box3_other_income_routing === "schedule_f" &&
        (item.box3_other_income ?? 0) > 0
        ? [{
          farm_id: item.farm_id!,
          kind: "1099m_box3_other_income" as const,
          amount: item.box3_other_income!,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin,
          recipient_tin: item.recipient_tin,
        }]
        : []
    );
    if (farmCropSources.length > 0 || farmBox3Sources.length > 0) {
      outputs.push(
        this.outputNodes.output(schedule_f, {
          farm_sources: [...farmCropSources, ...farmBox3Sources],
        }),
      );
    }

    // schedule2 — §409A excise tax (20% of NQDC includible amount)
    const totalNqdc = totalOf(m99s, "box15_nqdc");
    if (totalNqdc > 0) {
      outputs.push(
        this.outputNodes.output(schedule2, {
          line17h_nqdc_tax: totalNqdc * NQDC_EXCISE_RATE,
        }),
      );
    }

    // Form 8960 line 7 includes substitute payments and box 3 income explicitly
    // classified as investment income (IRC §1411).
    const totalNiit = niitIncomeTotal(m99s);
    if (totalNiit > 0) {
      outputs.push(
        this.outputNodes.output(form8960, {
          line7_other_modifications: totalNiit,
        }),
      );
    }

    return { outputs };
  }
}

export const f1099m = new F1099mNode();
