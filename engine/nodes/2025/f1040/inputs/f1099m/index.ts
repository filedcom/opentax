import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/schedule2/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { scheduleE as schedule_e } from "../schedule_e/index.ts";
import { schedule_f } from "../../intermediate/schedule_f/index.ts";

// ---------------------------------------------------------------------------
// Routing constants
// ---------------------------------------------------------------------------

const RENTS_ROUTING = ["schedule_e", "schedule_c"] as const;
const ROYALTIES_ROUTING = ["schedule_e", "schedule_c"] as const;
const OTHER_INCOME_ROUTING = ["prizes_awards", "other_income", "excluded"] as const;

type RentsRouting = typeof RENTS_ROUTING[number];
type RoyaltiesRouting = typeof ROYALTIES_ROUTING[number];
type OtherIncomeRouting = typeof OTHER_INCOME_ROUTING[number];

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const itemSchema = z.object({
  // Required identifiers
  payer_name: z.string().min(1).max(40),
  payer_tin: z.string().regex(/^\d{9}$/),
  recipient_tin: z.string().regex(/^\d{9}$/),
  // Optional identifiers
  account_number: z.string().max(20).optional(),
  multi_form_code: z.number().int().min(1).optional(),
  // Box 1 — Rents
  box1_rents: z.number().nonnegative().optional(),
  box1_rents_routing: z.enum(RENTS_ROUTING).optional(),
  // Box 2 — Royalties
  box2_royalties: z.number().nonnegative().optional(),
  box2_royalties_routing: z.enum(ROYALTIES_ROUTING).optional(),
  // Box 3 — Other income
  box3_other_income: z.number().nonnegative().optional(),
  box3_other_income_routing: z.enum(OTHER_INCOME_ROUTING).optional(),
  // Box 4 — Federal withholding
  box4_federal_withheld: z.number().nonnegative().optional(),
  // Box 5 — Fishing boat proceeds → Schedule C
  box5_fishing_boat: z.number().nonnegative().optional(),
  // Box 6 — Medical payments → Schedule C
  box6_medical_payments: z.number().nonnegative().optional(),
  // Box 7 — Direct sales indicator (checkbox — informational only)
  box7_direct_sales: z.boolean().optional(),
  // Box 8 — Substitute payments → Schedule 1 Line 8z
  box8_substitute_payments: z.number().nonnegative().optional(),
  // Box 9 — Crop insurance → Schedule F (unless deferred under IRC §451(d))
  box9_crop_insurance: z.number().nonnegative().optional(),
  box9_crop_insurance_deferred: z.boolean().optional(),
  // Box 10 — Attorney proceeds → Schedule 1 Line 8z (unless physical injury IRC §104)
  box10_attorney_proceeds: z.number().nonnegative().optional(),
  box10_attorney_taxable: z.boolean().optional(), // defaults true; false = excluded
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
});

export const inputSchema = z.object({
  f1099ms: z.array(itemSchema),
});

type M99Item = z.infer<typeof itemSchema>;
type M99Input = z.infer<typeof inputSchema>;

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

const NQDC_EXCISE_RATE = 0.20;

function totalOf(items: M99Item[], field: keyof M99Item): number {
  return items.reduce((sum, item) => sum + ((item[field] as number | undefined) ?? 0), 0);
}

function rentalIncomeForScheduleE(items: M99Item[]): number {
  return items
    .filter((i) => (i.box1_rents_routing ?? "schedule_e") === "schedule_e")
    .reduce((s, i) => s + (i.box1_rents ?? 0), 0);
}

function rentalIncomeForScheduleC(items: M99Item[]): number {
  return items
    .filter((i) => i.box1_rents_routing === "schedule_c")
    .reduce((s, i) => s + (i.box1_rents ?? 0), 0);
}

function royaltiesForScheduleE(items: M99Item[]): number {
  return items
    .filter((i) => (i.box2_royalties_routing ?? "schedule_e") === "schedule_e")
    .reduce((s, i) => s + (i.box2_royalties ?? 0), 0);
}

function royaltiesForScheduleC(items: M99Item[]): number {
  return items
    .filter((i) => i.box2_royalties_routing === "schedule_c")
    .reduce((s, i) => s + (i.box2_royalties ?? 0), 0);
}

function prizesAwardsTotal(items: M99Item[]): number {
  return items
    .filter((i) => (i.box3_other_income_routing ?? "prizes_awards") === "prizes_awards")
    .reduce((s, i) => s + (i.box3_other_income ?? 0), 0);
}

