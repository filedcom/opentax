import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { ableNiitGraph2026 } from "../inputs/able-niit.fixture.ts";
import type { calculateForm8960_2026 } from "../nodes/form8960.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildForm8960PdfBytes2026 } from "./form8960.ts";
async function printed(bytes: Uint8Array, page: number, x: number, y: number) {
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: [
        "-layout",
        "-f",
        String(page),
        "-l",
        String(page),
        "-x",
        String(x),
        "-y",
        String(y),
        "-W",
        "74",
        "-H",
        "12",
        path,
        "-",
      ],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).trim();
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 ABLE and investment draft prints reconciled Form 8960 numerator MAGI and Schedule 2 tax", async () => {
  for (
    const [wages, magi, tax, base] of [[180800, 201000, 38, 1000], [
      300000,
      320200,
      760,
      20000,
    ]]
  ) {
    const b = await buildDraftReturnPdf2026(ableNiitGraph2026(wages));
    const page = b.attachments.find((a) => a.form === "form8960")!.formPages[0];
    const pdf = await PDFDocument.load(b.bytes);
    assertEquals(pdf.catalog.has(PDFName.of("AcroForm")), false);
    for (
      const [x, y, value] of [
        [503, 144, 20000],
        [503, 348, 20000],
        [503, 432, 0],
        [503, 468, 20000],
        [409, 492, magi],
        [409, 504, 200000],
        [409, 516, magi - 200000],
        [503, 528, base],
        [503, 552, tax],
      ]
    ) {
      assertEquals(
        await printed(b.bytes, page, x, y),
        String(value),
        `NIIT at y=${y}`,
      );
    }
    assertEquals(b.calculation.pending.schedule2.line6_niit, tax);
    assertEquals(
      b.attachments.filter((a) => a.form.startsWith("form5329:")).length,
      1,
    );
  }
});
Deno.test("2026 NIIT PDF independently checks the ABLE income destination", async () => {
  const g = ableNiitGraph2026(),
    b = await buildDraftReturnPdf2026(g),
    p = b.calculation.pending;
  const n = p.form8960.calculation_2026 as ReturnType<
    typeof calculateForm8960_2026
  >;
  const destinations = {
    form1040_line2b: 20000,
    form1040_line3b: 0,
    form1040_line7a: 0,
    form1040_line11b: 320200,
    form1040_line12e: Number(p.f1040.line12e_standard_or_itemized),
    schedule1_line18: 0,
    schedule_a_line5d: 0,
    schedule_a_line7: 0,
    schedule2_line6: 760,
    schedule1_able_line8q: 200,
  };
  const filer = { name: "Synthetic ABLE Owner", ssn: g.general.taxpayer_ssn };
  await buildForm8960PdfBytes2026(n.source_input, destinations, filer);
  for (
    const key of [
      "schedule1_able_line8q",
    ] as const
  ) {
    await assertRejects(
      () =>
        buildForm8960PdfBytes2026(n.source_input, {
          ...destinations,
          [key]: destinations[key] + 1,
        }, filer),
      Error,
      "destinations disagree",
    );
  }
  const { schedule1_able_line8q: _missing, ...missing } = destinations;
  await assertRejects(
    () => buildForm8960PdfBytes2026(n.source_input, missing, filer),
    Error,
    "destinations disagree",
  );
});
