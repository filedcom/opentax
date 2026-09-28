import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { filingStatusSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

const usInstitutionAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().min(1).optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
});

const foreignInstitutionAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  province_or_state: z.string().min(1).optional(),
  country_code: z.string().length(2),
  postal_code: z.string().min(1).optional(),
});

const institutionFilingSchema = z.object({
  name: z.string().min(1),
  us_address: usInstitutionAddressSchema.optional(),
  foreign_address: foreignInstitutionAddressSchema.optional(),
  current_year_1098t_received: z.boolean(),
  prior_year_1098t_received: z.boolean(),
  ein: z.string().regex(/^\d{2}-?\d{7}$/).optional(),
}).refine(
  (value) =>
    (value.us_address === undefined) !==
      (value.foreign_address === undefined),
  "Educational institution needs exactly one structured address",
);

const studentFilingSchema = z.object({
  first_name: z.string().min(1).max(20),
  last_name: z.string().min(1).max(20),
  name_control: z.string().regex(/^[A-Z][A-Z\- ]{0,3}$/),
  institutions: z.array(institutionFilingSchema).min(1),
});

// Actual 2025 payments may differ from Form 1098-T box 1. Keep the
// substantiating document amounts separate from the credit workpaper.
const educationExpenseWorkpaperSchema = z.object({
  form1098t_box1_payments: z.number().finite().nonnegative(),
  form1098t_box5_scholarships: z.number().finite().nonnegative(),
  form1098t_document_id: z.string().trim().min(1),
  payment_record_ids: z.array(z.string().trim().min(1)).min(1),
  paid_tuition_required_fees: z.number().finite().nonnegative(),
  paid_course_materials_to_institution: z.number().finite().nonnegative(),
  paid_course_materials_elsewhere: z.number().finite().nonnegative(),
  outside_materials_needed_for_course: z.boolean(),
  institution_materials_required_for_enrollment: z.boolean(),
  tax_free_assistance_applied_to_expenses: z.number().finite().nonnegative(),
  qualified_expense_refunds: z.number().finite().nonnegative(),
  expenses_used_for_other_tax_benefits: z.number().finite().nonnegative(),
});

// Per-student item schema (Part III of Form 8863).
export const itemSchema = z.object({
  credit_type: z.enum(["aoc", "llc"]),
  // Identity fields (Part III, Lines 20–21)
  student_name: z.string(),
  student_ssn: z.string().optional(),
  // Institution data (Part III, Line 22)
  institution_a_name: z.string().optional(),
  institution_a_address: z.string().optional(),
  institution_a_1098t_received: z.boolean().optional(),
  institution_a_1098t_box7_prior: z.boolean().optional(),
  institution_a_ein: z.string().optional(),
  institution_b_name: z.string().optional(),
  institution_b_address: z.string().optional(),
  institution_b_1098t_received: z.boolean().optional(),
  institution_b_1098t_box7_prior: z.boolean().optional(),
  institution_b_ein: z.string().optional(),
  // AOC eligibility gates (Part III, Lines 23–26)
  aoc_claimed_4_prior_years: z.boolean().optional(),
  enrolled_half_time: z.boolean().optional(),
  completed_4_years_postsec: z.boolean().optional(),
  felony_drug_conviction: z.boolean().optional(),
  // Adjusted qualified education expenses
  aoc_adjusted_expenses: z.number().nonnegative().optional(),
  llc_adjusted_expenses: z.number().nonnegative().optional(),
  // Return-level fields (Parts I and II — same values for all students on the return)
  filer_magi: z.number().nonnegative().optional(),
  filing_status: filingStatusSchema.optional(),
  // Kiddie rule: denies refundable 40% AOC portion (Line 7 checkbox)
  taxpayer_under_24_no_refundable_aoc: z.boolean().optional(),
  // Required by TY2025 MeF. The older display strings above are not parsed
  // into identity or institution addresses for filing.
  filing_details: studentFilingSchema.optional(),
  education_expense_workpaper: educationExpenseWorkpaperSchema.optional(),
});

