import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  type FilerIdentity,
  FilingStatus as HeaderStatus,
} from "../../../../../mef/header.ts";
import { Form8949Part } from "../../../../../nodes/intermediate/forms/income/investments/form8949/index.ts";
import { disclosureFixture } from "./source.fixture.ts";
import { ReturnSourceKind } from "./source.ts";
import {
  prepareForm8886ReturnPackets,
  verifyPreparedForm8886ReturnPackets,
} from "./return-packets.ts";
import {
  finalizeForm8886NativeReturnPackets,
  Form8886PendingKey,
  verifiedForm8886NativeReturnFragments,
} from "./native-return.ts";
import {
  documentId,
  type MefDocumentFragment,
} from "../../../../mef/identity/document-identity.ts";
import {
  capitalReturnSourceSha256,
  reconcileForm8886CapitalSources,
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
const broker = {
  recipient_ssn: general.taxpayer_ssn,
  payer_tin: "333445555",
  account_number: "Acct1",
  source_document_reference: "reviewed broker statement",
  transaction_id: "broker-sale-1",
  part: "D" as const,
  description: "Reviewed asset disposition",
  date_acquired: "2024-01-01",
  date_sold: "2025-06-01",
  proceeds: 100000,
  cost_basis: 2100000,
};

Deno.test("Form 8886 native assembly rejects caller-supplied packet records even with plausible hashes", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: [broker] });
  await assertRejects(
    () =>
      verifiedForm8886NativeReturnFragments(
        {
          source_sha256: "a".repeat(64),
          return_pending_sha256: "b".repeat(64),
          filer_sha256: "c".repeat(64),
          packets: [],
        },
        { disclosures: [disclosureFixture] },
        result,
        filer,
      ),
    Error,
    "authentic prepared bundle",
  );
});

Deno.test("Form 8886 return packet preparation checks the actual source join and owner before rendering", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: [broker] });
  const source = { disclosures: [await linkedDisclosure()] };
  await assertRejects(
    () =>
      prepareForm8886ReturnPackets(
        {
          disclosures: [{
            ...source.disclosures[0],
            current_return_links: undefined,
          }],
        },
        result,
        filer,
        new Uint8Array(),
      ),
    Error,
    "explicit retained-source link",
  );
  await assertRejects(
    () =>
      prepareForm8886ReturnPackets(
        source,
        {
          ...result,
          pending: {
            ...result.pending,
            f1040: { ...result.pending.f1040, line7_capital_gain: 12345 },
          },
        },
        filer,
        new Uint8Array(),
      ),
    Error,
  );
  const missingAddress = structuredClone(result);
  delete missingAddress.pending.general.address_line1;
  await assertRejects(
    () =>
      prepareForm8886ReturnPackets(
        source,
        missingAddress,
        filer,
        new Uint8Array(),
      ),
    Error,
    "street address",
  );
  await assertRejects(
    () => prepareForm8886ReturnPackets(source, result, filer, new Uint8Array()),
    Error,
    "canonical template",
  );
});
async function linkedDisclosure(row = broker, taxpayer = row.recipient_ssn) {
  return {
    ...disclosureFixture,
    taxpayer_ssn: taxpayer,
    current_return_links: [{
      reference:
        disclosureFixture.benefits[0].current_return_source_references[0],
      source_kind: ReturnSourceKind.BrokerSale,
      source_document_reference: row.source_document_reference,
      source_transaction_id: row.transaction_id,
      reportable_transaction_id:
        disclosureFixture.transactions[0].transaction_id,
      source_row_sha256: await capitalReturnSourceSha256({
        kind: ReturnSourceKind.BrokerSale,
        row,
      }),
      relationship_review_reference:
        "Reviewed association of sale with the multi-step transaction",
    }],
  };
}

Deno.test("Form 8886 capital link joins a reviewed source to the actual return without confusing gross loss with the limited deduction", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: [broker] });
  assertEquals(result.diagnostics, []);
  const source = { disclosures: [await linkedDisclosure()] };
  const before = JSON.stringify({ source, result });
  const rows = await reconcileForm8886CapitalSources(source, result, filer);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].source_transaction_id, "broker-sale-1");
  assertEquals(rows[0].reportable_transaction_id, "asset-loss-2025");
  assertEquals(rows[0].gross_loss_before_limits, 2000000);
  assertEquals(result.pending.f1040.line7_capital_gain, -3000);
  assertEquals(JSON.stringify({ source, result }), before);
  assertEquals(Object.isFrozen(rows) && Object.isFrozen(rows[0]), true);
});

