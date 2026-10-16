import { z } from "zod";
import {
  calculateLandDispositionAmounts2026,
  type LandDispositionSource2026,
} from "./land-disposition-source.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const date = z.string().date();
const farmer = z.object({
  name: ref,
  tin,
  record_reference: ref,
  individual_actively_engaged_under_7usc1308_1_b_and_c: z.literal(true),
}).strict();
const farmingPurpose = z.enum([
  "cultivate_raise_or_harvest_commodities",
  "raise_or_manage_farm_animals",
  "handle_unmanufactured_commodities_majority_produced_by_operator",
  "grow_cut_or_prepare_trees_other_than_milling",
]);
const period = z.object({
  record_reference: ref,
  from: date,
  through: date,
  purpose: farmingPurpose,
  use: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("taxpayer_farm") }).strict(),
    z.object({ kind: z.literal("leased_to_qualified_farmer"), tenant: farmer })
      .strict(),
  ]),
}).strict();
export const form1062Election2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  land_inventory_reference: ref,
  review_reference: ref,
  elected_sale_inventory_complete: z.literal(true),
  sales: z.array(
    z.object({
      sale_reference: ref,
      property_reference: ref,
      owner_tin: tin,
      elect_section1062: z.literal(true),
      location: z.object({
        state: z.enum([
          "AL",
          "AK",
          "AZ",
          "AR",
          "CA",
          "CO",
          "CT",
          "DE",
          "DC",
          "FL",
          "GA",
          "HI",
          "ID",
          "IL",
          "IN",
          "IA",
          "KS",
          "KY",
          "LA",
          "ME",
          "MD",
          "MA",
          "MI",
          "MN",
          "MS",
          "MO",
          "MT",
          "NE",
          "NV",
          "NH",
          "NJ",
          "NM",
          "NY",
          "NC",
          "ND",
          "OH",
          "OK",
          "OR",
          "PA",
          "RI",
          "SC",
          "SD",
          "TN",
          "TX",
          "UT",
          "VT",
          "VA",
          "WA",
          "WV",
          "WI",
          "WY",
        ]),
        county_or_locality: ref,
        legal_description_reference: ref,
        real_property_in_the_united_states: z.literal(true),
      }).strict(),
      farming_history: z.object({
        record_reference: ref,
        periods: z.array(period).min(1).max(1000),
        substantially_all_ten_years_review: z.object({
          record_reference: ref,
          substantially_all_period_qualifies: z.literal(true),
          interruptions_explanation: ref.optional(),
        }).strict(),
      }).strict(),
      buyer: farmer,
      covenant: z.object({
        document_reference: ref,
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        property_reference: ref,
        seller_tin: tin,
        buyer_tin: tin,
        executed_on: date,
        effective_from: date,
        effective_through: date,
        legal_review_reference: ref,
        legally_enforceable_on_sale_date: z.literal(true),
        prohibits_all_nonfarming_use_during_required_period: z.literal(true),
        covers_entire_disposed_property: z.literal(true),
      }).strict(),
    }).strict(),
  ).min(1).max(1000),
}).strict();
export type Form1062Election2026 = z.input<typeof form1062Election2026Schema>;

const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000;
const iso = (value: number) =>
  new Date(value * 86400000).toISOString().slice(0, 10);
