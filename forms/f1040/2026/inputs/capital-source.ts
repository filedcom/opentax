import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  Form8949Part,
  type transactionSchema,
} from "../../nodes/intermediate/forms/income/investments/form8949/index.ts";
import { reportedCapitalSale } from "../../nodes/intermediate/forms/income/investments/form8949/reported-money.ts";
import { investmentOwner2026 } from "./investment-source.ts";
const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const signed = z.number().int().safe();
const tin = z.string().regex(/^\d{9}$/);
const broker = {
  source_document_reference: ref,
  payer_tin: tin,
  payer_name: ref,
  account_number: ref,
  transaction_id: ref,
  corrected: z.boolean(),
  superseded_document_references: z.array(ref),
};
const reporting = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("1099-B"),
    ...broker,
    box1d_proceeds: money,
    box1e_basis: money.optional(),
    box1f_market_discount: z.literal(0),
    box1g_wash_sale: money,
    box2_term: z.enum(["short", "long", "unknown"]),
    box3_collectibles_or_qof: z.literal(false),
    box4_federal_withholding: money,
    box5_noncovered: z.boolean(),
    box12_basis_reported: z.boolean(),
    no_barter_contracts_foreign_or_state_boxes: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("1099-DA"),
    ...broker,
    box1a_asset_code: ref,
    box1b_asset_name: ref,
    box1c_units: z.number().positive(),
    box1f_proceeds: money,
    box1g_basis: money.optional(),
    box1h_market_discount: z.literal(0),
    box1i_wash_sale: z.literal(0),
    box2_basis_reported: z.boolean(),
    box3b_qof: z.literal(false),
    box4_federal_withholding: money,
    box6_term: z.enum(["short", "long", "unknown"]),
    box9_noncovered: z.boolean(),
    no_optional_aggregate_method_or_other_special_boxes: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("unreported"),
    no_information_return_received: z.literal(true),
    source_document_reference: ref,
  }).strict(),
]);
export const capitalClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  complete_disposition_inventory: z.literal(true),
  no_other_capital_sources_qof_or_special_rate_gains: z.literal(true),
  no_form4952_election_or_filing: z.literal(true),
  no_niit_exclusions_or_amt_basis_differences: z.literal(true),
  no_other_niit_income_expenses_or_adjustments: z.literal(true),
  no_canceled_debt_attribute_reduction: z.literal(true),
  state_income_tax_allocation_review: z.object({
    record_reference: ref,
    method: z.literal("nii_to_agi_after_proportional_salt_limit"),
    reasonable_for_reported_income_and_tax_payments: z.literal(true),
  }).strict().optional(),
  carryover: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("none"),
      review_reference: ref,
      no_prior_capital_loss_carryover: z.literal(true),
    }).strict(),
    z.object({
      kind: z.literal("prior_return"),
      tax_year: z.literal(2025),
      return_reference: ref,
      taxpayer_tin: tin,
      spouse_tin: tin.optional(),
      filing_status: z.nativeEnum(FilingStatus),
      ownership_and_filing_unit_unchanged: z.literal(true),
      form1040_line11b: signed,
      form1040_line14: signed.nonnegative(),
      form1040_line15: signed.nonnegative(),
      schedule_d_line7: signed,
      schedule_d_line15: signed,
      schedule_d_line21: signed.nonpositive(),
    }).strict(),
  ]),
  sales: z.array(
    z.object({
      sale_reference: ref,
      owner_tin: tin,
      asset_kind: z.enum(["security", "digital_asset"]),
      description: ref,
      acquisition_method: z.literal("purchase"),
      date_acquired: z.string().date(),
      date_sold: z.string().date(),
      acquisition_record_reference: ref,
      disposition_record_reference: ref,
      tax_basis: money,
      basis_record_reference: ref,
      // Already net of selling expenses included in the broker's proceeds;
      // deduct only additional expenses separately below.
      actual_proceeds_before_additional_expenses: money,
      selling_expenses_not_in_reported_proceeds: money,
      ordinary_investment_asset_not_business_personal_or_special: z.literal(
        true,
      ),
      wash_sale_review: z.object({
        record_reference: ref,
        disallowed_loss: money,
        all_accounts_spouse_and_iras_reviewed: z.literal(true),
      }).strict(),
      reporting,
    }).strict(),
  ).max(5000),
}).strict();
export type CapitalClaim2026 = z.input<typeof capitalClaim2026Schema>;
export type CapitalRow2026 = z.infer<typeof transactionSchema>;
export function directCapitalRow2026(row: CapitalRow2026) {
  return ["A", "D", "G", "J"].includes(row.part) && !row.adjustment_codes &&
    row.adjustment_amount === undefined;
}
/** Ordinary capital-loss carryover worksheet; taxable income retains the
 * below-zero amount that the filed 1040 line 15 cannot print. */
