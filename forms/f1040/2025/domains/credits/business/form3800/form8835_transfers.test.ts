import { PDFDocument } from "pdf-lib";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  transferCases,
  transferFixture,
} from "./form8835_transfers.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";

for (const c of transferCases) {
  Deno.test(`Form 8835 reviewed transfer source-to-return: ${c.id}`, async () => {
    const { input, attachments, expected } = await transferFixture(c);
    const execution = f1040_2025.executeReturn(input);
    assertEquals(execution.diagnostics, []);
    const filer = extractFilerIdentity(execution.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(
        execution.pending,
        filer,
        attachments,
      ),
      pending = prepared.bundle.pending;
    assertEquals(
      pending.f1040?.line20_nonrefundable_credits,
      2001 + expected.used,
    );
    assertEquals(pending.f1040?.line24_total_tax, expected.tax);
    assertEquals(pending.f1040?.line35a_refund, 30000 - expected.tax);
    const statementCount = input.f8835.reduce(
      (n: number, f: any) => n + f.transfer_source.transfers.length,
      0,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `>${statementCount}</TransferElectionStatementCnt>`,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      new Set(
        origins.filter((o) => o.formKey === "f8835_transfer_statement").map(
          (o) => o.formCopy,
        ),
      ).size,
      input.f8835.length,
    );
    const mutations: ((f: any) => void)[] = [
      (f) => delete f.transfer_source,
      (f) => f.transfer_source.total_facility_credit++,
      (f) => f.transfer_election_amount++,
      (f) => f.transfer_source.registration_number = "CAABC25ZZZZZ",
      (f) => f.transfer_source.facility_description = "Wrong facility",
      (f) => f.transfer_source.facility_address.line1 = "Wrong street",
      (f) => f.transfer_source.facility_latitude++,
      (f) => f.transfer_source.transferor.tin = "999999999",
      (f) => f.transfer_source.transferor.name = "Wrong person",
      (f) => f.transfer_source.transferor.address.line1 = "Wrong street",
      (f) => f.transfer_source.registration_received_on = "2026-02-16",
      (f) =>
        f.transfer_source.return_due_date_including_extensions = "2026-02-14",
      (f) => f.transfer_source.transferor.signed_on = "2026-02-16",
      (f) => f.transfer_source.transfers[0].transferee.signed_on = "2026-02-16",
      (f) => f.transfer_source.transfers[0].transferee.tin = "111223333",
      (f) => f.transfer_source.transfers[0].cash_payments[0].amount_cents++,
      (f) =>
        f.transfer_source.transfers[0].cash_payments[0].paid_on = "2024-12-31",
      (f) =>
        f.transfer_source.transfers[0].cash_payments[0].paid_on = "2026-02-16",
      (f) =>
        f.transfer_source.transfers[0].cash_payments[0].record_reference =
          f.transfer_source.transfers[0].cash_payments[1].record_reference,
      (f) =>
        f.transfer_source.transfers[0]
          .unrelated_under_267b_and_707b_including_controlled_groups_verified =
            false,
      (f) => f.transfer_source.transfers[0].statement_sha256 = "0".repeat(64),
      (f) =>
        f.transfer_source.transfers[0]
          .minimum_documentation_delivered_to_transferee_verified = false,
      (f) =>
        f.transfer_source.complete_facility_transfer_inventory_verified = false,
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate((changed.f8835 as any).f8835s[0]);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, attachments)
      );
      const fresh = {
        ...prepared.bundle,
        pending: changed,
        sourceSha256: await preparedSourceSha256(changed, filer),
      };
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", fresh)
      );
    }
    for (const a of attachments) {
      await assertRejects(() =>
        f1040_2025.prepareReturn(
          pending,
          filer,
          attachments.filter((other) => other !== a),
        )
      );
    }
    for (const field of ["TransferredCredit", "TransfereeTIN"]) {
      const changed = structuredClone(pending);
      const t = (changed.f8835 as any).f8835s[0].transfer_source.transfers[0];
      const original = attachments.find((a) =>
        a.fileName === t.statement_file_name
      )!;
      const doc = await PDFDocument.load(original.bytes);
      doc.getForm().getTextField(`Form8835Transfer.${field}`).setText(
        "999999999",
      );
      const bytes = await doc.save();
      t.statement_sha256 = await sha256Hex(bytes);
      const changedAttachments = attachments.map((a) =>
        a === original ? { ...a, bytes } : a
      );
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, changedAttachments)
      );
      const fresh = {
        ...prepared.bundle,
        pending: changed,
        attachments: changedAttachments,
        sourceSha256: await preparedSourceSha256(changed, filer),
        attachmentSha256ByFileName: {
          ...prepared.bundle.attachmentSha256ByFileName,
          [t.statement_file_name]: t.statement_sha256,
        },
      };
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", fresh)
      );
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8835_TRANSFER_EVIDENCE_DIR");
    } catch { /*optional*/ }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${c.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${c.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${c.id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            expected,
            origins,
            nativeRejections: mutations.length,
            pdfRejections: mutations.length,
            attachmentRejections: attachments.length,
            rehashedStatementContentRejections: 2,
          },
          null,
          2,
        ),
      );
      for (const a of attachments) {
        await Deno.writeFile(`${root}/${c.id}-${a.fileName}`, a.bytes);
      }
    }
  });
}
