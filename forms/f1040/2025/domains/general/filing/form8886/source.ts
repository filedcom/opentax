import { z } from "zod";

// Disclosure facts do not create, remove or classify a tax item in the return.
// The prepared filing path must reconcile the source references separately.
export enum ReportableCategory {
  Listed = "listed",
  Confidential = "confidential",
  ContractualProtection = "contractual_protection",
  Loss = "loss",
  TransactionOfInterest = "transaction_of_interest",
}

export enum TaxBenefit {
  Deduction = "deduction",
  CapitalLoss = "capital_loss",
  OrdinaryLoss = "ordinary_loss",
  Exclusion = "exclusion",
  Nonrecognition = "nonrecognition",
  BasisAdjustment = "basis_adjustment",
  NoBasisAdjustment = "no_basis_adjustment",
  Deferral = "deferral",
  Credit = "credit",
  Other = "other",
}

export enum EntityType {
  Partnership = "partnership",
  SCorporation = "s_corporation",
  Trust = "trust",
}

export enum ReturnSourceKind {
  BrokerSale = "broker_sale",
  DirectSale = "direct_sale",
  BusinessCasualty = "business_casualty",
  PartnershipK1Capital = "partnership_k1_capital",
  SCorporationK1Capital = "s_corporation_k1_capital",
  TrustK1Capital = "trust_k1_capital",
  PartnershipK1Activity = "partnership_k1_activity",
  SCorporationK1Activity = "s_corporation_k1_activity",
  TrustK1Activity = "trust_k1_activity",
}

export enum K1CapitalComponent {
  ShortTerm = "short_term",
  LongTerm = "long_term",
}

export enum K1ActivityComponent {
  OrdinaryBusiness = "ordinary_business",
  RentalRealEstate = "rental_real_estate",
  OtherRental = "other_rental",
  OtherPortfolio = "other_portfolio",
}

const reference = z.string().trim().min(1).max(500);
const narrative = z.string().trim().min(1).max(100_000).refine(
  (value) =>
    !/\b(?:information|details)\s+(?:provided|available)\s+(?:up)?on\s+request\b/i
      .test(value),
  "Form 8886 requires disclosure details, not information offered on request",
);
const year = z.number().int().min(1900).max(2099);
const amount = z.number().finite().nonnegative().max(999_999_999_999_999);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value;
  },
  "Invalid calendar date",
);
const unique = <T>(values: readonly T[]) =>
  new Set(values).size === values.length;

export const currentReturnLinkSchema = z.object({
  reference,
  source_kind: z.nativeEnum(ReturnSourceKind),
  source_component: z.union([
    z.nativeEnum(K1CapitalComponent),
    z.nativeEnum(K1ActivityComponent),
  ]).optional(),
  source_document_reference: reference,
  source_transaction_id: reference,
  reportable_transaction_id: reference,
  source_row_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  relationship_review_reference: reference,
}).strict().superRefine((link, ctx) => {
  const k1 = [
    ReturnSourceKind.PartnershipK1Capital,
    ReturnSourceKind.SCorporationK1Capital,
    ReturnSourceKind.TrustK1Capital,
  ]
    .includes(link.source_kind);
  const activity = [
    ReturnSourceKind.PartnershipK1Activity,
    ReturnSourceKind.SCorporationK1Activity,
    ReturnSourceKind.TrustK1Activity,
  ].includes(link.source_kind);
  if (activity) {
    if (
      !z.nativeEnum(K1ActivityComponent).safeParse(link.source_component)
        .success
    ) {
      ctx.addIssue({
        code: "custom",
        message: "K-1 activity links require an activity component",
      });
    }
    return;
  }
  if (
    k1
      ? !z.nativeEnum(K1CapitalComponent).safeParse(link.source_component)
        .success
      : link.source_component !== undefined
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Only K-1 capital links require a capital component",
    });
  }
});

const addressSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("us"),
    line1: z.string().trim().min(1).max(35),
    line2: z.string().trim().min(1).max(35).optional(),
    city: z.string().trim().min(1).max(22),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
  }).strict(),
  z.object({
    kind: z.literal("foreign"),
    line1: z.string().trim().min(1).max(35),
    line2: z.string().trim().min(1).max(35).optional(),
    city: z.string().trim().min(1).max(50),
    province: z.string().trim().min(1).max(50).optional(),
    postal_code: z.string().trim().min(1).max(50).optional(),
    country: z.string().regex(/^[A-Z]{2}$/),
  }).strict(),
]);

const identitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ssn"), value: z.string().regex(/^\d{9}$/) })
    .strict(),
  z.object({ kind: z.literal("ein"), value: z.string().regex(/^\d{9}$/) })
    .strict(),
  z.object({ kind: z.literal("unknown"), reason: reference }).strict(),
]);

const partySchema = z.object({
  party_id: reference,
  name: z.string().trim().min(1).max(150),
  individual: z.boolean(),
  identity: identitySchema,
  address: addressSchema.optional(),
  unknown_address_reason: reference.optional(),
  tax_exempt: z.boolean(),
  foreign: z.boolean(),
  related: z.boolean(),
  relationship_description: narrative.optional(),
  involvement_description: narrative,
  source_reference: reference,
}).strict().superRefine((party, ctx) => {
  if (
    (party.address === undefined) ===
      (party.unknown_address_reason === undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Supply an address or explain why it is unknown",
    });
  }
  if (party.related && !party.relationship_description) {
    ctx.addIssue({
      code: "custom",
      message: "A related party needs its relationship description",
    });
  }
});

const participationSchema = z.object({
  transaction_id: reference,
  // Shared arrangement identity does not merge each participant's tax items.
  shared_transaction_review_reference: reference.optional(),
  name: z.string().trim().min(1).max(500),
  initial_participation_year: year.max(2025),
  // Retain every supplied RTN unchanged. No legacy-schema workaround is used.
  reportable_transaction_numbers: z.array(z.string().trim().min(1).max(50)),
  source_reference: reference,
}).strict();

const entitySchema = z.object({
  party_id: reference,
  entity_type: z.nativeEnum(EntityType),
  k1_received_date: date.optional(),
  no_k1_received: z.boolean(),
  k1_source_reference: reference.optional(),
}).strict().superRefine((entity, ctx) => {
  if (entity.no_k1_received === (entity.k1_received_date !== undefined)) {
    ctx.addIssue({
      code: "custom",
      message: "Supply either the K-1 receipt date or no K-1 received",
    });
  }
  if (entity.k1_received_date && !entity.k1_source_reference) {
    ctx.addIssue({
      code: "custom",
      message: "The K-1 receipt date needs its source reference",
    });
  }
  if (entity.no_k1_received && entity.k1_source_reference) {
    ctx.addIssue({
      code: "custom",
      message: "No K-1 received cannot carry a received K-1 reference",
    });
  }
});

