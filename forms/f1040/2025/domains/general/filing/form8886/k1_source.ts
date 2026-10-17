import { z } from "zod";
import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import {
  inputSchema as partnershipSchema,
  itemSchema as partnershipRow,
} from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import {
  inputSchema as corporationSchema,
  itemSchema as corporationRow,
} from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import {
  inputSchema as trustSchema,
  itemSchema as trustRow,
} from "../../../../../nodes/inputs/income/rental-passthrough/k1_trust/index.ts";
import { box11CodeSSourceRows } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_code_s.ts";
import {
  currentReturnLinkSchema,
  disclosureSchema,
  EntityType,
  K1CapitalComponent,
  ReturnSourceKind,
} from "./source.ts";

export const k1CapitalReturnSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(ReturnSourceKind.PartnershipK1Capital),
    row: partnershipRow,
  }).strict(),
  z.object({
    kind: z.literal(ReturnSourceKind.SCorporationK1Capital),
    row: corporationRow,
  }).strict(),
  z.object({ kind: z.literal(ReturnSourceKind.TrustK1Capital), row: trustRow })
    .strict(),
]);
type K1Source = z.infer<typeof k1CapitalReturnSourceSchema>;
type Link = z.infer<typeof currentReturnLinkSchema>;
type Disclosure = z.infer<typeof disclosureSchema>;

export function findForm8886K1CapitalSource(
  link: Link,
  pending: ExecuteResult["pending"],
): K1Source | undefined {
  // The source transaction ID identifies the issuing entity's EIN. The
  // separately reviewed reportable transaction ID identifies the arrangement.
  if (link.source_kind === ReturnSourceKind.PartnershipK1Capital) {
    const rows = partnershipSchema.parse(pending.k1_partnership).k1_partnerships
      .filter((row) =>
        row.partnership_ein === link.source_transaction_id &&
        row.source_document_reference === link.source_document_reference
      );
    if (rows.length !== 1) {
      throw new Error(
        "Form 8886 K-1 link must resolve exactly one retained row",
      );
    }
    return { kind: ReturnSourceKind.PartnershipK1Capital, row: rows[0] };
  }
  if (link.source_kind === ReturnSourceKind.SCorporationK1Capital) {
    const rows = corporationSchema.parse(pending.k1_s_corp).k1_s_corps.filter(
      (row) =>
        row.corporation_ein === link.source_transaction_id &&
        row.source_document_reference === link.source_document_reference,
    );
    if (rows.length !== 1) {
      throw new Error(
        "Form 8886 K-1 link must resolve exactly one retained row",
      );
    }
    return { kind: ReturnSourceKind.SCorporationK1Capital, row: rows[0] };
  }
  if (link.source_kind === ReturnSourceKind.TrustK1Capital) {
    const rows = trustSchema.parse(pending.k1_trust).k1_trusts.filter((row) =>
      row.estate_trust_ein === link.source_transaction_id &&
      row.source_document_reference === link.source_document_reference
    );
    if (rows.length !== 1) {
      throw new Error(
        "Form 8886 K-1 link must resolve exactly one retained row",
      );
    }
    return { kind: ReturnSourceKind.TrustK1Capital, row: rows[0] };
  }
  return undefined;
}

