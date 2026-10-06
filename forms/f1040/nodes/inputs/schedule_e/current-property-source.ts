import { z } from "zod";
import {
  currentFarmRentalNet,
  type CurrentFarmRentalQbiSource,
} from "../f4835/qbi-source.ts";
const ref = z.string().trim().min(1),
  tin = z.string().regex(/^\d{9}$/),
  date = z.string().date().refine((s) => s.startsWith("2025-"));
export const currentPropertySourceSchema = z.object({
  tax_year: z.literal(2025),
  activity_id: ref.max(64),
  activity_name: ref.max(30),
  recipient_tin: tin,
  business_name: ref.max(75),
  source_reference: ref,
  domestic_section162_trade_review_reference: ref,
  management_record: z.object({
    agent_ein: tin,
    contract_reference: ref,
    recurring_leasing_management_services: z.literal(true),
    taxpayer_materially_participated: z.literal(false),
  }).strict(),
  acquisition_record: z.object({
    acquired_on: date,
    seller_tin: tin,
    closing_reference: ref,
    payment_reference: ref,
    total_paid: z.number().int().positive(),
    parcels: z.array(
      z.object({
        parcel_id: ref,
        property_description: ref,
        allocated_purchase_cost: z.number().int().positive(),
        nondepreciable_land: z.literal(true),
        location_state: z.string().regex(/^[A-Z]{2}$/),
      }).strict(),
    ).min(2),
  }).strict(),
  closing_record: z.object({
    parcel_id: ref,
    sold_on: date,
    buyer_tin: tin,
    buyer_unrelated: z.literal(true),
    closing_reference: ref,
    deposit_reference: ref,
    gross_paid: z.number().int().positive(),
    fully_taxable: z.literal(true),
    installment_method: z.literal(false),
  }).strict(),
  retained_interest_record: z.object({
    remaining_parcel_ids: z.array(ref).min(1),
    ownership_record_reference: ref,
    retained_lease_reference: ref,
  }).strict(),
  lease_records: z.array(
    z.object({
      parcel_id: ref,
      tenant_tin: tin,
      lease_reference: ref,
      started_on: date,
      ended_on: date,
    }).strict(),
  ).min(1),
  rent_payments: z.array(
    z.object({
      paid_on: date,
      tenant_tin: tin,
      amount: z.number().int().positive(),
      lease_reference: ref,
      deposit_reference: ref,
    }).strict(),
  ).min(1),
  property_tax_payments: z.array(
    z.object({
      paid_on: date,
      payee_tin: tin,
      amount: z.number().int().positive(),
      assessment_reference: ref,
      payment_reference: ref,
    }).strict(),
  ).min(1),
  prior_passive_loss: z.literal(0),
  prior_qbi_loss: z.literal(0),
  grouped_with_prior_activity: z.literal(false),
  owner_level_adjustments: z.literal(0),
}).strict().superRefine((s, c) => {
  const ids = s.acquisition_record.parcels.map((p) => p.parcel_id),
    remaining = s.retained_interest_record.remaining_parcel_ids;
  // One multiparcel lease may have rows for distinct parcels. Repeating or
  // overlapping a parcel period, or changing the tenant of that reference,
  // does not establish another independent lease.
  const leaseConflict = s.lease_records.some((row, i) =>
    s.lease_records.slice(0, i).some((prior) =>
      (prior.lease_reference === row.lease_reference &&
        prior.tenant_tin !== row.tenant_tin) ||
      (prior.parcel_id === row.parcel_id &&
        prior.started_on <= row.ended_on && row.started_on <= prior.ended_on)
    )
  );
  const deposits = [
    s.closing_record.deposit_reference,
    ...s.rent_payments.map((row) => row.deposit_reference),
  ];
  const payments = [
    s.acquisition_record.payment_reference,
    ...s.property_tax_payments.map((row) => row.payment_reference),
  ];
  const assessments = s.property_tax_payments.map((row) =>
    row.assessment_reference
  );
  const retainedLeaseJoined = remaining.every((parcel) =>
    s.lease_records.some((row) =>
      row.parcel_id === parcel &&
      row.lease_reference ===
        s.retained_interest_record.retained_lease_reference &&
      row.started_on <= s.closing_record.sold_on &&
      row.ended_on >= s.closing_record.sold_on
    )
  );
  const sourceIssues: Array<[boolean, string[], string]> = [
    [
      leaseConflict,
      ["lease_records"],
      "Lease parcel periods must not overlap and a multiparcel lease must retain one tenant",
    ],
    [
      !retainedLeaseJoined,
      ["retained_interest_record", "retained_lease_reference"],
      "Retained lease reference must join every remaining owned parcel through the sale date",
    ],
    [
      new Set(deposits).size !== deposits.length,
      ["rent_payments"],
      "Closing and rent deposit references must identify distinct receipts",
    ],
    [
      new Set(payments).size !== payments.length,
      ["property_tax_payments"],
      "Acquisition and tax payment references must identify distinct payments",
    ],
    [
      new Set(assessments).size !== assessments.length,
      ["property_tax_payments"],
      "Current tax assessment references must be distinct; installment allocation evidence is not supplied by this contract",
    ],
  ];
  for (const [invalid, path, message] of sourceIssues) {
    if (invalid) c.addIssue({ code: z.ZodIssueCode.custom, path, message });
  }
  if (
    new Set(ids).size !== ids.length ||
    new Set(remaining).size !== remaining.length ||
    !ids.includes(s.closing_record.parcel_id) ||
    remaining.length !== ids.length - 1 || remaining.some((id) =>
      !ids.includes(id) || id === s.closing_record.parcel_id
    ) || s.acquisition_record.parcels.reduce((n, p) =>
        n + p.allocated_purchase_cost, 0) !== s.acquisition_record.total_paid ||
    s.closing_record.sold_on <= s.acquisition_record.acquired_on ||
    s.closing_record.buyer_tin === s.recipient_tin ||
    s.acquisition_record.seller_tin === s.recipient_tin ||
    s.lease_records.some((r) =>
      !ids.includes(r.parcel_id) ||
      r.started_on < s.acquisition_record.acquired_on ||
      r.ended_on < r.started_on ||
      (r.parcel_id === s.closing_record.parcel_id &&
        r.ended_on >= s.closing_record.sold_on)
    ) ||
    s.rent_payments.some((r) =>
      r.paid_on < s.acquisition_record.acquired_on ||
      !s.lease_records.some((l) =>
        l.tenant_tin === r.tenant_tin &&
        l.lease_reference === r.lease_reference &&
        l.started_on <= r.paid_on && r.paid_on <= l.ended_on
      )
    ) ||
    s.property_tax_payments.some((r) =>
      r.paid_on < s.acquisition_record.acquired_on
    )
  ) {
    c.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Current land acquisition, retained parcels, owner and unrelated closing must reconcile",
    });
  }
});
export function currentPropertyRentalDays(
  s: z.infer<typeof currentPropertySourceSchema>,
) {
  const days = new Set<string>();
  for (const lease of s.lease_records) {
    for (
      let day = Date.parse(lease.started_on);
      day <= Date.parse(lease.ended_on);
      day += 86400000
    ) days.add(new Date(day).toISOString().slice(0, 10));
  }
  return days.size;
}
export type CurrentPropertySource = z.infer<typeof currentPropertySourceSchema>;
export function currentPropertyAmounts(s: CurrentPropertySource) {
  const cost =
    s.acquisition_record.parcels.find((p) =>
      p.parcel_id === s.closing_record.parcel_id
    )!.allocated_purchase_cost;
  return {
    receipts: s.rent_payments.reduce((n, r) => n + r.amount, 0),
    taxes: s.property_tax_payments.reduce((n, r) => n + r.amount, 0),
    cost,
    gain: s.closing_record.gross_paid - cost,
  };
}
/** Section1.469-2T(f)(3): zero of this complete land inventory's UBIA is
 * depreciable. Recharacterize only positive net activity income. Keep gross
 * gain and deductions on their ordinary forms. Publication925 omits all
 * income and loss of a net-positive recharacterized activity from8582. */
