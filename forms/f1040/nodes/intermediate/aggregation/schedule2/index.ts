import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Schedule 2 receives pre-computed excise/penalty amounts from upstream nodes.
// All fields are optional — any subset may be present on a given return.
export const inputSchema = z.object({
  // Line 1 — Alternative Minimum Tax (from Form 6251 line 11)
  // IRC §55; Form 6251 line 11 → Schedule 2 line 1
  line1_amt: z.number().nonnegative().optional(),
  // Line 8 — Additional taxes from Form 5329 (early dist, excess contributions)
  // IRC §72(t), §4973; Form 5329 all parts → Schedule 2 line 8
  line8_form5329_tax: z.number().nonnegative().optional(),
  // Line 13 — Uncollected SS/Medicare on tips (W-2 Box12 codes A+B)
  uncollected_fica: z.number().nonnegative().optional(),
  // Line 13 — Uncollected SS/Medicare on group-term life ins >$50k (W-2 Box12 codes M+N)
  uncollected_fica_gtl: z.number().nonnegative().optional(),
  // Line 17h — §409A excise on NQDC failure (W-2 Box12 code Z, pre-computed at 20%)
  section409a_excise: z.number().nonnegative().optional(),
  // Line 17h — §409A NQDC excise (1099-MISC box15 × 20%, computed by f1099m)
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
  // Line 17b — 20% additional tax on non-qualified HSA distributions (Form 8889 line 20)
  // IRC §223(f)(4)(A); Form 8889 Part II line 20 → Schedule 2 line 17b
  line17b_hsa_penalty: z.number().nonnegative().optional(),
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
  // Line 17c — Tax on lump-sum distributions (from Form 4972)
  // IRC §402(e)(1); Form 4972 → Schedule 2 line 17c
  lump_sum_tax: z.number().nonnegative().optional(),
  // Line 2 — Excess advance premium tax credit repayment (Form 8962 line 29)
  // IRC §36B(f); Form 8962 line 29 → Schedule 2 line 2
  line2_excess_advance_premium: z.number().nonnegative().optional(),
  // Line 7a — Household employment taxes (Schedule H line 26)
  // IRC §3510; Schedule H line 26 → Schedule 2 line 7a
  line7a_household_employment: z.number().nonnegative().optional(),
  // Line 17d — Section 965 net tax liability (Form 8615 — Kiddie Tax)
  // IRC §1(g); Form 8615 line 18 → Schedule 2 line 17d
  line17d_kiddie_tax: z.number().nonnegative().optional(),
  // Line 17a — Recapture of investment credit (Form 4255)
  // IRC §50(a); Form 4255 → Schedule 2 line 17a
  line17a_investment_credit_recapture: z.number().nonnegative().optional(),
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

// Line 17h: §409A excise tax on failing NQDC plans
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

// ─── Node class ───────────────────────────────────────────────────────────────

class Schedule2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule2";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, rawInput: Schedule2Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const total = (input.line4_se_tax ?? 0) +
      (input.line5_unreported_tip_tax ?? 0) +
      line8(input) +
      (input.line1_amt ?? 0) +
      line13(input) +
      line17h(input) +
      line17k(input) +
      (input.lump_sum_tax ?? 0) +
      (input.line17e_archer_msa_tax ?? 0) +
      (input.line17f_medicare_advantage_msa_tax ?? 0) +
      (input.line6_uncollected_8919 ?? 0) +
      (input.line17b_hsa_penalty ?? 0) +
      (input.line11_additional_medicare ?? 0) +
      (input.line12_niit ?? 0) +
      (input.line2_excess_advance_premium ?? 0) +
      (input.line7a_household_employment ?? 0) +
      (input.line17d_kiddie_tax ?? 0) +
      (input.line17a_investment_credit_recapture ?? 0);
    if (total === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line17_additional_taxes: total }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule2 = new Schedule2Node();