export const inputSchema = z.object({
  f8863s: z.array(itemSchema).min(1),
  // Set by Form 8862 when prior-year AOTC disallowance has been cleared
  form8862_filed: z.boolean().optional(),
  // 2025 Form 8863 Credit Limit Worksheet, lines 4 and 5. These amounts must
  // come from the completed return; missing amounts are not treated as zero.
  credit_limit_worksheet: z.object({
    form1040_line18_tax: z.number().nonnegative(),
    schedule3_line1_foreign_tax_credit: z.number().nonnegative(),
    schedule3_line2_dependent_care_credit: z.number().nonnegative(),
    schedule3_line6d: z.number().nonnegative(),
    schedule3_line6l: z.number().nonnegative(),
  }).optional(),
});

export type F8863Item = z.infer<typeof itemSchema>;
type F8863Items = F8863Item[];
export type F8863Input = z.infer<typeof inputSchema>;

// The bounded filing route is one U.S. institution that supplied the 2025
// Form 1098-T. Other IRS-permitted 1098-T exceptions need their own evidence.
export function validateForm8863FilingSource(
  item: F8863Item,
  credit: "aoc" | "llc",
): void {
  const institutions = item.filing_details?.institutions;
  const workpaper = item.education_expense_workpaper;
  if (
    institutions?.length !== 1 || !institutions[0].us_address ||
    institutions[0].current_year_1098t_received !== true || !workpaper
  ) {
    throw new Error(
      "Form 8863 filing needs one U.S. institution, received 2025 Form 1098-T, and an education expense workpaper",
    );
  }
  if (
    workpaper.paid_course_materials_elsewhere > 0 &&
    (credit === "llc" || !workpaper.outside_materials_needed_for_course)
  ) {
    throw new Error(
      "Form 8863 outside-institution course materials do not qualify for this credit",
    );
  }
  if (
    credit === "llc" && workpaper.paid_course_materials_to_institution > 0 &&
    !workpaper.institution_materials_required_for_enrollment
  ) {
    throw new Error(
      "Form 8863 LLC institution materials must be required for enrollment",
    );
  }
  if (
    workpaper.tax_free_assistance_applied_to_expenses <
      workpaper.form1098t_box5_scholarships
  ) {
    throw new Error(
      "Form 8863 bounded filing route must reduce expenses by all Form 1098-T box 5 scholarships",
    );
  }
  const paid = workpaper.paid_tuition_required_fees +
    workpaper.paid_course_materials_to_institution +
    workpaper.paid_course_materials_elsewhere;
  const reductions = workpaper.tax_free_assistance_applied_to_expenses +
    workpaper.qualified_expense_refunds +
    workpaper.expenses_used_for_other_tax_benefits;
  if (reductions > paid) {
    throw new Error("Form 8863 education expense reductions exceed paid expenses");
  }
  const claimed = credit === "aoc"
    ? item.aoc_adjusted_expenses
    : item.llc_adjusted_expenses;
  if (claimed !== paid - reductions) {
    throw new Error(
      "Form 8863 adjusted expenses do not reconcile to the education expense workpaper",
    );
  }
}

function assertDistinctEducationSourceReferences(items: F8863Items): void {
  const documentIds = new Set<string>();
  const paymentIds = new Set<string>();
  for (const item of items) {
    const workpaper = item.education_expense_workpaper;
    if (!workpaper) continue;
    const documentId = workpaper.form1098t_document_id.trim();
    if (documentIds.has(documentId)) {
      throw new Error("Form 8863 students cannot reuse a Form 1098-T document reference");
    }
    documentIds.add(documentId);
    for (const rawPaymentId of workpaper.payment_record_ids) {
      const paymentId = rawPaymentId.trim();
      if (paymentIds.has(paymentId)) {
        throw new Error("Form 8863 students cannot reuse an education payment reference");
      }
      paymentIds.add(paymentId);
    }
  }
}
type CreditLimitWorksheet = NonNullable<
  z.infer<typeof inputSchema>["credit_limit_worksheet"]
>;

export function calculateForm8863Line19(
  tentativeNonrefundable: number,
  worksheet: CreditLimitWorksheet,
): number {
  const priorCredits = worksheet.schedule3_line1_foreign_tax_credit +
    worksheet.schedule3_line2_dependent_care_credit +
    worksheet.schedule3_line6d + worksheet.schedule3_line6l;
  const availableTax = Math.max(
    0,
    worksheet.form1040_line18_tax - priorCredits,
  );
  return Math.min(tentativeNonrefundable, availableTax);
}