export const disclosureSchema = z.object({
  disclosure_id: reference,
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  tax_year: z.literal(2025),
  initial_year_filer: z.boolean(),
  protective_disclosure: z.boolean(),
  previous_disclosure_reference: reference.optional(),
  transactions: z.array(participationSchema).min(1),
  substantially_similar_review_reference: reference.optional(),
  categories: z.array(z.nativeEnum(ReportableCategory)).min(1).refine(unique),
  category_review_reference: reference,
  published_guidance: narrative.optional(),
  confidentiality_description: narrative.optional(),
  contractual_protection_description: narrative.optional(),
  loss_basis_description: narrative.optional(),
  parties: z.array(partySchema).min(1),
  through_entities: z.array(entitySchema),
  fee_recipients: z.array(
    z.object({
      party_id: reference,
      approximate_fees_paid: amount,
      source_reference: reference,
    }).strict(),
  ),
  benefits: z.array(
    z.object({
      kind: z.nativeEnum(TaxBenefit),
      description: narrative,
      anticipated_amount: amount,
      affected_tax_years: z.array(year).min(1).refine(unique),
      source_reference: reference,
      current_return_source_references: z.array(reference),
    }).strict(),
  ).min(1),
  current_return_links: z.array(currentReturnLinkSchema).optional(),
  anticipated_benefit_year_count: z.number().int().min(1).max(99),
  total_investment_or_basis: amount,
  investment_basis_source_reference: reference,
  transaction_steps: narrative,
  expected_tax_treatment: narrative,
  economic_business_reasons: narrative,
  tax_result_protection: narrative,
  disclosure_review_reference: reference,
}).strict().superRefine((source, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: "custom", message });
  if (!unique(source.transactions.map((item) => item.transaction_id))) {
    reject("Disclosure transaction IDs must be distinct");
  }
  if (
    source.transactions.length > 1 &&
    !source.substantially_similar_review_reference
  ) {
    reject("Grouped transactions need a same-or-substantially-similar review");
  }
  if (
    source.initial_year_filer ===
      (source.previous_disclosure_reference !== undefined)
  ) {
    reject(
      "Initial filing cannot claim a previous disclosure; subsequent filing needs one",
    );
  }
  const has = (category: ReportableCategory) =>
    source.categories.includes(category);
  if (
    (has(ReportableCategory.Listed) ||
      has(ReportableCategory.TransactionOfInterest)) &&
    !source.published_guidance
  ) {
    reject(
      "Listed and interest transactions need their identifying published guidance",
    );
  }
  if (
    has(ReportableCategory.Confidential) && !source.confidentiality_description
  ) {
    reject("Confidential transactions need their disclosure restrictions");
  }
  if (
    has(ReportableCategory.ContractualProtection) &&
    !source.contractual_protection_description
  ) {
    reject("Contractual protection needs its terms");
  }
  if (has(ReportableCategory.Loss) && !source.loss_basis_description) {
    reject("Loss transactions need their basis calculation");
  }
  const parties = new Map(
    source.parties.map((party) => [party.party_id, party]),
  );
  if (parties.size !== source.parties.length) {
    reject("Party IDs must be distinct");
  }
  if (!unique(source.through_entities.map((entity) => entity.party_id))) {
    reject("Pass-through entity IDs must be distinct");
  }
  if (!unique(source.fee_recipients.map((party) => party.party_id))) {
    reject("Fee recipient IDs must be distinct");
  }
  for (const entity of source.through_entities) {
    const party = parties.get(entity.party_id);
    if (!party || party.individual) {
      reject("Pass-through entity must reference an entity party");
    }
  }
  for (const recipient of source.fee_recipients) {
    if (!parties.has(recipient.party_id)) {
      reject("Fee recipient must reference a disclosed party");
    }
  }
  if (
    source.benefits.some((benefit) =>
      benefit.affected_tax_years.includes(2025) &&
      benefit.current_return_source_references.length === 0
    )
  ) {
    reject("Every current-year benefit needs its return source references");
  }
  const links = source.current_return_links ?? [];
  if (!unique(links.map((link) => link.reference))) {
    reject("Current-return link references must be distinct");
  }
  for (const link of links) {
    if (
      !source.transactions.some((row) =>
        row.transaction_id === link.reportable_transaction_id
      )
    ) {
      reject(
        "A current-return link must identify a disclosed reportable transaction",
      );
    }
    if (
      !source.benefits.some((benefit) =>
        benefit.affected_tax_years.includes(2025) &&
        benefit.current_return_source_references.includes(link.reference)
      )
    ) {
      reject("A current-return link must belong to a current-year benefit");
    }
  }
});

export const publicSourceSchema = z.object({
  disclosures: z.array(disclosureSchema).min(1),
}).strict().refine(
  ({ disclosures }) => unique(disclosures.map((item) => item.disclosure_id)),
  "Disclosure IDs must be distinct",
).superRefine(({ disclosures }, ctx) => {
  const participations = disclosures.flatMap((disclosure) =>
    disclosure.transactions.map((transaction) => ({
      owner: disclosure.taxpayer_ssn,
      transaction,
    }))
  );
  for (
    const id of new Set(
      participations.map((row) => row.transaction.transaction_id),
    )
  ) {
    const copies = participations.filter((row) =>
      row.transaction.transaction_id === id
    );
    if (copies.length === 1) {
      if (copies[0].transaction.shared_transaction_review_reference) {
        ctx.addIssue({
          code: "custom",
          message:
            "Shared transaction review requires both participant disclosures",
        });
      }
      continue;
    }
    const knownNumbers = copies.map((row) =>
      row.transaction.reportable_transaction_numbers
    )
      .filter((numbers) => numbers.length > 0)
      .map((numbers) => JSON.stringify(numbers.toSorted()));
    if (new Set(knownNumbers).size > 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Shared transaction copies have conflicting issued reportable transaction numbers",
      });
    }
    const review = copies[0].transaction.shared_transaction_review_reference;
    if (
      copies.length !== 2 || !unique(copies.map((row) => row.owner)) ||
      !review || copies.some((row) =>
        row.transaction.shared_transaction_review_reference !== review
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "A repeated transaction requires two distinct owners and the same explicit shared transaction review",
      });
    }
  }
});

export type Form8886Disclosure = z.infer<typeof disclosureSchema>;
export type Form8886Source = z.infer<typeof publicSourceSchema>;