Deno.test("Form 8886 rejects orphaned source links, diagnostic returns and a changed reviewed source even after recalculation", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: [broker] });
  const disclosure = await linkedDisclosure();
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources(
        { disclosures: [{ ...disclosure, current_return_links: undefined }] },
        result,
        filer,
      ),
    Error,
    "explicit retained-source link",
  );
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources({ disclosures: [disclosure] }, {
        ...result,
        pending: {
          ...result.pending,
          f1099b: { f1099bs: [{ ...broker, transaction_id: "other-sale" }] },
        },
      }, filer),
    Error,
    "exactly one retained source row",
  );
  const changed = f1040_2025.executeReturn({
    general,
    f1099b: [{ ...broker, proceeds: 200000 }],
  });
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources(
        { disclosures: [disclosure] },
        changed,
        filer,
      ),
    Error,
    "changed after disclosure review",
  );
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources({ disclosures: [disclosure] }, {
        ...result,
        diagnostics: [{
          severity: "error",
          code: "EXECUTOR_NODE_FAILURE",
          nodeType: "source",
          nodeId: "source",
          message: "Synthetic failure",
        }],
      }, filer),
    Error,
    "successful return calculation",
  );
});

Deno.test("Form 8886 capital link requires the same recipient as its disclosure, including an independently owned spouse source", async () => {
  const spouseRow = { ...broker, recipient_ssn: general.spouse_ssn };
  const result = f1040_2025.executeReturn({ general, f1099b: [spouseRow] });
  const disclosure = await linkedDisclosure(spouseRow);
  const rows = await reconcileForm8886CapitalSources(
    { disclosures: [disclosure] },
    result,
    filer,
  );
  assertEquals(rows[0].taxpayer_ssn, general.spouse_ssn);
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources(
        {
          disclosures: [{ ...disclosure, taxpayer_ssn: general.taxpayer_ssn }],
        },
        result,
        filer,
      ),
    Error,
    "recipient differs",
  );
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources({ disclosures: [disclosure] }, result, {
        ...filer,
        filingStatus: HeaderStatus.Single,
      }),
    Error,
    "not an owner",
  );
});

Deno.test("Form 8886 current-year source proof also rejects missing calculated rows and a changed Form 1040 join", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: [broker] });
  const source = { disclosures: [await linkedDisclosure()] };
  await assertRejects(() =>
    reconcileForm8886CapitalSources(source, {
      ...result,
      pending: {
        ...result.pending,
        schedule_d: { ...result.pending.schedule_d, transaction: undefined },
      },
    }, filer)
  );
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources(source, {
        ...result,
        pending: {
          ...result.pending,
          f1040: { ...result.pending.f1040, line7_capital_gain: -2000 },
        },
      }, filer),
    Error,
    "Form 1040 line 7 must match",
  );
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources(source, {
        ...result,
        pending: { ...result.pending, schedule_d: {} },
      }, filer),
    Error,
    "finalized Schedule D",
  );
});

Deno.test("Form 8886 direct-sale link retains nonbroker source identity and refuses an unidentified recipient", async () => {
  const direct = {
    recipient_ssn: general.taxpayer_ssn,
    source_document_reference: "reviewed sale contract",
    source_transaction_id: "direct-sale-1",
    part: Form8949Part.F,
    description: "Reviewed sale of property",
    date_acquired: "2024-01-01",
    date_sold: "2025-06-01",
    proceeds: 100000,
    cost_basis: 2100000,
  };
  const disclosure = await linkedDisclosure();
  const source = {
    disclosures: [{
      ...disclosure,
      current_return_links: [{
        ...disclosure.current_return_links[0],
        source_kind: ReturnSourceKind.DirectSale,
        source_document_reference: direct.source_document_reference,
        source_transaction_id: direct.source_transaction_id,
        source_row_sha256: await capitalReturnSourceSha256({
          kind: ReturnSourceKind.DirectSale,
          row: direct,
        }),
      }],
    }],
  };
  const result = f1040_2025.executeReturn({ general, f8949: [direct] });
  assertEquals(result.diagnostics, []);
  const rows = await reconcileForm8886CapitalSources(source, result, filer);
  assertEquals(rows[0].gross_loss_before_limits, 2000000);
  const missingOwner = { ...direct, recipient_ssn: undefined };
  const unowned = f1040_2025.executeReturn({ general, f8949: [missingOwner] });
  await assertRejects(
    () => reconcileForm8886CapitalSources(source, unowned, filer),
    Error,
    "recipient differs",
  );
});

