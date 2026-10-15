import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { form4797 } from "../../nodes/intermediate/forms/income/business/form4797/index.ts";
import {
  calculateSection1231History2026,
  section1231History2026Schema,
} from "./section1231-history.ts";

const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < .0001,
  "Source money must be dollars and cents",
);
const record = z.object({
  record_reference: ref,
  date: z.string().date(),
  description: ref,
  amount: money,
}).strict();
const informationReturn = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("none"),
    review_reference: ref,
    no_information_return_received: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("1099-S"),
    tax_year: z.literal(2026),
    source_document_reference: ref,
    filer_tin: z.string().regex(/^\d{9}$/),
    transferor_tin: z.string().regex(/^\d{9}$/),
    box1_date_closing: z.string().date(),
    box2_gross_proceeds: money,
    corrected: z.boolean(),
    superseded_document_references: z.array(ref),
    no_non_cash_consideration_foreign_transferor_or_special_adjustments: z
      .literal(true),
  }).strict(),
]);
/** Staged source contract. Registration waits for 4797/QBI/NIIT and loss-limit consumers. */
export const landDispositionSource2026Schema = investmentOwner2026.extend({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    review_reference: ref,
    all_dispositions_and_section1231_items_included: z.literal(true),
    no_other_section1231_sources_or_casualties: z.literal(true),
    no_passive_or_at_risk_limitations: z.literal(true),
    prior_history: section1231History2026Schema,
    sales: z.array(
      z.object({
        sale_reference: ref,
        information_return: informationReturn,
        owner_tin: z.string().regex(/^\d{9}$/),
        property_reference: ref,
        activity_reference: ref,
        description: ref,
        nondepreciable_business_land_only: z.literal(true),
        business_use_entire_ownership_period: z.literal(true),
        full_interest_disposed: z.literal(true),
        no_section1252_1254_or1255_recapture: z.literal(true),
        no_related_party_installment_exchange_or_nonrecognition: z.literal(
          true,
        ),
        acquired_on: z.string().date(),
        acquisition_record_reference: ref,
        purchase_price: money,
        capitalized_acquisition_costs: z.array(record).max(100),
        basis_adjustments: z.array(
          record.extend({ direction: z.enum(["increase", "decrease"]) })
            .strict(),
        ).max(500),
        closing: z.object({
          settled_on: z.string().date(),
          closing_record_reference: ref,
          gross_sales_price: money,
          all_consideration_and_assumed_debt_included: z.literal(true),
          selling_expenses: z.array(record).max(100),
        }).strict(),
      }).strict(),
    ).min(1).max(1000),
  }).strict(),
}).strict();
export type LandDispositionSource2026 = z.input<
  typeof landDispositionSource2026Schema
>;
export const section1231FinalizedLoss2026Schema = z.object({
  amount_taken_into_account: z.number().int().nonnegative().safe(),
  finalized_limitation_workpaper_reference: ref,
}).strict();

