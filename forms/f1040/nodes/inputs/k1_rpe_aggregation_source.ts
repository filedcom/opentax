import { z } from "zod";
import { createHash } from "node:crypto";

const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ein = z.string().regex(/^\d{9}$/);
export const rpeAggregationSourceSchema = z.object({
  tax_year: z.literal(2025),
  issuer_name: reference.max(75),
  issuer_ein: ein,
  recipient_tin: ein,
  issued_k1_reference: reference,
  issued_section199a_statement_reference: reference,
  recipient_share_pct: z.literal(100),
  recipient_ownership_start_date: date,
  recipient_owned_on_2025_12_31: z.literal(true),
  recipient_ownership_source_reference: reference,
  group_name: reference.max(75),
  group_description: reference.max(180),
  tax_year_end: z.literal("2025-12-31"),
  tax_year_end_source_reference: reference,
  election_history: z.object({
    status: z.literal("new_2025"),
    no_prior_election_confirmed: z.literal(true),
  }).strict(),
  timely_original_return_election_confirmed: z.literal(true),
  no_commissioner_disaggregation_confirmed: z.literal(true),
  complete_current_year_event_inventory_confirmed: z.literal(true),
  complete_member_inventory_confirmed: z.literal(true),
  no_lower_tier_rpe_aggregations_confirmed: z.literal(true),
  no_other_199a_groups_confirmed: z.literal(true),
  domestic_non_sstb_trades_confirmed: z.literal(true),
  owner_level_adjustments: z.literal(0),
  prior_qbi_loss: z.literal(0),
  qualified_dividends_zero_confirmed: z.literal(true),
  review_source_reference: reference,
  reviewed_by: reference,
  review_date: date,
  operational_factors: z.array(
    z.object({
      factor: z.enum([
        "common_products",
        "shared_facilities_or_functions",
        "coordinated_operations",
      ]),
      explanation: reference,
      source_reference: reference,
    }).strict(),
  ).min(2).max(3),
  members: z.array(
    z.object({
      business_reference: reference,
      business_name: reference.max(75),
      business_description: reference,
      entity_name: reference.max(75),
      entity_ein: ein,
      rpe_ownership_start_date: date,
      rpe_owned_on_2025_12_31: z.literal(true),
      rpe_owner_share_pct: z.literal(100),
      ownership_source_reference: reference,
      events: z.array(
        z.object({
          event: z.enum(["formed", "acquired"]),
          date: z.string().regex(/^2025-\d{2}-\d{2}$/),
          source_reference: reference,
        }).strict(),
      ),
      qualified_box1_income: z.number().int().positive(),
      qbi: z.number().int().positive(),
      w2_wages: z.number().int().nonnegative(),
      ubia: z.number().int().nonnegative(),
      member_statement_reference: reference,
    }).strict(),
  ).min(2),
  issued_statement_pdf: z.object({
    file_name: z.string().regex(/^[A-Za-z0-9_-]+\.pdf$/),
    document_reference: reference,
    pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    pdf_base64: z.string().min(1),
    reviewed_by: reference,
    review_date: date,
    complete_member_amounts_events_and_owner_match_confirmed: z.literal(true),
  }).strict(),
}).strict();
export type RpeAggregationSource = z.infer<typeof rpeAggregationSourceSchema>;

function validDate(value: string, last: string) {
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value && value <= last;
}

export function issuedRpeStatementBytes(
  source: RpeAggregationSource,
): Uint8Array {
  if (
    source.issued_statement_pdf.file_name ===
      "Form8995AAggregationAnnualDisclosure.pdf"
  ) {
    throw Error(
      "Issued RPE copy must have its own distinct attachment filename",
    );
  }
  let bytes: Uint8Array;
  try {
    const decoded = atob(source.issued_statement_pdf.pdf_base64);
    if (btoa(decoded) !== source.issued_statement_pdf.pdf_base64) {
      throw Error("noncanonical base64");
    }
    bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  } catch {
    throw Error("RPE aggregation needs its actual retained PDF copy bytes");
  }
  if (
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-" ||
    createHash("sha256").update(bytes).digest("hex") !==
      source.issued_statement_pdf.pdf_sha256
  ) {
    throw Error(
      "RPE aggregation issued disclosure PDF differs from its reviewed source digest",
    );
  }
  return bytes;
}

