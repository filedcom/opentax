import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { join } from "@std/path";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { buildMefXml } from "../../mef/builder.ts";
import { buildPending } from "../../mef/pending.ts";
import { normalizeAllPending } from "../../pending.ts";
import { fillFormPdf } from "../builder.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { irs1040Pdf } from "./f1040.ts";

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
