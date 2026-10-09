import { inputSchema as partnershipInputSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { box11CodeSSourceSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_code_s.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  type FilerIdentity,
  FilingStatus as HeaderStatus,
} from "../../../../../mef/header.ts";
import { disclosureFixture } from "./source.fixture.ts";
import {
  EntityType,
  K1CapitalComponent,
  publicSourceSchema,
  ReturnSourceKind,
} from "./source.ts";
import { k1CapitalReturnSourceSchema } from "./k1-source.ts";
import {
  reconcileForm8886CapitalSources,
  reconcileForm8886CurrentReturnSources,
  returnSourceSha256,
} from "./return-sources.ts";

const general = {
  filing_status: FilingStatus.MFJ,
  digital_assets: false,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1980-01-01",
  spouse_first_name: "Bea",
  spouse_last_name: "Example",
  spouse_ssn: "444556666",
  spouse_dob: "1981-01-01",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const filer: FilerIdentity = {
  primarySSN: general.taxpayer_ssn,
  firstName: "Alex",
  firstNameWithInitial: "Alex",
  lastName: "Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  filingStatus: HeaderStatus.MarriedFilingJointly,
  spouse: {
    ssn: general.spouse_ssn,
    firstName: "Bea",
    lastName: "Example",
    nameControl: "EXAM",
  },
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};
const partnership = {
  partnership_name: "Example Partnership",
  partnership_ein: "333445555",
  recipient_tin: general.taxpayer_ssn,
  source_document_reference: "Reviewed partnership K-1",
  source_tax_year: 2025 as const,
  box8_net_st_cap_gain: -12000,
  box9a_net_lt_cap_gain: 2000,
};
const corporation = {
  corporation_name: "Example Corporation",
  corporation_ein: "555667777",
  recipient_tin: general.spouse_ssn,
  source_document_reference: "Reviewed corporation K-1",
  source_tax_year: 2025 as const,
  box7_net_st_cap_gain: 1000,
  box8a_net_lt_cap_gain: -10000,
};
const trust = {
  estate_trust_name: "Example Trust",
  estate_trust_ein: "666778888",
  beneficiary_ssn: general.taxpayer_ssn,
  source_document_reference: "Reviewed trust K-1",
  source_tax_year: 2025 as const,
  box3_net_st_cap_gain: 3000,
  box4a_net_lt_cap_gain: 4000,
};
const sources = [
  { kind: ReturnSourceKind.PartnershipK1Capital, row: partnership },
  { kind: ReturnSourceKind.SCorporationK1Capital, row: corporation },
  { kind: ReturnSourceKind.TrustK1Capital, row: trust },
].map((source) => k1CapitalReturnSourceSchema.parse(source));
function execute() {
  return f1040_2025.executeReturn({
    general,
    k1_partnership: [partnership],
    k1_s_corp: [corporation],
    k1_trust: [trust],
  });
}
async function disclosure(
  index: number,
  component = K1CapitalComponent.ShortTerm,
  retained = sources[index],
) {
  const identity = index === 0
    ? {
      name: partnership.partnership_name,
      ein: partnership.partnership_ein,
      owner: partnership.recipient_tin,
      entity: EntityType.Partnership,
    }
    : index === 1
    ? {
      name: corporation.corporation_name,
      ein: corporation.corporation_ein,
      owner: corporation.recipient_tin,
      entity: EntityType.SCorporation,
    }
    : {
      name: trust.estate_trust_name,
      ein: trust.estate_trust_ein,
      owner: trust.beneficiary_ssn,
      entity: EntityType.Trust,
    };
  const ref = `K1-${index}-${component}`;
  return publicSourceSchema.parse({
    disclosures: [{
      ...disclosureFixture,
      disclosure_id: `disclosure-${index}`,
      taxpayer_ssn: identity.owner,
      transactions: [{
        ...disclosureFixture.transactions[0],
        transaction_id: `arrangement-${index}`,
      }],
      parties: [...disclosureFixture.parties, {
        ...disclosureFixture.parties[0],
        party_id: "entity",
        name: identity.name,
        individual: false,
        identity: { kind: "ein", value: identity.ein },
        involvement_description: "Passed through the reviewed tax item.",
      }],
      through_entities: [{
        party_id: "entity",
        entity_type: identity.entity,
        no_k1_received: false,
        k1_received_date: "2026-03-01",
        k1_source_reference: retained.row.source_document_reference,
      }],
      benefits: [{
        ...disclosureFixture.benefits[0],
        current_return_source_references: [ref],
      }],
      current_return_links: [{
        reference: ref,
        source_kind: retained.kind,
        source_component: component,
        source_document_reference: retained.row.source_document_reference,
        source_transaction_id: identity.ein,
        reportable_transaction_id: `arrangement-${index}`,
        source_row_sha256: await returnSourceSha256(retained),
        relationship_review_reference:
          "Reviewed K-1 component association with disclosed arrangement",
      }],
    }],
  });
}

Deno.test("Form 8886 K-1 links retain all three issuers, each owner and capital character through actual Schedule D and Form 1040", async () => {
  const result = execute();
  assertEquals(result.diagnostics, []);
  const disclosures = await Promise.all([
    disclosure(0),
    disclosure(1, K1CapitalComponent.LongTerm),
    disclosure(2),
  ]);
  const source = {
    disclosures: disclosures.flatMap((value) => value.disclosures),
  };
  const before = JSON.stringify({ source, result });
  const receipts = await reconcileForm8886CurrentReturnSources(
    source,
    result,
    filer,
  );
  assertEquals(
    receipts.map((row) =>
      "capital_gain_loss_before_individual_limits" in row
        ? row.capital_gain_loss_before_individual_limits
        : undefined
    ),
    [-12000, -10000, 3000],
  );
  assertEquals(receipts.map((row) => row.taxpayer_ssn), [
    general.taxpayer_ssn,
    general.spouse_ssn,
    general.taxpayer_ssn,
  ]);
  assertEquals(receipts.map((row) => row.gross_loss_before_limits), [
    undefined,
    undefined,
    undefined,
  ]);
  assertEquals(result.pending.schedule_d.line_5_k1_st, -8000);
  assertEquals(result.pending.schedule_d.line_12_k1_lt, -4000);
  assertEquals(result.pending.f1040.line7_capital_gain, -3000);
  assertEquals(JSON.stringify({ source, result }), before);
});
Deno.test("Form 8886 K-1 proof rejects changed amounts even after recalculating valid Schedule D", async () => {
  const source = await disclosure(0);
  const result = f1040_2025.executeReturn({
    general,
    k1_partnership: [{ ...partnership, box8_net_st_cap_gain: -11000 }],
  });
  assertEquals(result.diagnostics, []);
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(source, result, filer),
    Error,
    "changed after disclosure review",
  );
});
Deno.test("Form 8886 K-1 proof requires matching recipient, source year, EIN, name, entity type and received copy", async () => {
  for (const index of [0, 1, 2]) {
    const result = execute(), source = await disclosure(index);
    for (const change of ["owner", "ein", "name", "type", "copy"] as const) {
      const changed = structuredClone(source), d = changed.disclosures[0];
      if (change === "owner") {
        d.taxpayer_ssn = index === 1
          ? general.taxpayer_ssn
          : general.spouse_ssn;
      }
      if (change === "ein") {
        d.parties[1].identity = { kind: "ein", value: "999887777" };
      }
      if (change === "name") d.parties[1].name = "Wrong issuer";
      if (change === "type") {
        d.through_entities[0].entity_type = index === 0
          ? EntityType.Trust
          : EntityType.Partnership;
      }
      if (change === "copy") {
        d.through_entities[0].k1_source_reference = "Wrong received copy";
      }
      await assertRejects(
        () => reconcileForm8886CurrentReturnSources(changed, result, filer),
        Error,
      );
    }
  }
  const { source_tax_year: _year, ...unreviewedYear } = partnership;
  const result = f1040_2025.executeReturn({
    general,
    k1_partnership: [unreviewedYear],
  });
  await assertRejects(
    () =>
      reconcileForm8886CurrentReturnSources(disclosureSource, result, filer),
    Error,
    "retained 2025 source year",
  );
  // A yearless retained row must fail before its stale fingerprint is checked.
});
const disclosureSource = await disclosure(0);
Deno.test("Form 8886 K-1 proof rejects duplicate rows, repeated components and independent calculation join changes", async () => {
  const source = await disclosure(0), result = execute();
  const duplicate = structuredClone(result);
  duplicate.pending.k1_partnership.k1_partnerships = [
    ...partnershipInputSchema.parse(duplicate.pending.k1_partnership)
      .k1_partnerships,
    partnership,
  ];
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(source, duplicate, filer),
    Error,
    "exactly one",
  );
  const repeated = structuredClone(source), d = repeated.disclosures[0];
  d.current_return_links!.push({
    ...d.current_return_links![0],
    reference: "second-link",
  });
  d.benefits[0].current_return_source_references.push("second-link");
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(repeated, result, filer),
    Error,
    "reviewed allocation",
  );
  for (
    const [key, field] of [
      ["schedule_d", "line_5_k1_st"],
      ["schedule_d", "line_12_k1_lt"],
      ["schedule_d", "print_line16_combined"],
      ["f1040", "line7_capital_gain"],
    ]
  ) {
    const changed = structuredClone(result);
    changed.pending[key][field] = 999;
    await assertRejects(
      () => reconcileForm8886CurrentReturnSources(source, changed, filer),
      Error,
    );
  }
  await assertRejects(
    () => reconcileForm8886CapitalSources(source, result, filer),
    Error,
    "K-1 source",
  );
});
Deno.test("Form 8886 K-1 proof isolates caller mutations before hashing and rejects a zero linked component", async () => {
  const source = await disclosure(0),
    result = execute(),
    identity = structuredClone(filer);
  const promise = reconcileForm8886CurrentReturnSources(
    source,
    result,
    identity,
  );
  source.disclosures[0].parties[1].name = "Changed caller";
  result.pending.k1_partnership.k1_partnerships = [{
    ...partnership,
    box8_net_st_cap_gain: -1,
  }];
  Object.assign(identity, { primarySSN: "999887777" });
  const receipt = (await promise)[0];
  assertEquals(
    "capital_gain_loss_before_individual_limits" in receipt
      ? receipt.capital_gain_loss_before_individual_limits
      : undefined,
    -12000,
  );
  const zero = f1040_2025.executeReturn({
    general,
    k1_partnership: [{ ...partnership, box8_net_st_cap_gain: 0 }],
  });
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(disclosureSource, zero, filer),
    Error,
    "no retained capital amount",
  );
});

