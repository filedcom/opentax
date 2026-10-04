import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { join } from "@std/path";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { buildMefXml } from "../../mef/builder.ts";
import { buildPending } from "../../mef/pending.ts";
import { normalizeAllPending } from "../../pending.ts";
import { buildPdfBytes, fillFormPdf, type PdfPageOrigin } from "../builder.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { irs1040Pdf } from "./f1040.ts";
import { form8814Pdf } from "./f8814.ts";
import { scheduleDPdf } from "./schedule_d.ts";

Deno.test("Form 8814 gain through Schedule D marks and amounts Form 1040 line 7b", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-form8814-child-gain-with-schedule-d"
  );
  if (!fixture) throw new Error("Missing Form 8814 Schedule D fixture");
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule_d?.print_line13_cap_gain_distrib, 179);
  assertEquals(pending.f1040?.line7_capital_gain, 1_179);
  const nativeXml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(nativeXml, "<IRS1040ScheduleD ");
  assertStringIncludes(nativeXml, "<IRS8814 ");
  assertStringIncludes(
    nativeXml,
    "<CapitalGainDistributionsAmt>179</CapitalGainDistributionsAmt>",
  );
  const normalized = normalizeAllPending(result.pending);
  const projected = irs1040Pdf.projectFields?.(
    normalized.f1040,
    normalized,
  );
  assertEquals(projected?.print_form8814_line7a_included, true);
  assertEquals(projected?.print_form8814_line7b_amount, 179);

  const temp = await Deno.makeTempDir();
  try {
    const marked = await fillFormPdf(
      irs1040Pdf,
      projected!,
      fixture.filer,
      ".pdf-cache",
    );
    const unmarked = await fillFormPdf(
      irs1040Pdf,
      { ...projected, print_form8814_line7a_included: false },
      fixture.filer,
      ".pdf-cache",
    );
    if (!marked || !unmarked) throw new Error("Form 1040 was not rendered");
    const markedPath = join(temp, "marked.pdf");
    const unmarkedPath = join(temp, "unmarked.pdf");
    await Deno.writeFile(markedPath, marked);
    await Deno.writeFile(unmarkedPath, unmarked);
    const printed = await new Deno.Command("pdftotext", {
      args: ["-f", "1", "-l", "1", "-layout", markedPath, "-"],
    }).output();
    if (!printed.success) throw new Error("Form 1040 text extraction failed");
    assertStringIncludes(new TextDecoder().decode(printed.stdout), "179");
    const raster = async (path: string, prefix: string) => {
      const run = await new Deno.Command("pdftoppm", {
        args: [
          "-f",
          "1",
          "-l",
          "1",
          "-r",
          "144",
          "-x",
          "515",
          "-y",
          "1400",
          "-W",
          "40",
          "-H",
          "40",
          "-singlefile",
          "-png",
          path,
          prefix,
        ],
      }).output();
      if (!run.success) throw new Error("Form 1040 raster failed");
      return Deno.readFile(`${prefix}.png`);
    };
    const markedBox = await raster(markedPath, join(temp, "marked-box"));
    const blankBox = await raster(unmarkedPath, join(temp, "blank-box"));
    assertNotEquals(markedBox, blankBox);
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});

Deno.test("two elected children retain two Form 8814 copies and one Schedule D gain total", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-form8814-child-gain-with-schedule-d"
  );
  if (!fixture) throw new Error("Missing Form 8814 Schedule D fixture");
  const [first] = (fixture.inputs as Record<string, unknown>).f8814 as Record<
    string,
    unknown
  >[];
  const second = {
    ...first,
    child_name: "Morgan Example",
    child_ssn: "333-44-5555",
    source_review: {
      ...(first.source_review as Record<string, unknown>),
      child_ssn: "333-44-5555",
      source_document_reference: "reviewed-morgan-interest-gain-packet",
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs, f8814: [first, second] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule_d?.line13_form8814, 358);
  assertEquals(pending.schedule_d?.print_line13_cap_gain_distrib, 358);
  assertEquals(pending.f1040?.line7_capital_gain, 1_358);
  const xml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(
    xml,
    "<CapitalGainDistributionsAmt>358</CapitalGainDistributionsAmt>",
  );
  assertEquals((xml.match(/<IRS8814 /g) ?? []).length, 2);
  const normalized = normalizeAllPending(result.pending);
  const projected = irs1040Pdf.projectFields?.(
    normalized.f1040,
    normalized,
  );
  assertEquals(projected?.print_form8814_line7a_included, true);
  assertEquals(projected?.print_form8814_line7b_amount, 358);
  assertEquals(projected?.line7a_cap_gain_distrib, undefined);
  const childCopies = form8814Pdf.instances?.(
    normalized.form8814,
    fixture.filer,
  ) ?? [];
  assertEquals(childCopies.length, 2);
  assertEquals(
    childCopies.map((copy) => copy.child_ssn),
    ["222-33-4444", "333-44-5555"],
  );
  const scheduleD = scheduleDPdf.projectFields?.(
    normalized.schedule_d,
    normalized,
  );
  assertEquals(scheduleD?.print_line13_cap_gain_distrib, 358);
  assertEquals(scheduleD?.print_form8814_line13_note, "Form 8814 $358");

  const temp = await Deno.makeTempDir();
  try {
    const pageOrigins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      fixture.filer,
      join(temp, "cache"),
      undefined,
      pageOrigins,
    );
    const pageCount = (await PDFDocument.load(pdf)).getPageCount();
    assertEquals(pageOrigins.length, pageCount);
    assertEquals(
      pageOrigins.filter((page) => page.formKey === "form8814")
        .map((page) => page.formCopy),
      [1, 2],
    );
    assertEquals(
      pageOrigins.some((page) => page.formKey === "schedule_d"),
      true,
    );
    const path = join(temp, "two-children.pdf");
    await Deno.writeFile(path, pdf);
    const printed = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(printed.code, 0, new TextDecoder().decode(printed.stderr));
    const pages = new TextDecoder().decode(printed.stdout).split("\f");
    const childPages = pageOrigins.filter((page) =>
      page.formKey === "form8814"
    );
    assertStringIncludes(
      pages[childPages[0].pageNumber - 1],
      "Jamie Example",
    );
    assertStringIncludes(
      pages[childPages[1].pageNumber - 1],
      "Morgan Example",
    );
    const scheduleDPage = pageOrigins.find((page) =>
      page.formKey === "schedule_d"
    );
    if (!scheduleDPage) throw new Error("Missing printed Schedule D page");
    const scheduleDText = pages[scheduleDPage.pageNumber - 1];
    assertStringIncludes(scheduleDText, "Form. 8814");
    assertStringIncludes(scheduleDText, "$358");
    assertEquals(/\b13\s+358\b/.test(scheduleDText), true);
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});