function otherIncomeTotal(items: M99Item[]): number {
  return items
    .filter((i) => i.box3_other_income_routing === "other_income")
    .reduce((s, i) => s + (i.box3_other_income ?? 0), 0);
}

function cropInsuranceTotal(items: M99Item[]): number {
  return items
    .filter((i) => !i.box9_crop_insurance_deferred)
    .reduce((s, i) => s + (i.box9_crop_insurance ?? 0), 0);
}

function taxableAttorneyTotal(items: M99Item[]): number {
  return items
    .filter((i) => i.box10_attorney_taxable !== false)
    .reduce((s, i) => s + (i.box10_attorney_proceeds ?? 0), 0);
}

function scheduleCGrossReceipts(items: M99Item[]): number {
  return (
    totalOf(items, "box5_fishing_boat") +
    totalOf(items, "box6_medical_payments") +
    totalOf(items, "box11_fish_purchased") +
    rentalIncomeForScheduleC(items) +
    royaltiesForScheduleC(items)
  );
}

function scheduleEOutput(items: M99Item[]): NodeOutput | null {
  const rental = rentalIncomeForScheduleE(items);
  const royalty = royaltiesForScheduleE(items);
  const schedEInput: Record<string, number> = {};
  if (rental > 0) schedEInput.rental_income = rental;
  if (royalty > 0) schedEInput.royalty_income = royalty;
  if (Object.keys(schedEInput).length === 0) return null;
  return output(schedule_e, schedEInput);
}

function schedule1Output(items: M99Item[]): NodeOutput | null {
  const prizes = prizesAwardsTotal(items);
  const other = otherIncomeTotal(items);
  const substitute = totalOf(items, "box8_substitute_payments");
  const attorney = taxableAttorneyTotal(items);
  const nqdc = totalOf(items, "box15_nqdc");

  const s1Input: Record<string, number> = {};
  if (prizes > 0) s1Input.line8i_prizes_awards = prizes;
  if (other > 0) s1Input.line8z_other = other;
  if (substitute > 0) s1Input.line8z_substitute_payments = substitute;
  if (attorney > 0) s1Input.line8z_attorney_proceeds = attorney;
  if (nqdc > 0) s1Input.line8z_nqdc = nqdc;
  if (Object.keys(s1Input).length === 0) return null;
  return output(schedule1, s1Input);
}

// ---------------------------------------------------------------------------
// Node class
// ---------------------------------------------------------------------------

class F1099mNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099m";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_c,
    schedule_e,
    schedule_f,
    schedule1,
    schedule2,
    f1040,
  ]);

  compute(input: M99Input): NodeResult {
    const { f1099ms: m99s } = input;
    if (m99s.length === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [];

    // f1040 line25b — federal withholding (always aggregated)
    const totalWithheld = totalOf(m99s, "box4_federal_withheld");
    if (totalWithheld > 0) {
      outputs.push(output(f1040, { line25b_withheld_1099: totalWithheld }));
    }

    // schedule_e — rents (typical) + royalties (investment)
    const schedE = scheduleEOutput(m99s);
    if (schedE) outputs.push(schedE);

    // schedule_c — fishing boat + medical + fish purchased + rents (substantial services) + royalties (trade/business)
    const totalScheduleC = scheduleCGrossReceipts(m99s);
    if (totalScheduleC > 0) {
      outputs.push(output(schedule_c, { line1_gross_receipts: totalScheduleC }));
    }

    // schedule1 — prizes, other income, substitute payments, attorney proceeds, NQDC ordinary income
    const sched1 = schedule1Output(m99s);
    if (sched1) outputs.push(sched1);

    // schedule_f — crop insurance (non-deferred only)
    const totalCropInsurance = cropInsuranceTotal(m99s);
    if (totalCropInsurance > 0) {
      outputs.push(output(schedule_f, { crop_insurance: totalCropInsurance }));
    }

    // schedule2 — §409A excise tax (20% of NQDC includible amount)
    const totalNqdc = totalOf(m99s, "box15_nqdc");
    if (totalNqdc > 0) {
      outputs.push(output(schedule2, { line17h_nqdc_tax: totalNqdc * NQDC_EXCISE_RATE }));
    }

    return { outputs };
  }
}

export const f1099m = new F1099mNode();
