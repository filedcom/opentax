import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assertEquals, assertRejects } from "@std/assert";
import {
  annualTraditionalCases,
  annualTraditionalReturnSource,
} from "./form8606_annual_traditional.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

// Existing worked annual amounts, replayed from persisted public sources and
// actual retained document bytes rather than a serialized calculated graph.
for (
  const [index, id, gross, taxable, tax, owners] of [
    [0, "single-annual", 23000, 11662, 22949, 1],
    [2, "joint-annual", 43500, 22568, 17675, 2],
    [9, "roth-phaseout", 24500, 13066, 31204, 1],
  ] as const
) {
  test(`Form 8606 ${id} rebuilds both filing formats from disk-retained sources`, async () => {
    const evidence = process.env.FORM8606_REPLAY_DIR;
    const root = evidence
      ? `${evidence}/${id}`
      : await sys.makeTempDir({ prefix: "form8606-replay-" });
    await fs.mkdir(root, { recursive: true });
    try {
      const source = await annualTraditionalReturnSource(
        annualTraditionalCases[index],
        8100 + index,
      );
      await fs.writeFile(
        `${root}/input.json`,
        JSON.stringify(source.inputs),
      );
      await fs.writeFile(
        `${root}/filer.json`,
        JSON.stringify(source.filer),
      );
      const manifest = [];
      for (const [n, document] of source.retained.documents.entries()) {
        const path = `document-${n}.bin`;
        await fs.writeFile(`${root}/${path}`, document.bytes);
        manifest.push({
          document_reference: document.document_reference,
          path,
          sha256: await sha256Hex(document.bytes),
        });
      }
      await fs.writeFile(
        `${root}/documents.json`,
        JSON.stringify(manifest, null, 2),
      );
      const inputs = JSON.parse(await fs.readFile(`${root}/input.json`, "utf8"));
      const filer = JSON.parse(await fs.readFile(`${root}/filer.json`, "utf8"));
      const records: typeof manifest = JSON.parse(
        await fs.readFile(`${root}/documents.json`, "utf8"),
      );
      const documents = await Promise.all(records.map(async (record) => {
        const bytes = await sys.readBytes(`${root}/${record.path}`);
        assertEquals(await sha256Hex(bytes), record.sha256);
        return { document_reference: record.document_reference, bytes };
      }));
      const result = f1040_2025.executeReturn(inputs);
      assertEquals(result.diagnostics, []);
      const pending = normalizeAllPending(result.pending);
      assertEquals([
        pending.f1040.line4a_ira_gross,
        pending.f1040.line4b_ira_taxable,
        pending.f1040.line24_total_tax,
      ], [gross, taxable, tax]);
      const forms = pending.form8606.owner_forms as Record<string, any>[];
      assertEquals(forms.length, owners);
      assertEquals(
        forms.map((f) => f.print_line14_remaining_basis),
        index === 0 ? [2662] : index === 2 ? [2566, 1002] : [2566],
      );
      const prepared = await f1040_2025.prepareReturn(
        result.pending,
        filer,
        [],
        documents,
      );
      assertEquals(
        (prepared.bundle.xml.match(/<IRS8606 /g) ?? []).length,
        owners,
      );
      assertEquals(prepared.bundle.attachments, []);
      const origins: PdfPageOrigin[] = [];
      const pdf = await buildPdfBytes(
        prepared.bundle.pending,
        filer,
        ".pdf-cache",
        prepared.bundle,
        origins,
      );
      await fs.writeFile(`${root}/return.xml`, prepared.bundle.xml);
      await fs.writeFile(`${root}/return.pdf`, pdf);
      await fs.writeFile(
        `${root}/origins.json`,
        JSON.stringify(origins, null, 2),
      );
      await fs.writeFile(
        `${root}/pending.json`,
        JSON.stringify(pending, null, 2),
      );
      // Native replay validates changed owner lines; prepared-PDF replay must
      // also reject a graph differing from the validated source bundle.
      for (const owner of forms.keys()) {
        for (
          const field of [
            "print_line14_remaining_basis",
            "print_line15c_taxable",
            "print_line18_taxable_conversion",
          ]
        ) {
          const changed = structuredClone(pending);
          (changed.form8606.owner_forms as Record<string, any>[])[owner][
            field
          ] += 1;
          await assertRejects(() =>
            f1040_2025.prepareReturn(changed, filer, [], documents)
          );
          await assertRejects(() =>
            buildPdfBytes(changed, filer, ".pdf-cache", prepared.bundle)
          );
        }
      }
      await assertRejects(
        () => f1040_2025.prepareReturn(result.pending, filer, [], []),
        Error,
      );
    } finally {
      if (!evidence) await sys.remove(root, { recursive: true });
    }
  });
}
