import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form2441 } from "../../intermediate/forms/form2441/index.ts";
import { form4137 } from "../../intermediate/forms/form4137/index.ts";
import { form8839 } from "../../intermediate/forms/form8839/index.ts";
import { form8853 } from "../../intermediate/forms/form8853/index.ts";
import { form8880 } from "../../intermediate/forms/form8880/index.ts";
import { form8889 } from "../../intermediate/forms/form8889/index.ts";
import { form8959 } from "../../intermediate/forms/form8959/index.ts";
import { form8962 } from "../../intermediate/forms/form8962/index.ts";
import { ira_deduction_worksheet } from "../../intermediate/worksheets/ira_deduction_worksheet/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { eitc } from "../../intermediate/forms/eitc/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { f8812 } from "../f8812/index.ts";
import { schedule_se } from "../../intermediate/forms/schedule_se/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import {
  SS_WAGE_BASE_2025,
  SS_MAX_TAX_PER_EMPLOYER_2025,
  RETIREMENT_LIMITS_2025,
} from "../../config/2025.ts";

export enum Box12Code {
  A = "A",     // Uncollected SS tax on tips
  AA = "AA",   // Designated Roth contributions to 401(k)
  B = "B",     // Uncollected Medicare tax on tips
  BB = "BB",   // Designated Roth contributions to 403(b)
  C = "C",     // Taxable cost of group-term life insurance >$50k
  D = "D",     // 401(k) elective deferrals
  DD = "DD",   // Cost of employer-sponsored health coverage
  E = "E",     // 403(b) elective deferrals
  EE = "EE",   // Designated Roth contributions to 457(b)
  F = "F",     // 408(k)(6) SEP elective deferrals
  FF = "FF",   // Permitted benefits under qualified small employer HRA
  G = "G",     // 457(b) deferrals and employer contributions
  GG = "GG",   // Income from qualified equity grants
  H = "H",     // 501(c)(18)(D) plan elective deferrals
  HH = "HH",   // Aggregate deferrals under §83(i) elections
  J = "J",     // Non-taxable sick pay
  K = "K",     // 20% excise tax on excess golden parachute payments
  L = "L",     // Substantiated employee business expense reimbursements
  M = "M",     // Uncollected SS tax on group-term life insurance cost
  N = "N",     // Uncollected Medicare tax on group-term life insurance cost
  P = "P",     // Excludable moving expense reimbursements
  Q = "Q",     // Nontaxable combat pay
  R = "R",     // Employer contributions to Archer MSA
  S = "S",     // 408(p) SIMPLE salary reduction contributions
  T = "T",     // Adoption benefits
  V = "V",     // Income from exercise of nonstatutory stock options
  W = "W",     // Employer contributions to HSA
  Y = "Y",     // 409A nonqualified deferred compensation deferrals
  Z = "Z",     // Income under 409A-failing nonqualified deferred compensation
}

const box12EntrySchema = z.object({
  code: z.nativeEnum(Box12Code),
  amount: z.number().nonnegative(),
});

const box14EntrySchema = z.object({
  description: z.string(),
  amount: z.number().nonnegative(),
  is_state_sdi_pfml: z.boolean(),
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
  box14_entries: z.array(box14EntrySchema).optional(),
  box14b_tipped_code: z.string().optional(),
  box15_state: z.string().optional(),
  box16_state_wages: z.number().nonnegative().optional(),
  box17_state_withheld: z.number().nonnegative().optional(),
  box19_local_withheld: z.number().nonnegative().optional(),
  taxpayer_age: z.number().nonnegative().optional(),
});

// Node inputSchema — receives all W-2s for this return as a single array.
export const inputSchema = z.object({
  w2s: z.array(w2ItemSchema).min(1),
});

type F1040Input = z.infer<typeof f1040.inputSchema>;
type W2Item = z.infer<typeof w2ItemSchema>;
type W2Items = W2Item[];

const SS_WAGE_BASE = SS_WAGE_BASE_2025;
const SS_MAX_TAX = SS_MAX_TAX_PER_EMPLOYER_2025;

const RETIREMENT_LIMITS = RETIREMENT_LIMITS_2025;

function retirementLimit(
  planType: keyof typeof RETIREMENT_LIMITS,
  age: number | undefined,
): number {
  const limits = RETIREMENT_LIMITS[planType];
  if (age === undefined) return limits[59]; // default to standard catch-up limit
  if (age <= 49) return limits[49];
  if (age <= 59) return limits[59];
  if (age <= 63) return limits[63];
  return limits[Infinity];
}