export function capitalLossCarryover(
  taxableIncome: number,
  shortNet: number,
  longNet: number,
  deductedLoss: number,
) {
  const used = Math.min(
    deductedLoss,
    Math.max(0, taxableIncome + deductedLoss),
  );
  const shortLoss = Math.max(0, -shortNet), longLoss = Math.max(0, -longNet);
  return {
    short_term: Math.max(0, shortLoss - used - Math.max(0, longNet)),
    long_term: Math.max(
      0,
      longLoss - Math.max(0, shortNet) - Math.max(0, used - shortLoss),
    ),
    deducted_against_income: used,
  };
}
export function resolveCapitalSources2026(
  raw: CapitalClaim2026,
  ownerRaw: z.input<typeof investmentOwner2026>,
) {
  const claim = capitalClaim2026Schema.parse(raw),
    owner = investmentOwner2026.parse(ownerRaw);
  const filers = new Set([
    owner.taxpayer_ssn,
    ...(owner.filing_status === FilingStatus.MFJ && owner.spouse_ssn
      ? [owner.spouse_ssn]
      : []),
  ]);
  let carry = { short_term: 0, long_term: 0, deducted_against_income: 0 };
  const prior = claim.carryover;
  if (prior.kind === "prior_return") {
    if (
      prior.taxpayer_tin !== owner.taxpayer_ssn ||
      prior.spouse_tin !== owner.spouse_ssn ||
      prior.filing_status !== owner.filing_status
    ) {
      throw new Error(
        "Capital carryover needs unchanged, reconciled prior filing-unit ownership",
      );
    }
    const net = prior.schedule_d_line7 + prior.schedule_d_line15,
      limit = prior.filing_status === FilingStatus.MFS ? 1500 : 3000;
    if (
      prior.form1040_line15 !==
        Math.max(0, prior.form1040_line11b - prior.form1040_line14) ||
      prior.schedule_d_line21 !== Math.min(0, Math.max(-limit, net))
    ) {
      throw new Error(
        "Prior capital loss and taxable income do not reconcile to the prior return",
      );
    }
    carry = capitalLossCarryover(
      prior.form1040_line11b - prior.form1040_line14,
      prior.schedule_d_line7,
      prior.schedule_d_line15,
      -prior.schedule_d_line21,
    );
  }
  const seen = new Set<string>(),
    sources = new Map<string, string>(),
    activeDocs = new Set<string>(),
    superseded = new Set<string>();
  const unique = (key: string) => {
    if (seen.has(key)) {
      throw new Error("Duplicate capital disposition or broker transaction");
    }
    seen.add(key);
  };
  let withholding = 0, hasDigital = false;
  const rows = claim.sales.map((s) => {
    unique(`sale:${s.sale_reference}`);
    if (!filers.has(s.owner_tin)) {
      throw new Error("Capital sale owner must be a filer on this return");
    }
    if (!s.date_sold.startsWith("2026-") || s.date_acquired > s.date_sold) {
      throw new Error(
        "Capital sale needs ordered acquisition and 2026 disposition dates",
      );
    }
    const anniversary = `${Number(s.date_acquired.slice(0, 4)) + 1}${
      s.date_acquired.slice(4)
    }`;
    const long = s.date_sold > anniversary,
      digital = s.asset_kind === "digital_asset",
      r = s.reporting;
    hasDigital ||= digital;
    let proceeds = s.actual_proceeds_before_additional_expenses,
      basis = s.tax_basis,
      reportedBasis = false,
      reportedWash = 0;
    let part: Form8949Part;
    if (r.kind === "unreported") {
      part = digital
        ? (long ? Form8949Part.L : Form8949Part.I)
        : (long ? Form8949Part.F : Form8949Part.C);
    } else {
      if ((r.kind === "1099-DA") !== digital) {
        throw new Error(
          "Broker information form must match security or digital-asset source",
        );
      }
      unique(
        JSON.stringify([
          r.payer_tin,
          s.owner_tin,
          r.account_number,
          r.transaction_id,
        ]),
      );
      unique(JSON.stringify([r.source_document_reference, r.transaction_id]));
      const documentIdentity = JSON.stringify([
        r.kind,
        r.payer_tin,
        r.payer_name,
        s.owner_tin,
        r.account_number,
        r.corrected,
        r.superseded_document_references,
      ]);
      if (
        sources.has(r.source_document_reference) &&
        sources.get(r.source_document_reference) !== documentIdentity
      ) {
        throw new Error(
          "Broker document identity or correction history is inconsistent",
        );
      }
      sources.set(r.source_document_reference, documentIdentity);
      activeDocs.add(r.source_document_reference);
      if (
        r.corrected !== (r.superseded_document_references.length > 0) ||
        new Set(r.superseded_document_references).size !==
          r.superseded_document_references.length
      ) {
        throw new Error(
          "Corrected capital statement needs distinct superseded copies",
        );
      }
      r.superseded_document_references.forEach((id) => superseded.add(id));
      const term = r.kind === "1099-B" ? r.box2_term : r.box6_term;
      if (term !== "unknown" && term !== (long ? "long" : "short")) {
        throw new Error(
          "Broker holding term conflicts with acquisition evidence; term correction needs its source route",
        );
      }
      reportedBasis = r.kind === "1099-B"
        ? r.box12_basis_reported
        : r.box2_basis_reported;
      const noncovered = r.kind === "1099-B"
        ? r.box5_noncovered
        : r.box9_noncovered;
      if (reportedBasis && noncovered) {
        throw new Error(
          "Noncovered sale cannot assert basis reported to the IRS",
        );
      }
      const rb = r.kind === "1099-B" ? r.box1e_basis : r.box1g_basis;
      if (reportedBasis && rb === undefined) {
        throw new Error("Basis-reported sale requires the issued basis amount");
      }
      proceeds = r.kind === "1099-B" ? r.box1d_proceeds : r.box1f_proceeds;
      basis = reportedBasis ? rb! : s.tax_basis;
      reportedWash = r.kind === "1099-B" ? r.box1g_wash_sale : 0;
      withholding += r.box4_federal_withholding;
      part = digital
        ? (long
          ? (reportedBasis ? Form8949Part.J : Form8949Part.K)
          : (reportedBasis ? Form8949Part.G : Form8949Part.H))
        : (long
          ? (reportedBasis ? Form8949Part.D : Form8949Part.E)
          : (reportedBasis ? Form8949Part.A : Form8949Part.B));
    }
    const wash = s.wash_sale_review.disallowed_loss;
    if (
      wash < reportedWash ||
      wash >
        Math.max(
            0,
            s.tax_basis + s.selling_expenses_not_in_reported_proceeds -
              s.actual_proceeds_before_additional_expenses,
          ) + .000001 ||
      (digital && wash > 0)
    ) {
      throw new Error(
        "Capital wash-sale review conflicts with reported or realized loss",
      );
    }
    const correction = basis - s.tax_basis,
      expenses = s.actual_proceeds_before_additional_expenses - proceeds -
        s.selling_expenses_not_in_reported_proceeds;
    const codes = [
      ...(reportedBasis && correction !== 0 ? ["B"] : []),
      ...(expenses !== 0 ? ["E"] : []),
      ...(wash > 0 ? ["W"] : []),
    ].join("");
    const adjustment = correction + expenses + wash;
    const row: CapitalRow2026 = {
      part,
      description: s.description,
      source_transaction_id: s.sale_reference,
      date_acquired: s.date_acquired,
      date_sold: s.date_sold,
      proceeds,
      cost_basis: basis,
      ...(codes
        ? { adjustment_codes: codes, adjustment_amount: adjustment }
        : {}),
      gain_loss: proceeds - basis + adjustment,
      is_long_term: long,
    };
    // Shared 2025 rounding preserves direct A/D cents. Preserve G/J cents here
    // as well; the shared Schedule D receives their aggregate direct-line facts.
    return directCapitalRow2026(row) ? row : reportedCapitalSale(row);
  });
  if ([...superseded].some((id) => activeDocs.has(id))) {
    throw new Error(
      "Superseded capital statements cannot remain in the current inventory",
    );
  }
  return {
    source_input: claim,
    rows,
    carry,
    withholding,
    has_digital_sales: hasDigital,
  };
}
