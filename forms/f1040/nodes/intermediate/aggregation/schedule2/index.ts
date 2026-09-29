import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { form8978_reporting_year } from "../../worksheets/form8978_reporting_year/index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Schedule 2 receives pre-computed excise/penalty amounts from upstream nodes.
// All fields are optional — any subset may be present on a given return.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

function sumAccumulable(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  return Array.isArray(value)
    ? value.reduce((sum, item) => sum + item, 0)
    : value;
}

export const inputSchema = z.object({
  // Line 2 — Alternative minimum tax (from Form 6251 line 11).
  // IRC §55; 2025 Schedule 2 moved AMT below the line 1 additions.
  line2_amt: z.number().nonnegative().optional(),
  // Line 8 — Additional taxes from Form 5329 (early dist, excess contributions)
  // IRC §72(t), §4973; Form 5329 all parts → Schedule 2 line 8
  line8_form5329_tax: z.number().nonnegative().optional(),
  // Pre-2025 Form 5405 repayment posted to Schedule 2 line 10.
  line10_homebuyer_credit_repayment: z.number().nonnegative().optional(),
  // Only Form 5329 Parts I/II are chapter 1 taxes. The later parts include
  // several different excise-tax sections, not just section 4973, and cannot
  // be included in a Form 8978 chapter 1 offset.
  line8_form5329_chapter1_tax: z.number().nonnegative().optional(),
  // Line 13 — Uncollected SS/Medicare on tips (W-2 Box12 codes A+B)
  uncollected_fica: z.number().nonnegative().optional(),
  // Line 13 — Uncollected SS/Medicare on group-term life ins >$50k (W-2 Box12 codes M+N)
  uncollected_fica_gtl: z.number().nonnegative().optional(),
  // Line 17h — §409A additional chapter 1 income tax on NQDC failure
  // (W-2 Box12 code Z, pre-computed at 20%).
  section409a_excise: z.number().nonnegative().optional(),
  // Line 17h — §409A NQDC additional income tax
  // (1099-MISC box15 × 20%, computed by f1099m).
  line17h_nqdc_tax: z.number().nonnegative().optional(),
  // Line 17k — 20% excise on excess golden parachute payments (W-2 Box12 code K)
  golden_parachute_excise: z.number().nonnegative().optional(),
  // Line 17k — 20% excise on excess golden parachute payments (1099-NEC box3 × 20%)
  line17k_golden_parachute_excise: z.number().nonnegative().optional(),
  // Line 17e — 20% additional tax on taxable Archer MSA distributions (Form 8853 line 9b)
  // IRC §220(f)(4); Form 8853 Part II line 9b → Schedule 2 line 17e
  line17e_archer_msa_tax: z.number().nonnegative().optional(),
  // Line 17f — 50% additional tax on taxable Medicare Advantage MSA distributions (Form 8853 line 13b)
  // IRC §138(c)(2); Form 8853 Section B line 13b → Schedule 2 line 17f
  line17f_medicare_advantage_msa_tax: z.number().nonnegative().optional(),
  // Line 6 — Uncollected SS and Medicare tax on wages (Form 8919 line 13)
  // IRC §3101; Form 8919 line 13 → Schedule 2 line 6
  line6_uncollected_8919: z.number().nonnegative().optional(),
  // Line 17c — 20% additional tax on non-qualified HSA distributions (Form 8889 line 20)
  // IRC §223(f)(4)(A); Form 8889 Part II line 20 → Schedule 2 line 17c
  line17c_hsa_penalty: z.number().nonnegative().optional(),
  // Line 17d — Form 8889 line 21, failure to remain HSA-eligible.
  line17d_hsa_eligibility_tax: z.number().nonnegative().optional(),
  // Line 11 — Additional Medicare Tax (from Form 8959 line 18)
  // IRC §3101(b)(2); Form 8959 line 18 → Schedule 2 line 11
  line11_additional_medicare: z.number().nonnegative().optional(),
  // Line 12 — Net Investment Income Tax (from Form 8960 line 17)
  // IRC §1411; Form 8960 line 17 → Schedule 2 line 12
  line12_niit: z.number().nonnegative().optional(),
  // Line 4 — Self-employment tax (from Schedule SE line 12)
  // IRC §1401; Schedule SE line 12 → Schedule 2 line 4
  line4_se_tax: z.number().nonnegative().optional(),
  // Line 5 — Unreported social security and Medicare tax from Form 4137
  // IRC §3101; Form 4137 line 13 → Schedule 2 line 5
  line5_unreported_tip_tax: z.number().nonnegative().optional(),
  // Line 1a — Excess advance premium tax credit repayment (Form 8962 line 29).
  // IRC §36B(f); 2025 Schedule 2 line 1a.
  line1a_excess_advance_premium: z.number().nonnegative().optional(),
  // Lines 1b and 1c — dealer-transferred clean-vehicle credits that must be
  // repaid when the purchaser does not qualify at filing.
  line1b_new_clean_vehicle_repayment: accumulable(z.number().nonnegative())
    .optional(),
  line1c_prev_owned_clean_vehicle_repayment: accumulable(
    z.number().nonnegative(),
  )
    .optional(),
  // Form 4255 Part I row 2a column (l), row-specific net EPE recapture.
  line1d_form4255_net_epe: z.number().nonnegative().optional(),
  // Form 4255 rows 1d/2a columns (n)(1) and (n)(3), respectively.
  line1e_form4255_excessive_payment: z.number().nonnegative().optional(),
  line1f_form4255_20_percent_ep: z.number().nonnegative().optional(),
  // Line 9 — Household employment taxes (Schedule H line 26).
  // IRC §3510; Schedule H line 26 → Schedule 2 line 9.
  line9_household_employment: z.number().nonnegative().optional(),
  // Line 17a — Recapture of investment credit (Form 4255)
  // IRC §50(a); Form 4255 → Schedule 2 line 17a
  line17a_investment_credit_recapture: z.number().nonnegative().optional(),
  // Line 17a — New Markets Credit recapture under IRC 45D(g), code NMCR.
  line17a_new_markets_credit_recapture: z.number().nonnegative().optional(),
  // Line 17b — Recapture of federal mortgage subsidy (Form 8828).
  line17b_mortgage_subsidy_recapture: z.number().nonnegative().optional(),
  // Line 16 — Recapture of low-income housing credit (Form 8611).
  line16_lihtc_recapture: z.number().nonnegative().optional(),
  // Form 4255 Part I row 1d column (l), separate from line 1d above.
  line19_form4255_net_epe: z.number().nonnegative().optional(),
  // Line 17z — other additional taxes. A negative Form 8978 adjustment may
  // reduce eligible chapter 1 taxes here after its Schedule 3 line 6l cap;
  // a positive Form 8978 line 14 belongs on Form 1040 line 16, not here.
  line17z_other_additional_taxes: z.number().nonnegative().optional(),
  // Form 8621 Part V line 16f interest on prior PFIC-year tax.
  line17p_form8621_interest: z.number().nonnegative().optional(),
  // Line 20 — Section 965 installment (Form 965-A Part II column (k)).
  // Schedule 2 line 21 expressly excludes line 20.
  line20_965_tax_installment: z.number().nonnegative().optional(),
});

