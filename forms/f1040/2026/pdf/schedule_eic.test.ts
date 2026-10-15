import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildScheduleEicPdfBytes2026 } from "./schedule_eic.ts";
import { eicGraphFixture2026 } from "../nodes/eitc.fixture.ts";
import type { calculateEic2026 } from "../nodes/eitc.ts";
async function extract(bytes: Uint8Array) {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/return.pdf`, bytes);
    const out = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/return.pdf`, "-"],
    }).output();
    assertEquals(out.code, 0);
    return new TextDecoder().decode(out.stdout).split("\f");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}
Deno.test("2026 EIC bundle reconciles child credit and prints only the filing Schedule EIC page", async () => {
  const r = await buildDraftReturnPdf2026(eicGraphFixture2026(20000, 3));
  assertEquals(r.attachments.map((a) => a.form), [
    "f1040",
    "schedule3a",
    "schedule_eic",
    "schedule8812",
  ]);
  assertEquals(
    r.attachments.find((a) => a.form === "schedule_eic")!.formPages,
    [4],
  );
  const pdf = await PDFDocument.load(r.bytes);
  assertEquals(pdf.getPageCount(), 6);
  assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const text = await extract(r.bytes);
  for (
    const name of [
      "Child1",
      "Child2",
      "Child3",
      "222334444",
      "222334445",
      "222334446",
    ]
  ) assertStringIncludes(text[3], name);
  assertStringIncludes(text[5], "8231");
  assertStringIncludes(text[5], "2625");
  const calculation = r.calculation.pending.eitc.calculation_2026 as ReturnType<
    typeof calculateEic2026
  >;
  await assertRejects(
    () =>
      buildScheduleEicPdfBytes2026(calculation.source_input, {
        form1040_line27a: 8230,
        form1040_line11b: 20000,
        form1040_line1i: 0,
      }, { name: "Synthetic Investor", ssn: "123456789" }),
    Error,
    "disagree",
  );
});
Deno.test("2026 childless EIC does not attach Schedule EIC", async () => {
  const r = await buildDraftReturnPdf2026(eicGraphFixture2026(10000, 0));
  assertEquals(r.attachments.map((a) => a.form), ["f1040", "schedule3a"]);
  assertEquals(r.calculation.pending.f1040.line27a_eic, 664);
});

Deno.test("2026 Schedule EIC renders student, disabled and newborn child paths", async () => {
  const base = eicGraphFixture2026(20000, 3);
  const children = base.general.dependents;
  const input = {
    ...base,
    general: {
      ...base.general,
      dependents: [
        {
          ...children[0],
          dob: "2004-06-01",
          full_time_student: true,
          student_full_time_months: 5,
        },
        { ...children[1], dob: "1970-06-01", disabled: true },
        {
          ...children[2],
          dob: "2026-12-01",
          months_in_home: 1,
          months_lived_with_you_in_us: 1,
          residency_2026_review: {
            tax_year: 2026,
            source_reference: "synthetic-newborn-residence",
            all_home_periods_reviewed: true,
            birth_record_reference: "synthetic-birth-record",
            periods: [{
              from: "2026-12-01",
              through: "2026-12-31",
              in_us: true,
              record_reference: "synthetic-home",
            }],
          },
        },
      ],
    },
  };
  const r = await buildDraftReturnPdf2026(input);
  assertEquals(r.calculation.pending.f1040.line27a_eic, 8231);
  const c = r.calculation.pending.eitc.calculation_2026 as ReturnType<
    typeof calculateEic2026
  >;
  assertEquals(c.qualifying_child_details.map((d) => d.eic_printed_months), [
    12,
    12,
    12,
  ]);
  const pages = await extract(r.bytes);
  const text = pages[
    r.attachments.find((a) => a.form === "schedule_eic")!.formPages[0] - 1
  ];
  for (const name of ["Child1", "Child2", "Child3"]) {
    assertStringIncludes(text, name);
  }
});
