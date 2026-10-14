import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { fillFormPdf } from "../../../builder.ts";
import { form8911ScheduleAPdf } from "./f8911_schedule_a.ts";

Deno.test("Schedule A 8911 fills the pinned December 2025 template and rejects cache drift", async () => {
  const cache = await Deno.makeTempDir();
  const template = await Deno.readFile(
    new URL("./fixtures/f8911sa-2025.pdf", import.meta.url),
  );
  const slug = form8911ScheduleAPdf.pdfUrl.replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_");
  const path = `${cache}/${slug}.pdf`;
  const fields = {
    filer_name: "Alex Charger",
    filer_tin: "123456789",
    property_description: "Home EV charger",
    property_address: "1 Main St, Wilmington, DE 19801",
    construction_date: "05/01/2025",
    service_date: "06/01/2025",
    eligible_census_tract: true,
    census_geoid: "10003000100",
    main_home_property: true,
    line8: 1000,
    line9: 0,
    line10: 0,
    line18: 1000,
    line19: 300,
    line21: 300,
  };
  try {
    await Deno.writeFile(path, template);
    const filled = await fillFormPdf(
      form8911ScheduleAPdf,
      fields,
      undefined,
      cache,
    );
    const pdf = await PDFDocument.load(filled!);
    assertEquals(pdf.getPageCount(), 1);
    assertEquals(pdf.getForm().getFields().length, 0);
    await Deno.writeFile(path, new Uint8Array([...template, 10]));
    await assertRejects(
      () => fillFormPdf(form8911ScheduleAPdf, fields, undefined, cache),
      Error,
      "template digest mismatch",
    );
  } finally {
    await Deno.remove(cache, { recursive: true });
  }
});
