import { z } from "zod";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { form2441 } from "../../intermediate/form2441/index.ts";
import { form4137 } from "../../intermediate/form4137/index.ts";
import { form8839 } from "../../intermediate/form8839/index.ts";
import { form8853 } from "../../intermediate/form8853/index.ts";
import { form8889 } from "../../intermediate/form8889/index.ts";
import { form8959 } from "../../intermediate/form8959/index.ts";
import { schedule2 } from "../../intermediate/schedule2/index.ts";
import { schedule_c } from "../../intermediate/schedule_c/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

export enum Box12Code {
  A = "A",   // Uncollected SS tax on tips
  B = "B",   // Uncollected Medicare tax on tips
  C = "C",   // Taxable cost of group-term life insurance >$50k
  D = "D",   // 401(k) elective deferrals
  DD = "DD", // Cost of employer-sponsored health coverage
  E = "E",   // 403(b) elective deferrals
  EE = "EE", // Designated Roth contributions to 457(b)
  F = "F",   // 408(k)(6) SEP elective deferrals
  FF = "FF", // Permitted benefits under qualified small employer HRA
  G = "G",   // 457(b) deferrals and employer contributions
  GG = "GG", // Income from qualified equity grants
  H = "H",   // 501(c)(18)(D) plan elective deferrals
  HH = "HH", // Aggregate deferrals under §83(i) elections
  J = "J",   // Non-taxable sick pay
  K = "K",   // 20% excise tax on excess golden parachute payments
  L = "L",   // Substantiated employee business expense reimbursements
  M = "M",   // Uncollected SS tax on group-term life insurance cost
  N = "N",   // Uncollected Medicare tax on group-term life insurance cost
  P = "P",   // Excludable moving expense reimbursements
  Q = "Q",   // Nontaxable combat pay
  R = "R",   // Employer contributions to Archer MSA
  S = "S",   // 408(p) SIMPLE salary reduction contributions
  T = "T",   // Adoption benefits
  V = "V",   // Income from exercise of nonstatutory stock options
  W = "W",   // Employer contributions to HSA
  Y = "Y",   // 409A nonqualified deferred compensation deferrals
  Z = "Z",   // Income under 409A-failing nonqualified deferred compensation
}

const box12EntrySchema = z.object({
  code: z.nativeEnum(Box12Code),
  amount: z.number().nonnegative(),
});

// Per-entry schema — one W-2 from one employer. Used by the CLI for per-entry validation.
export const w2ItemSchema = z.object({
  box1_wages: z.number().nonnegative(),
  box2_fed_withheld: z.number().nonnegative(),
  box3_ss_wages: z.number().nonnegative().optional(),
  box4_ss_withheld: z.number().nonnegative().optional(),
  box5_medicare_wages: z.number().nonnegative().optional(),
  box6_medicare_withheld: z.number().nonnegative().optional(),
  box7_ss_tips: z.number().nonnegative().optional(),
  box8_allocated_tips: z.number().nonnegative().optional(),
  box10_dep_care: z.number().nonnegative().optional(),
  box11_nonqual_plans: z.number().nonnegative().optional(),
  box12_entries: z.array(box12EntrySchema).optional(),
  box13_statutory_employee: z.boolean().optional(),
  box13_retirement_plan: z.boolean().optional(),
  box13_third_party_sick: z.boolean().optional(),
  box14b_tipped_code: z.string().optional(),
});

// Node inputSchema — receives all W-2s for this return as a single array.
export const inputSchema = z.object({
  w2s: z.array(w2ItemSchema).min(1),
});

type F1040Input = z.infer<typeof f1040.inputSchema>;
type W2Items = z.infer<typeof w2ItemSchema>[];

function regularItems(w2s: W2Items) {
  return w2s.filter((item) => item.box13_statutory_employee !== true);
}

function withholdingFields(w2s: W2Items): F1040Input {
  return {
    line25a_w2_withheld: w2s.reduce(
      (sum, item) => sum + item.box2_fed_withheld,
      0,
    ),
  };
}

function wageFields(w2s: W2Items): F1040Input {
  const total = regularItems(w2s).reduce(
    (sum, item) => sum + item.box1_wages,
    0,
  );
  return total > 0 ? { line1a_wages: total } : {};
}

