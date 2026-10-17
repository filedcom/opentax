import { z } from "zod";

const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const parsed = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === s;
});
const dollars = z.number().int().finite().nonnegative();
const componentBase = z.object({
  component_reference: reference,
  description: reference,
  cost: dollars.positive(),
  appraised_fmv: dollars.positive(),
  placed_in_service: date,
  annual_records: z.array(
    z.object({
      tax_year: z.number().int().min(2010).max(2025),
      depreciation_claimed: dollars,
      annual_return_and_asset_ledger_reference: reference,
    }).strict(),
  ),
});
const component = z.discriminatedUnion("method", [
  componentBase.extend({
    method: z.literal("ads_5_year_sl_hy_computer"),
    ads_election_reference: reference,
    acquired_after_2017: z.literal(true),
    computer_or_peripheral: z.literal(true),
    no_section179_or_bonus: z.literal(true),
    half_year_not_midquarter_confirmed: z.literal(true),
  }).strict(),
  componentBase.extend({
    method: z.literal("gds_39_year_sl_mm_building"),
    nonresidential_real_property: z.literal(true),
    no_section179_or_bonus: z.literal(true),
  }).strict(),
  componentBase.extend({
    method: z.literal("gds_15_year_qip_2022_bonus"),
    interior_improvement_made_by_donor: z.literal(true),
    underlying_building_placed_in_service: date,
    no_enlargement_elevator_or_internal_structure: z.literal(true),
    acquired_and_placed_in_service_2022: z.literal(true),
    bonus_election_out: z.literal(false),
    no_section179: z.literal(true),
    half_year_not_midquarter_confirmed: z.literal(true),
  }).strict(),
  componentBase.extend({ method: z.literal("nondepreciable_land") }).strict(),
]);

/** Owned original-basis property only. Prior annual records are source evidence,
 * not authenticated accepted returns. No actual sale is represented here.
 * For this outright gift, 26 CFR 1.170A-4(b)(4) treats section 1231(b)
 * property as a capital asset except for its listed recapture provisions.
 * Section 1231(c) sale-loss lookback is not an additional gift reduction. */
export const charitableDepreciationSourceSchema = z.object({
  property_reference: reference,
  real_property_identity: z.object({
    street: reference,
    city: reference,
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}$/),
    recorded_deed_identifier: reference,
    whole_land_building_and_qip_identified: z.literal(true),
  }).strict().optional(),
  business_reference: reference,
  proprietor_recipient: z.enum(["T", "S"]),
  donor_name: reference,
  donor_ssn: z.string().regex(/^\d{9}$/),
  retained_source_documents: z.array(
    z.object({
      source_reference: reference,
      attachment_file_name: reference,
      pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }).strict(),
  ).length(3),
  purchase_record_reference: reference,
  annual_depreciation_ledger_reference: reference,
  business_use_and_retirement_record_reference: reference,
  date_acquired: date,
  date_contributed: date.refine((s) => s.startsWith("2025-")),
  last_business_use_date: date,
  whole_owned_interest_donated: z.literal(true),
  original_cost_basis_no_transfer_or_adjustment: z.literal(true),
  business_use_percent: z.literal(100),
  no_personal_use_conversion: z.literal(true),
  no_debt_or_consideration_received: z.literal(true),
  no_other_depreciation_assets_or_amortization_in_activity: z.literal(true),
  no_2025_placed_assets_section179_listed_property_or_other_4562_requirement: z
    .literal(true),
  calendar_year_full_year_returns: z.literal(true),
  fifty_percent_limit_donee: z.literal(true),
  exempt_related_use_confirmed: z.literal(true),
  current_year_business_records: z.object({
    issued_receipts_reference: reference,
    gross_receipts: dollars,
    fees_paid_record_reference: reference,
    fees_paid: dollars,
    no_other_receipts_or_expenses_except_source_depreciation: z.literal(true),
  }).strict().optional(),
  components: z.array(component).min(1).max(3),
}).strict();
export type CharitableDepreciationSource = z.infer<
  typeof charitableDepreciationSourceSchema
>;

function year(date: string) {
  return Number(date.slice(0, 4));
}
function month(date: string) {
  return Number(date.slice(5, 7));
}