// TY2025 constants — statutory rates/caps (IRC §25A(d), not inflation-adjusted)
const AOC_FIRST_TIER = 2000;
const AOC_SECOND_TIER_RATE = 0.25;
const AOC_EXPENSE_CAP = 4000;
const AOC_REFUNDABLE_RATE = 0.40;
const AOC_NONREFUNDABLE_RATE = 0.60;

const LLC_RATE = 0.20;
const LLC_EXPENSE_CAP = 10000;

// Returns true if the student is AOC-eligible (all four gates pass).
function isAocEligible(item: F8863Item): boolean {
  if (item.aoc_claimed_4_prior_years === true) return false;
  if (item.enrolled_half_time === false) return false;
  if (item.completed_4_years_postsec === true) return false;
  if (item.felony_drug_conviction === true) return false;
  return true;
}

// Per-student TY2025 Form 8863 Part III, lines 27-30.
export function calculateAocStudentLines(expenses: number): {
  line27: number;
  line28: number;
  line29: number;
  line30: number;
} {
  if (!Number.isFinite(expenses) || expenses < 0) {
    throw new Error("Form 8863 AOC expenses must be finite and nonnegative");
  }
  const line27 = Math.min(expenses, AOC_EXPENSE_CAP);
  const line28 = Math.max(0, line27 - AOC_FIRST_TIER);
  const line29 = line28 * AOC_SECOND_TIER_RATE;
  const line30 = line28 === 0 ? line27 : AOC_FIRST_TIER + line29;
  return { line27, line28, line29, line30 };
}

// Form 8863 line 6 or 17. Round the allowable ratio itself, not the
// complementary phase-out amount, to match the printed worksheet.
export function calculateForm8863AllowableRatio(
  magi: number,
  isMfj: boolean,
  phaseOutMfjStart: number,
  phaseOutMfjEnd: number,
  phaseOutOtherStart: number,
  phaseOutOtherEnd: number,
): number {
  const end = isMfj ? phaseOutMfjEnd : phaseOutOtherEnd;
  const start = isMfj ? phaseOutMfjStart : phaseOutOtherStart;
  const raw = (end - magi) / (end - start);
  return Math.round(Math.min(1, Math.max(0, raw)) * 1000) / 1000;
}

// Returns true if credit is allowed (MFS filers cannot claim either credit).
function creditAllowed(item: F8863Item): boolean {
  return item.filing_status !== "mfs";
}

function eligibleAocStudents(items: F8863Items): F8863Items {
  return items.filter((item) =>
    item.credit_type === "aoc" && creditAllowed(item) &&
    isAocEligible(item) && (item.aoc_adjusted_expenses ?? 0) > 0
  );
}

function eligibleLlcStudents(items: F8863Items): F8863Items {
  return items.filter((item) =>
    creditAllowed(item) &&
    (item.credit_type === "llc" ||
      (item.credit_type === "aoc" && !isAocEligible(item))) &&
    (item.llc_adjusted_expenses ?? 0) > 0
  );
}

// Collect return-level context from the first item (all items share the same filer_magi
// and filing_status on a single return).
function returnContext(items: F8863Items): { magi: number; isMfj: boolean } {
  const first = items[0];
  const magi = first.filer_magi;
  if (magi === undefined || first.filing_status === undefined) {
    throw new Error(
      "Form 8863 needs filing status and MAGI for every claimed credit",
    );
  }
  const isMfj = first.filing_status === "mfj";
  return { magi, isMfj };
}

