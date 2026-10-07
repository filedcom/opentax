import { z } from "zod";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const keys = [
  "wages",
  "taxable_interest",
  "tax_exempt_interest",
  "ordinary_dividends",
  "taxable_ira_distributions",
  "taxable_pensions",
  "social_security_total",
  "social_security_taxable",
  "capital_gain",
  "additional_income",
  "adjustments",
  "foreign_earned_income_exclusion",
] as const;
const amounts = z.object(
  Object.fromEntries(keys.map((key) => [key, z.number().finite()])) as Record<
    typeof keys[number],
    z.ZodNumber
  >,
).strict();
/** Ordinary reviewed source copies; this inventory does not authenticate issuers. */
export const ptcJointIncomeReviewSchema = z.object({
  tax_year: z.literal(2025),
  review_reference: reference,
  reviewed_on: z.string().refine((value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  ),
  reviewer_name: reference,
  owners: z.array(
    z.object({
      owner_ssn: tin,
      income_amounts: amounts,
      income_source_references: z.array(reference),
    }).strict(),
  ).length(2),
  sources: z.array(
    z.object({
      input_key: reference,
      source_index: z.number().int().nonnegative(),
      source_document_reference: reference,
      owner_ssn: tin,
      tax_year: z.literal(2025),
      source_record: z.record(z.unknown()),
    }).strict(),
  ),
}).strict();
const obj = (v: unknown): Record<string, any> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, any>
    : {};
const normalize = (v: unknown) =>
  typeof v === "string" ? v.replaceAll("-", "") : "";
const canonical = (v: unknown): string =>
  JSON.stringify(
    Array.isArray(v)
      ? v.map((x) => JSON.parse(canonical(x)))
      : v && typeof v === "object"
      ? Object.fromEntries(
        Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map((
          [k, x],
        ) => [k, JSON.parse(canonical(x))]),
      )
      : v ?? null,
  );
const n = (r: Record<string, any>, key: string): number =>
  typeof r[key] === "number" && Number.isFinite(r[key]) ? r[key] : 0;
const paths: Record<string, [string, string]> = {
  w2: ["w2", "w2s"],
  f1099int: ["f1099int", "f1099ints"],
  f1099oid: ["f1099oid", "f1099oids"],
  f1099div: ["f1099div", "f1099divs"],
  f1099g: ["f1099g", "f1099gs"],
  f1099r: ["f1099r", "f1099rs"],
  f1099b: ["f1099b", "f1099bs"],
};
function sourceAmounts(
  key: string,
  r: Record<string, any>,
): Record<string, number> {
  const a = Object.fromEntries(keys.map((k) => [k, 0]));
  if (key === "w2") a.wages = n(r, "box1_wages");
  if (key === "f1099int") {
    a.taxable_interest = n(r, "box1") + n(r, "box3") + n(r, "box10") -
      (r.elect_bond_premium_amortization === true ? n(r, "box11") : 0) -
      n(r, "box12") - n(r, "nominee_interest") - n(r, "accrued_interest_paid") -
      n(r, "non_taxable_oid_adjustment");
    a.tax_exempt_interest = n(r, "box8") - n(r, "box13");
    a.adjustments = n(r, "box2");
  }
  if (key === "f1099oid") {
    a.taxable_interest = n(r, "box1_oid") + n(r, "box8_oid_treasury") +
      n(r, "box2_other_interest") +
      (r.box5_included_in_income_currently ? n(r, "box5_market_discount") : 0) -
      (r.box6_applies_to === "taxable_oid"
        ? n(r, "box6_acquisition_premium")
        : 0) -
      n(r, "nominee_oid") - (r.box10_applies_to === "taxable_stated_interest"
        ? n(r, "box10_bond_premium")
        : 0);
    a.tax_exempt_interest = n(r, "box11_tax_exempt_oid") -
      (r.box6_applies_to === "tax_exempt_oid"
        ? n(r, "box6_acquisition_premium")
        : 0) -
      (r.box10_applies_to === "tax_exempt_oid"
        ? n(r, "box10_bond_premium")
        : 0);
    a.adjustments = n(r, "box3_early_withdrawal_penalty");
  }
  if (key === "f1099div") {
    const own = (field: string) =>
      n(r, field) -
      (r.isNominee === true ? n(obj(r.nominee_distribution), field) : 0);
    a.ordinary_dividends = own("box1a");
    a.tax_exempt_interest = own("box12");
    a.capital_gain = own("box2a");
  }
  if (key === "f1099g") {
    if (
      [
        "box_2_state_refund",
        "box_5_rtaa",
        "box_6_taxable_grants",
        "box_7_agriculture",
        "box_9_market_gain",
      ].some((k) => n(r, k) !== 0)
    ) {
      throw new Error(
        "Form 8962 joint inventory needs a separate owned 1099-G non-unemployment source reconciliation",
      );
    }
    a.additional_income = n(r, "box_1_unemployment") - n(r, "box_1_repaid");
  }
  if (key === "f1099r") {
    const allowed = [
      "payer_name",
      "payer_ein",
      "payer_address_line1",
      "payer_address_city",
      "payer_address_state",
      "payer_address_zip",
      "recipient_ssn",
      "recipient_address_line1",
      "recipient_address_city",
      "recipient_address_state",
      "recipient_address_zip",
      "account_number",
      "source_document_reference",
      "tax_year",
      "ts",
      "box1_gross_distribution",
      "box2a_taxable_amount",
      "box2b_not_determined",
      "box2b_total_dist",
      "box4_federal_withheld",
      "box7_distribution_code",
      "box7_ira_simple_indicator",
    ];
    if (
      Object.keys(r).some((k) => !allowed.includes(k)) ||
      !["1", "2", "3", "7"].includes(r.box7_distribution_code) ||
      typeof r.box2a_taxable_amount !== "number" ||
      r.box2b_not_determined === true ||
      r.box2a_taxable_amount > r.box1_gross_distribution
    ) {
      throw new Error(
        "Form 8962 joint inventory requires separate owned 1099-R basis, rollover, exclusion or special-distribution reconciliation",
      );
    }
    a[
      r.box7_ira_simple_indicator === true
        ? "taxable_ira_distributions"
        : "taxable_pensions"
    ] = r.box2a_taxable_amount;
  }
  if (key === "f1099b") {
    if (
      [
        "adjustment_amount",
        "box1f_accrued_market_discount",
        "box1g_wash_sale_loss_disallowed",
      ].some((k) => n(r, k) !== 0) || r.adjustment_codes ||
      r.box3_transaction_type
    ) {
      throw new Error(
        "Form 8962 joint inventory requires separate owned adjusted or special capital source reconciliation",
      );
    }
    a.capital_gain = n(r, "proceeds") - n(r, "cost_basis");
  }
  return a;
}
export function assertForm8962JointIncomeReview(
  generalValue: unknown,
  pendingValue?: unknown,
): void {
  const g = obj(generalValue),
    parsed = ptcJointIncomeReviewSchema.safeParse(g.ptc_joint_income_review);
  if (
    !parsed.success || g.filing_status !== "mfj" ||
    g.ptc_spouse_income_review !== undefined
  ) {
    throw new Error(
      "Form 8962 joint income needs one complete reviewed owner inventory",
    );
  }
  const review = parsed.data,
    owners = [normalize(g.taxpayer_ssn), normalize(g.spouse_ssn)];
  if (
    owners.some((t) => !/^\d{9}$/.test(t)) || new Set(owners).size !== 2 ||
    new Set(review.owners.map((r) => normalize(r.owner_ssn))).size !== 2 ||
    review.owners.some((r) => !owners.includes(normalize(r.owner_ssn))) ||
    review.reviewed_on < "2025-12-31"
  ) throw new Error("Form 8962 joint income owner or review date disagrees");
  if (pendingValue === undefined) return;
  const p = obj(pendingValue), raw = obj(p.start);
  if (
    canonical(obj(raw.general).ptc_joint_income_review) !==
      canonical(g.ptc_joint_income_review)
  ) {
    throw new Error(
      "Form 8962 joint income retained review differs from entered source",
    );
  }
  for (const key of Object.keys(raw)) {
    if (!["general", "f1095a", ...Object.keys(paths)].includes(key)) {
      throw new Error(
        `Form 8962 joint income requires an owned reconciliation for entered source category ${key}`,
      );
    }
  }
  const totals = Object.fromEntries(
    owners.map(
      (owner) => [owner, Object.fromEntries(keys.map((key) => [key, 0]))],
    ),
  );
  const references = Object.fromEntries(
    owners.map((owner) => [owner, [] as string[]]),
  );
  const identities = new Set<string>(), refs = new Set<string>();
  let count = 0;
  for (const [key, [node, field]] of Object.entries(paths)) {
    const rows = raw[key] ?? [], retained = obj(p[node])[field] ?? [];
    if (
      !Array.isArray(rows) || !Array.isArray(retained) ||
      rows.length !== retained.length
    ) {
      throw new Error(
        "Form 8962 joint income raw and retained source collection disagree",
      );
    }
    count += rows.length;
    for (let index = 0; index < rows.length; index++) {
      const row = obj(rows[index]),
        copy = review.sources.filter((s) =>
          s.input_key === key && s.source_index === index
        );
      if (copy.length !== 1) {
        throw new Error(
          "Form 8962 joint income inventory omits or duplicates an entered source",
        );
      }
      const s = copy[0],
        owner = normalize(
          key === "w2"
            ? row.employee_ssn
            : ["f1099r", "f1099b"].includes(key)
            ? row.recipient_ssn
            : row.recipient_tin,
        ),
        identity = `${key}:${index}`;
      if (
        !owners.includes(owner) || owner !== normalize(s.owner_ssn) ||
        row.tax_year !== 2025 ||
        row.source_document_reference !== s.source_document_reference ||
        refs.has(
          s.source_document_reference +
            (key === "f1099b" ? ":" + row.transaction_id : ""),
        ) || identities.has(identity) ||
        canonical(row) !== canonical(s.source_record)
      ) {
        throw new Error(
          "Form 8962 joint income source owner, year, reference or received copy disagrees",
        );
      }
      const payerName = key === "w2"
        ? row.employer_name
        : key === "f1099div"
        ? row.payerName
        : row.payer_name;
      const payerTin = key === "w2"
        ? row.employer_ein
        : key === "f1099div"
        ? row.payerTin
        : key === "f1099r"
        ? row.payer_ein
        : row.payer_tin;
      if (
        (key !== "f1099b" &&
          (typeof payerName !== "string" || !payerName.trim())) ||
        !/^\d{9}$/.test(normalize(payerTin))
      ) {
        throw new Error(
          "Form 8962 joint income needs identified employer or payer source",
        );
      }
      refs.add(
        s.source_document_reference +
          (key === "f1099b" ? ":" + row.transaction_id : ""),
      );
      identities.add(identity);
      // Compare every retained source property supplied in the raw record. Unknown
      // source year is bound above; schema-added defaults are not source evidence.
      const kept = obj(retained[index]);
      for (const k of Object.keys(kept)) {
        if (k in row && canonical(kept[k]) !== canonical(row[k])) {
          throw new Error(
            "Form 8962 joint income retained source copy differs from entered source",
          );
        }
      }
      if (
        normalize(
            key === "w2"
              ? kept.employee_ssn
              : ["f1099r", "f1099b"].includes(key)
              ? kept.recipient_ssn
              : kept.recipient_tin,
          ) !==
          owner ||
        kept.source_document_reference !== s.source_document_reference
      ) {
        throw new Error(
          "Form 8962 joint income retained source ownership disagrees",
        );
      }
      if (key === "f1099r" && row.ts !== (owner === owners[0] ? "T" : "S")) {
        throw new Error("Form 8962 joint pension source owner flag disagrees");
      }
      if (
        key === "f1099b" &&
        (!row.account_number || !row.transaction_id ||
          !String(row.date_sold).startsWith("2025-"))
      ) {
        throw new Error(
          "Form 8962 joint capital source needs current-year owned transaction identity",
        );
      }
      if (
        key === "w2" &&
        [
          "box1_wages",
          "box2_fed_withheld",
          "box3_ss_wages",
          "box4_ss_withheld",
          "box5_medicare_wages",
          "box6_medicare_withheld",
        ].some((field) =>
          typeof row[field] !== "number" || !Number.isFinite(row[field])
        )
      ) {
        throw new Error(
          "Form 8962 joint income needs complete entered employee payroll boxes",
        );
      }
      // These item schemas add no per-item defaults. The only deliberately
      // schema-stripped source field is tax_year, already bound above.
      // Use saved JSON semantics for undefined properties; require the complete
      // received financial/identity/payment/classification source copy.
      const sourceCopy = (value: Record<string, any>) => {
        const copy = JSON.parse(JSON.stringify(value));
        delete copy.tax_year;
        return copy;
      };
      if (canonical(sourceCopy(kept)) !== canonical(sourceCopy(row))) {
        throw new Error(
          "Form 8962 joint income retained complete source copy differs from entered source",
        );
      }
      const projection = sourceAmounts(key, row);
      for (const k of keys) totals[owner][k] += projection[k];
      references[owner].push(s.source_document_reference);
    }
  }
  if (review.sources.length !== count) {
    throw new Error(
      "Form 8962 joint income inventory contains an unentered source",
    );
  }
  for (const owner of review.owners) {
    const id = normalize(owner.owner_ssn);
    if (
      canonical(owner.income_source_references.slice().sort()) !==
        canonical(references[id].slice().sort()) ||
      keys.some((k) =>
        Math.abs(owner.income_amounts[k] - totals[id][k]) > 0.000001
      )
    ) {
      throw new Error(
        "Form 8962 joint income amounts or complete source references disagree",
      );
    }
  }
  const sum = (key: string) => owners.reduce((v, id) => v + totals[id][key], 0),
    f = obj(p.f1040);
  const fields: Record<string, string> = {
    wages: "line1z_total_wages",
    taxable_interest: "line2b_taxable_interest",
    tax_exempt_interest: "line2a_tax_exempt",
    ordinary_dividends: "line3b_ordinary_dividends",
    taxable_ira_distributions: "line4b_ira_taxable",
    taxable_pensions: "line5b_pension_taxable",
    social_security_total: "line6a_ss_gross",
    social_security_taxable: "line6b_ss_taxable",
    additional_income: "line8_additional_income",
    adjustments: "line10_adjustments",
  };
  for (const [key, field] of Object.entries(fields)) {
    if (Math.round(sum(key)) !== n(f, field)) {
      throw new Error(
        `Form 8962 joint income source total disagrees with Form 1040 ${field}`,
      );
    }
  }
  if (
    Math.max(-3000, Math.round(sum("capital_gain"))) !==
      (n(f, "line7_capital_gain") + n(f, "line7a_cap_gain_distrib"))
  ) {
    throw new Error(
      "Form 8962 joint income source capital gain disagrees with Form 1040",
    );
  }
  const agi = Math.round(sum("wages")) + Math.round(sum("taxable_interest")) +
    Math.round(sum("ordinary_dividends")) +
    Math.round(sum("taxable_ira_distributions")) +
    Math.round(sum("taxable_pensions")) +
    Math.max(-3000, Math.round(sum("capital_gain"))) +
    Math.round(sum("additional_income")) - Math.round(sum("adjustments"));
  if (agi !== n(f, "line11_agi")) {
    throw new Error(
      "Form 8962 joint income complete inventory disagrees with joint AGI",
    );
  }
}