function combatPayFields(w2s: W2Items): F1040Input {
  const total = regularItems(w2s)
    .flatMap((item) => item.box12_entries ?? [])
    .filter(({ code }) => code === Box12Code.Q)
    .reduce((sum, { amount }) => sum + amount, 0);
  return total > 0 ? { line1i_combat_pay: total } : {};
}

function statutoryOutput(w2s: W2Items): NodeOutput[] {
  const statutory = w2s.filter((item) =>
    item.box13_statutory_employee === true
  );
  const wages = statutory.reduce((sum, item) => sum + item.box1_wages, 0);
  if (wages === 0) return [];
  const withholding = statutory.reduce(
    (sum, item) => sum + item.box2_fed_withheld,
    0,
  );
  return [{
    nodeType: schedule_c.nodeType,
    input: { statutory_wages: wages, withholding },
  }];
}

function medicareOutputs(w2s: W2Items): NodeOutput[] {
  return regularItems(w2s)
    .filter((item) =>
      item.box5_medicare_wages !== undefined ||
      item.box6_medicare_withheld !== undefined
    )
    .map((item) => ({
      nodeType: form8959.nodeType,
      input: {
        medicare_wages: item.box5_medicare_wages,
        medicare_withheld: item.box6_medicare_withheld,
      },
    }));
}

function allocatedTipsOutputs(w2s: W2Items): NodeOutput[] {
  return regularItems(w2s)
    .filter((item) => (item.box8_allocated_tips ?? 0) > 0)
    .map((item) => ({
      nodeType: form4137.nodeType,
      input: { allocated_tips: item.box8_allocated_tips },
    }));
}

function depCareOutputs(w2s: W2Items): NodeOutput[] {
  return regularItems(w2s)
    .filter((item) => (item.box10_dep_care ?? 0) > 0)
    .map((item) => ({
      nodeType: form2441.nodeType,
      input: { dep_care_benefits: item.box10_dep_care },
    }));
}

function box12NodeOutputs(w2s: W2Items): NodeOutput[] {
  return regularItems(w2s)
    .flatMap((item) => item.box12_entries ?? [])
    .flatMap(({ code, amount }): NodeOutput[] => {
      switch (code) {
        case Box12Code.H:
          return [{ nodeType: schedule1.nodeType, input: { line24f_501c18d: amount } }];
        case Box12Code.W:
          return [{ nodeType: form8889.nodeType, input: { employer_hsa_contributions: amount } }];
        case Box12Code.R:
          return [{ nodeType: form8853.nodeType, input: { employer_archer_msa: amount } }];
        case Box12Code.T:
          return [{ nodeType: form8839.nodeType, input: { adoption_benefits: amount } }];
        case Box12Code.A:
        case Box12Code.B:
          return [{ nodeType: schedule2.nodeType, input: { uncollected_fica: amount } }];
        case Box12Code.M:
        case Box12Code.N:
          return [{ nodeType: schedule2.nodeType, input: { uncollected_fica_gtl: amount } }];
        case Box12Code.K:
          return [{ nodeType: schedule2.nodeType, input: { golden_parachute_excise: amount } }];
        case Box12Code.Z:
          return [{ nodeType: schedule2.nodeType, input: { section409a_excise: amount } }];
        default:
          return [];
      }
    });
}

class W2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "w2";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    schedule1,
    schedule2,
    schedule_c,
    form4137,
    form2441,
    form8959,
    form8889,
    form8853,
    form8839,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const f1040Fields: F1040Input = {
      ...withholdingFields(input.w2s),
      ...wageFields(input.w2s),
      ...combatPayFields(input.w2s),
    };

    const outputs: NodeOutput[] = [
      ...statutoryOutput(input.w2s),
      ...medicareOutputs(input.w2s),
      ...allocatedTipsOutputs(input.w2s),
      ...depCareOutputs(input.w2s),
      ...box12NodeOutputs(input.w2s),
      { nodeType: f1040.nodeType, input: f1040Fields },
    ];

    return { outputs };
  }
}

export const w2 = new W2Node();
