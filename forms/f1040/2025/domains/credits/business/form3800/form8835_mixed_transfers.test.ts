import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  mixedTransferCases,
  mixedTransferFixture,
} from "./form8835_mixed_transfers.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";

for (const c of mixedTransferCases) {
  Deno.test(`Form 8835 mixed transfer limits and allocations: ${c.id}`, async () => {
    const { input, attachments, expected } = await mixedTransferFixture(c);
    const execution = f1040_2025.executeReturn(input);
    assertEquals(execution.diagnostics, []);
    const filer = extractFilerIdentity(execution.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(
      execution.pending,
      filer,
      attachments,
    );
    const pending = prepared.bundle.pending;
    assertEquals(pending.f1040?.line24_total_tax, expected.tax);
    assertEquals(pending.f1040?.line35a_refund, 30000 - expected.tax);
    assertEquals(
      pending.f1040?.line20_nonrefundable_credits,
      expected.ordinaryUsed + expected.orphanUsed + expected.specifiedUsed,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `>${attachments.length}</TransferElectionStatementCnt>`,
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
      origins.filter((o) => o.formKey === "f8835").length,
      input.f8835.length * 3,
    );
    assertEquals(
      origins.filter((o) => o.formKey === "f8835_transfer_statement").length,
      input.f8835.length * 3,
    );
    if (c.id === "mixed-transfer-overflow") {
      assertEquals(origins.filter((o) => o.formKey === "f3800").length, 10);
    }
    const mutations: Array<(p: any) => void> = [
      (p) =>
        p.form3800_current_production_allocation.facilities[0]
          .transfer_out_amount++,
      (p) =>
        p.form3800_current_production_allocation.facilities[0].applied_credit++,
      (p) =>
        p.form3800_current_production_allocation.facilities[0].form3800_line =
          "4z",
      (p) => p.form3800_current_orphan_allocation.sources[0].applied_credit++,
      (p) => p.f8835.f8835s[0].transfer_source.transfers[0].credit_amount++,
      (p) => p.f8835.f8835s[0].registration_number = "CAABC25ZZZZZ",
      (p) =>
        p.f8835.f8835s[0].transfer_source.transfers[0].statement_file_name =
          "Transfer Election Statement missing.pdf",
      (p) =>
        p.f8835.f8835s[0].transfer_source.transfers[0].cash_payments[0]
          .amount_cents++,
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, attachments)
      );
      const sourceSha256 = await preparedSourceSha256(changed, filer);
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
          sourceSha256,
        })
      );
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8835_MIXED_TRANSFER_EVIDENCE");
    } catch { /* Optional private evidence. */ }
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