export function currentPropertyPassiveAmounts(s: CurrentPropertySource) {
  const a = currentPropertyAmounts(s),
    operating = a.receipts - a.taxes,
    net = operating + a.gain,
    recharacterized = Math.max(0, net);
  return {
    operating,
    net,
    recharacterized,
    passiveOperating: net > 0 ? 0 : operating,
    passiveGain: net > 0 ? 0 : a.gain,
    nonpassiveOperating: net > 0 ? operating : 0,
  };
}
export function reconcileCurrentPropertySource(item: Record<string, unknown>) {
  if (item.current_property_source === undefined) return undefined;
  const s = currentPropertySourceSchema.parse(item.current_property_source),
    a = currentPropertyAmounts(s),
    sales = item.passive_property_sales as any[] | undefined,
    sale = sales?.[0],
    first = item.first_year_activity_source as any;
  if (
    item.activity_id !== s.activity_id ||
    item.property_description !== s.activity_name ||
    item.activity_type !== "B" || item.property_type !== 5 ||
    item.disposed_of !== true || item.form_1099_payments_made !== false ||
    item.some_investment_not_at_risk === true ||
    (item.ownership_percent ?? 100) !== 100 || item.personal_use_days !== 0 ||
    item.fair_rental_days !== currentPropertyRentalDays(s) ||
    item.qbi_trade_or_business !== "Y" || (item.qbi_override !== undefined) ||
    (item.qbi_specified_service === true) || a.receipts !== item.rent_income ||
    a.taxes !== (item.expense_taxes ?? 0) || !sales || sales.length !== 1 ||
    !sale || sale.activity_id !== s.activity_id ||
    sale.activity_name !== s.activity_name || sale.part !== "II" ||
    sale.property_description !==
      s.acquisition_record.parcels.find((p) =>
        p.parcel_id === s.closing_record.parcel_id
      )?.property_description ||
    sale.acquired_on !== s.acquisition_record.acquired_on ||
    sale.sold_on !== s.closing_record.sold_on ||
    sale.gross_sales_price !== s.closing_record.gross_paid ||
    sale.cost_or_other_basis !== a.cost || sale.depreciation_allowed !== 0 ||
    sale.entire_activity_interest_disposed !== false ||
    sale.buyer_unrelated !== true || sale.fully_taxable !== true ||
    sale.installment_method !== false ||
    sale.disposition_document_reference !==
      s.closing_record.closing_reference ||
    a.gain <= 0 || first?.activity_id !== s.activity_id ||
    first?.activity_name !== s.activity_name ||
    first?.activity_acquired_on !== s.acquisition_record.acquired_on ||
    first?.acquisition_document_reference !==
      s.acquisition_record.closing_reference ||
    first?.not_grouped_with_prior_activity !== true ||
    Object.entries(item).some(([k, v]) =>
      k.startsWith("expense_") && typeof v === "number" && v !== 0 &&
      k !== "expense_taxes"
    ) ||
    Object.keys(item).some((k) =>
      k.startsWith("prior_") || k.includes("carryover")
    )
  ) {
    throw new Error(
      "Current passive land sale differs from actual owner, purchase, closing, retained parcel, rental or payment records",
    );
  }
  return s;
}
export function currentPropertyQbiRows(
  properties: readonly CurrentPropertySource[],
  farms: readonly CurrentFarmRentalQbiSource[] = [],
) {
  const unique = (references: string[], kind: string) => {
    if (new Set(references).size !== references.length) {
      throw new Error(
        `Current property activities repeat ${kind}; shared economic records require explicit allocation evidence`,
      );
    }
  };
  unique(
    properties.flatMap((s) =>
      s.acquisition_record.parcels.map((p) =>
        `${s.recipient_tin}:${p.location_state}:${p.parcel_id}`
      )
    ),
    "owned parcels",
  );
  unique(
    properties.flatMap((s) => [
      s.closing_record.deposit_reference,
      ...s.rent_payments.map((r) => r.deposit_reference),
    ]),
    "receipt references",
  );
  unique(
    properties.flatMap((s) => [
      s.acquisition_record.payment_reference,
      ...s.property_tax_payments.map((r) => r.payment_reference),
    ]),
    "payment references",
  );
  unique(
    properties.flatMap((s) =>
      s.property_tax_payments.map((r) => r.assessment_reference)
    ),
    "tax assessment references",
  );
  const rows = [
    ...properties.map((s) => {
      const a = currentPropertyAmounts(s);
      return {
        activity_id: s.activity_id,
        businessName: s.business_name,
        tin: { kind: "ssn" as const, value: s.recipient_tin },
        net: a.receipts - a.taxes + a.gain,
        passiveNet: Math.min(0, a.receipts - a.taxes + a.gain),
      };
    }),
    ...farms.map((s) => ({
      activity_id: s.activity_id,
      businessName: s.business_name,
      tin: { kind: "ssn" as const, value: s.recipient_tin },
      net: currentFarmRentalNet(s),
      passiveNet: currentFarmRentalNet(s),
    })),
  ];
  if (new Set(rows.map((r) => r.activity_id)).size !== rows.length) {
    throw new Error("Current property/farm activities must be distinct");
  }
  const income = rows.reduce((n, r) => n + Math.max(0, r.passiveNet), 0),
    loss = rows.reduce((n, r) => n + Math.max(0, -r.passiveNet), 0),
    allowed = Math.min(income, loss);
  return rows.map((r) => {
    const qbi = r.net >= 0
      ? r.net
      : -(loss > 0 ? allowed * (-r.passiveNet) / loss : 0);
    if (!Number.isSafeInteger(qbi)) {
      throw new Error(
        "Current property QBI needs exact filed activity loss allocation",
      );
    }
    return {
      ...r,
      qbi,
      suspended_loss: Math.max(0, -r.passiveNet) + Math.min(0, qbi),
    };
  });
}
export function currentPropertyQbiLines(
  properties: readonly CurrentPropertySource[],
  farms: readonly CurrentFarmRentalQbiSource[],
  taxable: number,
) {
  const qbi = currentPropertyQbiRows(properties, farms).reduce(
      (n, r) => n + r.qbi,
      0,
    ),
    positive = Math.max(0, qbi),
    line11 = Math.max(0, Math.round(taxable)),
    component = Math.round(positive * .2),
    cap = Math.round(line11 * .2);
  return {
    line1_qbi: qbi,
    line1_business_reference: properties[0].source_reference,
    line2: qbi,
    line3: 0,
    line4: positive,
    line5: component,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: component,
    line11,
    line12: 0,
    line13: line11,
    line14: cap,
    line15: Math.min(component, cap),
    line16: Math.max(0, -qbi),
    line17: 0,
  };
}
