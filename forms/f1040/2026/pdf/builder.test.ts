import { test } from "bun:test";
import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import * as fs from "node:fs/promises";
import * as sys from "../../../../scripts/support/sys.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import { pdfReviewFixtures } from "../../2025/pdf/review-fixtures.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { f1040_2026 } from "../index.ts";
import { TY2026_DRAFT_NOTICE } from "./draft-template.ts";
import { TY2026_PDF_MAPPED_FORMS, ty2026PdfForms } from "./builder.ts";
import { loadPdfTemplate } from "../../2025/pdf/support/template-cache.ts";

const fixture = (id: string) => {
  const row = pdfReviewFixtures.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`missing sample ${id}`);
  return row.inputs as Record<string, unknown>;
};

async function render(inputs: Record<string, unknown>) {
  const result = f1040_2026.executeReturn(signed(inputs));
  const pending = result.pending as Record<string, Record<string, unknown>>;
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  return await f1040_2026.buildPdfBytes(
    f1040_2026.buildPending(pending),
    filer,
  );
}

async function text(bytes: Uint8Array): Promise<string> {
  const path = await sys.makeTempFile({ suffix: ".pdf" });
  try {
    await fs.writeFile(path, bytes);
    const out = await new sys.Command("pdftotext", {
      args: ["-layout", path, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(out.success, true, new TextDecoder().decode(out.stderr));
    return new TextDecoder().decode(out.stdout).replace(/[ \t]+/g, " ");
  } finally {
    await sys.remove(path);
  }
}

test("TY2026 PDF prints Form 1040 and Schedule 3 on the 2026 draft lines", async () => {
  const bytes = await render(
    fixture("single-two-employers-excess-social-security"),
  );
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  assertEquals(doc.getPageCount(), 3);
  assertEquals(doc.getSubject(), TY2026_DRAFT_NOTICE);
  const printed = await text(bytes);
  assertMatch(printed, /Individual Income Tax Return 2026/);
  assertMatch(printed, /DRAFT/);
  assertMatch(printed, /1a Total amount from Form\(s\) W-2[^\n]* 1a 200000/);
  assertMatch(printed, /12e Standard deduction[^\n]* 12e 16100/);
  assertMatch(printed, /24a Add lines 22 and 23[^\n]* 24a 36734/);
  assertMatch(printed, /24c Add lines 24a and 24b[^\n]* 24c 36734/);
  assertMatch(printed, /32c Subtract line 32b[^\n]* 32c 961/);
  assertMatch(printed, /11 Excess social security[^\n]* 11 961/);
  assertMatch(printed, /15 Add lines 9 through 12 and 14[^\n]* 15 961/);
});

test("TY2026 PDF prints Schedule 1 on the 2026 draft", async () => {
  const printed = await text(
    await render(fixture("single-mixed-box8-rtaa-taxable-grant-line8z")),
  );
  assertMatch(printed, /SCHEDULE 1[\s\S]*2026/);
  assertMatch(printed, /8 Additional income from Schedule 1, line 10[^\n]* 8 1750/);
});

test("TY2026 PDF moves W-2 uncollected tax to Schedule 2 line 17c", async () => {
  const inputs = fixture("single-two-employers-excess-social-security");
  const [first] = inputs.w2 as Array<Record<string, unknown>>;
  const printed = await text(
    await render({
      ...inputs,
      w2: [{
        ...first,
        box12_entries: [{ code: Box12Code.A, amount: 300 }],
      }],
    }),
  );
  assertMatch(printed, /SCHEDULE 2[\s\S]*2026/);
  assertMatch(printed, /17c Uncollected social security[\s\S]*?17c 300/);
  assertMatch(printed, /17d Total other employment taxes[^\n]* 17d 300/);
  assertMatch(printed, /20 Total additional employment[^\n]* 20 300/);
  assertMatch(printed, /\n 21 [^\n]*\n[^\n]* 21 300/);
  assertMatch(printed, /23 Additional taxes[^\n]* 23 300/);
});

test("TY2026 PDF refuses, by name, a form with no TY2026 mapping", async () => {
  await assertRejects(
    () => render(fixture("single-form2441-child-care-credit")),
    Error,
    "TY2026 PDF export needs form2441",
  );
});

test("every TY2026 mapped field exists on its pinned 2026 template", async () => {
  const forms = await ty2026PdfForms();
  for (const key of TY2026_PDF_MAPPED_FORMS) {
    const descriptor = forms.find((row) => row.pendingKey === key)!;
    const doc = await PDFDocument.load(
      await loadPdfTemplate(
        descriptor.pdfUrl,
        ".pdf-cache",
        descriptor.pdfSha256,
      ),
      { ignoreEncryption: true, updateMetadata: false },
    );
    const names = new Set(doc.getForm().getFields().map((f) => f.getName()));
    const missing = [...descriptor.fields, ...(descriptor.filerFields ?? [])]
      .flatMap((entry) => [
        entry.pdfField,
        ...("extraPdfFields" in entry ? entry.extraPdfFields ?? [] : []),
      ])
      .filter((name) => !names.has(name));
    assertEquals(missing, [], key);
  }
});