Deno.test("Form 8886 capital proof binds the actual calculated return identity, not only the entered sale recipient", async () => {
  const row = { ...broker, recipient_ssn: "999887777" };
  const result = f1040_2025.executeReturn({ general, f1099b: [row] });
  assertEquals(result.diagnostics, []);
  const disclosure = await linkedDisclosure(row);
  await assertRejects(
    () =>
      reconcileForm8886CapitalSources(
        { disclosures: [disclosure] },
        result,
        { ...filer, primarySSN: row.recipient_ssn },
      ),
    Error,
    "taxpayer source TIN differs",
  );
});

Deno.test("Form 8886 reconciliation snapshots source, filer and calculated return before asynchronous fingerprinting", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: [broker] });
  const disclosure = await linkedDisclosure();
  const source = { disclosures: [disclosure] };
  const mutableFiler = { ...filer };
  const preparing = reconcileForm8886CapitalSources(
    source,
    result,
    mutableFiler,
  );
  disclosure.taxpayer_ssn = "999887777";
  disclosure.current_return_links[0].source_transaction_id = "changed-sale";
  result.pending.f1040.line7_capital_gain = 0;
  mutableFiler.primarySSN = "999887777";
  const rows = await preparing;
  assertEquals(rows[0].taxpayer_ssn, general.taxpayer_ssn);
  assertEquals(rows[0].source_transaction_id, broker.transaction_id);
  assertEquals(rows[0].gross_loss_before_limits, 2000000);
});

Deno.test("Form 8886 capital adapter cannot relabel a prior-year or impossible-date sale as a current-year source", async () => {
  for (const date_sold of ["2024-06-01", "2025-02-30"]) {
    const row = { ...broker, date_sold };
    const result = f1040_2025.executeReturn({ general, f1099b: [row] });
    const source = { disclosures: [await linkedDisclosure(row)] };
    await assertRejects(
      () => reconcileForm8886CapitalSources(source, result, filer),
      Error,
      "valid 2025 disposition date",
    );
  }
});

Deno.test("Form 8886 foreign packet address is derived from the retained return and reconciled to its native header", async () => {
  const foreignGeneral = {
    ...general,
    address_line1: "1 Example Street",
    address_line2: "Apartment 12",
    address_city: "Stockholm",
    address_state: undefined,
    address_zip: undefined,
    address_foreign_country: "SW",
    address_foreign_province_state: "Stockholm County",
    address_foreign_postal_code: "111 22",
  };
  const result = f1040_2025.executeReturn({
    general: foreignGeneral,
    f1099b: [broker],
  });
  assertEquals(result.diagnostics, []);
  const foreignFiler: FilerIdentity = {
    ...filer,
    address: {
      line1: foreignGeneral.address_line1,
      state: "",
      zip: "",
      line2: foreignGeneral.address_line2,
      city: foreignGeneral.address_city,
      foreignCountry: foreignGeneral.address_foreign_country,
      foreignProvinceState: foreignGeneral.address_foreign_province_state,
      foreignPostalCode: foreignGeneral.address_foreign_postal_code,
    },
  };
  const source = { disclosures: [await linkedDisclosure()] };
  await assertRejects(
    () =>
      prepareForm8886ReturnPackets(
        source,
        result,
        foreignFiler,
        new Uint8Array(),
      ),
    Error,
    "canonical template",
  );
  for (
    const changed of [
      { ...foreignFiler.address, foreignCountry: "CA" },
      { ...foreignFiler.address, foreignPostalCode: "999 99" },
      { ...foreignFiler.address, line2: undefined },
    ]
  ) {
    await assertRejects(
      () =>
        prepareForm8886ReturnPackets(source, result, {
          ...foreignFiler,
          address: changed,
        }, new Uint8Array()),
      Error,
      "foreign mailing address differs",
    );
  }
  await assertRejects(
    () =>
      prepareForm8886ReturnPackets(
        source,
        {
          ...result,
          pending: {
            ...result.pending,
            f1040: { ...result.pending.f1040, address_city: "Gothenburg" },
          },
        },
        foreignFiler,
        new Uint8Array(),
      ),
    Error,
    "foreign mailing address differs",
  );
  const unknownCountry = f1040_2025.executeReturn({
    general: { ...foreignGeneral, address_foreign_country: "ZZ" },
    f1099b: [broker],
  });
  await assertRejects(
    () =>
      prepareForm8886ReturnPackets(source, unknownCountry, {
        ...foreignFiler,
        address: { ...foreignFiler.address, foreignCountry: "ZZ" },
      }, new Uint8Array()),
    Error,
    "TY2025 IRS country code",
  );
});