type Schedule2Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Line 8: Additional taxes from Form 5329 (early distributions, excess contributions)
// IRC §72(t), §4973; Schedule 2 Line 8
function line8(input: Schedule2Input): number {
  return input.line8_form5329_tax ?? 0;
}

// Line 13: Uncollected SS and Medicare tax on tips and GTL insurance
// IRC §3102(c); Schedule 2 Line 13
function line13(input: Schedule2Input): number {
  return (input.uncollected_fica ?? 0) + (input.uncollected_fica_gtl ?? 0);
}

// Line 17h: §409A additional income tax on failing NQDC plans
// IRC §409A(a)(1)(B); Schedule 2 Line 17h
function line17h(input: Schedule2Input): number {
  return (input.section409a_excise ?? 0) + (input.line17h_nqdc_tax ?? 0);
}

// Line 17k: 20% excise on excess golden parachute payments
// IRC §4999; Schedule 2 Line 17k
function line17k(input: Schedule2Input): number {
  return (input.golden_parachute_excise ?? 0) +
    (input.line17k_golden_parachute_excise ?? 0);
}

function part1Total(input: Schedule2Input): number {
  return (input.line2_amt ?? 0) + (input.line1a_excess_advance_premium ?? 0) +
    sumAccumulable(input.line1b_new_clean_vehicle_repayment) +
    sumAccumulable(input.line1c_prev_owned_clean_vehicle_repayment) +
    (input.line1d_form4255_net_epe ?? 0) +
    (input.line1e_form4255_excessive_payment ?? 0) +
    (input.line1f_form4255_20_percent_ep ?? 0);
}

