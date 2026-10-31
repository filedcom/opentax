import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { f1040 } from "../../../../outputs/general/return-assembly/f1040/index.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { schedule_se } from "../../../../intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import type { MinisterialSource } from "../../../../intermediate/forms/taxes/self-employment/schedule_se/ministerial.ts";

// A minister is an employee for income tax and self-employed for SE tax on
// ministerial services (Pub 517). Every amount here is tied to the minister,
// the church's W-2, and a retained record; anything missing fails closed.
//
// Income tax: the church normally leaves the designated housing allowance
// out of W-2 box 1. Only the excess of the allowance paid over the smallest
// of (amount designated in advance, amount actually used to provide the home,
// fair rental value furnished plus utilities) is income, on Form 1040 line 1h
// as "Excess allowance" (IRC §107(2); Pub 517, "Exclusion of Rental Allowance
// and Fair Rental Value of a Parsonage"). A parsonage provided in kind is
// excluded under §107(1) and needs no income adjustment. Pub 517 also caps
// either exclusion at reasonable pay for the minister's services; the engine
// cannot judge that, so the minister attests to it.
//
// SE tax without an approved Form 4361: wages + allowance paid + parsonage
// fair rental value plus utilities − unreimbursed ministerial expenses, in
// full (Pub 517, "Figuring Net Earnings" and "Expenses Allocable to Tax-Free
// Income"; i1040sse, Ministers). It can be a loss.

export enum MinisterialCredential {
  ORDAINED = "ORDAINED",
  COMMISSIONED = "COMMISSIONED",
  LICENSED = "LICENSED",
}

const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
const reference = z.string().trim().min(1);
const amount = z.number().int().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Clergy dates must be valid calendar dates");

const ministerSchema = z.object({
  owner: z.enum(["taxpayer", "spouse"]),
  name: z.string().trim().min(1),
  ssn,
  credential: z.nativeEnum(MinisterialCredential),
  ordained_commissioned_or_licensed_confirmed: z.literal(true),
  ministerial_services_confirmed: z.literal(true),
  credential_reference: reference,
}).strict();

const employerSchema = z.object({
  employer_name: z.string().trim().min(1),
  employer_ein: ein,
  // The entered W-2's source_document_reference.
  w2_reference: reference,
}).strict();

const designationSchema = z.object({
  amount,
  designated_on: isoDate,
  // First day of the period the designation covers.
  effective_from: isoDate,
  designation_reference: reference,
}).strict();

const housingAllowanceSchema = z.object({
  included_in_w2_box1: z.boolean(),
  designation: designationSchema,
  paid: z.object({
    amount,
    payment_records_reference: reference,
    paid_after_designation_confirmed: z.literal(true),
  }).strict(),
  actual_housing_expenses: z.object({
    amount,
    expense_records_reference: reference,
  }).strict(),
  // Fair rental value of the home, furnished, plus the cost of utilities.
  fair_rental_value: z.object({
    amount,
    furnished_plus_utilities_confirmed: z.literal(true),
    fair_rental_value_reference: reference,
  }).strict(),
  // Pub 517, "Rental allowances": excludable only if "the amount isn't more
  // than reasonable pay for your services".
  not_more_than_reasonable_pay_confirmed: z.literal(true),
}).strict();

const parsonageSchema = z.object({
  fair_rental_value_plus_utilities: amount.positive(),
  fair_rental_value_reference: reference,
  // Pub 517, "Fair rental value of parsonage": "the exclusion can't be more
  // than the reasonable pay for your services".
  not_more_than_reasonable_pay_confirmed: z.literal(true),
}).strict();

const unreimbursedExpensesSchema = z.object({
  amount: amount.positive(),
  not_reimbursed_confirmed: z.literal(true),
  expense_records_reference: reference,
}).strict();

const form4361Schema = z.discriminatedUnion("approved", [
  z.object({ approved: z.literal(false) }).strict(),
  z.object({
    approved: z.literal(true),
    approved_on: isoDate,
    approval_reference: reference,
  }).strict(),
]);