Deno.test("Form 8886 authentic return packets retain their preparation snapshot and reject stale disclosure, return and filer inputs", async () => {
  const template = await Deno.readFile(
    new URL("./fixtures/f8886-2019.pdf", import.meta.url),
  );
  const result = f1040_2025.executeReturn({ general, f1099b: [broker] });
  const original = structuredClone(result);
  const source = { disclosures: [await linkedDisclosure()] };
  const preparing = prepareForm8886ReturnPackets(
    source,
    result,
    filer,
    template,
  );
  result.pending.f1040.line7_capital_gain = 0;
  const prepared = await preparing;
  await verifyPreparedForm8886ReturnPackets(prepared, source, original, filer);
  const fragments = await verifiedForm8886NativeReturnFragments(
    prepared,
    source,
    original,
    filer,
  );
  assertEquals(fragments.some((fragment) => fragment.tag === "IRS8886"), true);
  await assertRejects(
    () =>
      verifiedForm8886NativeReturnFragments(
        { ...prepared },
        source,
        original,
        filer,
      ),
    Error,
    "authentic prepared bundle",
  );
  await assertRejects(
    () =>
      verifiedForm8886NativeReturnFragments(prepared, source, result, filer),
    Error,
    "no longer matches",
  );
  await assertRejects(
    () =>
      verifiedForm8886NativeReturnFragments(
        prepared,
        {
          disclosures: [{
            ...source.disclosures[0],
            economic_business_reasons:
              "Changed reviewed transaction explanation",
          }],
        },
        original,
        filer,
      ),
    Error,
    "no longer matches",
  );
  await assertRejects(
    () =>
      verifiedForm8886NativeReturnFragments(prepared, source, original, {
        ...filer,
        address: { ...filer.address, zip: "78702" },
      }),
    Error,
    "no longer matches",
  );
  const failed = f1040_2025.executeReturn({
    general: { filing_status: "invalid" },
  });
  assertEquals(failed.diagnostics.length > 0, true);
  await assertRejects(
    () =>
      verifyPreparedForm8886ReturnPackets(prepared, source, {
        ...original,
        diagnostics: failed.diagnostics,
      }, filer),
    Error,
    "successful return calculation",
  );
  const copiedPdf = prepared.packets[0].packet.getPdf();
  copiedPdf[0] = 0;
  assertEquals(prepared.packets[0].packet.getPdf()[0], 37);
});

