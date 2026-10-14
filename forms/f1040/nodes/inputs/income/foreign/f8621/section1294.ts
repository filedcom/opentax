import { z } from "zod";
import {
  assertRetainedSourceCopy,
  retainedSourceCopySchema,
} from "./retained_source_copy.ts";
import { section6621QuarterlyUnderpaymentRates } from "./excess_distribution.ts";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dollars = z.number().int().safe().nonnegative();

export const priorSection1294ElectionSchema = z.object({
  election_tax_year: z.number().int().min(1987).max(2024),
  remaining_undistributed_earnings_usd: dollars.positive(),
  deferred_tax_outstanding_usd: dollars.positive(),
  prior_filed_form: retainedSourceCopySchema.extend({
    pfic_reference_id: z.string().trim().min(1),
    prior_line8e_undistributed_earnings_usd: dollars.positive(),
    prior_line9c_deferred_tax_usd: dollars.positive(),
    submission_id: z.string().trim().min(1),
    applicable_original_due_date: date.optional(),
    due_date_evidence: retainedSourceCopySchema.extend({
      election_tax_year: z.number().int().min(1987).max(2024),
      applicable_original_due_date: date,
    }).optional(),
  }),
  accepted_acknowledgment: retainedSourceCopySchema.extend({
    submission_id: z.string().trim().min(1),
    disposition: z.literal("Accepted"),
  }),
  latest_2024_status: retainedSourceCopySchema.extend({
    pfic_reference_id: z.string().trim().min(1),
    election_tax_year: z.number().int().min(1987).max(2023),
    line18_earnings_before_2024_termination_usd: dollars.positive(),
    line19_deferred_tax_before_2024_termination_usd: dollars.positive(),
    line22_earnings_terminated_2024_usd: dollars,
    line23_deferred_tax_due_2024_usd: dollars,
    line25_deferred_tax_remaining_usd: dollars.optional(),
    submission_id: z.string().trim().min(1),
    accepted_acknowledgment: retainedSourceCopySchema.extend({
      submission_id: z.string().trim().min(1),
      disposition: z.literal("Accepted"),
    }),
  }).optional(),
}).strict();

export const section1294TerminationEventSchema = z.object({
  event_id: z.string().trim().min(1),
  date,
  description: z.string().trim().min(1).max(35),
  earnings_distributed_or_deemed_usd: dollars.positive(),
  activity_record: retainedSourceCopySchema,
}).strict();

export const section1294PriorStatusSchema = z.object({
  filing_date: date,
  prior_elections: z.array(priorSection1294ElectionSchema).min(1),
  termination_events: z.array(section1294TerminationEventSchema),
}).strict();

export type Section1294PriorStatus = z.infer<
  typeof section1294PriorStatusSchema
>;

function day(value: string): number {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Form 8621 section 1294 needs a real calendar date");
  }
  return parsed.getTime();
}

/** Section 6621 daily compounding, using the published TY2026 quarters. */
const original1040DueDate: Readonly<Record<number, string>> = {
  // Calendar-year 1040 due dates (without filing extensions), verified from
  // the IRS annual filing guidance. Other years need an actual due-date source.
  2016: "2017-04-18",
  2017: "2018-04-17",
  2018: "2019-04-15",
  2021: "2022-04-18",
  2022: "2023-04-18",
  2023: "2024-04-15",
  2024: "2025-04-15",
};

export function section1294Interest(
  electionTaxYear: number,
  principal: number,
  endDate: string,
  sourcedDueDate?: string,
): number {
  if (!Number.isSafeInteger(principal) || principal < 0) {
    throw new Error(
      "Form 8621 section 1294 interest needs nonnegative deferred tax",
    );
  }
  const dueDate = sourcedDueDate ?? original1040DueDate[electionTaxYear];
  if (!dueDate) {
    throw new Error(
      "Form 8621 section 1294 needs verified original return due-date evidence",
    );
  }
  if (
    day(dueDate) < day(`${electionTaxYear + 1}-04-15`) ||
    day(dueDate) > day(`${electionTaxYear + 1}-12-31`)
  ) {
    throw new Error(
      "Form 8621 section 1294 original due date is outside election filing year",
    );
  }
  let current = day(dueDate);
  const end = day(endDate);
  if (end < current) {
    throw new Error(
      "Form 8621 section 1294 interest ends before election due date",
    );
  }
  let balance = principal;
  while (current < end) {
    const date = new Date(current);
    const year = date.getUTCFullYear();
    const quarter = Math.floor(date.getUTCMonth() / 3);
    const rate = section6621QuarterlyUnderpaymentRates[year]?.[quarter];
    if (rate === undefined) {
      throw new Error(
        "Form 8621 section 1294 lacks a verified section 6621 rate",
      );
    }
    const leap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
    balance *= 1 + rate / 100 / (leap ? 366 : 365);
    current += 86_400_000;
  }
  return Math.round(balance - principal);
}

