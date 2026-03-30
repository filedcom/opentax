import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §220(f)(4) — additional tax on non-qualified Archer MSA distributions
const ARCHER_MSA_PENALTY_RATE = 0.20;
// IRC §138(c)(2) — additional tax on non-qualified Medicare Advantage MSA distributions
const MEDICARE_ADVANTAGE_PENALTY_RATE = 0.50;
// Rev. Proc. 2024-40 §2.62 — LTC per diem exclusion limit for TY2025
const LTC_PER_DIEM_DAILY_LIMIT = 420;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // ── Section A Part I: Archer MSA Contributions and Deductions ───────────
  // Line 1: Employer contributions (from W-2 Box 12 code R, routed by w2 node)
  // IRC §220(b); Form 8853 Part I line 1
  employer_archer_msa: z.number().nonnegative().optional(),
  // Line 2: Taxpayer contributions to Archer MSA in 2025
  // IRC §220(a); Form 8853 Part I line 2
  taxpayer_archer_msa_contributions: z.number().nonnegative().optional(),
  // Line 3: Limitation from Line 3 chart (65%/75% of HDHP deductible × eligible months/12)
  // Self-only: 65% × deductible ($2,850–$4,300); Family: 75% × deductible ($5,700–$8,550)
  // IRC §220(b)(2); Form 8853 Part I line 3 (pre-computed by screen/UI)
  line3_limitation_amount: z.number().nonnegative().optional(),
  // Line 4: Compensation from employer maintaining the HDHP
  // IRC §220(b)(1)(B); Form 8853 Part I line 4
  compensation: z.number().nonnegative().optional(),

  // ── Section A Part II: Archer MSA Distributions ──────────────────────────
  // Line 6a: Total distributions from all Archer MSAs (1099-SA box 1)
  // IRC §220(f); Form 8853 Part II line 6a
  archer_msa_distributions: z.number().nonnegative().optional(),
  // Line 6b: Distributions rolled over + withdrawn excess contributions
  // IRC §220(f)(5); Form 8853 Part II line 6b
  archer_msa_rollover: z.number().nonnegative().optional(),
  // Line 7: Unreimbursed qualified medical expenses
  // IRC §220(f)(1); Form 8853 Part II line 7
  archer_msa_qualified_expenses: z.number().nonnegative().optional(),
  // Line 9a: Exception to additional 20% tax (death, disability, or age 65+)
  // IRC §220(f)(4)(B); Form 8853 Part II line 9a
  archer_msa_exception: z.boolean().optional(),

  // ── Section B: Medicare Advantage MSA Distributions ─────────────────────
  // Line 10: Total distributions from Medicare Advantage MSAs (1099-SA box 1)
  // IRC §138(c); Form 8853 Section B line 10
  medicare_advantage_distributions: z.number().nonnegative().optional(),
  // Line 11: Qualified medical expenses for Medicare Advantage MSA
  // IRC §138(c)(1); Form 8853 Section B line 11
  medicare_advantage_qualified_expenses: z.number().nonnegative().optional(),
  // Line 13a: Exception to additional 50% tax (death or disability only — NOT age 65)
  // IRC §138(c)(2); Form 8853 Section B line 13a
  medicare_advantage_exception: z.boolean().optional(),

  // ── Section C: Long-Term Care Insurance Contracts ────────────────────────
  // Line 17: Gross LTC payments received on per diem or periodic basis (1099-LTC box 1)
  // IRC §7702B; Form 8853 Section C line 17
  ltc_gross_payments: z.number().nonnegative().optional(),
  // Line 18: Amount on line 17 that is from qualified LTC insurance contracts
  // IRC §7702B(b); Form 8853 Section C line 18
  ltc_qualified_contract_amount: z.number().nonnegative().optional(),
  // Line 19: Accelerated death benefits received on per diem basis (chronically ill only)
  // IRC §101(g)(3); Form 8853 Section C line 19
  ltc_accelerated_death_benefits: z.number().nonnegative().optional(),
  // Line 21: Number of days in the LTC period (for per diem limit calculation)
  // IRC §7702B(d)(2); Form 8853 Section C line 21
  ltc_period_days: z.number().nonnegative().optional(),
  // Line 22: Costs incurred for qualified LTC services during the LTC period
  // IRC §7702B(c); Form 8853 Section C line 22
  ltc_actual_costs: z.number().nonnegative().optional(),
  // Line 24: Reimbursements for qualified LTC services received
  // IRC §7702B; Form 8853 Section C line 24
  ltc_reimbursements: z.number().nonnegative().optional(),
});

type Form8853Input = z.infer<typeof inputSchema>;

// ─── Section A Part I: Archer MSA Deduction ──────────────────────────────────

// Line 5: Archer MSA deduction = min(line2, line3, line4)
// If employer made any contributions, taxpayer cannot deduct (Part I instructions)
// IRC §220(b); Form 8853 Part I line 5 → Schedule 1 Part II line 23
function archerMsaDeduction(input: Form8853Input): number {
  const employerContrib = input.employer_archer_msa ?? 0;
  if (employerContrib > 0) return 0;

  const taxpayerContrib = input.taxpayer_archer_msa_contributions ?? 0;
  if (taxpayerContrib <= 0) return 0;

  const limitation = input.line3_limitation_amount ?? 0;
  const compensation = input.compensation ?? Infinity;

  return Math.min(taxpayerContrib, limitation, compensation);
}

// ─── Section A Part II: Archer MSA Distributions ─────────────────────────────

// Line 6c: Net distributions after rollovers
function archerMsaNetDistributions(input: Form8853Input): number {
  const gross = input.archer_msa_distributions ?? 0;
  const rollover = input.archer_msa_rollover ?? 0;
  return Math.max(0, gross - rollover);
}