Deno.test("Form 8886 whole-return finalization binds both owners and continuation types without changing reviewed PDF bytes", async () => {
  const spouseBroker = {
    ...broker,
    recipient_ssn: general.spouse_ssn,
    transaction_id: "broker-sale-2",
    source_document_reference: "spouse broker statement",
  };
  const result = f1040_2025.executeReturn({
    general,
    f1099b: [broker, spouseBroker],
  });
  assertEquals(result.diagnostics, []);
  const disclosures = await Promise.all([
    linkedDisclosure(),
    linkedDisclosure(spouseBroker),
  ]);
  const source = {
    disclosures: disclosures.map((copy, index) => ({
      ...copy,
      disclosure_id: `owned-disclosure-${index + 1}`,
      transactions: copy.transactions.map((transaction) => ({
        ...transaction,
        shared_transaction_review_reference:
          "Reviewed separately owned interests in the shared arrangement",
      })),
      transaction_steps: "Reviewed financing and disposition steps. ".repeat(
        70,
      ),
      parties: copy.parties.map((party) => ({
        ...party,
        involvement_description: "The advisor supplied financing advice. "
          .repeat(70),
      })),
    })),
  };
  const template = await Deno.readFile(
    new URL("./fixtures/f8886-2019.pdf", import.meta.url),
  );
  const prepared = await prepareForm8886ReturnPackets(
    source,
    result,
    filer,
    template,
  );
  const layout = (
    rows: readonly MefDocumentFragment[],
  ): readonly MefDocumentFragment[] => [
    { pendingKey: "f1040", tag: "IRS1040", xml: "<IRS1040></IRS1040>" },
    ...rows.filter((row) => row.pendingKey === Form8886PendingKey.Form),
    { pendingKey: "form8949", tag: "IRS8949", xml: "<IRS8949></IRS8949>" },
    ...rows.filter((row) =>
      row.pendingKey === Form8886PendingKey.ExpectedBenefits
    ),
    {
      pendingKey: "other_statement",
      tag: "GeneralDependencySmall",
      xml: "<GeneralDependencySmall></GeneralDependencySmall>",
    },
    ...rows.filter((row) =>
      row.pendingKey === Form8886PendingKey.AdditionalDetails
    ),
  ];
  const discovered = layout(
    await verifiedForm8886NativeReturnFragments(
      prepared,
      source,
      result,
      filer,
    ),
  );
  const ids = (key: Form8886PendingKey) =>
    discovered.flatMap((row, index) =>
      row.pendingKey === key ? [documentId(row.tag, index)] : []
    );
  const assigned = {
    form8886: ids(Form8886PendingKey.Form),
    form8886_expected_benefits: ids(Form8886PendingKey.ExpectedBenefits),
    form8886_additional_details: ids(Form8886PendingKey.AdditionalDetails),
  };
  assertEquals(assigned.form8886_expected_benefits.length, 2);
  assertEquals(assigned.form8886_additional_details.length >= 2, true);
  const linked = layout(
    await verifiedForm8886NativeReturnFragments(
      prepared,
      source,
      result,
      filer,
      assigned,
    ),
  );
  const bound = await finalizeForm8886NativeReturnPackets(
    prepared,
    source,
    result,
    filer,
    linked,
  );
  await verifyPreparedForm8886ReturnPackets(bound, source, result, filer);
  const mutableFragments = linked.map((row) => ({ ...row }));
  const finalizing = finalizeForm8886NativeReturnPackets(
    prepared,
    source,
    result,
    filer,
    mutableFragments,
  );
  mutableFragments[1].xml = mutableFragments[1].xml.replace(
    "111223333",
    "999887777",
  );
  const captured = await finalizing;
  assertEquals(
    captured.packets.map((row) => row.packet.metadata.xml_sha256),
    bound.packets.map((row) => row.packet.metadata.xml_sha256),
  );

  for (const [index, entry] of bound.packets.entries()) {
    assertEquals(
      entry.packet.getPdf(),
      prepared.packets[index].packet.getPdf(),
    );
    assertEquals(
      entry.packet.metadata.preparation_xml_sha256,
      prepared.packets[index].packet.metadata.xml_sha256,
    );
    assertEquals(
      entry.packet.metadata.final_native_document_ids?.[0],
      assigned.form8886[index],
    );
    assertEquals(
      entry.packet.metadata.xml_sha256 ===
        prepared.packets[index].packet.metadata.xml_sha256,
      false,
    );
    assertEquals(entry.sourceLinks, prepared.packets[index].sourceLinks);
  }
  await assertRejects(
    () =>
      finalizeForm8886NativeReturnPackets(
        prepared,
        source,
        result,
        filer,
        linked.filter((row) => row !== linked[1]),
      ),
    Error,
  );
  await assertRejects(
    () =>
      finalizeForm8886NativeReturnPackets(
        prepared,
        source,
        result,
        filer,
        linked.map((row, index) =>
          index === 1 ? linked[2] : index === 2 ? linked[1] : row
        ),
      ),
    Error,
    "differ from the prepared disclosures",
  );
  await assertRejects(
    () =>
      finalizeForm8886NativeReturnPackets(
        prepared,
        source,
        result,
        filer,
        linked.map((row) =>
          row.pendingKey === Form8886PendingKey.ExpectedBenefits
            ? { ...row, xml: row.xml.replace("Reviewed", "Altered") }
            : row
        ),
      ),
    Error,
    "differ from the prepared disclosures",
  );
  await assertRejects(
    () =>
      finalizeForm8886NativeReturnPackets(prepared, source, result, filer, [
        ...linked,
        { ...linked[1], pendingKey: "unregistered_copy" },
      ]),
    Error,
    "outside its assigned return slot",
  );
});

