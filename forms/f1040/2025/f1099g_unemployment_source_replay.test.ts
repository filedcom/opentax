import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { inputSchema as form1099gInputSchema } from "../nodes/inputs/f1099g/index.ts";
import { registry } from "./registry.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  digital_assets: false,
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

Deno.test("two 1099-G unemployment copies and repayments reach native and PDF return", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    f1099g: [{
      payer_name: "Texas Workforce Agency",
      payer_tin: "123456789",
      recipient_tin: "111223333",
      source_document_reference: "2025 Texas unemployment copy",
      box_1_unemployment: 5_000,
      box_1_repaid: 600,
    }, {
      payer_name: "Oklahoma Workforce Agency",
      payer_tin: "987654321",
      recipient_tin: "111223333",
      source_document_reference: "2025 Oklahoma unemployment copy",
      box_1_unemployment: 2_000,
      box_1_repaid: 100,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  assertEquals(pending.schedule1?.line7_unemployment, 6_300);
  assertEquals(pending.f1040?.line8_additional_income, 6_300);
  const xml = buildMefXml(pending, filer);
  assertStringIncludes(xml, "<UnemploymentCompAmt>6300</UnemploymentCompAmt>");
  const xsdPath = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsdPath);
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(xmlPath, xml);
      const check = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsdPath, xmlPath],
      }).output();
      assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
    } finally {
      await Deno.remove(xmlPath);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  const pdf = await buildPdfBytes(pending, filer);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    const printed = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(printed, "6300");
    assertStringIncludes(printed, "700");
  } finally {
    await Deno.remove(pdfPath);
  }

  const changedSchedule = {
    ...pending,
    schedule1: { ...pending.schedule1, line7_unemployment: 6_400 },
  };
  assertThrows(
    () => buildMefXml(changedSchedule, filer),
    Error,
    "1099-G unemployment must reconcile",
  );
  await assertRejects(
    () => buildPdfBytes(changedSchedule, filer),
    Error,
    "1099-G unemployment must reconcile",
  );
  const changedReturn = {
    ...pending,
    f1040: { ...pending.f1040, line8_additional_income: 6_400 },
  };
  assertThrows(
    () => buildMefXml(changedReturn, filer),
    Error,
    "1099-G unemployment must reconcile",
  );
  await assertRejects(
    () => buildPdfBytes(changedReturn, filer),
    Error,
    "1099-G unemployment must reconcile",
  );
  const source = form1099gInputSchema.parse(result.pending.f1099g);
  const changedCopy = {
    ...pending,
    f1099g: {
      f1099gs: source.f1099gs.map((row, index) =>
        index === 1 ? { ...row, box_1_unemployment: 2_100 } : row
      ),
    },
  };
  assertThrows(
    () => buildMefXml(changedCopy, filer),
    Error,
    "1099-G unemployment must reconcile",
  );
  await assertRejects(
    () => buildPdfBytes(changedCopy, filer),
    Error,
    "1099-G unemployment must reconcile",
  );
});
