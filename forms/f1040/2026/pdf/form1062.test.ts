import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { form1062PdfFixture2026 } from "./form1062.fixture.ts";
import { form1062TaxFixture2026 } from "../inputs/form1062-tax.fixture.ts";
import { calculateForm1062Tax2026 } from "../inputs/form1062-tax.ts";
import { buildForm1062Draft2026 } from "./form1062.ts";
import { landGraphFixture2026 } from "../inputs/land-graph.fixture.ts";
import { syntheticIso2026 } from "../inputs/iso.fixture.ts";
import { energyClaimFixture2026 } from "../inputs/energy.fixture.ts";
const filer = { name: "Synthetic Land Seller", ssn: "123456789" };

async function fixture(graph?: Record<string, unknown>) {
  const { input } = form1062TaxFixture2026(graph),
    pdf = await form1062PdfFixture2026();
  input.election.sales[0].covenant.sha256 =
    pdf.election.sales[0].covenant.sha256;
  const r = calculateForm1062Tax2026(input);
  return {
    input,
    documents: pdf.documents,
    destinations: {
      schedule3_line13e: r.lines.line14,
      form1040_line24b: r.lines.line15,
    },
  };
}
async function text(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.getPageCount(), 1);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(doc.getPage(0).node.has(PDFName.of("Annots")), false);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout);
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 Form 1062 draft prints recomputed lines and binds Schedule A and original covenants", async () => {
  const f = await fixture(), before = f.documents[0].bytes.slice();
  const r = await buildForm1062Draft2026(
    f.input,
    f.documents,
    f.destinations,
    filer,
  );
  const t = await text(r.bytes);
  for (
    const value of [
      "Synthetic Land Seller",
      "123456789",
      "5871",
      "67900",
      "45000",
      "22900",
      "2503",
      "3368",
      "842",
      "INCOMPLETE 2026 IMPLEMENTATION",
    ]
  ) assertStringIncludes(t, value);
  assertEquals(t.includes("Note: The draft you are looking for begins"), false);
  assertEquals([
    r.attachment_sequence,
    r.schedule_a_attachment_sequence,
    r.schedules.length,
  ], [106, "106A", 1]);
  assertEquals(r.covenants[0].bytes, before);
  assertEquals(
    r.schedules[0].sale_reference,
    f.input.election.sales[0].sale_reference,
  );
  const schedule = await text(r.schedules[0].bytes);
  assertStringIncludes(schedule, "45000");
  assertEquals(r.filing_ready, false);
});
Deno.test("2026 Form 1062 draft preserves negative net tax and the printed hypothetical credit cap", async () => {
  const iso = syntheticIso2026();
  iso.f3921s[0].employee_tin = "123456789";
  const f = await fixture({
    ...landGraphFixture2026(45000, [], 40000),
    f3921: iso,
    f5695: energyClaimFixture2026(100000),
  });
  const r = await buildForm1062Draft2026(
    f.input,
    f.documents,
    f.destinations,
    filer,
  );
  const t = await text(r.bytes);
  for (const value of ["(10911)", "16782", "12714", "2503"]) {
    assertStringIncludes(t, value);
  }
  assertEquals(r.calculation.lines.line14, 0);
});
Deno.test("2026 Form 1062 draft rejects mismatched settlement, identity and missing covenant bytes", async () => {
  const f = await fixture();
  for (
    const destinations of [{
      ...f.destinations,
      schedule3_line13e: f.destinations.schedule3_line13e + 1,
    }, {
      ...f.destinations,
      form1040_line24b: f.destinations.form1040_line24b + 1,
    }]
  ) {
    await assertRejects(
      () => buildForm1062Draft2026(f.input, f.documents, destinations, filer),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () => buildForm1062Draft2026(f.input, [], f.destinations, filer),
    Error,
    "exact claimed document set",
  );
  await assertRejects(
    () =>
      buildForm1062Draft2026(f.input, f.documents, f.destinations, {
        ...filer,
        ssn: "987654321",
      }),
    Error,
    "matching filer identity",
  );
});