function validateItem(item: W2Item): void {
  const ssWages = (item.box3_ss_wages ?? 0) + (item.box7_ss_tips ?? 0);
  if (ssWages > SS_WAGE_BASE) {
    throw new Error(
      `W-2 validation error: SS taxable wages (${ssWages}) exceed the wage base limit (${SS_WAGE_BASE})`,
    );
  }
  if ((item.box4_ss_withheld ?? 0) > SS_MAX_TAX) {
    throw new Error(
      `W-2 validation error: SS tax withheld (${item.box4_ss_withheld}) exceeds the per-employer maximum (${SS_MAX_TAX})`,
    );
  }

  const entries = item.box12_entries ?? [];
  const age = item.taxpayer_age;

  const code401k = entries.filter((e) => e.code === Box12Code.D || e.code === Box12Code.AA)
    .reduce((s, e) => s + e.amount, 0);
  if (code401k > retirementLimit("401k", age)) {
    throw new Error(`W-2 validation error: 401(k) deferrals (${code401k}) exceed the limit`);
  }

  const code403b = entries.filter((e) => e.code === Box12Code.E || e.code === Box12Code.BB)
    .reduce((s, e) => s + e.amount, 0);
  if (code403b > retirementLimit("403b", age)) {
    throw new Error(`W-2 validation error: 403(b) deferrals (${code403b}) exceed the limit`);
  }

  const code457b = entries.filter((e) => e.code === Box12Code.G || e.code === Box12Code.EE)
    .reduce((s, e) => s + e.amount, 0);
  if (code457b > retirementLimit("457b", age)) {
    throw new Error(`W-2 validation error: 457(b) deferrals (${code457b}) exceed the limit`);
  }

  const codeS = entries.filter((e) => e.code === Box12Code.S)
    .reduce((s, e) => s + e.amount, 0);
  if (codeS > retirementLimit("simple", age)) {
    throw new Error(`W-2 validation error: SIMPLE IRA deferrals (${codeS}) exceed the limit`);
  }
}

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

function excessSsOutput(w2s: W2Items): NodeOutput[] {
  const totalSsWithheld = w2s.reduce((sum, item) => sum + (item.box4_ss_withheld ?? 0), 0);
  const excess = totalSsWithheld - SS_MAX_TAX;
  if (w2s.length < 2 || excess <= 0) return [];
  return [output(schedule3, { line11_excess_ss: excess })];
}

function statutoryOutput(w2s: W2Items): NodeOutput[] {
  const statutory = w2s.filter((item) => item.box13_statutory_employee === true);
  const wages = statutory.reduce((sum, item) => sum + item.box1_wages, 0);
  if (wages === 0) return [];
  const withholding = statutory.reduce(
    (sum, item) => sum + item.box2_fed_withheld,
    0,
  );
  return [output(schedule_c, { statutory_wages: wages, withholding })];
}

function medicareOutput(w2s: W2Items): NodeOutput[] {
  const items = regularItems(w2s).filter(
    (item) =>
      item.box5_medicare_wages !== undefined ||
      item.box6_medicare_withheld !== undefined,
  );
  if (items.length === 0) return [];
  const totalWages = items.reduce((sum, item) => sum + (item.box5_medicare_wages ?? 0), 0);
  const totalWithheld = items.reduce((sum, item) => sum + (item.box6_medicare_withheld ?? 0), 0);
  const fields: Partial<z.infer<typeof form8959["inputSchema"]>> = {};
  if (totalWages > 0) fields.medicare_wages = totalWages;
  if (totalWithheld > 0) fields.medicare_withheld = totalWithheld;
  if (Object.keys(fields).length === 0) return [];
  return [output(form8959, fields as AtLeastOne<z.infer<typeof form8959["inputSchema"]>>)];
}

function allocatedTipsOutput(w2s: W2Items): NodeOutput[] {
  const total = regularItems(w2s).reduce(
    (sum, item) => sum + (item.box8_allocated_tips ?? 0),
    0,
  );
  return total > 0
    ? [output(form4137, { allocated_tips: total })]
    : [];
}

function depCareOutput(w2s: W2Items): NodeOutput[] {
  const total = regularItems(w2s).reduce(
    (sum, item) => sum + (item.box10_dep_care ?? 0),
    0,
  );
  return total > 0
    ? [output(form2441, { dep_care_benefits: total })]
    : [];
}

function retirementPlanOutput(w2s: W2Items): NodeOutput[] {
  const any = regularItems(w2s).some((item) => item.box13_retirement_plan === true);
  return any
    ? [output(ira_deduction_worksheet, { covered_by_retirement_plan: true })]
    : [];
}

function scheduleAOutput(w2s: W2Items): NodeOutput[] {
  const line5a = regularItems(w2s)
    .flatMap((item) => item.box14_entries ?? [])
    .filter((entry) => entry.is_state_sdi_pfml)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const line5b = regularItems(w2s).reduce(
    (sum, item) => sum + (item.box17_state_withheld ?? 0),
    0,
  );
  const line5c = regularItems(w2s).reduce(
    (sum, item) => sum + (item.box19_local_withheld ?? 0),
    0,
  );
  // line5a = SDI/PFML (state income tax variant)
  // line5b = state income taxes withheld (box 17)
  // line5c = local income taxes withheld (box 19)
  // All three contribute to Schedule A line 5a (state and local income taxes)
  const stateTaxTotal = line5a + line5b + line5c;
  if (stateTaxTotal === 0) return [];
  return [output(schedule_a, { line_5a_tax_amount: stateTaxTotal })];
}

