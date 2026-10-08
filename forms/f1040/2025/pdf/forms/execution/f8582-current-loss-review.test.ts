import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { passivePropertyInputs } from "../../../domains/credits/earned-income/eic_passive_property.fixture.ts";
import { normalizeAllPending } from "../../../domains/execution/pending.ts";
import { form8582Pdf, projectCurrentPropertyLoss8582Review } from "./f8582.ts";
import { buildCurrentPropertyLoss8582ReviewPdf } from "./f8582-current-loss-review.ts";

Deno.test("current property loss review prints source-bound Parts V VII VIII IX on the three actual IRS pages", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  for (
    const c of [
      {
        id: "mixed-allowed",
        farmIncome: true,
        nonpassive: false,
        loss: 4000,
        income: 2000,
        allowed: 2000,
        unallowed: 2000,
      },
      {
        id: "all-suspended",
        farmIncome: false,
        nonpassive: false,
        loss: 9000,
        income: 0,
        allowed: 0,
        unallowed: 9000,
      },
      {
        id: "recharacterized-land",
        farmIncome: false,
        nonpassive: true,
        loss: 5000,
        income: 0,
        allowed: 0,
        unallowed: 5000,
      },
    ]
  ) {
    const inputs = passivePropertyInputs(-3000);
    const property = inputs.schedule_e[0];
    property.passive_property_sales[0].current_loss_source_reference =
      property.current_property_source.source_reference;
    if (c.farmIncome) {
      inputs.f4835[0].livestock_crop_income = 9000;
      inputs.f4835[0].current_qbi_source.current_receipts[0].amount = 9000;
    }
    if (c.nonpassive) {
      property.rent_income = 8000;
      property.current_property_source.rent_payments[0].amount = 8000;
    }
    const graph = f1040_2025.executeReturn(inputs);
    assertEquals(graph.diagnostics, []);
    const pending = normalizeAllPending(graph.pending);
    const before = structuredClone(pending);
    const review = await buildCurrentPropertyLoss8582ReviewPdf(
      pending,
      ".pdf-cache",
    );
    assertEquals(review.filingReady, false);
    assertEquals(review.issuerVerified, false);
    const f = review.fields;
    assertEquals(Number(f.line2a ?? 0), c.income);
    assertEquals(Number(f.line2b), c.loss);
    assertEquals(Number(f.line11), c.allowed);
    assertEquals(Number(f.part7_total_unallowed), c.unallowed);
    if (!c.nonpassive) {
      assertEquals(Number(f.part9_1_loss), 1000);
      assertEquals(Number(f.part9_2_loss), 3000);
      assertEquals(Number(f.part9_1_ratio), 0.25);
      assertEquals(Number(f.part9_2_ratio), 0.75);
      assertEquals(Number(f.part9_1_allowed), c.farmIncome ? 500 : 0);
      assertEquals(Number(f.part9_2_allowed), c.farmIncome ? 1500 : 0);
      assertEquals(Number(f.part9_total_unallowed), c.farmIncome ? 2000 : 4000);
    }
    if (!c.farmIncome) {
      assertEquals(Number(f.part8_total_loss), 5000);
      assertEquals(Number(f.part8_total_unallowed), 5000);
      assertEquals(Number(f.part8_total_allowed), 0);
    }
    const filed = form8582Pdf.projectFields!(pending.form8582, pending);
    for (const key of Object.keys(f)) assertEquals(filed[key], f[key]);
    const changed = structuredClone(pending);
    changed.eitc.investment_income_floor = 11949;
    assertThrows(() => projectCurrentPropertyLoss8582Review(changed));
    assertEquals(pending, before);
    assertEquals((await PDFDocument.load(review.bytes)).getPageCount(), 3);
    const temp = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(temp, review.bytes);
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-layout", temp, "-"],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(extracted.code, 0);
      const text = new TextDecoder().decode(extracted.stdout);
      assertStringIncludes(text, "Alex Example");
      assertStringIncludes(text, "111223333");
      assertStringIncludes(text, "Current farm");
      if (!c.nonpassive) assertStringIncludes(text, "Form 4797, Part II");
      if (output) {
        await Deno.writeFile(`${output}/${c.id}.pdf`, review.bytes, {
          createNew: true,
          mode: 0o600,
        });
        await Deno.writeTextFile(`${output}/${c.id}.txt`, text, {
          createNew: true,
          mode: 0o600,
        });
        await Deno.writeTextFile(
          `${output}/${c.id}.json`,
          JSON.stringify(
            {
              inputs,
              pending,
              fields: f,
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