function validateReturnContext(items: F8863Items): void {
  const claiming = items.filter((item) =>
    (item.aoc_adjusted_expenses ?? 0) > 0 ||
    (item.llc_adjusted_expenses ?? 0) > 0
  );
  if (claiming.length === 0) return;
  const first = claiming[0];
  if (first.filer_magi === undefined || first.filing_status === undefined) {
    throw new Error(
      "Form 8863 needs filing status and MAGI for every claimed credit",
    );
  }
  for (const item of claiming) {
    if (
      item.filer_magi !== first.filer_magi ||
      item.filing_status !== first.filing_status
    ) {
      throw new Error(
        "Form 8863 students have conflicting return-level MAGI or filing status",
      );
    }
  }

  // Form 8863 Part III permits a student only once on the return, whether
  // that student's expense is used for AOC or LLC. Normalize punctuation so
  // the same SSN cannot be entered twice in different display formats.
  const studentSsns = new Set<string>();
  for (const item of claiming) {
    if (!item.student_ssn) continue;
    const ssn = item.student_ssn.replaceAll("-", "");
    if (studentSsns.has(ssn)) {
      throw new Error("Form 8863 cannot claim the same student SSN twice");
    }
    studentSsns.add(ssn);
  }

  // Line 7 is a taxpayer-level answer. The current input repeats it on each
  // student, so a conflict or partial answer must not silently make the first
  // student determine the entire return's refundable credit.
  const aocClaimants = eligibleAocStudents(items);
  const under24Answers = new Set(
    aocClaimants.map((item) => item.taxpayer_under_24_no_refundable_aoc),
  );
  if (under24Answers.size > 1) {
    throw new Error(
      "Form 8863 AOC students have conflicting taxpayer under-24 answers",
    );
  }
}

// Aggregate all per-student AOC tentative credits (Line 1), apply phase-out (Lines 2–7),
// then split into refundable (Line 8 → f1040) and nonrefundable (Line 9 → schedule3).
function aocOutputs(
  items: F8863Items,
  phaseOutMfjStart: number,
  phaseOutMfjEnd: number,
  phaseOutOtherStart: number,
  phaseOutOtherEnd: number,
): NodeOutput[] {
  // Filter to AOC-eligible students on credit_type "aoc" with non-zero expenses.
  const eligible = eligibleAocStudents(items);
  if (eligible.length === 0) return [];

  // Sum per-student Line 30 values → Line 1.
  const totalTentative = eligible.reduce(
    (sum, item) =>
      sum + calculateAocStudentLines(item.aoc_adjusted_expenses ?? 0).line30,
    0,
  );
  if (totalTentative === 0) return [];

  const { magi, isMfj } = returnContext(eligible);
  const ratio = calculateForm8863AllowableRatio(
    magi,
    isMfj,
    phaseOutMfjStart,
    phaseOutMfjEnd,
    phaseOutOtherStart,
    phaseOutOtherEnd,
  );
  const allowed = totalTentative * ratio; // Line 7

  if (allowed <= 0) return [];

  // Check kiddie rule on the first eligible item (return-level flag).
  const kiddieApplies =
    eligible[0].taxpayer_under_24_no_refundable_aoc === true;

  const outputs: NodeOutput[] = [];

  if (kiddieApplies) {
    // Entire credit is nonrefundable (skip Line 8, put Line 7 on Line 9).
    outputs.push(output(schedule3, { line3_education_credit: allowed }));
  } else {
    const refundable = allowed * AOC_REFUNDABLE_RATE; // Line 8
    const nonrefundable = allowed * AOC_NONREFUNDABLE_RATE; // Line 9
    if (refundable > 0) {
      outputs.push(output(f1040, { line29_refundable_aoc: refundable }));
    }
    if (nonrefundable > 0) {
      outputs.push(
        output(schedule3, { line3_education_credit: nonrefundable }),
      );
    }
  }

  return outputs;
}

// Aggregate all LLC expenses (Line 10), apply $10k cap (Line 11), apply 20% rate (Line 12),
// apply phase-out (Lines 13–18), emit to schedule3 (Line 18 → Credit Limit Worksheet → Line 19).
function llcOutputs(
  items: F8863Items,
  phaseOutMfjStart: number,
  phaseOutMfjEnd: number,
  phaseOutOtherStart: number,
  phaseOutOtherEnd: number,
): NodeOutput[] {
  // LLC items: any student where credit_type="llc" OR where AOC gates failed but llc_adjusted_expenses exist.
  const llcStudents = eligibleLlcStudents(items);

  if (llcStudents.length === 0) return [];

  // Sum all Line 31 values → Line 10.
  const totalExpenses = llcStudents.reduce(
    (sum, item) => sum + (item.llc_adjusted_expenses ?? 0),
    0,
  );

  // Line 11: cap at $10,000.
  const cappedExpenses = Math.min(totalExpenses, LLC_EXPENSE_CAP);

  // Line 12: 20% rate.
  const llcBase = cappedExpenses * LLC_RATE;

  if (llcBase === 0) return [];

  const { magi, isMfj } = returnContext(llcStudents);
  const ratio = calculateForm8863AllowableRatio(
    magi,
    isMfj,
    phaseOutMfjStart,
    phaseOutMfjEnd,
    phaseOutOtherStart,
    phaseOutOtherEnd,
  );
  const llcAllowed = llcBase * ratio; // Line 18

  if (llcAllowed <= 0) return [];

  return [output(schedule3, { line3_education_credit: llcAllowed })];
}

