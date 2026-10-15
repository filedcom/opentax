import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { w2Item2026Schema } from "./w2.ts";
import type { Dependent2026 } from "./dependents.ts";
import { reviewedResidence2026, validDate2026 } from "./dependent-residency.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
export const careMfs2026Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("not_mfs") }).strict(),
  z.object({
    kind: z.literal("considered_unmarried"),
    review_reference: ref,
    no_community_property_income_allocation: z.literal(true),
    qualifying_person_tin: tin,
    home_cost_record_reference: ref,
    total_home_costs: z.number().finite().positive(),
    taxpayer_paid_home_costs: z.number().finite().nonnegative(),
    complete_spouse_home_calendar_reviewed: z.literal(true),
    spouse_home_record_reference: ref,
    spouse_home_periods: z.array(
      z.object({
        from: z.string().date(),
        through: z.string().date(),
      }).strict(),
    ).max(365),
  }).strict(),
  z.object({
    kind: z.literal("not_considered_unmarried"),
    review_reference: ref,
    no_community_property_income_allocation: z.literal(true),
    reason: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("spouse_home_last_six_months"),
        record_reference: ref,
        home_date: z.string().date(),
      }).strict(),
      z.object({
        kind: z.literal("home_costs_not_over_half"),
        record_reference: ref,
        total_home_costs: z.number().finite().positive(),
        taxpayer_paid_home_costs: z.number().finite().nonnegative(),
      }).strict(),
      z.object({
        kind: z.literal("no_qualifying_main_home"),
        record_reference: ref,
      }).strict(),
    ]),
    spouse_income_inventory_reference: ref,
    all_spouse_w2_copies_reconciled: z.literal(true),
    no_spouse_other_earned_income_or_care_benefits: z.literal(true),
    spouse_w2s: z.array(w2Item2026Schema).max(100),
  }).strict(),
]);
export type CareMfs2026 = z.input<typeof careMfs2026Schema>;

export function resolveCareMfs2026(
  raw: CareMfs2026,
  context: {
    filing_status: FilingStatus;
    taxpayer_ssn: string;
    spouse_ssn?: string;
    mfs_spouse_lived_with_taxpayer?: boolean;
    dependents: Dependent2026[];
  },
  qualifyingTins: string[],
) {
  const r = careMfs2026Schema.parse(raw),
    norm = (s: string) => s.replaceAll("-", "");
  if (context.filing_status !== FilingStatus.MFS) {
    if (r.kind !== "not_mfs") {
      throw new Error("Care MFS review requires a separate return");
    }
    return { considered_unmarried: false, spouse_earnings: null };
  }
  if (r.kind === "not_mfs" || !context.spouse_ssn) {
    throw new Error(
      "Separate care return needs the spouse identity and MFS review",
    );
  }
  if (r.kind === "considered_unmarried") {
    if (
      r.taxpayer_paid_home_costs > r.total_home_costs ||
      r.taxpayer_paid_home_costs * 2 <= r.total_home_costs
    ) {
      throw new Error(
        "Considered-unmarried care requires taxpayer payment of over half the home costs",
      );
    }
    const periods = r.spouse_home_periods.map((p) => ({
      start: validDate2026(p.from, "Spouse home start"),
      end: validDate2026(p.through, "Spouse home end"),
    })).sort((a, b) => a.start - b.start);
    let previous = Date.UTC(2025, 11, 31);
    for (const p of periods) {
      if (
        p.start < Date.UTC(2026, 0, 1) || p.start > p.end ||
        p.start <= previous ||
        p.end >= Date.UTC(2026, 6, 1)
      ) {
        throw new Error(
          "Considered-unmarried care needs nonoverlapping spouse home periods entirely before July 1",
        );
      }
      previous = p.end;
    }
    if (
      context.mfs_spouse_lived_with_taxpayer !== undefined &&
      context.mfs_spouse_lived_with_taxpayer !== (periods.length > 0)
    ) {
      throw new Error(
        "Care spouse home calendar conflicts with general MFS residence facts",
      );
    }
    const id = norm(r.qualifying_person_tin);
    const person = context.dependents.find((d) =>
      norm(d.ssn ?? d.itin ?? d.atin ?? "") === id
    );
    if (!qualifyingTins.includes(id) || !person) {
      throw new Error(
        "MFS home must identify an actual care qualifying person",
      );
    }
    const residence = reviewedResidence2026(person);
    if (!(residence ? residence.days * 2 > 365 : person.months_in_home > 6)) {
      throw new Error(
        "Considered-unmarried care needs the person's main home for over half of 2026",
      );
    }
    return { considered_unmarried: true, spouse_earnings: null };
  }
  if (r.reason.kind === "spouse_home_last_six_months") {
    const date = validDate2026(r.reason.home_date, "Spouse home date");
    if (
      date < Date.UTC(2026, 6, 1) ||
      context.mfs_spouse_lived_with_taxpayer === false
    ) {
      throw new Error(
        "MFS noneligibility residence evidence must identify spouse presence in the last six months",
      );
    }
  } else if (r.reason.kind === "home_costs_not_over_half") {
    if (r.reason.taxpayer_paid_home_costs * 2 > r.reason.total_home_costs) {
      throw new Error(
        "MFS noneligibility home-cost evidence cannot show over-half taxpayer payment",
      );
    }
  } else if (
    qualifyingTins.some((id) => {
      if (id === norm(context.spouse_ssn!)) return true;
      const person = context.dependents.find((d) =>
        norm(d.ssn ?? d.itin ?? d.atin ?? "") === id
      );
      if (!person) return false;
      const residence = reviewedResidence2026(person);
      return residence ? residence.days * 2 > 365 : person.months_in_home > 6;
    })
  ) {
    throw new Error(
      "MFS no-main-home review conflicts with a qualifying person's home facts",
    );
  }
  const seen = new Set<string>(), employers = new Set<string>();
  let wages = 0, combat = 0;
  for (const w of r.spouse_w2s) {
    if (
      norm(w.employee_ssn) !== norm(context.spouse_ssn) ||
      norm(w.employee_ssn) === norm(context.taxpayer_ssn)
    ) {
      throw new Error(
        "External care wage record must belong to the separate spouse",
      );
    }
    const employer = norm(w.employer_ein);
    if (seen.has(w.source_document_reference) || employers.has(employer)) {
      throw new Error(
        "External spouse W-2 copies need one reconciled record per employer",
      );
    }
    seen.add(w.source_document_reference);
    employers.add(employer);
    if (w.box13_statutory_employee || (w.box10_dep_care ?? 0) > 0) {
      throw new Error(
        "External spouse care benefits or self-employment need their earned-income worksheet",
      );
    }
    wages += w.box1_wages;
    combat += (w.box12_entries ?? []).filter((e) => e.code === "Q").reduce(
      (n, e) => n + e.amount,
      0,
    );
  }
  return {
    considered_unmarried: false,
    spouse_earnings: { wages, combat, taxable_care: 0 },
  };
}