export const itemSchema = z.object({
  tax_year: z.number().int(),
  minister: ministerSchema,
  employer: employerSchema,
  // Equals box 1 of the referenced W-2; a W-2 mixing ministerial and other
  // pay fails closed rather than being split.
  ministerial_wages: z.number().finite().nonnegative(),
  housing_allowance: housingAllowanceSchema.optional(),
  parsonage: parsonageSchema.optional(),
  // Reduces ministerial SE earnings only; ignored with an approved Form 4361,
  // which leaves no ministerial SE earnings to reduce.
  unreimbursed_ministerial_expenses: unreimbursedExpensesSchema.optional(),
  form4361: form4361Schema,
}).strict().superRefine((item, context) => {
  const yearEnd = `${item.tax_year}-12-31`;
  const designation = item.housing_allowance?.designation;
  if (designation && designation.designated_on > designation.effective_from) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["housing_allowance", "designation", "designated_on"],
      message:
        "Clergy housing allowance must be designated before the period it covers",
    });
  }
  if (
    designation &&
    (designation.designated_on > yearEnd || designation.effective_from > yearEnd)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["housing_allowance", "designation", "effective_from"],
      message: `Clergy housing designation must cover ${item.tax_year}`,
    });
  }
});

const returnFilerSchema = z.object({
  filing_status: z.string().optional(),
  taxpayer_ssn: z.string().optional(),
  taxpayer_first_name: z.string().optional(),
  taxpayer_middle_initial: z.string().optional(),
  taxpayer_last_name: z.string().optional(),
  spouse_ssn: z.string().optional(),
  spouse_first_name: z.string().optional(),
  spouse_middle_initial: z.string().optional(),
  spouse_last_name: z.string().optional(),
}).strict();

const returnW2Schema = z.object({
  employee_ssn: z.string().optional(),
  employer_ein: z.string().optional(),
  employer_name: z.string().optional(),
  source_document_reference: z.string().optional(),
  box1_wages: z.number(),
  box3_ss_wages: z.number().optional(),
  box5_medicare_wages: z.number().optional(),
  box13_statutory_employee: z.boolean().optional(),
}).strict();

export const inputSchema = z.object({
  clergys: z.array(itemSchema).min(1),
  // Return context the start node supplies: the filer identity and the
  // entered W-2s each clergy entry must reconcile to.
  return_filer: returnFilerSchema.optional(),
  return_w2s: z.array(returnW2Schema).optional(),
});

export type ClergyItem = z.infer<typeof itemSchema>;
type ClergyInput = z.infer<typeof inputSchema>;
export type ReturnFiler = z.infer<typeof returnFilerSchema>;
export type ReturnW2 = z.infer<typeof returnW2Schema>;

export interface ClergyAmounts {
  readonly allowance_paid: number;
  readonly excludable_allowance: number;
  readonly excess_allowance: number;
  readonly parsonage_value: number;
  readonly unreimbursed_expenses: number;
  /** Null when an approved Form 4361 exempts ministerial earnings. */
  readonly ministerial_se_earnings: number | null;
}

const digits = (value: string | undefined) => (value ?? "").replace(/\D/g, "");
const normalizedName = (value: string) =>
  value.trim().toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ");

// Courtesy titles and generational suffixes a minister's name may carry on a
// credential or W-2 but not in the return's name fields.
const NAME_TITLES = new Set(["REV", "REVEREND", "PASTOR", "DR", "FR"]);
const NAME_SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

/**
 * The minister's name as compared with the return: case, periods, commas
 * and extra spaces are ignored, and so are leading titles (Rev., Reverend,
 * Pastor, Dr., Fr.) and trailing suffixes (Jr., Sr., II, III, IV).
 * Every other word must match the return's first, optional middle initial
 * and last name, in order.
 */
export function comparablePersonName(value: string): string {
  const words = normalizedName(value).split(" ").filter(Boolean);
  let start = 0;
  let end = words.length;
  while (start < end - 1 && NAME_TITLES.has(words[start])) start++;
  while (end > start + 1 && NAME_SUFFIXES.has(words[end - 1])) end--;
  return words.slice(start, end).join(" ");
}

