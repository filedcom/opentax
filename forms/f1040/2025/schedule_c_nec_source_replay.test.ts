import {
  assertEquals,
  assertGreater,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

Deno.test("Schedule C 1099-NEC receipt replays its payer copy in native and PDF export", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-1099nec-trade-business-tips-schedule1a"
  );
  if (!fixture) throw new Error("Missing 1099-NEC Schedule C fixture");
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(xml, "<IRS1040ScheduleC ");
  const pdf = await buildPdfBytes(pending, fixture.filer);
  assertGreater(pdf.byteLength, 0);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    const printed = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(printed, "Example Event Service");
    assertStringIncludes(printed, "18000");
  } finally {
    await Deno.remove(pdfPath);
  }

  const scheduleC = pending.schedule_c as Record<string, unknown>;
  const necRows = scheduleC.f1099nec_receipt_sources as Array<
    Record<string, unknown>
  >;
  const changedReceipt = {
    ...pending,
    schedule_c: {
      ...scheduleC,
      f1099nec_receipt_sources: [{ ...necRows[0], amount: 17_000 }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(changedReceipt), fixture.filer),
    Error,
    "1099-NEC Schedule C source differs from the retained payer copy",
  );
  await assertRejects(
    () => buildPdfBytes(changedReceipt, fixture.filer),
    Error,
    "1099-NEC Schedule C source differs from the retained payer copy",
  );

  const source = pending.f1099nec as {
    f1099necs: Array<Record<string, unknown>>;
  };
  const changedPayer = {
    ...pending,
    f1099nec: {
      f1099necs: source.f1099necs.map((row) => ({
        ...row,
        payer_tin: "99-9999999",
      })),
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(changedPayer), fixture.filer),
    Error,
    "1099-NEC Schedule C source differs from the retained payer copy",
  );
});
