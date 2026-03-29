import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
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
  return (input.golden_parachute_excise ?? 0) + (input.line17k_golden_parachute_excise ?? 0);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Schedule2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule2";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(rawInput: Schedule2Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const total =
      line8(input) +
      (input.line1_amt ?? 0) +
      line13(input) +
      line17h(input) +
      line17k(input) +
      (input.line17e_archer_msa_tax ?? 0) +
      (input.line17f_medicare_advantage_msa_tax ?? 0) +
      (input.line6_uncollected_8919 ?? 0) +
      (input.line17b_hsa_penalty ?? 0) +
      (input.line11_additional_medicare ?? 0) +
      (input.line12_niit ?? 0);
    if (total === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      { nodeType: f1040.nodeType, input: { line17_additional_taxes: total } },
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule2 = new Schedule2Node();