export function clergyRecipient(item: ClergyItem): "T" | "S" {
  return item.minister.owner === "taxpayer" ? "T" : "S";
}

/** §107(2) limits: the smallest of designated, used, and fair rental value. */
export function clergyAmounts(item: ClergyItem): ClergyAmounts {
  const housing = item.housing_allowance;
  if (housing?.included_in_w2_box1 === true) {
    throw new Error(
      "Clergy housing allowance included in W-2 box 1 needs a corrected W-2 (Form W-2c); the engine does not subtract an exclusion from reported wages",
    );
  }
  const paid = housing?.paid.amount ?? 0;
  const excludable = housing
    ? Math.min(
      housing.designation.amount,
      paid,
      housing.actual_housing_expenses.amount,
      housing.fair_rental_value.amount,
    )
    : 0;
  const parsonage = item.parsonage?.fair_rental_value_plus_utilities ?? 0;
  // Expenses only reduce SE earnings (Pub 517, "Allowable deductions"); with
  // an approved Form 4361 there are none to reduce, so they are ignored.
  const expenses = item.form4361.approved
    ? 0
    : item.unreimbursed_ministerial_expenses?.amount ?? 0;
  return {
    allowance_paid: paid,
    excludable_allowance: excludable,
    excess_allowance: paid - excludable,
    parsonage_value: parsonage,
    unreimbursed_expenses: expenses,
    ministerial_se_earnings: item.form4361.approved
      ? null
      : item.ministerial_wages + paid + parsonage - expenses,
  };
}

/** Schedule SE line 2 rows, one per W-2 of a minister without Form 4361. */
export function ministerialSeSources(
  items: readonly ClergyItem[],
): MinisterialSource[] {
  return items.flatMap((item) => {
    const earnings = clergyAmounts(item).ministerial_se_earnings;
    // Its own reference: the same W-2 is also a Schedule SE wage source.
    return earnings === null || earnings === 0 ? [] : [{
      recipient: clergyRecipient(item),
      source_reference: `ministerial ${item.employer.w2_reference}`,
      net_earnings: earnings,
    }];
  });
}

/** Whether public clergy rows claim ministerial SE earnings (no Form 4361). */
export function hasMinisterialSeClaim(raw: unknown): boolean {
  return Array.isArray(raw) &&
    raw.some((item) =>
      item !== null && typeof item === "object" &&
      (item as { form4361?: { approved?: unknown } }).form4361?.approved !==
        true
    );
}

function ownerIdentity(
  item: ClergyItem,
  filer: ReturnFiler,
): { ssn: string; names: string[] } {
  const prefix = item.minister.owner;
  if (prefix === "spouse" && filer.filing_status !== "mfj") {
    throw new Error(
      "Clergy spouse minister needs a joint return; a separate return reports only its own filer",
    );
  }
  const first = filer[`${prefix}_first_name`] ?? "";
  const middle = filer[`${prefix}_middle_initial`] ?? "";
  const last = filer[`${prefix}_last_name`] ?? "";
  return {
    ssn: digits(filer[`${prefix}_ssn`]),
    names: [
      [first, middle, last].filter(Boolean).join(" "),
      [first, last].filter(Boolean).join(" "),
    ].map(comparablePersonName),
  };
}

/**
 * The entered W-2 a clergy entry reconciles to: same employee SSN, employer
 * EIN and name, issued-copy reference, box 1 equal to the ministerial wages,
 * and no social security or Medicare wages (a minister's earnings are not
 * covered under FICA; Pub 517, Table 1).
 */