export interface Section1294StatusColumn {
  readonly taxYear: number;
  readonly earnings: number;
  readonly deferredTax: number;
  readonly interestAtFiling: number;
  readonly terminationDescription?: string;
  readonly earningsDistributed?: number;
  readonly taxDue?: number;
  readonly interestDue?: number;
  readonly taxRemaining?: number;
  readonly interestRemaining?: number;
}

/** Allocate 2025 terminating earnings newest election first, as the IRS directs. */
export function calculateSection1294PriorStatus(
  raw: Section1294PriorStatus,
  pficReferenceId: string,
): Section1294StatusColumn[] {
  const source = section1294PriorStatusSchema.parse(raw);
  const filedOn = day(source.filing_date);
  if (filedOn < day("2026-01-01")) {
    throw new Error("Form 8621 2025 return filing date cannot precede 2026");
  }
  const seen = new Set<number>();
  const elections = [...source.prior_elections].sort((a, b) =>
    b.election_tax_year - a.election_tax_year
  );
  for (const election of elections) {
    if (seen.has(election.election_tax_year)) {
      throw new Error(
        "Form 8621 section 1294 prior election years must be distinct",
      );
    }
    seen.add(election.election_tax_year);
    assertRetainedSourceCopy(
      election.prior_filed_form,
      "Form 8621 prior section 1294 filing",
    );
    assertRetainedSourceCopy(
      election.accepted_acknowledgment,
      "Form 8621 prior section 1294 acceptance",
    );
    if (
      election.prior_filed_form.pfic_reference_id !== pficReferenceId ||
      election.prior_filed_form.submission_id !==
        election.accepted_acknowledgment.submission_id ||
      election.prior_filed_form.prior_line8e_undistributed_earnings_usd <
        election.remaining_undistributed_earnings_usd ||
      election.prior_filed_form.prior_line9c_deferred_tax_usd <
        election.deferred_tax_outstanding_usd
    ) {
      throw new Error(
        "Form 8621 section 1294 prior filed amounts or acceptance differ",
      );
    }
    const sourceDue = election.prior_filed_form.applicable_original_due_date;
    const dueEvidence = election.prior_filed_form.due_date_evidence;
    if (sourceDue !== undefined || dueEvidence !== undefined) {
      if (
        !sourceDue || !dueEvidence ||
        dueEvidence.election_tax_year !== election.election_tax_year ||
        dueEvidence.applicable_original_due_date !== sourceDue
      ) {
        throw new Error(
          "Form 8621 section 1294 due date differs from retained evidence",
        );
      }
      assertRetainedSourceCopy(
        dueEvidence,
        "Form 8621 original return due date",
      );
    }
    const status = election.latest_2024_status;
    if (election.election_tax_year === 2024) {
      if (
        status ||
        election.prior_filed_form.prior_line8e_undistributed_earnings_usd !==
          election.remaining_undistributed_earnings_usd ||
        election.prior_filed_form.prior_line9c_deferred_tax_usd !==
          election.deferred_tax_outstanding_usd
      ) {
        throw new Error(
          "Form 8621 2024 election differs from initial accepted filing",
        );
      }
    } else {
      if (!status) {
        throw new Error(
          "Form 8621 older section 1294 election needs accepted 2024 status",
        );
      }
      assertRetainedSourceCopy(
        status,
        "Form 8621 accepted 2024 election status",
      );
      assertRetainedSourceCopy(
        status.accepted_acknowledgment,
        "Form 8621 2024 status acceptance",
      );
      const earningsRemaining =
        status.line18_earnings_before_2024_termination_usd -
        status.line22_earnings_terminated_2024_usd;
      const taxRemaining =
        status.line19_deferred_tax_before_2024_termination_usd -
        status.line23_deferred_tax_due_2024_usd;
      if (
        status.pfic_reference_id !== pficReferenceId ||
        status.election_tax_year !== election.election_tax_year ||
        status.submission_id !== status.accepted_acknowledgment.submission_id ||
        earningsRemaining !== election.remaining_undistributed_earnings_usd ||
        taxRemaining !== election.deferred_tax_outstanding_usd ||
        (status.line22_earnings_terminated_2024_usd > 0
          ? status.line25_deferred_tax_remaining_usd !== taxRemaining
          : status.line25_deferred_tax_remaining_usd !== undefined) ||
        status.line23_deferred_tax_due_2024_usd !== Math.round(
            status.line19_deferred_tax_before_2024_termination_usd *
              status.line22_earnings_terminated_2024_usd /
              status.line18_earnings_before_2024_termination_usd,
          )
      ) {
        throw new Error(
          "Form 8621 2024 accepted election status differs from remaining amount",
        );
      }
    }
  }
  const remaining = new Map(elections.map((row) => [
    row.election_tax_year,
    row.remaining_undistributed_earnings_usd,
  ]));
  const allocations = new Map<number, { amount: number; labels: string[] }>();
  const events = [...source.termination_events].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  if (new Set(events.map((event) => event.event_id)).size !== events.length) {
    throw new Error(
      "Form 8621 section 1294 termination event IDs must be distinct",
    );
  }
  for (const event of events) {
    const eventDay = day(event.date);
    if (
      eventDay < day("2025-01-01") || eventDay > day("2025-12-31") ||
      eventDay > filedOn
    ) {
      throw new Error("Form 8621 section 1294 termination must occur in 2025");
    }
    assertRetainedSourceCopy(
      event.activity_record,
      "Form 8621 section 1294 termination activity",
    );
    let unapplied = event.earnings_distributed_or_deemed_usd;
    for (const election of elections) {
      const available = remaining.get(election.election_tax_year) ?? 0;
      const used = Math.min(available, unapplied);
      if (used <= 0) continue;
      remaining.set(election.election_tax_year, available - used);
      const prior = allocations.get(election.election_tax_year) ?? {
        amount: 0,
        labels: [],
      };
      prior.amount += used;
      prior.labels.push(event.description);
      allocations.set(election.election_tax_year, prior);
      unapplied -= used;
      if (unapplied === 0) break;
    }
    if (unapplied > 0) {
      throw new Error(
        "Form 8621 section 1294 termination exceeds outstanding earnings",
      );
    }
  }
  return elections.map((election) => {
    const allocated = allocations.get(election.election_tax_year);
    const due = allocated
      ? Math.round(
        election.deferred_tax_outstanding_usd * allocated.amount /
          election.remaining_undistributed_earnings_usd,
      )
      : 0;
    const interestAtFiling = section1294Interest(
      election.election_tax_year,
      election.deferred_tax_outstanding_usd,
      source.filing_date,
      election.prior_filed_form.applicable_original_due_date,
    );
    if (!allocated) {
      return {
        taxYear: election.election_tax_year,
        earnings: election.remaining_undistributed_earnings_usd,
        deferredTax: election.deferred_tax_outstanding_usd,
        interestAtFiling,
      };
    }
    const interestDue = section1294Interest(
      election.election_tax_year,
      due,
      "2026-04-15",
      election.prior_filed_form.applicable_original_due_date,
    );
    const labels = [...new Set(allocated.labels)].join("; ");
    if (labels.length > 35) {
      throw new Error(
        "Form 8621 section 1294 termination label exceeds line 21",
      );
    }
    if (
      allocated.amount < election.remaining_undistributed_earnings_usd &&
      interestAtFiling < interestDue
    ) {
      throw new Error(
        "Form 8621 early-filed partial section 1294 termination would make line 26 negative",
      );
    }
    return {
      taxYear: election.election_tax_year,
      earnings: election.remaining_undistributed_earnings_usd,
      deferredTax: election.deferred_tax_outstanding_usd,
      interestAtFiling,
      terminationDescription: labels,
      earningsDistributed: allocated.amount,
      taxDue: due,
      interestDue,
      ...(allocated.amount < election.remaining_undistributed_earnings_usd
        ? {
          taxRemaining: election.deferred_tax_outstanding_usd - due,
          interestRemaining: interestAtFiling - interestDue,
        }
        : {}),
    };
  });
}

