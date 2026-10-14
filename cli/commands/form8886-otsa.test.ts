import { ExportRejectedError } from "./export.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { PDFDocument } from "pdf-lib";
import {
  exportForm8886OtsaCommand,
  recordForm8886OtsaDeliveryCommand,
} from "./form8886-otsa.ts";
import { createReturnCommand } from "./return.ts";
import { appendInput } from "../store/store.ts";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { sha256Hex } from "../../forms/f1040/2025/return-processing/prepared-source.ts";
import { disclosureFixture } from "../../forms/f1040/2025/domains/general/filing/form8886/source.fixture.ts";
import { ReturnSourceKind } from "../../forms/f1040/2025/domains/general/filing/form8886/source.ts";
import { capitalReturnSourceSha256 } from "../../forms/f1040/2025/domains/general/filing/form8886/return-sources.ts";
import {
  OtsaMethod,
  OtsaTiming,
} from "../../forms/f1040/2025/domains/general/filing/form8886/handoff.ts";
import {
  prepareForm8886OtsaDeliveryRecord,
  prepareForm8886OtsaExport,
} from "../../forms/f1040/2025/domains/general/filing/form8886/otsa-export.ts";

async function fixture(subsequent = false) {
  const general = {
    filing_status: "mfj",
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
  const sales = [general.taxpayer_ssn, general.spouse_ssn].map((
    owner,
    index,
  ) => ({
    recipient_ssn: owner,
    payer_tin: "333445555",
    account_number: `Acct${index}`,
    source_document_reference: `Reviewed statement ${index}`,
    transaction_id: `sale-${index}`,
    part: "D" as const,
    description: "Reviewed sale",
    date_acquired: "2024-01-01",
    date_sold: "2025-06-01",
    proceeds: 100000,
    cost_basis: 2100000,
  }));
  const disclosures = await Promise.all(sales.map(async (row, index) => ({
    ...disclosureFixture,
    disclosure_id: `copy-${index + 1}`,
    taxpayer_ssn: row.recipient_ssn,
    initial_year_filer: !subsequent,
    previous_disclosure_reference: subsequent
      ? "Retained earlier disclosure"
      : undefined,
    transactions: disclosureFixture.transactions.map((tx) => ({
      ...tx,
      shared_transaction_review_reference:
        "Reviewed separate owners in one arrangement",
    })),
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
      relationship_review_reference: "Reviewed sale-to-arrangement association",
    }],
  })));
  const requests = {
    requests: disclosures.map((copy, index) => ({
      disclosure_id: copy.disclosure_id,
      handoff: {
        method: index === 0 ? OtsaMethod.Fax : OtsaMethod.Mail,
        timing: {
          kind: OtsaTiming.InitialReturn,
          return_due_date: "2026-04-15",
          event_source_reference: "Reviewed due date",
        },
        sender_name: "Example Preparer",
        sender_title: "Preparer",
        sender_phone: "5125550100",
        sender_address: "2 Example Way, Austin TX 78701",
        prepared_on: "2026-04-01",
      },
    })).toReversed(),
  };
  return {
    inputs: { general, f1099b: sales, f8886: { disclosures } },
    requests,
  };
}

