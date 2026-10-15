import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  businessEducationFixture2026,
  capitalServicesEducationFixture2026,
} from "../inputs/business-education.fixture.ts";

Deno.test("Business education and dependent deduction results reconcile through the complete static draft bundle", async () => {
  const allowed = businessEducationFixture2026();
  const denied = capitalServicesEducationFixture2026();
  const allocation =
    denied.schedule_c.claim.earned_income_review!.activities[0];
  assert(allocation.kind === "services_and_capital");
  allocation.reasonable_compensation_for_owner_services = 400;
  const dependent = {
    ...allowed,
    f8863: undefined,
    general: {
      ...allowed.general,
      taxpayer_can_be_claimed_as_dependent: true,
      dependents: [],
    },
  };
  for (
    const [input, refund, deduction] of [[allowed, 1000, 16100], [
      denied,
      0,
      16100,
    ], [dependent, 0, 9743]] as const
  ) {
    const r = await buildDraftReturnPdf2026(input);
    assertEquals(r.calculation.pending.f1040.line29_refundable_aotc, refund);
    assertEquals(
      r.calculation.pending.f1040.line12e_standard_or_itemized,
      deduction,
    );
    const form = r.attachments.find((a) => a.form === "form8863");
    assertEquals(!!form, !!input.f8863);
    const pdf = await PDFDocument.load(r.bytes);
    assert(!pdf.catalog.has(PDFName.of("AcroForm")));
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, r.bytes);
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(extracted.code, 0);
      const pages = new TextDecoder().decode(extracted.stdout).split("\f");
      assertStringIncludes(pages[1], String(deduction));
      if (form) {
        assertStringIncludes(
          pages[form.formPages[0] - 1],
          refund ? "1000" : "2500",
        );
        assertStringIncludes(
          pages[form.formPages[1] - 1],
          "Synthetic University",
        );
      }
    } finally {
      await Deno.remove(path);
    }
  }
});