function part2Total(input: Schedule2Input): number {
  return (input.line4_se_tax ?? 0) +
    (input.line5_unreported_tip_tax ?? 0) +
    (input.line10_homebuyer_credit_repayment ?? 0) +
    line8(input) +
    line13(input) +
    line17h(input) +
    line17k(input) +
    (input.line17e_archer_msa_tax ?? 0) +
    (input.line17f_medicare_advantage_msa_tax ?? 0) +
    (input.line6_uncollected_8919 ?? 0) +
    (input.line17c_hsa_penalty ?? 0) +
    (input.line17d_hsa_eligibility_tax ?? 0) +
    (input.line11_additional_medicare ?? 0) +
    (input.line12_niit ?? 0) +
    (input.line9_household_employment ?? 0) +
    (input.line17a_investment_credit_recapture ?? 0) +
    (input.line17a_new_markets_credit_recapture ?? 0) +
    (input.line17b_mortgage_subsidy_recapture ?? 0) +
    (input.line16_lihtc_recapture ?? 0) +
    (input.line19_form4255_net_epe ?? 0) +
    (input.line17z_other_additional_taxes ?? 0) +
    (input.line17p_form8621_interest ?? 0);
}

function part2Chapter1Tax(input: Schedule2Input): number {
  const form5329Chapter1 = input.line8_form5329_chapter1_tax ?? 0;
  if (form5329Chapter1 > (input.line8_form5329_tax ?? 0)) {
    throw new Error(
      "Form 5329 chapter 1 amount exceeds its Schedule 2 line 8 tax",
    );
  }
  return form5329Chapter1 +
    (input.section409a_excise ?? 0) +
    (input.line17h_nqdc_tax ?? 0) +
    (input.line17e_archer_msa_tax ?? 0) +
    (input.line17f_medicare_advantage_msa_tax ?? 0) +
    (input.line17c_hsa_penalty ?? 0) +
    (input.line17d_hsa_eligibility_tax ?? 0) +
    (input.line17a_investment_credit_recapture ?? 0) +
    (input.line17a_new_markets_credit_recapture ?? 0) +
    (input.line17b_mortgage_subsidy_recapture ?? 0) +
    (input.line16_lihtc_recapture ?? 0);
}

function part2UnclassifiedTax(input: Schedule2Input): number {
  const form5329WithoutBreakdown =
    input.line8_form5329_chapter1_tax === undefined
      ? input.line8_form5329_tax ?? 0
      : 0;
  return form5329WithoutBreakdown +
    (input.line19_form4255_net_epe ?? 0) +
    (input.line17z_other_additional_taxes ?? 0);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Schedule2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule2";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form8978_reporting_year]);

  compute(_ctx: NodeContext, rawInput: Schedule2Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if ((input.line17a_investment_credit_recapture ?? 0) > 0) {
      throw new Error(
        "Schedule 2 generic 3468 recapture requires a specific Form 4255 credit-line source",
      );
    }

    const part1 = part1Total(input);
    const part2 = part2Total(input);
    if (part1 === 0 && part2 === 0) return { outputs: [] };

    const output = part1 > 0 && part2 > 0
      ? this.outputNodes.output(f1040, {
        line17_additional_taxes: part1,
        line23_other_taxes: part2,
        credit_limit_schedule2_line1z: part1 - (input.line2_amt ?? 0),
      })
      : part1 > 0
      ? this.outputNodes.output(f1040, {
        line17_additional_taxes: part1,
        credit_limit_schedule2_line1z: part1 - (input.line2_amt ?? 0),
      })
      : this.outputNodes.output(f1040, {
        line23_other_taxes: part2,
        credit_limit_schedule2_line1z: 0,
      });
    const outputs: NodeOutput[] = [
      output,
      this.outputNodes.output(form8978_reporting_year, {
        schedule2_part1_tax: part1,
        schedule2_part2_tax: part2,
        schedule2_chapter1_part2_tax: part2Chapter1Tax(input),
        schedule2_unclassified_part2_tax: part2UnclassifiedTax(input),
      }),
    ];

    const line1b = sumAccumulable(input.line1b_new_clean_vehicle_repayment);
    const line1c = sumAccumulable(
      input.line1c_prev_owned_clean_vehicle_repayment,
    );
    if (line1b > 0 || line1c > 0) {
      outputs.push({
        nodeType: this.nodeType,
        fields: {
          line1b_new_clean_vehicle_repayment: line1b > 0 ? line1b : undefined,
          line1c_prev_owned_clean_vehicle_repayment: line1c > 0
            ? line1c
            : undefined,
        },
      });
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule2 = new Schedule2Node();