Deno.test("Form 8886 real MeF bundle binds source, global continuations, printable copies and replay", async () => {
  const { buildMefBundle, assertPreparedBundleProjection } = await import(
    "../../../../mef/builder.ts"
  );
  const { buildPending } = await import("../../../../mef/execution/pending.ts");
  const row = { ...broker, proceeds: 1000, cost_basis: 3000 };
  const spouseRow = {
    ...row,
    recipient_ssn: general.spouse_ssn,
    transaction_id: "spouse-sale",
    source_document_reference: "Reviewed spouse sale",
  };
  const result = f1040_2025.executeReturn({
    general,
    f1099b: [row, spouseRow],
  });
  assertEquals(result.diagnostics, []);
  const disclosures = await Promise.all([
    linkedDisclosure(row),
    linkedDisclosure(spouseRow),
  ]);
  const source = {
    disclosures: disclosures.map((disclosure, index) => ({
      ...disclosure,
      disclosure_id: `real-builder-disclosure-${index + 1}`,
      transactions: disclosure.transactions.map((transaction) => ({
        ...transaction,
        shared_transaction_review_reference:
          "Reviewed independently owned interests in shared arrangement",
      })),
      protective_disclosure: true,
      transaction_steps: "Reviewed financing and disposition steps. ".repeat(
        70,
      ),
      parties: disclosure.parties.map((party) => ({
        ...party,
        involvement_description: "The advisor supplied financing advice. "
          .repeat(70),
      })),
    })),
  };
  const identity = {
    ...filer,
    timestamp: "2026-04-01T12:00:00Z",
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" },
  };
  const template = await Deno.readFile(
    new URL("./fixtures/f8886-2019.pdf", import.meta.url),
  );
  const prepared = await prepareForm8886ReturnPackets(
    source,
    result,
    identity,
    template,
  );
  const pending = buildPending(result.pending);
  const options = {
    filer: identity,
    attachments: [],
    form8886: { prepared, source, result },
  };
  const bundle = await buildMefBundle(pending, options);
  assertEquals(bundle.form8886Packets?.packets.length, 2);
  const finalPackets = bundle.form8886Packets!.packets.map((row) => row.packet);
  const final = finalPackets[0];
  for (const [index, copy] of finalPackets.entries()) {
    assertEquals(
      copy.metadata.pdf_sha256,
      prepared.packets[index].packet.metadata.pdf_sha256,
    );
    for (
      const xml of [
        copy.documents.formXml,
        copy.documents.continuationXml!,
        ...copy.documents.generalContinuations.map((row) => row.xml),
      ]
    ) assertEquals(bundle.xml.includes(xml), true);
    assertEquals(
      copy.documents.formXml.includes(
        `Disclosure taxpayer SSN ${source.disclosures[index].taxpayer_ssn}`,
      ),
      true,
    );
  }
  assertEquals(
    final.metadata.pdf_sha256,
    prepared.packets[0].packet.metadata.pdf_sha256,
  );
  assertEquals(final.documents.continuationXml !== undefined, true);
  assertEquals(final.documents.generalContinuations.length > 0, true);
  for (
    const xml of [
      final.documents.formXml,
      final.documents.continuationXml!,
      ...final.documents.generalContinuations.map((item) => item.xml),
    ]
  ) {
    assertEquals(bundle.xml.includes(xml), true);
  }
  assertPreparedBundleProjection(bundle, identity);
  const { buildPdfBytes } = await import("../../../../pdf/builder.ts");
  const { PDFDocument } = await import("pdf-lib");
  const origins: import("../../../../pdf/builder.ts").PdfPageOrigin[] = [];
  const pdfBytes = await buildPdfBytes(
    bundle.pending,
    identity,
    ".pdf-cache",
    bundle,
    origins,
  );
  const completePdf = await PDFDocument.load(pdfBytes);
  const disclosurePages = await Promise.all(
    finalPackets.map(async (copy) =>
      (await PDFDocument.load(copy.getPdf())).getPageCount()
    ),
  );
  const disclosureOrigins = origins.filter((row) => row.formKey === "form8886");
  assertEquals(
    disclosureOrigins.length,
    disclosurePages.reduce((sum, count) => sum + count, 0),
  );
  assertEquals(
    disclosureOrigins.map((row) => row.formCopy),
    disclosurePages.flatMap((count, index) => Array(count).fill(index + 1)),
  );
  assertEquals(
    disclosureOrigins.at(-1)?.pageNumber,
    completePdf.getPageCount(),
  );
  const { prepareOtsaHandoff, OtsaMethod, OtsaTiming } = await import(
    "./handoff.ts"
  );
  const handoff = prepareOtsaHandoff(final, {
    method: OtsaMethod.Fax,
    timing: {
      kind: OtsaTiming.InitialReturn,
      return_due_date: "2026-04-15",
      event_source_reference: "Synthetic due date",
    },
    sender_name: "Synthetic Preparer",
    sender_title: "Preparer",
    sender_phone: "5125550100",
    sender_address: "2 Example Way, Austin TX 78701",
    prepared_on: "2026-04-01",
  });
  assertEquals(handoff.artifact.pdf_sha256, final.metadata.pdf_sha256);
  assertEquals(handoff.artifact.xml_sha256, final.metadata.xml_sha256);

  const schema = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema.pathname, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line7_capital_gain: 1 },
      }, options),
    Error,
    "calculation differs",
  );
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        ...options,
        form8886: { ...options.form8886, prepared: { ...prepared } },
      }),
    Error,
    "authentic prepared bundle",
  );
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        ...options,
        form8886: {
          ...options.form8886,
          source: {
            disclosures: source.disclosures.map((copy, index) =>
              index === 0 ? { ...copy, transaction_steps: "Changed" } : copy
            ),
          },
        },
      }),
    Error,
    "no longer matches",
  );
  const callerPending = structuredClone(pending);
  const callerOptions = {
    ...options,
    form8886: {
      ...options.form8886,
      source: structuredClone(source),
      result: structuredClone(result),
    },
  };
  const inFlight = buildMefBundle(callerPending, callerOptions);
  callerPending.f1040!.line7_capital_gain = 99;
  callerOptions.form8886.source.disclosures[0].transaction_steps =
    "Changed during preparation";
  callerOptions.form8886.result.pending.f1040.line7_capital_gain = 99;
  const snapshotted = await inFlight;
  assertEquals(snapshotted.xml, bundle.xml);
});