export function reviewedRpeAggregation(raw: RpeAggregationSource) {
  const source = rpeAggregationSourceSchema.parse(raw);
  if (
    !validDate(source.recipient_ownership_start_date, "2025-07-02") ||
    !validDate(source.review_date, "9999-12-31") ||
    source.review_date < "2025-12-31" ||
    source.issued_statement_pdf.review_date !== source.review_date ||
    source.issued_statement_pdf.reviewed_by !== source.reviewed_by
  ) {
    throw Error(
      "RPE aggregation needs majority-year owned shares and dated issued statement review",
    );
  }
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (
    !unique(source.operational_factors.map((f) => f.factor)) ||
    !unique(source.members.map((m) => m.business_reference))
  ) {
    throw Error(
      "RPE aggregation needs distinct complete business records and operational factors",
    );
  }
  for (const member of source.members) {
    const formed = member.events.find((e) => e.event === "formed");
    const acquired = member.events.find((e) => e.event === "acquired");
    const ownershipEvent = acquired ?? formed;
    // This current route is the issuer's directly operated business inventory,
    // not another legal entity or a lower-tier RPE aggregation.
    if (
      member.entity_name !== source.issuer_name ||
      member.entity_ein !== source.issuer_ein ||
      !validDate(member.rpe_ownership_start_date, "2025-07-02") ||
      member.qbi !== member.qualified_box1_income ||
      !unique(member.events.map((e) => e.event)) ||
      member.events.some((e) => !validDate(e.date, "2025-12-31")) ||
      (ownershipEvent !== undefined &&
        ownershipEvent.date !== member.rpe_ownership_start_date) ||
      (formed !== undefined && acquired !== undefined &&
        formed.date > acquired.date) ||
      (member.rpe_ownership_start_date >= "2025-01-01" &&
        member.events.length === 0)
    ) {
      throw Error(
        "RPE aggregation members must reconcile issuer ownership, ordinary QBI and actual annual events",
      );
    }
  }
  issuedRpeStatementBytes(source);
  return {
    source,
    qbi: source.members.reduce((t, m) => t + m.qbi, 0),
    wages: source.members.reduce((t, m) => t + m.w2_wages, 0),
    ubia: source.members.reduce((t, m) => t + m.ubia, 0),
  };
}

export function currentSCorpRpeAggregation(item: {
  corporation_name: string;
  corporation_ein?: string;
  recipient_tin?: string;
  source_document_reference?: string;
  box1_ordinary_business?: number;
  qbi_amount?: number;
  w2_wages?: number;
  box17_w2_wages?: number;
  ubia_qualified_property?: number;
  box17_ubia?: number;
  sstb_indicator?: boolean;
  qualified_business_income_source?: unknown;
  rpe_aggregation_source?: RpeAggregationSource;
  eic_passive_activity_review?: {
    box1?: string;
    recipient_tin: string;
    activity_statement_reference: string;
    participation_workpaper_reference: string;
  };
}) {
  if (!item.rpe_aggregation_source) return undefined;
  const result = reviewedRpeAggregation(item.rpe_aggregation_source),
    s = result.source;
  if (
    item.corporation_name !== s.issuer_name ||
    item.corporation_ein !== s.issuer_ein ||
    item.recipient_tin !== s.recipient_tin ||
    item.source_document_reference !== s.issued_k1_reference ||
    item.box1_ordinary_business !== result.qbi ||
    item.qbi_amount !== result.qbi ||
    item.w2_wages !== result.wages ||
    item.ubia_qualified_property !== result.ubia ||
    item.box17_w2_wages !== undefined || item.box17_ubia !== undefined ||
    item.sstb_indicator === true ||
    item.qualified_business_income_source !== undefined ||
    item.eic_passive_activity_review?.box1 !== "nonpassive" ||
    item.eic_passive_activity_review.recipient_tin !== s.recipient_tin ||
    item.eic_passive_activity_review.activity_statement_reference !==
      s.issued_section199a_statement_reference
  ) {
    throw Error(
      "RPE aggregated section199A statement differs from its actual issued K1 owner, income or wages/property",
    );
  }
  const allowed = new Set([
    "corporation_name",
    "corporation_ein",
    "recipient_tin",
    "source_document_reference",
    "box1_ordinary_business",
    "qbi_amount",
    "w2_wages",
    "ubia_qualified_property",
    "rpe_aggregation_source",
    "eic_passive_activity_review",
    "sstb_indicator",
  ]);
  if (
    Object.entries(item).some(([key, value]) =>
      !allowed.has(key) && value !== undefined && value !== 0 && value !== false
    )
  ) {
    throw Error(
      "Current RPE aggregation K1 needs its complete ordinary nonpassive source without other K1 income, deduction, credit or basis paths",
    );
  }
  return result;
}
