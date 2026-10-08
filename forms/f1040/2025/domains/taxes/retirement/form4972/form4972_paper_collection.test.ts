import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  buildForm4972PaperPdfBytes,
  buildPdfBytes,
  type PdfPageOrigin,
} from "../../../../pdf/builder.ts";
import { participantCollectionInputs } from "./form4972_participant_collection.fixture.ts";
import expected from "./form4972_participant_collection.expected.json" with {
  type: "json",
};
import { appendInput, createReturn } from "../../../../../../../cli/store/store.ts";
import { exportForm4972PaperCommand } from "../../../../../../../cli/commands/export.ts";
import { fromFileUrl, join } from "@std/path";

Deno.test("three and five sourced Form 4972 participants print as paper packets only", async () => {
  const evidenceDir = Deno.args[0];
  if (evidenceDir) await Deno.mkdir(evidenceDir, { recursive: true });
  for (
    const id of ["own-plus-parents", "joint-three", "five-inherited"] as const
  ) {
    const input = participantCollectionInputs(id);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, [], id);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040)!;
    const forms = pending.form4972.forms as Record<string, unknown>[];
    assertEquals(forms.length, expected[id].forms.length);
    assertEquals(pending.f1040.form4972_tax, expected[id].specialTax);
    assertEquals(
      pending.f1040.line16_income_tax,
      expected[id].regularTax + expected[id].specialTax,
    );
    const origins: PdfPageOrigin[] = [];
    const bytes = await buildForm4972PaperPdfBytes(
      f1040_2025.buildPending(result.pending),
      filer,
      ".pdf-cache",
      origins,
    );
    const document = await PDFDocument.load(bytes);
    assertEquals(document.getForm().getFields().length, 0);
    assertEquals(origins.length, document.getPageCount());
    assertEquals(
      origins.filter((item) => item.formKey === "form4972").map((item) =>
        item.formCopy
      ),
      forms.map((_, index) => index + 1),
    );
    await assertRejects(
      () => f1040_2025.prepareReturn(result.pending, filer),
      Error,
      "at most two participant documents",
    );
    await assertRejects(
      () => buildPdfBytes(result.pending, filer),
      Error,
      "at most two participant documents",
    );
    if (evidenceDir) {
      await Deno.writeFile(`${evidenceDir}/${id}.pdf`, bytes);
      await Deno.writeTextFile(
        `${evidenceDir}/${id}.json`,
        JSON.stringify(
          { input, pending, filer, carry: result.carryforwards, origins },
          null,
          2,
        ),
      );
    }
  }
});

Deno.test("paper Form 4972 collection rejects altered source and final tax", async () => {
  const input = participantCollectionInputs("own-plus-parents");
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040)!;
  const sourceChanged = structuredClone(pending);
  const sourceRows = sourceChanged.f1099r.f1099rs as Record<string, unknown>[];
  sourceRows[0].box2a_taxable_amount =
    Number(sourceRows[0].box2a_taxable_amount) + 1;
  await assertRejects(
    () => buildForm4972PaperPdfBytes(sourceChanged, filer),
  );
  const taxChanged = structuredClone(pending);
  taxChanged.f1040.form4972_tax = Number(taxChanged.f1040.form4972_tax) + 1;
  await assertRejects(
    () => buildForm4972PaperPdfBytes(taxChanged, filer),
  );
});

Deno.test("CLI paper export emits no XML and ordinary MeF still rejects the same stored return", async () => {
  const cwd = await Deno.makeTempDir();
  const baseDir = join(cwd, ".state/returns");
  try {
    const { returnId, returnPath } = await createReturn(2025, baseDir);
    const input = participantCollectionInputs("own-plus-parents");
    await appendInput(returnPath, "general", input.general);
    await appendInput(returnPath, "form4972", input.form4972);
    await appendInput(returnPath, "schedule1a", input.schedule1a);
    for (const source of input.f1099r) {
      await appendInput(returnPath, "f1099r", source);
    }
    const path = await exportForm4972PaperCommand({ returnId, baseDir });
    const bytes = await Deno.readFile(path);
    const pdf = await PDFDocument.load(bytes);
    assertEquals(pdf.getPageCount() >= 5, true);
    assertEquals(pdf.getForm().getFields().length, 0);
    const manifest = JSON.parse(
      await Deno.readTextFile(`${path}.source-manifest.json`),
    );
    assertEquals(manifest.filingChannel, "paper_only");
    assertEquals(manifest.electronicSubmissionAuthorized, false);
    assertEquals(manifest.participantForms.length, 3);
    assertEquals(
      manifest.participantForms.map((form: Record<string, unknown>) =>
        form.sourceDocumentReferences
      ),
      input.form4972.elections.map((e) => e.source_document_references),
    );
    assertEquals(
      manifest.participantForms.reduce(
        (sum: number, form: Record<string, unknown>) =>
          sum + Number(form.determinedTax),
        0,
      ),
      expected["own-plus-parents"].specialTax,
    );
    await assertRejects(
      () => exportForm4972PaperCommand({ returnId, baseDir, force: true }),
      Error,
      "cannot bypass filing checks",
    );
    const main = fromFileUrl(new URL("../../../../../../../cli/main.ts", import.meta.url));
    const command = (type: string) =>
      new Deno.Command("deno", {
        args: [
          "run",
          "-A",
          "--no-check",
          main,
          "return",
          "export",
          "--returnId",
          returnId,
          "--type",
          type,
        ],
        cwd,
        stdout: "piped",
        stderr: "piped",
      }).output();
    const paper = await command("form4972-paper");
    assertEquals(paper.code, 0, new TextDecoder().decode(paper.stderr));
    assertEquals(
      new TextDecoder().decode(paper.stdout).includes("PAPER ONLY"),
      true,
    );
    assertEquals(
      new TextDecoder().decode(paper.stdout).includes("no MeF XML"),
      true,
    );
    const native = await command("mef");
    assertEquals(native.code, 1);
    assertEquals(
      new TextDecoder().decode(native.stderr).includes(
        "at most two participant documents",
      ),
      true,
    );
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});