function straightLineAnnual(
  cost: number,
  life: number,
  convention: "HY" | "MM",
  placed: string,
  retired: string,
  taxYear: number,
): number {
  const first = year(placed), last = year(retired);
  if (taxYear < first || taxYear > last) return 0;
  let months = 12;
  if (convention === "HY") {
    if (taxYear > first + life) return 0;
    if (taxYear === first || taxYear === last || taxYear === first + life) {
      months = 6;
    }
  } else {
    if (taxYear === first) months = 12 - month(placed) + 0.5;
    if (taxYear === last) months -= 12 - month(retired) + 0.5;
  }
  return cost / life * months / 12;
}

export function calculateCharitableDepreciation(raw: unknown) {
  const source = charitableDepreciationSourceSchema.parse(raw);
  if (
    source.date_acquired > source.last_business_use_date ||
    source.last_business_use_date > source.date_contributed ||
    source.date_contributed <=
      `${year(source.date_acquired) + 1}${source.date_acquired.slice(4)}` ||
    new Set(source.components.map((c) => c.component_reference)).size !==
      source.components.length
  ) {
    throw new Error(
      "Charitable depreciation needs one owned long-term property and coherent business-use dates/components",
    );
  }
  const refs = [
    source.purchase_record_reference,
    source.annual_depreciation_ledger_reference,
    source.business_use_and_retirement_record_reference,
  ];
  if (
    new Set(refs).size !== 3 ||
    new Set(source.retained_source_documents.map((d) => d.attachment_file_name))
        .size !== 3 ||
    refs.some((r) =>
      !source.retained_source_documents.some((d) => d.source_reference === r)
    )
  ) {
    throw new Error(
      "Charitable depreciation requires distinct retained purchase, annual ledger and use records",
    );
  }
  const computer = source.components.filter((c) =>
    c.method === "ads_5_year_sl_hy_computer"
  );
  const building = source.components.find((c) =>
    c.method === "gds_39_year_sl_mm_building"
  );
  const qip = source.components.find((c) =>
    c.method === "gds_15_year_qip_2022_bonus"
  );
  const land = source.components.find((c) =>
    c.method === "nondepreciable_land"
  );
  if (
    !(computer.length === 1 && source.components.length === 1) &&
    !(source.components.length === 3 && building && qip && land)
  ) {
    throw new Error(
      "Charitable depreciation supports one nonlisted computer or whole land/building/QIP property",
    );
  }
  if (
    (building !== undefined) !== (source.real_property_identity !== undefined)
  ) {
    throw new Error(
      "Whole donated real estate requires its actual location/deed source identity",
    );
  }
  const rows = source.components.map((c) => {
    if (
      c.placed_in_service < source.date_acquired ||
      c.placed_in_service > source.last_business_use_date ||
      (c.method === "ads_5_year_sl_hy_computer" &&
        (year(c.placed_in_service) < 2018 ||
          year(source.date_acquired) < 2018)) ||
      (c.method === "gds_15_year_qip_2022_bonus" &&
        (year(c.placed_in_service) !== 2022 ||
          c.underlying_building_placed_in_service !==
            building?.placed_in_service ||
          c.placed_in_service <= c.underlying_building_placed_in_service))
    ) {
      throw new Error(
        "Charitable depreciation component classification and placed-in-service source disagree",
      );
    }
    const annual: {
      tax_year: number;
      depreciation: number;
      straight_line: number;
    }[] = [];
    let cumulative = 0, comparison = 0;
    const end = c.method === "nondepreciable_land"
      ? year(c.placed_in_service) - 1
      : Math.min(
        year(source.last_business_use_date),
        c.method === "ads_5_year_sl_hy_computer"
          ? year(c.placed_in_service) + 5
          : 2025,
      );
    for (let taxYear = year(c.placed_in_service); taxYear <= end; taxYear++) {
      const life = c.method === "ads_5_year_sl_hy_computer"
        ? 5
        : c.method === "gds_39_year_sl_mm_building"
        ? 39
        : 15;
      const sl = Math.min(
        c.cost - comparison,
        straightLineAnnual(
          c.cost,
          life,
          c.method === "gds_39_year_sl_mm_building" ? "MM" : "HY",
          c.placed_in_service,
          source.last_business_use_date,
          taxYear,
        ),
      );
      const depreciation = c.method === "gds_15_year_qip_2022_bonus"
        ? (taxYear === 2022 ? c.cost : 0)
        : Math.min(c.cost - cumulative, sl);
      cumulative += depreciation;
      comparison += sl;
      annual.push({ tax_year: taxYear, depreciation, straight_line: sl });
    }
    if (
      c.annual_records.length !== annual.length ||
      annual.some((r, i) =>
        c.annual_records[i].tax_year !== r.tax_year ||
        c.annual_records[i].depreciation_claimed !== Math.round(r.depreciation)
      )
    ) {
      throw new Error(
        "Charitable depreciation annual records differ from allowable method/convention; no missing or duplicate years",
      );
    }
    const cents = (value: number) =>
      Math.round((value + Number.EPSILON) * 100) / 100;
    const adjustedBasis = cents(c.cost - cumulative);
    const hypotheticalGain = cents(c.appraised_fmv - adjustedBasis);
    if (hypotheticalGain < 0) {
      throw new Error(
        "Charitable depreciation loss components need separate source treatment",
      );
    }
    const ordinaryLimit = c.method === "ads_5_year_sl_hy_computer"
      ? cumulative
      : c.method === "gds_15_year_qip_2022_bonus"
      ? Math.max(0, cumulative - comparison)
      : 0;
    const ordinaryGain = cents(Math.min(hypotheticalGain, ordinaryLimit));
    return {
      component_reference: c.component_reference,
      annual,
      cumulative_depreciation: cents(cumulative),
      straight_line_comparison: cents(comparison),
      adjusted_basis: adjustedBasis,
      hypothetical_gain: hypotheticalGain,
      ordinary_gain: ordinaryGain,
      residual_long_term_gain: cents(hypotheticalGain - ordinaryGain),
      current_year_depreciation: Math.round(
        annual.find((r) => r.tax_year === 2025)?.depreciation ?? 0,
      ),
    };
  });
  const sum = (
    key: keyof Omit<typeof rows[number], "component_reference" | "annual">,
  ) => rows.reduce((n, row) => n + row[key], 0);
  const fmv = source.components.reduce((n, c) => n + c.appraised_fmv, 0);
  const ordinary = sum("ordinary_gain"),
    residual = sum("residual_long_term_gain");
  if (ordinary <= 0) {
    throw new Error(
      "Charitable ordinary depreciation reduction needs actual hypothetical ordinary gain",
    );
  }
  if (
    sum("current_year_depreciation") > 0 &&
    !source.current_year_business_records
  ) {
    throw new Error(
      "Active donated property requires actual current-year business receipts and paid-cost records",
    );
  }
  return {
    source,
    rows,
    fmv,
    adjusted_basis: sum("adjusted_basis"),
    ordinary_gain: ordinary,
    deduction_claimed: fmv - ordinary,
    current_year_depreciation: sum("current_year_depreciation"),
    is_capital_gain_property: residual > 0,
    charitable_limit_category: residual > 0
      ? "capital_gain_30" as const
      : "noncash_50" as const,
  };
}

