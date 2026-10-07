import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { inputSchema } from "../nodes/inputs/k1_trust/index.ts";
import { f1040_2025 } from "./index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { normalizeAllPending } from "./pending.ts";
import { preparedSourceSha256, sha256Hex } from "./prepared-source.ts";
import { PreparedTrustK1Copies } from "./trust-k1-prepared-copies.ts";
import {
  fieldName,
  filer,
  fixture,
  reference,
} from "./trust-k1-issued-copy.fixture.ts";

const recipient = {
  pdf_reference: reference,
  person_name: "Test Taxpayer",
  address: {
    kind: "us",
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};
async function preparedFixture() {
  const { source, documents } = await fixture((pdf) => {
    const form = pdf.getForm();
    for (const key of ["f1_52[0]", "f1_53[0]", "f1_56[0]", "f1_57[0]"]) {
      form.getTextField(fieldName(key)).setText("");
    }
    form.updateFieldAppearances(form.getDefaultFont());
  });
  const trust = inputSchema.parse({
    k1_trusts: [{ ...source.k1_trusts[0], box1_interest: 234.56 }],
  });
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      digital_assets: false,
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    k1_trust: trust.k1_trusts,
  });
  assertEquals(result.diagnostics, []);
  return {
    pending: normalizeAllPending(result.pending),
    documents,
    transcriptions: [structuredClone(recipient)],
  };
}

Deno.test("prepared trust K-1 copies bind the real finalized graph, reviewed native projection and exact source bytes without authorizing exports", async () => {
  const { pending, documents, transcriptions } = await preparedFixture();
  const prepared = await PreparedTrustK1Copies.prepare(
    pending,
    filer,
    documents,
    transcriptions,
  );
  assertEquals(
    prepared.sourceSha256,
    await preparedSourceSha256(pending, filer),
  );
  await prepared.assertCurrent(pending, filer);
  assertEquals(
    await sha256Hex(prepared.getCopyBytes(reference)),
    await sha256Hex(documents[0].bytes),
  );
  assertEquals(prepared.copies.length, 1);
  assertEquals(prepared.copies[0].directPrintedFactsMatched, true);
  assertEquals(prepared.copies[0].staticPageLayoutVerified, true);
  assertEquals(prepared.copies[0].requiredStatements, []);
  assertEquals(
    prepared.copies[0].nativeXml.includes(
      "<CreditsAndRecaptureAmt>125</CreditsAndRecaptureAmt>",
    ),
    true,
  );
  assertEquals(prepared.filingReady, false);
  assertEquals(Object.isFrozen(prepared), true);
  assertEquals(
    Object.isFrozen(prepared.copies[0].beneficiaryTranscription.address),
    true,
  );
  assertThrows(
    () => f1040_2025.buildMefXml(pending, filer),
    Error,
    "trust K-1 backup withholding",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(pending, filer),
    Error,
    "trust K-1 backup withholding",
  );
});

Deno.test("prepared trust K-1 source/filer/recipient/byte snapshots survive caller mutations before asynchronous verification finishes", async () => {
  const { pending, documents, transcriptions } = await preparedFixture();
  const current = structuredClone(pending),
    owner = { ...structuredClone(filer) },
    expectedHash = await sha256Hex(documents[0].bytes);
  const preparation = PreparedTrustK1Copies.prepare(
    pending,
    owner,
    documents,
    transcriptions,
  );
  documents[0].bytes.fill(0);
  transcriptions[0].person_name = "Changed Person";
  owner.firstName = "Changed";
  pending.f1040.line25c_total = 999;
  const prepared = await preparation;
  await prepared.assertCurrent(current, filer);
  assertEquals(await sha256Hex(prepared.getCopyBytes(reference)), expectedHash);
  assertEquals(
    prepared.copies[0].beneficiaryTranscription.person_name,
    "Test Taxpayer",
  );
  const output = prepared.getCopyBytes(reference);
  output.fill(0);
  assertEquals(await sha256Hex(prepared.getCopyBytes(reference)), expectedHash);
  assertThrows(
    () => prepared.getCopyBytes("unreviewed.pdf"),
    Error,
    "reference is unavailable",
  );
  await assertRejects(
    () => prepared.assertCurrent(pending, filer),
    Error,
    "differ from the current return",
  );
});

for (
  const [label, change] of [
    [
      "changed income",
      (pending: ReturnType<typeof normalizeAllPending>) => {
        const source = inputSchema.parse(pending.k1_trust);
        source.k1_trusts[0].box1_interest = 300;
        pending.k1_trust = source;
      },
    ],
    [
      "changed retained source reference",
      (pending: ReturnType<typeof normalizeAllPending>) => {
        const source = inputSchema.parse(pending.k1_trust);
        source.k1_trusts[0].source_document_reference = "other source";
        pending.k1_trust = source;
      },
    ],
    [
      "changed refund",
      (pending: ReturnType<typeof normalizeAllPending>) =>
        pending.f1040.line35a_refund = 999,
    ],
  ] as const
) {
  Deno.test(`prepared trust K-1 rejects ${label} after preparation`, async () => {
    const { pending, documents, transcriptions } = await preparedFixture();
    const prepared = await PreparedTrustK1Copies.prepare(
      pending,
      filer,
      documents,
      transcriptions,
    );
    change(pending);
    await assertRejects(
      () => prepared.assertCurrent(pending, filer),
      Error,
      "differ from the current return",
    );
  });
}

Deno.test("prepared trust K-1 copies reject incomplete finalized withholding, extra bytes and a different filer", async () => {
  const { pending, documents, transcriptions } = await preparedFixture();
  const stale = structuredClone(pending);
  stale.f1040.line25c_total = 0;
  await assertRejects(() =>
    PreparedTrustK1Copies.prepare(stale, filer, documents, transcriptions)
  );
  await assertRejects(() =>
    PreparedTrustK1Copies.prepare(pending, filer, [...documents, {
      reference: "extra.pdf",
      bytes: documents[0].bytes,
    }], transcriptions)
  );
  const prepared = await PreparedTrustK1Copies.prepare(
    pending,
    filer,
    documents,
    transcriptions,
  );
  await assertRejects(
    () => prepared.assertCurrent(pending, { ...filer, firstName: "Other" }),
    Error,
    "differ from the current return",
  );
});

Deno.test("prepared trust K-1 return binding preserves top-level Form8949 rows handled by the shared prepared-source contract", async () => {
  const { pending, documents, transcriptions } = await preparedFixture();
  const withRows: Record<string, unknown> = {
    ...pending,
    form8949: [{
      part: "A",
      source_transaction_id: "retained-sale",
      description: "RETAINED SALE",
      proceeds: 100,
      cost_basis: 80,
      gain_loss: 20,
    }],
  };
  const prepared = await PreparedTrustK1Copies.prepare(
    withRows,
    filer,
    documents,
    transcriptions,
  );
  assertEquals(
    prepared.sourceSha256,
    await preparedSourceSha256(withRows, filer),
  );
  const changed = structuredClone(withRows);
  changed.form8949 = [{
    part: "A",
    source_transaction_id: "retained-sale",
    description: "RETAINED SALE",
    proceeds: 200,
    cost_basis: 80,
    gain_loss: 120,
  }];
  await assertRejects(
    () => prepared.assertCurrent(changed, filer),
    Error,
    "differ from the current return",
  );
});