function box12NodeOutputs(w2s: W2Items): NodeOutput[] {
  const entries = regularItems(w2s).flatMap((item) => item.box12_entries ?? []);
  const sum = (...codes: Box12Code[]) =>
    entries.filter((e) => codes.includes(e.code)).reduce((s, e) => s + e.amount, 0);

  const outputs: NodeOutput[] = [];

  const h = sum(Box12Code.H);
  if (h > 0) outputs.push(output(schedule1, { line24f_501c18d: h }));

  const w = sum(Box12Code.W);
  if (w > 0) outputs.push(output(form8889, { employer_hsa_contributions: w }));

  const r = sum(Box12Code.R);
  if (r > 0) outputs.push(output(form8853, { employer_archer_msa: r }));

  const t = sum(Box12Code.T);
  if (t > 0) outputs.push(output(form8839, { adoption_benefits: t }));

  const deg = sum(Box12Code.D, Box12Code.E, Box12Code.G);
  if (deg > 0) outputs.push(output(form8880, { elective_deferrals: deg }));

  const schedule2Input: Partial<z.infer<typeof schedule2["inputSchema"]>> = {};
  const ab = sum(Box12Code.A, Box12Code.B);
  if (ab > 0) schedule2Input.uncollected_fica = ab;
  const mn = sum(Box12Code.M, Box12Code.N);
  if (mn > 0) schedule2Input.uncollected_fica_gtl = mn;
  const k = sum(Box12Code.K);
  if (k > 0) schedule2Input.golden_parachute_excise = k;
  const zCode = sum(Box12Code.Z);
  if (zCode > 0) schedule2Input.section409a_excise = zCode;
  if (Object.keys(schedule2Input).length > 0) {
    outputs.push(output(schedule2, schedule2Input as AtLeastOne<z.infer<typeof schedule2["inputSchema"]>>));
  }

  // Code FF: QSEHRA benefits reduce Form 8962 PTC per IRC §36B(c)(4)
  const ff = sum(Box12Code.FF);
  if (ff > 0) outputs.push(output(form8962, { qsehra_amount_offered: ff }));

  return outputs;
}

class W2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "w2";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    agi_aggregator,
    eitc,
    schedule1,
    schedule2,
    schedule3,
    schedule_a,
    schedule_c,
    form4137,
    form2441,
    form8959,
    form8889,
    form8853,
    form8839,
    form8880,
    form8962,
    ira_deduction_worksheet,
    f8812,
    schedule_se,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    for (const item of input.w2s) {
      validateItem(item);
    }

    const f1040Fields: F1040Input = {
      ...withholdingFields(input.w2s),
      ...wageFields(input.w2s),
      ...combatPayFields(input.w2s),
    };

    const outputs: NodeOutput[] = [
      ...excessSsOutput(input.w2s),
      ...statutoryOutput(input.w2s),
      ...medicareOutput(input.w2s),
      ...allocatedTipsOutput(input.w2s),
      ...depCareOutput(input.w2s),
      ...retirementPlanOutput(input.w2s),
      ...scheduleAOutput(input.w2s),
      ...box12NodeOutputs(input.w2s),
      this.outputNodes.output(f1040, f1040Fields as AtLeastOne<F1040Input>),
    ];

    // Route wages and §501(c)(18)(D) deduction to AGI aggregator
    const agiWageFields: Partial<z.infer<typeof agi_aggregator["inputSchema"]>> = {};
    const wages = wageFields(input.w2s);
    if (wages.line1a_wages !== undefined) agiWageFields.line1a_wages = wages.line1a_wages;
    const entries = regularItems(input.w2s).flatMap((item) => item.box12_entries ?? []);
    const h = entries.filter((e) => e.code === Box12Code.H).reduce((s, e) => s + e.amount, 0);
    if (h > 0) agiWageFields.line24f_501c18d = h;
    if (Object.keys(agiWageFields).length > 0) {
      outputs.push(this.outputNodes.output(
        agi_aggregator,
        agiWageFields as AtLeastOne<z.infer<typeof agi_aggregator["inputSchema"]>>,
      ));
    }

    // Route earned income (regular wages) to EITC node and f8812 (for ACTC computation)
    const earnedIncome = regularItems(input.w2s).reduce(
      (sum, item) => sum + item.box1_wages,
      0,
    );
    if (earnedIncome > 0) {
      outputs.push(this.outputNodes.output(eitc, { earned_income: earnedIncome }));
      outputs.push(this.outputNodes.output(f8812, { auto_earned_income: earnedIncome }));
    }

    // Route total W-2 SS wages to schedule_se so it can offset the SS wage base cap.
    // IRC §1402(b); Sch SE line 8a — reduces the $176,100 cap available for SE tax.
    const totalSsWages = input.w2s.reduce(
      (sum, item) => sum + (item.box3_ss_wages ?? 0) + (item.box7_ss_tips ?? 0),
      0,
    );
    if (totalSsWages > 0) {
      outputs.push(this.outputNodes.output(schedule_se, { w2_ss_wages: totalSsWages }));
    }

    return { outputs };
  }
}

export const w2 = new W2Node();