export function matchedClergyW2(
  item: ClergyItem,
  w2s: readonly ReturnW2[],
): ReturnW2 {
  const matches = w2s.filter((w2) =>
    digits(w2.employee_ssn) === digits(item.minister.ssn) &&
    digits(w2.employer_ein) === digits(item.employer.employer_ein) &&
    w2.source_document_reference === item.employer.w2_reference
  );
  const w2 = matches[0];
  if (
    matches.length !== 1 ||
    normalizedName(w2.employer_name ?? "") !==
      normalizedName(item.employer.employer_name) ||
    w2.box13_statutory_employee === true ||
    Math.abs(w2.box1_wages - item.ministerial_wages) > 0.005
  ) {
    throw new Error(
      `Clergy income needs a matched W-2: ${item.employer.w2_reference} must be one entered W-2 for the minister's SSN, the church's EIN and name, with box 1 equal to the ministerial wages`,
    );
  }
  if ((w2.box3_ss_wages ?? 0) !== 0 || (w2.box5_medicare_wages ?? 0) !== 0) {
    throw new Error(
      `Clergy W-2 ${item.employer.w2_reference} shows social security or Medicare wages; ministerial wages are not FICA wages, so the church must correct the W-2`,
    );
  }
  return w2;
}

/** Owner, year, and W-2 reconciliation for every clergy entry. */
export function reconcileClergyItems(
  items: readonly ClergyItem[],
  filer: ReturnFiler | undefined,
  w2s: readonly ReturnW2[] | undefined,
  taxYear: number,
): void {
  if (items.some((item) => item.tax_year !== taxYear)) {
    throw new Error(`Clergy entries must be for ${taxYear}`);
  }
  if (!filer) {
    throw new Error("Clergy income needs the return's filer identity");
  }
  const references = items.map((item) => item.employer.w2_reference);
  if (new Set(references).size !== references.length) {
    throw new Error("Clergy entries need a distinct W-2 for each church");
  }
  for (const owner of ["taxpayer", "spouse"] as const) {
    const rows = items.filter((item) => item.minister.owner === owner);
    const ssns = new Set(rows.map((item) => digits(item.minister.ssn)));
    if (ssns.size > 1) {
      throw new Error(`Clergy ${owner} entries disagree on the minister's SSN`);
    }
    // A Form 4361 exemption covers all of one minister's ministerial
    // earnings (IRC §1402(e)), so every church W-2 must say the same.
    if (new Set(rows.map((item) => item.form4361.approved)).size > 1) {
      throw new Error(
        `Clergy ${owner} entries disagree on Form 4361 approval; one minister's exemption covers every church W-2`,
      );
    }
  }
  for (const item of items) {
    const owner = ownerIdentity(item, filer);
    if (
      owner.ssn.length !== 9 || owner.ssn !== digits(item.minister.ssn) ||
      !owner.names.includes(comparablePersonName(item.minister.name))
    ) {
      throw new Error(
        `Clergy minister on ${item.employer.w2_reference} differs from the return's ${item.minister.owner}`,
      );
    }
    matchedClergyW2(item, w2s ?? []);
  }
}

function excessAllowanceOutputs(excess: number): NodeOutput[] {
  if (excess === 0) return [];
  // Excess allowance is Form 1040 line 1h income and so also reaches AGI.
  return [
    output(f1040, { line1h_other_earned: excess }),
    output(agi_aggregator, { line1h_other_earned: excess }),
  ];
}

function scheduleSeOutputs(items: readonly ClergyItem[]): NodeOutput[] {
  const rows = ministerialSeSources(items);
  return rows.length === 0
    ? []
    : [output(schedule_se, { ministerial_sources: rows })];
}

class ClergyNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "clergy";
  readonly inputSchema = inputSchema;
  override readonly contextFields = ["return_filer", "return_w2s"];
  readonly outputNodes = new OutputNodes([f1040, agi_aggregator, schedule_se]);

  compute(ctx: NodeContext, rawInput: ClergyInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    reconcileClergyItems(
      input.clergys,
      input.return_filer,
      input.return_w2s,
      ctx.taxYear,
    );
    const excess = input.clergys.reduce(
      (sum, item) => sum + clergyAmounts(item).excess_allowance,
      0,
    );
    return {
      outputs: [
        ...excessAllowanceOutputs(excess),
        ...scheduleSeOutputs(input.clergys),
      ],
    };
  }
}

export const clergy = new ClergyNode();
