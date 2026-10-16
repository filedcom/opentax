import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  jointAdoptionCareFixture2026,
  mixedOwnerAdoptionCareFixture2026,
} from "../inputs/adoption-care.fixture.ts";
Deno.test("Adoption and care draft forms retain separate spouses' signed earned-income limits", async () => {
  const r = await buildDraftReturnPdf2026(jointAdoptionCareFixture2026());
  assertEquals(r.filingReady, false);
  const care = r.attachments.find((a) => a.form === "form2441"),
    adoption = r.attachments.find((a) => a.form === "form8839");
  assert(care && adoption);
  const doc = await PDFDocument.load(r.bytes);
  assert(!doc.catalog.has(PDFName.of("AcroForm")));
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, r.bytes);
    const t = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(t.code, 0);
    assertEquals(new TextDecoder().decode(t.stderr), "");
    const pages = new TextDecoder().decode(t.stdout).split("\f");
    assertStringIncludes(pages[care.formPages[0] - 1], "50000");
    assertStringIncludes(pages[care.formPages[0] - 1], "2330");
    assertStringIncludes(pages[adoption.formPages[1] - 1], "-17670");
  } finally {
    await Deno.remove(path);
  }
});
Deno.test("Coordinated adoption and care drafts print settled benefits and retained phaseout precision", async () => {
  const { phasedAdoptionCareFixture2026 } = await import(
    "../inputs/adoption-care.fixture.ts"
  );
  const r = await buildDraftReturnPdf2026(
    phasedAdoptionCareFixture2026(250030),
  );
  const care = r.attachments.find((a) => a.form === "form2441"),
    adoption = r.attachments.find((a) => a.form === "form8839");
  assert(care && adoption);
  assertEquals(care.formPages.length, 2);
  assertEquals(r.calculation.pending.f1040.line1e_taxable_dep_care, 2069);
  assertEquals(r.calculation.pending.f1040.line11b_agi, 257530);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, r.bytes);
    const t = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(t.code, 0);
    assertEquals(new TextDecoder().decode(t.stderr), "");
    const pages = new TextDecoder().decode(t.stdout).split("\f");
    for (const value of ["250030", "5431", "2069"]) {
      assertStringIncludes(pages[care.formPages[1] - 1], value);
    }
    for (const value of ["272099", "1755", "14569", "-14569"]) {
      assertStringIncludes(pages[adoption.formPages[1] - 1], value);
    }
    const pdf = await PDFDocument.load(r.bytes);
    assert(!pdf.catalog.has(PDFName.of("AcroForm")));
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Mixed-owner taxable adoption benefits print each spouse's care earnings and the joint income", async () => {
  const input = mixedOwnerAdoptionCareFixture2026();
  input.w2s[0].box1_wages = 300000;
  const r = await buildDraftReturnPdf2026(input);
  const care = r.attachments.find((a) => a.form === "form2441"),
    adoption = r.attachments.find((a) => a.form === "form8839");
  assert(care && adoption);
  assertEquals(r.filingReady, false);
  assertEquals(
    r.calculation.pending.f1040.line1f_taxable_adoption_benefits,
    10000,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, r.bytes);
    const t = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(t.code, 0);
    assertEquals(new TextDecoder().decode(t.stderr), "");
    const pages = new TextDecoder().decode(t.stdout).split("\f");
    assertStringIncludes(pages[care.formPages[0] - 1], "304000");
    assertStringIncludes(pages[care.formPages[0] - 1], "26000");
    assertStringIncludes(pages[adoption.formPages[1] - 1], "330000");
    assertStringIncludes(pages[adoption.formPages[1] - 1], "10000");
    const pdf = await PDFDocument.load(r.bytes);
    assert(!pdf.catalog.has(PDFName.of("AcroForm")));
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  } finally {
    await Deno.remove(path);
  }
});
