import { z } from "zod";
import {
  type ClergyItem,
  clergyAmounts,
  clergyRecipient,
  inputSchema as clergyInputSchema,
  ministerialSeSources,
  reconcileClergyItems,
  type ReturnFiler,
} from "../../../../../nodes/inputs/income/wages/clergy/index.ts";
import { inputSchema as w2InputSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { ministerialSourceSchema } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/ministerial.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { withMinisterialEarnings } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/ministerial.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { assertOwnedScheduleSE } from "../../../taxes/self-employment/schedule-se/schedule-se-owner-source.ts";
import { scheduleSeSpouseProprietor } from "../../../taxes/self-employment/schedule-se/schedule-se-proprietor.ts";

type Recipient = "T" | "S";
type Pending = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

/** What the filed forms show for a reconciled clergy return. */
export interface ClergyReturnFacts {
  readonly items: readonly ClergyItem[];
  /** Form 1040 line 1h "Excess allowance" (Pub 517). */
  readonly excessAllowance: number;
  /** Schedule SE line A: Form 4361 minister with $400+ other SE earnings. */
  readonly scheduleSeLineA: ReadonlySet<Recipient>;
  /** Schedule 2 line 4 box 1: Form 4361 and no other income subject to SE tax. */
  readonly schedule2Form4361: boolean;
  /** Form 1040 line 27b: clergy with Schedule SE line 4c also in line 1z. */
  readonly form1040Line27bClergy: boolean;
  /**
   * Schedule SE line 2 explanation, by the minister whose Schedule SE is
   * filed, present only when unreimbursed expenses reduce line 2.
   */
  readonly scheduleSeExplanations: ReadonlyMap<Recipient, string>;
}

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);
const whole = (value: number) => Math.round(value);

/**
 * Clergy rows the exporters can file: every row is source-complete, matches
 * the filer and W-2 context it was computed with, and keeps the allowance
 * out of W-2 box 1. The export guard reconciles again to the retained
 * general and W-2 sources and the return year.
 */
export function isSupportedClergyRoute(raw: unknown): boolean {
  const parsed = clergyInputSchema.safeParse(raw);
  if (!parsed.success) return false;
  const items = parsed.data.clergys;
  if (items.some((item) => item.housing_allowance?.included_in_w2_box1)) {
    return false;
  }
  try {
    reconcileClergyItems(
      items,
      parsed.data.return_filer,
      parsed.data.return_w2s,
      items[0].tax_year,
    );
    return true;
  } catch {
    return false;
  }
}

function returnFiler(general: Readonly<Record<string, unknown>> | undefined) {
  const text = (key: string) =>
    typeof general?.[key] === "string" ? general[key] as string : undefined;
  return {
    filing_status: text("filing_status"),
    taxpayer_ssn: text("taxpayer_ssn"),
    taxpayer_first_name: text("taxpayer_first_name"),
    taxpayer_middle_initial: text("taxpayer_middle_initial"),
    taxpayer_last_name: text("taxpayer_last_name"),
    spouse_ssn: text("spouse_ssn"),
    spouse_first_name: text("spouse_first_name"),
    spouse_middle_initial: text("spouse_middle_initial"),
    spouse_last_name: text("spouse_last_name"),
  } satisfies ReturnFiler;
}

/** Retained clergy rows, reconciled again to the retained general and W-2 sources. */
export function reconcileRetainedClergy(
  pending: Pending,
  taxYear: number,
  filer?: FilerIdentity,
): readonly ClergyItem[] | undefined {
  if (pending.clergy === undefined) return undefined;
  const items = clergyInputSchema.parse(pending.clergy).clergys;
  const general = returnFiler(pending.general);
  const w2s = pending.w2 === undefined
    ? []
    : w2InputSchema.parse(pending.w2).w2s;
  reconcileClergyItems(items, general, w2s, taxYear);
  if (filer) {
    const joint = filer.filingStatus === FilingStatus.MarriedFilingJointly;
    for (const item of items) {
      const ssn = item.minister.owner === "taxpayer"
        ? filer.primarySSN
        : joint
        ? filer.spouse?.ssn
        : undefined;
      if (digits(ssn) !== digits(item.minister.ssn)) {
        throw new Error(
          `Clergy minister on ${item.employer.w2_reference} differs from the filed return`,
        );
      }
    }
  }
  return items;
}