function anniversary(value: string, years: number) {
  const d = new Date(`${value}T00:00:00Z`), month = d.getUTCMonth();
  d.setUTCFullYear(d.getUTCFullYear() + years);
  if (d.getUTCMonth() !== month) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

/** Source qualification for direct sales; neither a tax deferral nor a filed election. */
export function resolveForm1062Sources2026(
  landRaw: LandDispositionSource2026,
  raw: Form1062Election2026,
) {
  const election = form1062Election2026Schema.parse(raw),
    land = calculateLandDispositionAmounts2026(landRaw);
  if (
    election.land_inventory_reference !==
      land.source_input.claim.record_reference
  ) {
    throw new Error(
      "Form 1062 election must reference the actual land inventory",
    );
  }
  for (const key of ["sale_reference", "property_reference"] as const) {
    if (
      new Set(election.sales.map((s) => s[key])).size !== election.sales.length
    ) {
      throw new Error(`Duplicate Form 1062 ${key}`);
    }
  }
  // One original document can cover multiple parcels, but its digest must be consistent.
  const documents = new Map<string, string>();
  const schedules = election.sales.map((elected) => {
    const row = land.rows.find((r) =>
      r.source.sale_reference === elected.sale_reference
    );
    if (
      !row || row.source.property_reference !== elected.property_reference ||
      row.source.owner_tin !== elected.owner_tin
    ) {
      throw new Error(
        "Form 1062 elected sale must match its property and return owner",
      );
    }
    const s = row.source, sold = s.closing.settled_on;
    const windowStart = iso(day(anniversary(sold, -10)) + 1), windowEnd = sold;
    if (s.acquired_on > windowStart) {
      throw new Error(
        "Form 1062 direct-sale history must establish the taxpayer's ten-year use period",
      );
    }
    const periods = [...elected.farming_history.periods].sort((a, b) =>
      a.from.localeCompare(b.from)
    );
    const references = new Set<string>();
    let cursor = day(windowStart), covered = 0;
    const gaps: { from: string; through: string }[] = [];
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      if (
        references.has(p.record_reference) || p.from > p.through ||
        p.from < s.acquired_on || p.through > sold ||
        (i > 0 && p.from <= periods[i - 1].through)
      ) {
        throw new Error(
          "Form 1062 farming history needs distinct nonoverlapping periods within ownership",
        );
      }
      references.add(p.record_reference);
      if (
        p.use.kind === "leased_to_qualified_farmer" &&
        p.use.tenant.tin === elected.owner_tin
      ) {
        throw new Error(
          "Form 1062 farm lease must identify a separate qualified tenant",
        );
      }
      const from = Math.max(day(p.from), day(windowStart)),
        through = Math.min(day(p.through), day(windowEnd));
      if (from > through) continue;
      if (from > cursor) {
        gaps.push({ from: iso(cursor), through: iso(from - 1) });
      }
      covered += through - from + 1;
      cursor = through + 1;
    }
    if (cursor <= day(windowEnd)) {
      gaps.push({ from: iso(cursor), through: windowEnd });
    }
    if (
      covered === 0 ||
      (gaps.length &&
        !elected.farming_history.substantially_all_ten_years_review
          .interruptions_explanation)
    ) {
      throw new Error(
        "Form 1062 substantially-all review must address actual farming-history gaps",
      );
    }
    const c = elected.covenant,
      requiredFrom = iso(day(sold) + 1),
      requiredThrough = anniversary(sold, 10);
    if (
      elected.buyer.tin === elected.owner_tin ||
      c.property_reference !== s.property_reference ||
      c.seller_tin !== s.owner_tin ||
      c.buyer_tin !== elected.buyer.tin || c.executed_on > sold ||
      c.effective_from > requiredFrom ||
      c.effective_through < requiredThrough ||
      c.effective_from > c.effective_through
    ) {
      throw new Error(
        "Form 1062 covenant must bind the elected property and buyer for the full ten-year restriction",
      );
    }
    if (
      documents.has(c.document_reference) &&
      documents.get(c.document_reference) !== c.sha256
    ) {
      throw new Error(
        "Form 1062 shared covenant reference has conflicting digests",
      );
    }
    documents.set(c.document_reference, c.sha256);
    const whole = (n: number) => roundWholeDollars(n / 100);
    const lines = {
      line9: whole(row.cents.gross_proceeds),
      line10: whole(row.cents.net_sales_price),
      line11: whole(row.cents.unadjusted_basis),
      line12: whole(row.cents.adjusted_basis),
      line13: whole(row.cents.net_sales_price) -
        whole(row.cents.adjusted_basis),
    };
    if (lines.line13 <= 0) {
      throw new Error(
        "Form 1062 election requires recognized gain from each elected sale",
      );
    }
    if (lines.line13 !== row.printed.gain) {
      throw new Error(
        "Form 1062 and Form 4797 whole-dollar columns require coordinated rounding before tax deferral",
      );
    }
    return {
      election: elected,
      sale: row,
      lines,
      farming_history_workpaper: {
        from: windowStart,
        through: windowEnd,
        calendar_days: day(windowEnd) - day(windowStart) + 1,
        supported_days: covered,
        gaps,
        // Evidence for the legal review, not an invented numerical qualification test.
        substantially_all_review:
          elected.farming_history.substantially_all_ten_years_review,
      },
      covenant_required_period: {
        from: requiredFrom,
        through: requiredThrough,
      },
    };
  });
  return {
    source_input: { land: land.source_input, election },
    schedules,
    schedule_count: schedules.length,
    elected_gain: schedules.reduce((n, s) => n + s.lines.line13, 0),
    covenant_claims: [...documents].map(([reference, sha256]) => ({
      reference,
      sha256,
    })),
    filing_ready: false as const,
  };
}