Deno.test("Form 8886 public intake replays ordinary return inputs before native, PDF and OTSA preparation", async () => {
  const { normalizeAllPending } = await import(
    "../../../../return-processing/pending.ts"
  );
  const { extractFilerIdentity } = await import("../../../../../mef/filer.ts");
  const { buildPending } = await import("../../../../mef/execution/pending.ts");
  const { buildMefXml } = await import("../../../../mef/builder.ts");
  const { buildPdfBytes } = await import("../../../../pdf/builder.ts");
  const { PDFDocument } = await import("pdf-lib");
  const row = { ...broker, proceeds: 1000, cost_basis: 3000 };
  const source = {
    disclosures: [{
      ...await linkedDisclosure(row),
      protective_disclosure: true,
    }],
  };
  const inputs = { general, f1099b: [row], f8886: source };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f8886.disclosures, source.disclosures);
  const normalized = normalizeAllPending(result.pending);
  const identity = extractFilerIdentity(normalized.f1040)!;
  const prepared = await f1040_2025.prepareReturn(normalized, identity);
  assertEquals(prepared.bundle.form8886Packets?.packets.length, 1);
  const packet = prepared.bundle.form8886Packets!.packets[0].packet;
  assertEquals(prepared.bundle.xml.includes(packet.documents.formXml), true);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() >=
      packet.metadata.page_count + 4,
    true,
  );
  await assertRejects(
    async () => buildMefXml(buildPending(normalized), identity),
    Error,
    "use prepareReturn",
  );
  await assertRejects(
    () => buildPdfBytes(normalized, identity),
    Error,
    "use prepareReturn",
  );
  const changed = structuredClone(normalized);
  changed.f1040.line7_capital_gain = -1;
  await assertRejects(
    () => f1040_2025.prepareReturn(changed, identity),
    Error,
    "public input replay",
  );
  const missingStart = { ...normalized, start: undefined };
  await assertRejects(
    () => f1040_2025.prepareReturn(missingStart, identity),
    Error,
    "retained public inputs",
  );
  const omitted = { ...normalized, f8886: undefined };
  await assertRejects(
    () => f1040_2025.prepareReturn(omitted, identity),
    Error,
    "retained public inputs",
  );
  const changedDisclosure = structuredClone(normalized);
  changedDisclosure.f8886 = {
    disclosures: [{ ...source.disclosures[0], transaction_steps: "Changed" }],
  };
  await assertRejects(
    () => f1040_2025.prepareReturn(changedDisclosure, identity),
    Error,
    "differs from its retained public inputs",
  );
  await assertRejects(
    () =>
      buildPdfBytes(changedDisclosure, identity, ".pdf-cache", prepared.bundle),
    Error,
    "public disclosure differs",
  );
  const callerPending = structuredClone(normalized);
  const callerFiler = { ...identity };
  const inFlight = f1040_2025.prepareReturn(callerPending, callerFiler);
  callerPending.f1040.line7_capital_gain = 77;
  callerFiler.primarySSN = "999887777";
  const captured = await inFlight;
  assertEquals(captured.bundle.pending.f1040?.line7_capital_gain, -2000);
  assertEquals(
    (await PDFDocument.load(await captured.renderPdf())).getPageCount() >=
      packet.metadata.page_count + 4,
    true,
  );
  // A covered source can pass the capital-loss screen; an omitted source cannot.
  const large = f1040_2025.executeReturn({
    general,
    f1099b: [broker],
    f8886: { disclosures: [await linkedDisclosure()] },
  });
  assertEquals(large.diagnostics, []);
  const disclosedLarge = await f1040_2025.prepareReturn(
    large.pending,
    identity,
  );
  assertEquals(disclosedLarge.bundle.form8886Packets?.packets.length, 1);
  assertEquals(disclosedLarge.bundle.pending.f1040?.line7_capital_gain, -3000);
  await disclosedLarge.renderPdf();
  const undisclosedLarge = f1040_2025.executeReturn({
    general,
    f1099b: [broker],
  });
  await assertRejects(
    () => f1040_2025.prepareReturn(undisclosedLarge.pending, identity),
    Error,
    "at least $2 million gross loss",
  );
});

