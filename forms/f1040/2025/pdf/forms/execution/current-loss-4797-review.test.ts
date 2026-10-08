import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { passivePropertyInputs } from "../../../domains/credits/earned-income/eic_passive_property.fixture.ts";
import { normalizeAllPending } from "../../../domains/execution/pending.ts";
import { form4797Pdf } from "../business/f4797.ts";
import { buildCurrentLoss4797ReviewPdf } from "./current-loss-4797-review.ts";

Deno.test("current ordinary loss Form 4797 review prints allowed amounts and omits fully suspended deductions", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  for (
    const c of [
      { id: "mixed-allowed", farm: true, rent: 2000, amount: -1500, pal: true },
      { id: "all-suspended", farm: false, rent: 2000, amount: 0, pal: false },
      {
        id: "recharacterized-land",
        farm: false,
        rent: 8000,
        amount: -3000,
        pal: false,
      },
      {
        id: "income-with-ordinary-loss",
        farm: false,
        rent: 4000,
        amount: -1000,
        pal: true,
      },
    ]
  ) {
    const inputs = passivePropertyInputs(-3000);
    const property = inputs.schedule_e[0];
    property.passive_property_sales[0].current_loss_source_reference =
      property.current_property_source.source_reference;
    property.rent_income = c.rent;
    property.current_property_source.rent_payments[0].amount = c.rent;
    if (c.farm) {
      inputs.f4835[0].livestock_crop_income = 9000;
      inputs.f4835[0].current_qbi_source.current_receipts[0].amount = 9000;
    }
    const graph = f1040_2025.executeReturn(inputs);
    assertEquals(graph.diagnostics, []);
    const pending = normalizeAllPending(graph.pending);
    const before = structuredClone(pending);
    const review = await buildCurrentLoss4797ReviewPdf(pending, ".pdf-cache");
    assertEquals(review.filingReady, false);
    assertEquals(review.issuerVerified, false);
    assertEquals(review.line4, c.amount);
    assertEquals(
      form4797Pdf.projectFields!(pending.form4797, pending).ordinary_gain ?? 0,
      c.amount,
    );
    assertEquals(pending, before);
    if (c.amount === 0) {
      assertEquals(review.bytes, undefined);
      continue;
    }
    assertEquals(review.fields.pdf_sale_gain, c.amount);
    assertEquals(review.fields.pdf_sale_price, 3000);
    assertEquals(review.fields.pdf_sale_basis, 6000);
    assertEquals(
      String(review.fields.pdf_sale_description).startsWith("PAL "),
      c.pal,
    );
    assertEquals(review.fields.pdf_line17, c.amount);
    assertEquals(review.fields.ordinary_gain, c.amount);
    assertEquals((await PDFDocument.load(review.bytes!)).getPageCount(), 1);
    const temp = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(temp, review.bytes!);
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-layout", temp, "-"],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(extracted.code, 0);
      const text = new TextDecoder().decode(extracted.stdout);
      assertStringIncludes(text, "EXAMPLE ALEX");
      assertStringIncludes(text, "111223333");
      assertStringIncludes(text, String(c.amount));
      assertStringIncludes(text, "6000");
      if (output) {
        await Deno.writeFile(`${output}/${c.id}-4797.pdf`, review.bytes!, {
          createNew: true,
          mode: 0o600,
        });
        await Deno.writeTextFile(`${output}/${c.id}-4797.txt`, text, {
          createNew: true,
          mode: 0o600,
        });
        await Deno.writeTextFile(
          `${output}/${c.id}-4797.json`,
          JSON.stringify(
            {
              inputs,
              pending,
              fields: review.fields,
              saleRows: review.saleRows,
              filingReady: false,
              issuerVerified: false,
            },
            null,
            2,
          ),
          { createNew: true, mode: 0o600 },
        );
      }
    } finally {
      await Deno.remove(temp);
    }
  }
});
