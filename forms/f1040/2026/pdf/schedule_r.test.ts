import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  scheduleRGraphFixture2026,
  scheduleRSourceFixture2026,
} from "../inputs/schedule-r.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildScheduleRPdfBytes2026 } from "./schedule_r.ts";
import { FilingStatus } from "../../nodes/types.ts";
async function text(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", file, "-"],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).split("\f");
  } finally {
    await Deno.remove(file);
  }
}
Deno.test("2026 Schedule R prints two source-reconciled pages in the complete credit bundle", async () => {
  const r = await buildDraftReturnPdf2026(scheduleRGraphFixture2026());
  const a = r.attachments.find((a) => a.form === "schedule_r")!;
  assertEquals(a.formPages.length, 2);
  const pages = await text(r.bytes);
  assertStringIncludes(pages[a.formPages[0] - 1], "Synthetic Investor");
  const amounts = pages[a.formPages[1] - 1];
  for (const amount of ["10001", "17001", "4751", "249", "37", "91"]) {
    assertStringIncludes(amounts, amount);
  }
  assertEquals(pages.join("").includes("private-physician-statement"), false);
  assertEquals(pages.join("").includes("employer-mandatory-age"), false);
  assertEquals(r.calculation.pending.f1040.line20_nonrefundable_credits, 37);
});
Deno.test("2026 Schedule R prints a mixed-age small disability base and the qualifying prior-statement name", async () => {
  const s = scheduleRSourceFixture2026(), pension = s.retirement_sources_2026!;
  s.filing_status = pension.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = pension.spouse_ssn = "444556666";
  s.spouse_dob = pension.spouse_dob = "1960-01-01";
  s.spouse_first_name = "Joint";
  s.agi = 10000;
  s.regular_tax = 1000;
  const d = pension.claim.reviews[0].disability_income!;
  if (d.kind !== "employer_disability_pension") throw Error("fixture");
  for (const p of d.payments) {
    p.gross = 100;
    p.taxable = 100;
  }
  pension.claim.copies[0].box1_gross_distribution = 300;
  pension.claim.copies[0].box2a_taxable_amount = 300;
  const destinations = {
    form1040_line11b: 10000,
    form1040_line18: 1000,
    schedule3_line2: 0,
    schedule3_line6d: 795,
  };
  const filer = { name: "Synthetic & Joint Investor", ssn: s.taxpayer_ssn };
  const pages = await text(
    await buildScheduleRPdfBytes2026(s, destinations, filer),
  );
  assertEquals(pages[0].match(/Synthetic/g)?.length, 2);
  assertStringIncludes(pages[1], "5300");
  assertStringIncludes(pages[1], "795");
  await assertRejects(
    () =>
      buildScheduleRPdfBytes2026(
        s,
        { ...destinations, schedule3_line6d: 796 },
        filer,
      ),
    Error,
    "destinations disagree",
  );
  await assertRejects(
    () =>
      buildScheduleRPdfBytes2026(s, destinations, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
});
Deno.test("2026 Schedule R omits an exhausted credit instead of adding a blank attachment", async () => {
  const r = await buildDraftReturnPdf2026(scheduleRGraphFixture2026(6000));
  assertEquals(r.attachments.some((a) => a.form === "schedule_r"), false);
  assertEquals(r.calculation.pending.f1040.line20_nonrefundable_credits, 0);
});