/** Other SE earnings sources (Schedule C, Schedule F, partnership) by owner. */
function otherSeOwners(pending: Pending, taxYear: number): {
  readonly owners: ReadonlySet<Recipient>;
  readonly filed: ReadonlySet<Recipient>;
} {
  const se = pending.schedule_se;
  if (se?.owner_identity) {
    // Ministerial earnings are retained apart, in `ministerial_sources`.
    const rows = z.array(
      z.object({ recipient: z.enum(["T", "S"]) }).passthrough(),
    ).parse(se.owner_business_sources ?? []);
    const owned = assertOwnedScheduleSE(pending as Record<string, Record<string, unknown>>, taxYear);
    return {
      owners: new Set(rows.map((row) => row.recipient)),
      filed: new Set(owned?.instances.map((row) => row.recipient) ?? []),
    };
  }
  const business = [se?.net_profit_schedule_c, se?.net_profit_schedule_f].some((
    value,
  ) => typeof value === "number" && value !== 0) ||
    se?.farm_optional_method_elected === true;
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${taxYear}`);
  const lines = se === undefined
    ? undefined
    : scheduleSELines(withMinisterialEarnings(se), cfg.ssWageBase, cfg);
  const owner: Recipient = se !== undefined &&
      scheduleSeSpouseProprietor(pending as Record<string, unknown>, se)
    ? "S"
    : "T";
  return {
    owners: new Set(business ? [owner] : []),
    filed: new Set(lines ? [owner] : []),
  };
}

function retainedMinisterialRows(pending: Pending) {
  return z.array(ministerialSourceSchema).parse(
    pending.schedule_se?.ministerial_sources ?? [],
  );
}

function sameRows(
  a: readonly z.infer<typeof ministerialSourceSchema>[],
  b: readonly z.infer<typeof ministerialSourceSchema>[],
): boolean {
  const key = (row: z.infer<typeof ministerialSourceSchema>) =>
    `${row.recipient}|${row.source_reference}|${row.net_earnings}`;
  return JSON.stringify(a.map(key).sort()) === JSON.stringify(b.map(key).sort());
}

/**
 * Schedule SE line 2 explanation. Instructions for Schedule SE (2025),
 * Ministers: "subtract on line 2 the allowable expenses from your
 * self-employment earnings and attach an explanation"; Pub 517 (2025),
 * "Allowable deductions": "Subtract any allowable expenses from those wages,
 * include the net amount on line 2 of Schedule SE (Form 1040), and attach an
 * explanation."
 */
export function clergyScheduleSeExplanation(
  items: readonly ClergyItem[],
): string {
  const lines = items.map((item) => {
    const amounts = clergyAmounts(item);
    return `${item.employer.employer_name} (EIN ${
      digits(item.employer.employer_ein)
    }; source W-2: ${item.employer.w2_reference}): ministerial wages ${
      whole(item.ministerial_wages)
    }; housing allowance paid ${amounts.allowance_paid} (excluded from income ${amounts.excludable_allowance}, excess ${amounts.excess_allowance} on Form 1040 line 1h); parsonage fair rental value plus utilities ${amounts.parsonage_value}; unreimbursed ministerial expenses ${amounts.unreimbursed_expenses}; net ${
      whole(amounts.ministerial_se_earnings ?? 0)
    }.`;
  });
  const total = sum(
    items.map((item) => clergyAmounts(item).ministerial_se_earnings ?? 0),
  );
  return [
    "Schedule SE line 2 includes net earnings from ministerial services, less allowable expenses (Instructions for Schedule SE, Ministers; Pub. 517, Allowable deductions).",
    ...lines,
    `Total ministerial earnings on line 2: ${whole(total)}.`,
    "Unreimbursed ministerial expenses reduce self-employment earnings only; no part is deducted for income tax.",
  ].join(" ");
}

/**
 * The filing guard for a return with clergy rows: the rows reconcile to the
 * return's filer and W-2s, the finalized Schedule SE carries exactly their
 * ministerial earnings, and the route is one the exporters represent.
 */
export function assertFileableClergyReturn(
  pending: Pending,
  taxYear: number,
  filer?: FilerIdentity,
): ClergyReturnFacts | undefined {
  const items = reconcileRetainedClergy(pending, taxYear, filer);
  if (!items) return undefined;
  const expected = ministerialSeSources(items);
  if (!sameRows(expected, retainedMinisterialRows(pending))) {
    throw new Error(
      "Clergy ministerial earnings differ from the finalized Schedule SE line 2 sources",
    );
  }
  if (
    pending.schedule_c !== undefined &&
    scheduleCInputSchema.parse(pending.schedule_c).schedule_cs.some((item) =>
      item.clergy_schedule_c === true
    )
  ) {
    throw new Error(
      "Clergy Schedule C fees and honoraria need a ministerial Schedule C route; not yet supported",
    );
  }
  const f1040 = pending.f1040 ?? {};
  if (typeof f1040.line27_eitc === "number" && f1040.line27_eitc > 0) {
    throw new Error(
      "Earned income credit with clergy income needs the clergy earned-income rules; not yet supported",
    );
  }
  if (
    expected.length > 0 && typeof f1040.line28_actc === "number" &&
    f1040.line28_actc > 0
  ) {
    throw new Error(
      "Additional child tax credit with ministerial SE earnings needs the clergy earned-income rules; not yet supported",
    );
  }
  const other = otherSeOwners(pending, taxYear);
  // Refused for anyone on the return, not only the minister. The joint
  // Schedule SE keeps each spouse's earnings apart, but the export guards
  // that replay the owner Schedule SE sources for QBI (Forms 8995 and
  // 8995-A), Schedule 1-A and Form 7206 would see the ministerial rows as
  // businesses; they are not ministerial-aware yet.
  if (expected.length > 0 && other.owners.size > 0) {
    throw new Error(
      "Schedule SE combining ministerial earnings with business or partnership earnings on the same return (including a spouse's) is not yet supported",
    );
  }
  const exempt = new Set(
    items.filter((item) => item.form4361.approved).map(clergyRecipient),
  );
  const seTax = pending.schedule2?.line4_se_tax;
  const anySeTax = typeof seTax === "number" && seTax > 0;
  const lineA = new Set<Recipient>();
  let schedule2Form4361 = false;
  for (const recipient of exempt) {
    if (other.owners.has(recipient)) {
      if (!other.filed.has(recipient)) {
        throw new Error(
          "Form 4361 minister with other SE earnings under $400 needs a reviewed Schedule 2 line 4 presentation; not yet supported",
        );
      }
      lineA.add(recipient);
    } else if (anySeTax) {
      // The 2025 Schedule SE instructions say to check box 1 "if you had no
      // other income subject to SE tax"; whether a joint return also checks
      // it beside the other spouse's SE tax was not confirmed.
      throw new Error(
        "Form 4361 minister without other SE income beside another Schedule SE (such as a spouse's) needs a reviewed Schedule 2 line 4 presentation; not yet supported",
      );
    } else {
      schedule2Form4361 = true;
    }
  }
  // With no other SE sources, a minister's Schedule SE is filed when the
  // ministerial earnings alone reach line 4c's $400.
  const filedMinisterial = new Set(
    expected.map((row) => row.recipient).filter((recipient) =>
      other.filed.has(recipient)
    ),
  );
  // The explanation is for expenses subtracted on line 2; with none, line 2
  // is the wages and housing amounts alone and nothing is attached.
  const explanations = new Map<Recipient, string>();
  for (const recipient of filedMinisterial) {
    const rows = items.filter((item) =>
      clergyRecipient(item) === recipient && !item.form4361.approved
    );
    if (rows.some((item) => clergyAmounts(item).unreimbursed_expenses > 0)) {
      explanations.set(recipient, clergyScheduleSeExplanation(rows));
    }
  }
  return {
    items,
    excessAllowance: sum(items.map((item) => clergyAmounts(item).excess_allowance)),
    scheduleSeLineA: lineA,
    schedule2Form4361,
    form1040Line27bClergy: items.some((item) =>
      !item.form4361.approved && filedMinisterial.has(clergyRecipient(item)) &&
      item.ministerial_wages + clergyAmounts(item).excess_allowance > 0
    ),
    scheduleSeExplanations: explanations,
  };
}