function sourceFacts(source: K1Source, component: K1CapitalComponent) {
  const short = component === K1CapitalComponent.ShortTerm;
  if (source.kind === ReturnSourceKind.PartnershipK1Capital) {
    const row = source.row;
    const codeS = box11CodeSSourceRows([row])[0];
    if (codeS && codeS.recipient_tin !== row.recipient_tin) {
      throw new Error(
        "Form 8886 K-1 code S owner differs from the retained K-1",
      );
    }
    return {
      owner: row.recipient_tin,
      ein: row.partnership_ein,
      name: row.partnership_name,
      entity: EntityType.Partnership,
      current: (short ? row.box8_net_st_cap_gain : row.box9a_net_lt_cap_gain) ??
        0,
      supplemental:
        (short ? codeS?.short_term_gain_loss : codeS?.long_term_gain_loss) ?? 0,
      carryover: 0,
    };
  }
  if (source.kind === ReturnSourceKind.SCorporationK1Capital) {
    const row = source.row;
    return {
      owner: row.recipient_tin,
      ein: row.corporation_ein,
      name: row.corporation_name,
      entity: EntityType.SCorporation,
      current: (short ? row.box7_net_st_cap_gain : row.box8a_net_lt_cap_gain) ??
        0,
      supplemental: 0,
      carryover: 0,
    };
  }
  const row = source.row;
  return {
    owner: row.beneficiary_ssn,
    ein: row.estate_trust_ein,
    name: row.estate_trust_name,
    entity: EntityType.Trust,
    current: (short ? row.box3_net_st_cap_gain : row.box4a_net_lt_cap_gain) ??
      0,
    supplemental: 0,
    carryover:
      (short
        ? row.box11_code_c_short_term_capital_loss_carryover
        : row.box11_code_d_long_term_capital_loss_carryover) ?? 0,
  };
}

/** Bind the entered K-1 to its recipient and disclosed pass-through. Entity
 * net amounts are not gross section 165 transaction losses or issuer proof. */
export function reconcileForm8886K1CapitalFacts(
  source: K1Source,
  link: Link,
  disclosure: Disclosure,
) {
  if (
    !z.nativeEnum(K1CapitalComponent).safeParse(link.source_component).success
  ) {
    throw new Error("Form 8886 K-1 link requires a capital component");
  }
  const facts = sourceFacts(
    source,
    z.nativeEnum(K1CapitalComponent).parse(link.source_component),
  );
  assertForm8886K1Identity(
    { ...facts, source_tax_year: source.row.source_tax_year },
    link,
    disclosure,
  );
  const values = [facts.current, facts.supplemental, facts.carryover];
  if (
    values.some((value) =>
      !Number.isFinite(value) ||
      !Number.isSafeInteger(Math.round(value * 100)) ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
    )
  ) throw new Error("Form 8886 K-1 capital amounts require cent precision");
  if (values.every((value) => value === 0)) {
    throw new Error(
      "Form 8886 K-1 linked component has no retained capital amount",
    );
  }
  return Object.freeze({
    issued_capital_gain_loss: facts.current,
    supplemental_capital_gain_loss: facts.supplemental,
    inherited_capital_loss_carryover: facts.carryover,
    capital_gain_loss_before_individual_limits:
      Math.round((facts.current + facts.supplemental - facts.carryover) * 100) /
      100,
  });
}

const k1IdentityFactsSchema = z.object({
  source_tax_year: z.literal(2025).optional(),
  owner: z.string().optional(),
  ein: z.string().optional(),
  name: z.string(),
  entity: z.nativeEnum(EntityType),
});
export function assertForm8886K1Identity(
  facts: z.infer<typeof k1IdentityFactsSchema>,
  link: Link,
  disclosure: Disclosure,
) {
  if (facts.source_tax_year !== 2025) {
    throw new Error("Form 8886 K-1 needs a retained 2025 source year");
  }
  if (facts.owner !== disclosure.taxpayer_ssn) {
    throw new Error(
      "Form 8886 K-1 recipient differs from the disclosure taxpayer",
    );
  }
  const entities = disclosure.through_entities.filter((entity) => {
    const party = disclosure.parties.find((party) =>
      party.party_id === entity.party_id
    );
    return entity.entity_type === facts.entity && !entity.no_k1_received &&
      entity.k1_source_reference === link.source_document_reference &&
      party?.identity.kind === "ein" && party.identity.value === facts.ein &&
      party.name === facts.name && !party.individual;
  });
  if (entities.length !== 1) {
    throw new Error(
      "Form 8886 K-1 requires its matching disclosed entity and received source",
    );
  }
}
