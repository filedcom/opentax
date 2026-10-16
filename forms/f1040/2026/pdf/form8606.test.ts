import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  retirementIraGraph2026,
  retirementIraSource2026,
} from "../inputs/retirement-ira.fixture.ts";
import { buildForm8606PdfBytes2026 } from "./form8606.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { FilingStatus } from "../../nodes/types.ts";

async function inspect(
  bytes: Uint8Array,
  body: (
    read: (page: number, rect?: number[]) => Promise<string>,
  ) => Promise<void>,
) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    await body(async (page, rect) => {
      const args = ["-layout", "-f", String(page), "-l", String(page)];
      if (rect) {
        for (const [i, flag] of ["-x", "-y", "-W", "-H"].entries()) {
          args.push(flag, String(rect[i]));
        }
      }
      const r = await new Deno.Command("pdftotext", {
        args: [...args, path, "-"],
      }).output();
      assertEquals(r.code, 0);
      return new TextDecoder().decode(r.stdout).trim();
    });
  } finally {
    await Deno.remove(path);
  }
}
const filer = { name: "Sam Wheat", ssn: "400001037" };

Deno.test("2026 Form 8606 prints every Part I/II line and owner in the pinned two-page draft", async () => {
  const bytes = await buildForm8606PdfBytes2026(
    retirementIraSource2026(),
    "taxpayer",
    14800,
    filer,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
  await inspect(bytes, async (read) => {
    assertEquals(await read(1, [36, 94, 424, 14]), "Sam Wheat");
    assertEquals(await read(1, [462, 94, 114, 14]), "400001037");
    for (
      const [page, x, y, value] of [
        [1, 505, 360, 2000],
        [1, 505, 372, 2000],
        [1, 505, 384, 4000],
        [1, 505, 456, 1000],
        [1, 505, 468, 3000],
        [1, 505, 504, 24000],
        [1, 505, 552, 6000],
        [1, 505, 576, 10000],
        [1, 411, 588, 40000],
        [1, 411, 636, 750],
        [1, 411, 660, 450],
        [1, 505, 672, 1200],
        [1, 505, 684, 2800],
        [2, 505, 60, 5550],
        [2, 505, 96, 0],
        [2, 505, 144, 5550],
        [2, 505, 216, 10000],
        [2, 505, 240, 750],
        [2, 505, 264, 9250],
      ]
    ) assertEquals(await read(page, [x, y, 71, 12]), String(value));
    assertEquals(await read(1, [433, 612, 12, 12]), "0");
    assertEquals(await read(1, [455, 612, 27, 12]), "075");
    assertEquals(await read(2, [505, 360, 71, 12]), "");
    assertStringIncludes(await read(2), "DRAFT - NOT FOR FILING");
  });
});

Deno.test("2026 Form 8606 contribution-only draft leaves distribution and conversion fields blank", async () => {
  const s = retirementIraSource2026(), o = s.claim.ira_basis!.owners[0];
  s.claim.copies = [];
  s.claim.reviews = [];
  o.distributions = [];
  o.roth_conversion_forms5498 = [];
  const bytes = await buildForm8606PdfBytes2026(s, "taxpayer", 0, filer);
  await inspect(bytes, async (read) => {
    assertEquals(await read(1, [505, 360, 71, 12]), "2000");
    assertEquals(await read(1, [505, 384, 71, 12]), "4000");
    assertEquals(await read(1, [505, 684, 71, 12]), "4000");
    assertEquals(await read(1, [505, 456, 71, 12]), "");
    assertEquals(await read(2, [505, 60, 71, 12]), "");
    assertEquals(await read(2, [505, 216, 71, 12]), "");
  });
});

Deno.test("2026 Form 8606 preserves negative Part II line 18 without printing Part I", async () => {
  const s = retirementIraSource2026(), o = s.claim.ira_basis!.owners[0];
  o.contributions = [];
  o.nondeductible_election = undefined;
  o.accounts.forEach((a) => a.year_end_statement.fair_market_value = 0);
  if (o.prior_basis.kind !== "filed_form8606") throw Error("fixture");
  o.prior_basis.line14 = 18000;
  s.claim.copies[0].box4_federal_withheld = 0;
  o.distributions[0].cash_paid_to_owner = 0;
  o.distributions[0].conversion!.receipt.amount = 16000;
  o.roth_conversion_forms5498[0].box3_conversion_amount = 16000;
  await inspect(
    await buildForm8606PdfBytes2026(s, "taxpayer", 0, filer),
    async (read) => {
      assertEquals(await read(1, [505, 360, 71, 12]), "");
      assertEquals(await read(1, [505, 684, 71, 12]), "");
      assertEquals(await read(2, [505, 216, 71, 12]), "16000");
      assertEquals(await read(2, [505, 240, 71, 12]), "18000");
      assertEquals(await read(2, [505, 264, 71, 12]), "-2000");
    },
  );
  await assertRejects(
    () => buildForm8606PdfBytes2026(s, "taxpayer", 1, filer),
    Error,
    "line 4b",
  );
  await assertRejects(
    () =>
      buildForm8606PdfBytes2026(s, "taxpayer", 0, {
        ...filer,
        ssn: "555667777",
      }),
    Error,
    "identity",
  );
});

Deno.test("2026 joint IRA draft bundle retains separate owner Forms 8606 and reconciles their combined taxable income", async () => {
  const g = retirementIraGraph2026(true);
  Object.assign(g.general, {
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Alex",
    spouse_last_name: "Wheat",
    spouse_ssn: "555667777",
    spouse_dob: "1980-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  });
  const claim = g.f1099r.claim;
  claim.copies[0].box4_federal_withheld = 0;
  claim.ira_basis!.owners[0].distributions[0].cash_paid_to_owner = 6000;
  const other = JSON.parse(
    JSON.stringify(claim)
      .replaceAll("400001037", "555667777")
      .replaceAll(
        '"source_document_reference":"',
        '"source_document_reference":"spouse-',
      ),
  ) as typeof claim;
  other.copies[0].recipient = "spouse";
  const o = other.ira_basis!.owners[0];
  o.distributions[0].disposition_record_reference = "spouse-disposition";
  o.contributions = [];
  o.nondeductible_election = undefined;
  if (o.prior_basis.kind !== "filed_form8606") throw Error("fixture");
  o.prior_basis.line14 = 6000;
  claim.copies.push(other.copies[0]);
  claim.reviews.push(other.reviews[0]);
  claim.ira_basis!.owners.push(o);
  const b = await buildDraftReturnPdf2026(g);
  assertEquals(b.calculation.pending.f1040.line4a_ira_gross, 32000);
  assertEquals(b.calculation.pending.f1040.line4b_ira_taxable, 28400);
  assertEquals(b.calculation.pending.schedule2.line5_form5329_early_tax, 1065);
  const forms = b.attachments.filter((p) => p.form.startsWith("form8606:"));
  assertEquals(forms.map((p) => p.form), [
    "form8606:taxpayer",
    "form8606:spouse",
  ]);
  assertEquals(forms.map((p) => p.formPages.length), [2, 2]);
  await inspect(b.bytes, async (read) => {
    const first = forms[0].formPages, second = forms[1].formPages;
    assertEquals(await read(first[0], [36, 94, 424, 14]), "Sam Wheat");
    assertEquals(await read(second[0], [36, 94, 424, 14]), "Alex Wheat");
    assertEquals(await read(second[0], [462, 94, 114, 14]), "555667777");
    assertEquals(await read(first[1], [505, 264, 71, 12]), "9250");
    assertEquals(await read(second[1], [505, 264, 71, 12]), "8500");
    assertEquals(await read(second[0], [505, 684, 71, 12]), "3600");
  });
});