// Line 8: Taxable Archer MSA distributions = max(0, line6c - line7)
// IRC §220(f)(1); Form 8853 Part II line 8 → Schedule 1 line 8e
function archerMsaTaxableDist(input: Form8853Input): number {
  const net = archerMsaNetDistributions(input);
  if (net <= 0) return 0;
  const qualified = input.archer_msa_qualified_expenses ?? 0;
  return Math.max(0, net - qualified);
}

// Line 9b: 20% additional tax on taxable Archer MSA distributions
// IRC §220(f)(4); Form 8853 Part II line 9b → Schedule 2 line 17e
function archerMsaPenaltyTax(input: Form8853Input): number {
  if (input.archer_msa_exception === true) return 0;
  const taxable = archerMsaTaxableDist(input);
  return taxable * ARCHER_MSA_PENALTY_RATE;
}

// ─── Section B: Medicare Advantage MSA Distributions ─────────────────────────

// Line 12: Taxable Medicare Advantage MSA distributions = max(0, line10 - line11)
// IRC §138(c)(2); Form 8853 Section B line 12 → Schedule 1 line 8e
function medicareAdvantaxableDist(input: Form8853Input): number {
  const gross = input.medicare_advantage_distributions ?? 0;
  if (gross <= 0) return 0;
  const qualified = input.medicare_advantage_qualified_expenses ?? 0;
  return Math.max(0, gross - qualified);
}

// Line 13b: 50% additional tax on taxable Medicare Advantage MSA distributions
// IRC §138(c)(2); Form 8853 Section B line 13b → Schedule 2 line 17f
function medicareAdvantagePenaltyTax(input: Form8853Input): number {
  if (input.medicare_advantage_exception === true) return 0;
  const taxable = medicareAdvantaxableDist(input);
  return taxable * MEDICARE_ADVANTAGE_PENALTY_RATE;
}

// ─── Section C: Long-Term Care Insurance Contracts ───────────────────────────

// Line 20: Total per diem LTC and accelerated death benefit payments
function ltcTotalPerDiemPayments(input: Form8853Input): number {
  return (input.ltc_qualified_contract_amount ?? 0) + (input.ltc_accelerated_death_benefits ?? 0);
}

// Line 21: Per diem limit = $420 × number of days in LTC period
// Rev. Proc. 2024-40 §2.62; Form 8853 Section C line 21
function ltcPerDiemLimit(input: Form8853Input): number {
  const days = input.ltc_period_days ?? 0;
  return LTC_PER_DIEM_DAILY_LIMIT * days;
}

// Line 23: Exclusion amount = max(line21_per_diem_limit, line22_actual_costs)
function ltcExclusionAmount(input: Form8853Input): number {
  const perDiemLimit = ltcPerDiemLimit(input);
  const actualCosts = input.ltc_actual_costs ?? 0;
  return Math.max(perDiemLimit, actualCosts);
}

// Line 25: Per diem limitation = max(0, line23 - line24_reimbursements)
function ltcPerDiemLimitation(input: Form8853Input): number {
  const exclusion = ltcExclusionAmount(input);
  const reimbursements = input.ltc_reimbursements ?? 0;
  return Math.max(0, exclusion - reimbursements);
}

// Line 26: Taxable LTC payments = max(0, line20 - line25)
// IRC §7702B(d); Form 8853 Section C line 26 → Schedule 1 line 8e
function ltcTaxablePayments(input: Form8853Input): number {
  const total = ltcTotalPerDiemPayments(input);
  if (total <= 0) return 0;
  const limitation = ltcPerDiemLimitation(input);
  return Math.max(0, total - limitation);
}

// ─── Output Builders ─────────────────────────────────────────────────────────

// Schedule 1 output: line 8e (taxable MSA/LTC income) and line 23 (Archer MSA deduction)
function schedule1Output(input: Form8853Input): NodeOutput[] {
  const deduction = archerMsaDeduction(input);
  const taxableArcher = archerMsaTaxableDist(input);
  const taxableMedicareAdv = medicareAdvantaxableDist(input);
  const taxableLtc = ltcTaxablePayments(input);
  const totalTaxableIncome = taxableArcher + taxableMedicareAdv + taxableLtc;

  if (deduction <= 0 && totalTaxableIncome <= 0) return [];

  const s1Input: Partial<z.infer<typeof schedule1["inputSchema"]>> = {};
  if (totalTaxableIncome > 0) s1Input.line8e_archer_msa_dist = totalTaxableIncome;
  if (deduction > 0) s1Input.line23_archer_msa_deduction = deduction;

  return [output(schedule1, s1Input as AtLeastOne<z.infer<typeof schedule1["inputSchema"]>>)];
}

// Schedule 2 output: line 17e (20% Archer MSA tax) and line 17f (50% Medicare Advantage MSA tax)
function schedule2Output(input: Form8853Input): NodeOutput[] {
  const archerTax = archerMsaPenaltyTax(input);
  const medicareTax = medicareAdvantagePenaltyTax(input);

  if (archerTax <= 0 && medicareTax <= 0) return [];

  const s2Input: Partial<z.infer<typeof schedule2["inputSchema"]>> = {};
  if (archerTax > 0) s2Input.line17e_archer_msa_tax = archerTax;
  if (medicareTax > 0) s2Input.line17f_medicare_advantage_msa_tax = medicareTax;

  return [output(schedule2, s2Input as AtLeastOne<z.infer<typeof schedule2["inputSchema"]>>)];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8853Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8853";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, schedule2]);

  compute(_ctx: NodeContext, rawInput: Form8853Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    return {
      outputs: [
        ...schedule1Output(input),
        ...schedule2Output(input),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8853 = new Form8853Node();