Deno.test("OTSA command writes separate owned copies with matching hashes and preserves existing exports", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const { inputs, requests } = await fixture();
    const { returnId } = await createReturnCommand({
      year: 2025,
      baseDir: dir,
    });
    const returnPath = join(dir, returnId);
    await appendInput(returnPath, "general", inputs.general);
    for (const row of inputs.f1099b) {
      await appendInput(returnPath, "f1099b", row);
    }
    await appendInput(returnPath, "f8886", inputs.f8886);
    const requestsPath = join(dir, "requests.json");
    await Deno.writeTextFile(requestsPath, JSON.stringify(requests));
    const args = {
      returnId,
      baseDir: dir,
      requestsPath,
      outputDir: join(dir, "output"),
      force: true,
    };
    await assertRejects(
      () => exportForm8886OtsaCommand({ ...args, force: false }),
      ExportRejectedError,
    );
    await assertRejects(() => Deno.stat(args.outputDir), Deno.errors.NotFound);
    const result = await exportForm8886OtsaCommand(args);
    assertEquals(result.delivered, false);
    const manifestText = await Deno.readTextFile(result.manifestPath);
    const manifest = JSON.parse(manifestText);
    assertEquals(manifest.status, "prepared_not_sent");
    assertEquals(manifest.delivery_recorded, false);
    assertEquals(manifest.irs_acceptance, false);
    assertEquals(manifest.business_rule_force_requested, true);
    assertEquals(
      manifest.copies.map((row: { disclosure_id: string }) =>
        row.disclosure_id
      ),
      ["copy-1", "copy-2"],
    );
    assertEquals(
      manifest.copies.map((row: { handoff_file: string }) => row.handoff_file),
      ["disclosure-001-fax.pdf", "disclosure-002.pdf"],
    );
    for (const [name, hash] of Object.entries(manifest.file_sha256)) {
      assertEquals(
        await sha256Hex(await Deno.readFile(join(result.outputDir, name))),
        hash,
      );
    }
    assertEquals(
      (await PDFDocument.load(
        await Deno.readFile(join(result.outputDir, "disclosure-001-fax.pdf")),
      )).getPageCount(),
      3,
    );
    assertEquals(
      (await PDFDocument.load(
        await Deno.readFile(join(result.outputDir, "disclosure-001.pdf")),
      )).getPageCount(),
      2,
    );
    assertEquals(
      (await PDFDocument.load(
        await Deno.readFile(join(result.outputDir, "disclosure-002.pdf")),
      )).getPageCount(),
      2,
    );
    await assertRejects(
      () => exportForm8886OtsaCommand(args),
      Deno.errors.AlreadyExists,
    );
    assertEquals(await Deno.readTextFile(result.manifestPath), manifestText);
    await assertRejects(
      () => exportForm8886OtsaCommand({ ...args, draft: true }),
      Error,
      "does not accept draft",
    );
    const evidence = new TextEncoder().encode(
      "Synthetic completed fax log: three pages to reviewed destination",
    );
    const evidencePath = join(dir, "fax-log.txt");
    const recordPath = join(dir, "delivery-request.json");
    await Deno.writeFile(evidencePath, evidence);
    const copy = manifest.copies[0];
    const deliveryRequest = {
      disclosure_id: copy.disclosure_id,
      record: {
        method: copy.method,
        destination: copy.destination,
        delivered_on: "2026-04-16",
        source_sha256: copy.source_sha256,
        xml_sha256: copy.native_copy_sha256,
        pdf_sha256: copy.disclosure_pdf_sha256,
        transmission_sha256: copy.handoff_sha256,
        transmitted_page_count: copy.handoff_page_count,
        evidence_sha256: await sha256Hex(evidence),
        evidence_reference: "Synthetic reviewed fax transmission log",
        reviewed_delivery_result: "completed",
        reviewer_reference: "Synthetic reviewer",
      },
    };
    await Deno.writeTextFile(recordPath, JSON.stringify(deliveryRequest));
    const deliveryArgs = {
      ...args,
      exportDir: result.outputDir,
      outputDir: join(dir, "receipt"),
      recordPath,
      evidencePath,
    };
    const receiptResult = await recordForm8886OtsaDeliveryCommand(deliveryArgs);
    const receiptText = await Deno.readTextFile(receiptResult.receiptPath);
    const receipt = JSON.parse(receiptText);
    assertEquals(receipt.status, "reviewed_delivery_recorded");
    assertEquals(receipt.irs_acceptance, false);
    assertEquals(receipt.delivery.late, true);
    assertEquals(
      receipt.export_manifest_sha256,
      await sha256Hex(new TextEncoder().encode(manifestText)),
    );
    assertEquals(
      await Deno.readFile(join(deliveryArgs.outputDir, "evidence.bin")),
      evidence,
    );
    assertEquals(await Deno.readTextFile(result.manifestPath), manifestText);
    await assertRejects(
      () => recordForm8886OtsaDeliveryCommand(deliveryArgs),
      Deno.errors.AlreadyExists,
    );
    assertEquals(
      await Deno.readTextFile(receiptResult.receiptPath),
      receiptText,
    );
    const rejectedArgs = {
      ...deliveryArgs,
      outputDir: join(dir, "rejected-receipt"),
    };
    for (
      const changed of [
        { ...deliveryRequest, disclosure_id: "copy-2" },
        {
          ...deliveryRequest,
          record: {
            ...deliveryRequest.record,
            destination: "wrong destination",
          },
        },
        {
          ...deliveryRequest,
          record: { ...deliveryRequest.record, delivered_on: "2026-03-31" },
        },
        {
          ...deliveryRequest,
          record: {
            ...deliveryRequest.record,
            evidence_sha256: "0".repeat(64),
          },
        },
      ]
    ) {
      await Deno.writeTextFile(recordPath, JSON.stringify(changed));
      await assertRejects(() =>
        recordForm8886OtsaDeliveryCommand(rejectedArgs)
      );
      await assertRejects(
        () => Deno.stat(rejectedArgs.outputDir),
        Deno.errors.NotFound,
      );
    }
    await Deno.writeTextFile(recordPath, JSON.stringify(deliveryRequest));
    const faxPath = join(result.outputDir, copy.handoff_file);
    const faxBytes = await Deno.readFile(faxPath);
    await Deno.writeTextFile(faxPath, "altered fax bytes");
    await assertRejects(
      () => recordForm8886OtsaDeliveryCommand(rejectedArgs),
      Error,
      "differs from its prepared digest",
    );
    await Deno.writeFile(faxPath, faxBytes);
    await Deno.writeTextFile(
      result.manifestPath,
      manifestText.replace('"prepared_not_sent"', '"sent"'),
    );
    await assertRejects(
      () => recordForm8886OtsaDeliveryCommand(rejectedArgs),
      Error,
      "manifest differs",
    );
    await Deno.writeTextFile(result.manifestPath, manifestText);
    const changedRequests = structuredClone(requests);
    changedRequests.requests[0].handoff.sender_name = "Changed sender";
    await Deno.writeTextFile(requestsPath, JSON.stringify(changedRequests));
    await assertRejects(
      () => recordForm8886OtsaDeliveryCommand(rejectedArgs),
      Error,
      "manifest differs",
    );
    await Deno.writeTextFile(requestsPath, JSON.stringify(requests));
    await assertRejects(
      () => Deno.stat(rejectedArgs.outputDir),
      Deno.errors.NotFound,
    );
    await assertRejects(
      () => Deno.stat(rejectedArgs.outputDir),
      Deno.errors.NotFound,
    );
    await Deno.writeTextFile(
      requestsPath,
      JSON.stringify({ requests: requests.requests.slice(0, 1) }),
    );
    await assertRejects(
      () =>
        exportForm8886OtsaCommand({
          ...args,
          outputDir: join(dir, "incomplete"),
        }),
      Error,
      "every prepared disclosure",
    );
    await assertRejects(
      () => Deno.stat(join(dir, "incomplete")),
      Deno.errors.NotFound,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("OTSA artifact preparation rejects changed native bytes and forged copies and retains not-required decisions", async () => {
  const { inputs, requests } = await fixture(true);
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040)!;
  const { bundle } = await f1040_2025.prepareReturn(pending, filer);
  const exported = await prepareForm8886OtsaExport(bundle, filer, requests);
  assertEquals(exported.manifest.copies.map((row) => row.state), [
    "not_required",
    "not_required",
  ]);
  assertEquals(exported.manifest.copies.map((row) => row.handoff_file), [
    undefined,
    undefined,
  ]);
  assertEquals(exported.files.map((row) => row.name), [
    "prepared-return.xml",
    "disclosure-001.pdf",
    "disclosure-002.pdf",
  ]);
  await assertRejects(
    () =>
      prepareForm8886OtsaExport(
        { ...bundle, xml: bundle.xml + "changed" },
        filer,
        requests,
      ),
    Error,
    "XML differs from its digest",
  );
  await assertRejects(
    () =>
      prepareForm8886OtsaExport(
        { ...bundle, form8886Packets: { ...bundle.form8886Packets! } },
        filer,
        requests,
      ),
    Error,
    "authentic prepared bundle",
  );
  await assertRejects(
    () =>
      prepareForm8886OtsaExport(bundle, filer, {
        requests: [requests.requests[0], requests.requests[0]],
      }),
    Error,
    "repeats a disclosure",
  );
  await assertRejects(
    () =>
      prepareForm8886OtsaExport(bundle, filer, {
        requests: [
          { ...requests.requests[0], disclosure_id: "unknown" },
          requests.requests[1],
        ],
      }),
    Error,
    "every prepared disclosure",
  );
});

Deno.test("OTSA mail delivery binds the spouse copy and rejects forged, unknown and not-required handoffs", async () => {
  const { inputs, requests } = await fixture();
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040)!;
  const { bundle } = await f1040_2025.prepareReturn(pending, filer);
  const exported = await prepareForm8886OtsaExport(bundle, filer, requests);
  const copy = exported.manifest.copies[1];
  const evidence = new TextEncoder().encode(
    "Synthetic reviewed mailing record for spouse disclosure",
  );
  const request = {
    disclosure_id: copy.disclosure_id,
    record: {
      method: OtsaMethod.Mail,
      destination: copy.destination,
      delivered_on: "2026-04-15",
      source_sha256: copy.source_sha256,
      xml_sha256: copy.native_copy_sha256,
      pdf_sha256: copy.disclosure_pdf_sha256,
      transmission_sha256: copy.handoff_sha256!,
      transmitted_page_count: copy.handoff_page_count!,
      evidence_sha256: await sha256Hex(evidence),
      evidence_reference: "Synthetic mailing record",
      reviewed_delivery_result: "completed" as const,
      reviewer_reference: "Synthetic reviewer",
    },
  };
  const receipt = await prepareForm8886OtsaDeliveryRecord(
    exported,
    request,
    evidence,
  );
  assertEquals(receipt.disclosure_id, "copy-2");
  assertEquals(receipt.delivery.late, false);
  assertEquals(receipt.delivery.method, OtsaMethod.Mail);
  assertEquals(
    receipt.delivery.transmission_sha256,
    copy.disclosure_pdf_sha256,
  );
  assertEquals(receipt.delivery.cover_sha256, undefined);
  assertEquals(receipt.irs_acceptance, false);
  assertEquals(exported.manifest.delivery_recorded, false);
  await assertRejects(
    () => prepareForm8886OtsaDeliveryRecord({ ...exported }, request, evidence),
    Error,
    "authentic prepared export",
  );
  await assertRejects(
    () =>
      prepareForm8886OtsaDeliveryRecord(exported, {
        ...request,
        disclosure_id: "unknown",
      }, evidence),
    Error,
    "authentic prepared export",
  );
  await assertRejects(
    () =>
      prepareForm8886OtsaDeliveryRecord(exported, {
        ...request,
        disclosure_id: "copy-1",
      }, evidence),
    Error,
    "differs from the prepared disclosure",
  );
  await assertRejects(
    () =>
      prepareForm8886OtsaDeliveryRecord(exported, request, new Uint8Array()),
    Error,
    "evidence bytes",
  );

  const later = await fixture(true);
  const laterResult = f1040_2025.executeReturn(later.inputs);
  assertEquals(laterResult.diagnostics, []);
  const laterPending = normalizeAllPending(laterResult.pending);
  const laterFiler = extractFilerIdentity(laterPending.f1040)!;
  const laterPrepared = await f1040_2025.prepareReturn(
    laterPending,
    laterFiler,
  );
  const laterExport = await prepareForm8886OtsaExport(
    laterPrepared.bundle,
    laterFiler,
    later.requests,
  );
  await assertRejects(
    () => prepareForm8886OtsaDeliveryRecord(laterExport, request, evidence),
    Error,
    "prepared exact-copy handoff",
  );
});
