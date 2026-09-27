import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../nodes/types.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import { buildCorePdfBytes2026 } from "./core.ts";

Deno.test("TY2026 core PDF appends required Schedule 3-A from a calculated credit", async () => {
  const result = f1040_2026_node.compute({ taxYear: 2026, formType: "f1040" }, {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line9_total_income: 20_000,
    deduction_method: "standard",
    line16_income_tax: 500,
    line27a_eic: 1_000,
    schedule2_line20: 100,
    wants_federal_public_benefit: false,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!
    .fields;
  const schedule =
    result.outputs.find((output) => output.nodeType === "schedule3a")!.fields;
  const bytes = await buildCorePdfBytes2026(f1040, schedule);
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 3);
  await assertRejects(
    () => buildCorePdfBytes2026(f1040),
    Error,
    "presence disagrees",
  );
  await assertRejects(
    () =>
      buildCorePdfBytes2026(f1040, {
        ...schedule,
        line6_federal_public_benefit: 601,
      }),
    Error,
    "line 32b",
  );
});

Deno.test("TY2026 core PDF omits Schedule 3-A without a relevant credit", async () => {
  const result = f1040_2026_node.compute({ taxYear: 2026, formType: "f1040" }, {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line9_total_income: 20_000,
    deduction_method: "standard",
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!
    .fields;
  const pdf = await PDFDocument.load(await buildCorePdfBytes2026(f1040));
  assertEquals(pdf.getPageCount(), 2);
});