/** Visible ledger fields retained in the three source documents. */
export function charitableDepreciationDocumentFields(
  raw: unknown,
  documentIndex: number,
): Record<string, string> {
  const source = charitableDepreciationSourceSchema.parse(raw);
  const fields: Record<string, string> = {};
  const add = (prefix: string, value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((row, i) => add(`${prefix}.${i + 1}`, row));
    } else if (value !== null && typeof value === "object") {
      Object.entries(value).forEach(([key, row]) =>
        add(prefix ? `${prefix}.${key}` : key, row)
      );
    } else if (value !== undefined) fields[prefix] = String(value);
  };
  for (
    const key of [
      "property_reference",
      "business_reference",
      "proprietor_recipient",
      "donor_name",
      "donor_ssn",
      "date_acquired",
      "date_contributed",
    ] as const
  ) add(key, source[key]);
  if (documentIndex === 0) {
    add("purchase_record_reference", source.purchase_record_reference);
    add("real_property_identity", source.real_property_identity);
    add(
      "components",
      source.components.map(({ annual_records: _annual, ...row }) => row),
    );
  } else if (documentIndex === 1) {
    add(
      "annual_depreciation_ledger_reference",
      source.annual_depreciation_ledger_reference,
    );
    add(
      "components",
      source.components.map((row) => ({
        component_reference: row.component_reference,
        method: row.method,
        annual_records: row.annual_records,
      })),
    );
  } else if (documentIndex === 2) {
    const {
      components: _components,
      retained_source_documents: _documents,
      ...facts
    } = source;
    add("", facts);
  } else {throw new Error(
      "Charitable depreciation requires three distinct source record roles",
    );}
  return fields;
}