Deno.test("Form 8886 trust capital receipts separate inherited final-year losses from current gains", async () => {
  const row = {
    ...trust,
    box11_final_k1: true as const,
    box11_beneficiary_succeeds_to_property: true as const,
    box11_code_c_short_term_capital_loss_carryover: 8000,
    box11_code_c_statement_reference:
      "Reviewed final-year ST carryover statement",
    box11_code_d_long_term_capital_loss_carryover: 11000,
    box11_code_d_statement_reference:
      "Reviewed final-year LT carryover statement",
  };
  const retained = k1CapitalReturnSourceSchema.parse({
    kind: ReturnSourceKind.TrustK1Capital,
    row,
  });
  const result = f1040_2025.executeReturn({ general, k1_trust: [row] });
  assertEquals(result.diagnostics, []);
  for (
    const [component, gain, carryover, net] of [[
      K1CapitalComponent.ShortTerm,
      3000,
      8000,
      -5000,
    ], [K1CapitalComponent.LongTerm, 4000, 11000, -7000]] as const
  ) {
    const source = await disclosure(2, component, retained);
    const receipt =
      (await reconcileForm8886CurrentReturnSources(source, result, filer))[0];
    assertEquals(
      "issued_capital_gain_loss" in receipt
        ? receipt.issued_capital_gain_loss
        : undefined,
      gain,
    );
    assertEquals(
      "inherited_capital_loss_carryover" in receipt
        ? receipt.inherited_capital_loss_carryover
        : undefined,
      carryover,
    );
    assertEquals(
      "capital_gain_loss_before_individual_limits" in receipt
        ? receipt.capital_gain_loss_before_individual_limits
        : undefined,
      net,
    );
  }
  assertEquals(result.pending.f1040.line7_capital_gain, -3000);
});
Deno.test("Form 8886 partnership capital receipts retain code S statement amounts and reject altered native-source metadata", async () => {
  const row = {
    ...partnership,
    box11_code_s_nonportfolio_capital: {
      short_term_gain_loss: -7000,
      long_term_gain_loss: 1000,
      nonpassive_reviewed: true as const,
      no_special_rate_components_confirmed: true as const,
      statement_reference: "Reviewed code S statement",
      recipient_tin: partnership.recipient_tin,
      character_workpaper_reference: "Reviewed capital character",
    },
  };
  const retained = k1CapitalReturnSourceSchema.parse({
    kind: ReturnSourceKind.PartnershipK1Capital,
    row,
  });
  const result = f1040_2025.executeReturn({ general, k1_partnership: [row] });
  assertEquals(result.diagnostics, []);
  const source = await disclosure(0, K1CapitalComponent.ShortTerm, retained);
  const receipt =
    (await reconcileForm8886CurrentReturnSources(source, result, filer))[0];
  assertEquals(
    "supplemental_capital_gain_loss" in receipt
      ? receipt.supplemental_capital_gain_loss
      : undefined,
    -7000,
  );
  assertEquals(
    "capital_gain_loss_before_individual_limits" in receipt
      ? receipt.capital_gain_loss_before_individual_limits
      : undefined,
    -19000,
  );
  const changed = structuredClone(result);
  const changedRows = box11CodeSSourceSchema.array().parse(
    changed.pending.schedule_d.k1_partnership_box11_code_s_sources,
  );
  changed.pending.schedule_d.k1_partnership_box11_code_s_sources = changedRows
    .map((row) => ({ ...row, statement_reference: "Different statement" }));
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(source, changed, filer),
    Error,
    "issued K-1 facts",
  );
});

Deno.test("Form 8886 source contract rejects absent K-1 character and capital components on other source kinds", async () => {
  const valid = await disclosure(0);
  const missing = structuredClone(valid);
  delete missing.disclosures[0].current_return_links![0].source_component;
  await assertRejects(
    async () => publicSourceSchema.parse(missing),
    Error,
    "capital component",
  );
  const invalid = structuredClone(valid);
  invalid.disclosures[0].current_return_links![0].source_kind =
    ReturnSourceKind.BrokerSale;
  await assertRejects(
    async () => publicSourceSchema.parse(invalid),
    Error,
    "capital component",
  );
});