Deno.test("Form 8886 public large-loss route covers every owned broker and direct sale through full XSD and PDF", async () => {
  const { extractFilerIdentity } = await import("../../../../../mef/filer.ts");
  const { normalizeAllPending } = await import(
    "../../../../return-processing/pending.ts"
  );
  const { assertAttachmentCoverage } = await import(
    "../../../../return-processing/attachment-coverage.ts"
  );
  const { PDFDocument } = await import("pdf-lib");
  const direct = {
    recipient_ssn: general.spouse_ssn,
    source_document_reference: "Spouse reviewed sale contract",
    source_transaction_id: "spouse-direct-sale",
    part: Form8949Part.F,
    description: "Spouse investment property",
    date_acquired: "2024-01-01",
    date_sold: "2025-06-01",
    proceeds: 100000,
    cost_basis: 2100000,
  };
  const primary = await linkedDisclosure();
  const spouse = {
    ...primary,
    disclosure_id: "spouse-large-loss",
    taxpayer_ssn: general.spouse_ssn,
    current_return_links: [{
      ...primary.current_return_links[0],
      source_kind: ReturnSourceKind.DirectSale,
      source_document_reference: direct.source_document_reference,
      source_transaction_id: direct.source_transaction_id,
      source_row_sha256: await capitalReturnSourceSha256({
        kind: ReturnSourceKind.DirectSale,
        row: direct,
      }),
    }],
  };
  const source = {
    disclosures: [primary, spouse].map((copy) => ({
      ...copy,
      transactions: copy.transactions.map((transaction) => ({
        ...transaction,
        shared_transaction_review_reference:
          "Reviewed separately owned interests in the same arrangement",
      })),
    })),
  };
  const result = f1040_2025.executeReturn({
    general,
    f1099b: [broker],
    f8949: [direct],
    f8886: source,
  });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const identity = {
    ...extractFilerIdentity(pending.f1040)!,
    timestamp: "2026-04-01T12:00:00Z",
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" },
  };
  const preparedReturn = await f1040_2025.prepareReturn(pending, identity);
  const bundle = preparedReturn.bundle;
  assertEquals(bundle.form8886Packets?.packets.length, 2);
  assertEquals(bundle.pending.f1040?.line7_capital_gain, -3000);
  assertEquals(bundle.pending.schedule_d?.print_line15_lt_total, -4000000);
  for (const copy of bundle.form8886Packets!.packets) {
    assertEquals(bundle.xml.includes(copy.packet.documents.formXml), true);
  }
  const pdfBytes = await preparedReturn.renderPdf();
  assertEquals((await PDFDocument.load(pdfBytes)).getPageCount() >= 8, true);
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, bundle.xml);
    const schema = new URL(
      "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    );
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema.pathname, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
  // The same authentic packet cannot cover a new source with the same loss.
  const changed = structuredClone(pending);
  changed.f8949 = {
    f8949s: [{ ...direct, source_transaction_id: "other-direct-sale" }],
  };
  await assertRejects(
    async () =>
      assertAttachmentCoverage(changed, "mef", bundle.form8886Packets),
    Error,
    "every triggered source",
  );
  const onlyPrimary = f1040_2025.executeReturn({
    general,
    f1099b: [broker],
    f8949: [direct],
    f8886: { disclosures: [primary] },
  });
  await assertRejects(
    () => f1040_2025.prepareReturn(onlyPrimary.pending, identity),
    Error,
    "every triggered source",
  );
  await assertRejects(
    async () =>
      assertAttachmentCoverage(pending, "mef", { ...bundle.form8886Packets! }),
    Error,
    "authentic prepared packets",
  );
});