export function calculateForm8863Lines(rawInput: F8863Input) {
  const input = inputSchema.parse(rawInput);
  const items = input.f8863s;
  validateReturnContext(items);
  const aocStudents = eligibleAocStudents(items);
  const llcStudents = eligibleLlcStudents(items);
  if (aocStudents.length === 0 && llcStudents.length === 0) return null;

  const calculatorArgs = [160_000, 180_000, 80_000, 90_000] as const;
  const aoc = aocOutputs(items, ...calculatorArgs);
  const llc = llcOutputs(items, ...calculatorArgs);
  const line8 = aoc.filter((item) => item.nodeType === f1040.nodeType)
    .reduce(
      (sum, item) =>
        sum + (item.fields as Record<string, number>).line29_refundable_aoc,
      0,
    );
  const line9 = aoc.filter((item) => item.nodeType === schedule3.nodeType)
    .reduce(
      (sum, item) =>
        sum + (item.fields as Record<string, number>).line3_education_credit,
      0,
    );
  const line18 = llc.filter((item) => item.nodeType === schedule3.nodeType)
    .reduce(
      (sum, item) =>
        sum + (item.fields as Record<string, number>).line3_education_credit,
      0,
    );
  const tentativeNonrefundable = line9 + line18;
  if (tentativeNonrefundable > 0 && !input.credit_limit_worksheet) {
    throw new Error(
      "Form 8863 needs Credit Limit Worksheet tax and prior-credit amounts",
    );
  }
  const line19 = input.credit_limit_worksheet
    ? calculateForm8863Line19(
      tentativeNonrefundable,
      input.credit_limit_worksheet,
    )
    : 0;
  if (line8 > 0 || line19 > 0) {
    for (const student of aocStudents) {
      validateForm8863FilingSource(student, "aoc");
    }
    for (const student of llcStudents) {
      validateForm8863FilingSource(student, "llc");
    }
    assertDistinctEducationSourceReferences([...aocStudents, ...llcStudents]);
  }
  const context = returnContext([...aocStudents, ...llcStudents]);
  const upper = context.isMfj ? 180_000 : 90_000;
  const span = context.isMfj ? 20_000 : 10_000;
  const ratio = calculateForm8863AllowableRatio(
    context.magi,
    context.isMfj,
    ...calculatorArgs,
  );
  const line1 = aocStudents.reduce(
    (sum, item) =>
      sum + calculateAocStudentLines(item.aoc_adjusted_expenses ?? 0).line30,
    0,
  );
  const line10 = llcStudents.reduce(
    (sum, item) => sum + (item.llc_adjusted_expenses ?? 0),
    0,
  );
  const line11 = Math.min(line10, LLC_EXPENSE_CAP);
  const line12 = line11 * LLC_RATE;
  return {
    aocStudents,
    llcStudents,
    line1,
    line2: upper,
    line3: context.magi,
    line4: Math.max(0, upper - context.magi),
    line5: span,
    line6: ratio,
    line7: line1 * ratio,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13: upper,
    line14: context.magi,
    line15: Math.max(0, upper - context.magi),
    line16: span,
    line17: ratio,
    line18,
    line19,
    kiddieApplies: aocStudents[0]?.taxpayer_under_24_no_refundable_aoc === true,
  };
}

class F8863Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8863";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const lines = calculateForm8863Lines(input);
    if (!lines) return { outputs: [] };
    return {
      outputs: [
        ...(lines.line8 > 0
          ? [output(f1040, { line29_refundable_aoc: lines.line8 })]
          : []),
        ...(lines.line19 > 0
          ? [output(schedule3, { line3_education_credit: lines.line19 })]
          : []),
      ],
    };
  }
}

export const f8863 = new F8863Node();