/** Recompute finalized Part VI amounts at each export boundary. */
export function section1294DueFromCalculatedForm(raw: unknown): {
  tax: number;
  interest: number;
} {
  if (raw === undefined) return { tax: 0, interest: 0 };
  if (
    !raw || typeof raw !== "object" || !("items" in raw) ||
    !Array.isArray(raw.items)
  ) {
    throw new Error("Form 8621 section 1294 needs calculated holding rows");
  }
  let tax = 0;
  let interest = 0;
  for (const row of raw.items) {
    if (
      !row || typeof row !== "object" || !("item" in row) ||
      !row.item || typeof row.item !== "object"
    ) {
      throw new Error("Form 8621 section 1294 holding is malformed");
    }
    const item = row.item as Record<string, unknown>;
    const parent = item.parent_source as Record<string, unknown> | undefined;
    if (!parent?.section1294_prior_status) continue;
    if (typeof item.company_ein_or_ref !== "string") {
      throw new Error("Form 8621 section 1294 needs PFIC identity");
    }
    for (
      const column of calculateSection1294PriorStatus(
        parent.section1294_prior_status as Section1294PriorStatus,
        item.company_ein_or_ref,
      )
    ) {
      tax += column.taxDue ?? 0;
      interest += column.interestDue ?? 0;
    }
  }
  return { tax, interest };
}