/** Property rows and tax character only. Does not elect section 1062 or post return totals. */
export function calculateLandDispositions2026(
  raw: LandDispositionSource2026,
  finalizedLoss?: z.input<typeof section1231FinalizedLoss2026Schema>,
) {
  const source = landDispositionSource2026Schema.parse(raw),
    claim = source.claim;
  if (
    claim.prior_history.current_year_loss_taken_into_account !== undefined ||
    claim.prior_history.current_year_loss_source_reference !== undefined
  ) {
    throw new Error(
      "Current section 1231 loss must come from the finalized limitation owner, not the sale history",
    );
  }
  const owners = source.filing_status === FilingStatus.MFJ
    ? [source.taxpayer_ssn, source.spouse_ssn]
    : [source.taxpayer_ssn];
  for (
    const key of [
      "sale_reference",
      "property_reference",
      "acquisition_record_reference",
    ] as const
  ) {
    if (new Set(claim.sales.map((s) => s[key])).size !== claim.sales.length) {
      throw new Error(`Duplicate land disposition ${key}`);
    }
  }
  const recordIds = claim.sales.flatMap((s) =>
    [
      ...s.capitalized_acquisition_costs,
      ...s.basis_adjustments,
      ...s.closing.selling_expenses,
    ].map((r) => r.record_reference)
  );
  if (new Set(recordIds).size !== recordIds.length) {
    throw new Error(
      "Land records cannot be deducted on multiple properties without an allocation",
    );
  }
  const copies = claim.sales.flatMap((s) =>
    s.information_return.kind === "1099-S" ? [s.information_return] : []
  );
  const active = copies.map((c) => c.source_document_reference);
  if (
    new Set(active).size !== active.length ||
    copies.some((c) =>
      c.superseded_document_references.some((id) => active.includes(id))
    )
  ) throw new Error("Duplicate or superseded land information-return copy");
  const rows = claim.sales.map((s) => {
    if (!owners.includes(s.owner_tin)) {
      throw new Error("Land sale owner is outside this return");
    }
    const sold = s.closing.settled_on;
    const copy = s.information_return;
    if (
      copy.kind === "1099-S" &&
      (copy.transferor_tin !== s.owner_tin || copy.box1_date_closing !== sold ||
        copy.box2_gross_proceeds !== s.closing.gross_sales_price ||
        copy.corrected !== (copy.superseded_document_references.length > 0) ||
        new Set(copy.superseded_document_references).size !==
          copy.superseded_document_references.length)
    ) {
      throw new Error(
        "Form 1099-S must reconcile to its land owner, closing and correction records",
      );
    }
    if (!sold.startsWith("2026-") || sold <= s.acquired_on) {
      throw new Error(
        "Land disposition dates must identify a 2026 sale after acquisition",
      );
    }
    const records = [
      ...s.capitalized_acquisition_costs,
      ...s.basis_adjustments,
      ...s.closing.selling_expenses,
    ];
    if (
      new Set(records.map((r) => r.record_reference)).size !== records.length ||
      records.some((r) => r.date < s.acquired_on || r.date > sold)
    ) {
      throw new Error(
        "Land basis and closing ledger needs distinct dated records within ownership",
      );
    }
    const cents = (n: number) => Math.round(n * 100);
    const initial = cents(s.purchase_price) +
      s.capitalized_acquisition_costs.reduce((n, r) => n + cents(r.amount), 0);
    // Review running basis, so an invalid reduction cannot be hidden by a later addition.
    let adjusted = initial;
    for (
      const r of [...s.basis_adjustments].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    ) {
      adjusted += (r.direction === "increase" ? 1 : -1) * cents(r.amount);
      if (adjusted < 0) {
        throw new Error("Land basis adjustments exceed available basis");
      }
    }
    const expenses = s.closing.selling_expenses.reduce(
        (n, r) => n + cents(r.amount),
        0,
      ),
      proceeds = cents(s.closing.gross_sales_price);
    const acquired = new Date(`${s.acquired_on}T00:00:00Z`);
    // For Feb 29 acquisitions, the following year's last February day is the
    // anniversary; holding begins the next day, as for other acquisitions.
    const anniversary = new Date(
      Date.UTC(
        acquired.getUTCFullYear() + 1,
        acquired.getUTCMonth(),
        acquired.getUTCDate(),
      ),
    );
    if (anniversary.getUTCMonth() !== acquired.getUTCMonth()) {
      anniversary.setUTCDate(0);
    }
    const long = new Date(`${sold}T00:00:00Z`) > anniversary;
    const gross = roundWholeDollars(proceeds / 100),
      basisAndExpenses = roundWholeDollars((adjusted + expenses) / 100);
    return {
      source: s,
      part: long ? "I" as const : "II" as const,
      cents: {
        gross_proceeds: proceeds,
        unadjusted_basis: initial,
        adjusted_basis: adjusted,
        selling_expenses: expenses,
        net_sales_price: proceeds - expenses,
        gain: proceeds - expenses - adjusted,
      },
      printed: {
        gross_sales_price: gross,
        depreciation: 0,
        basis_plus_selling_expenses: basisAndExpenses,
        gain: gross - basisAndExpenses,
      },
    };
  });
  const net1231 = rows.filter((r) => r.part === "I").reduce(
      (n, r) => n + r.printed.gain,
      0,
    ),
    shortOrdinary = rows.filter((r) => r.part === "II").reduce(
      (n, r) => n + r.printed.gain,
      0,
    );
  const loss = finalizedLoss
    ? section1231FinalizedLoss2026Schema.parse(finalizedLoss)
    : undefined;
  if (loss && net1231 >= 0) {
    throw new Error("Finalized section 1231 loss supplied for a nonloss year");
  }
  const history = calculateSection1231History2026(
    {
      ...claim.prior_history,
      ...(loss
        ? {
          current_year_loss_taken_into_account: loss.amount_taken_into_account,
          current_year_loss_source_reference:
            loss.finalized_limitation_workpaper_reference,
        }
        : {}),
    },
    net1231,
    {
      filing_status: source.filing_status,
      taxpayer_ssn: source.taxpayer_ssn,
      spouse_ssn: source.spouse_ssn,
    },
  );
  const shared = form4797.compute({ taxYear: 2026, formType: "f1040" }, {
    section_1231_gain: net1231,
    nonrecaptured_1231_loss: history.current.opening_nonrecaptured_loss,
    ordinary_gain: shortOrdinary,
  });
  const value = (node: string, field: string) =>
    shared.outputs.reduce(
      (n, o) =>
        n + (o.nodeType === node && typeof o.fields[field] === "number"
          ? Number(o.fields[field])
          : 0),
      0,
    );
  const capital = value("schedule_d", "line_11_form2439"),
    ordinary = value("schedule1", "line4_other_gains");
  if (
    capital !== history.current.long_term_gain ||
    ordinary !== history.current.ordinary_gain_loss + shortOrdinary ||
    capital + ordinary !== net1231 + shortOrdinary
  ) {
    throw new Error(
      "Shared Form 4797 character does not reconcile to land sale sources",
    );
  }
  return {
    source_input: source,
    rows,
    history,
    line1a_information_return_proceeds: roundWholeDollars(
      copies.reduce((n, c) => n + c.box2_gross_proceeds, 0),
    ),
    line8_net_section1231: net1231,
    line9_nonrecaptured_loss: history.current.nonrecaptured_loss_for_return,
    line10_long_term_gain: capital,
    line13_prior_loss_recapture: history.current.ordinary_recapture,
    short_term_ordinary_gain_loss: shortOrdinary,
    line12_section1231_loss: Math.min(0, net1231),
    line19_ordinary_gain_loss: ordinary,
    line20b_schedule1_gain_loss: ordinary,
    opening_2027_losses: history.opening_next_year_losses,
    filing_ready: false as const,
  };
}
