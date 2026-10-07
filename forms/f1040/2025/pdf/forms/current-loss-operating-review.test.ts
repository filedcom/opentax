import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../index.ts";
import { normalizeAllPending } from "../../pending.ts";
import { passivePropertyInputs } from "../../eic_passive_property.fixture.ts";
import { buildCurrentLossOperatingReviewPdfs } from "./current-loss-operating-review.ts";
import { form4835Pdf } from "./f4835.ts";

async function textOf(bytes: Uint8Array) {
  const temp = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(temp, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", temp, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout);
  } finally {
    await Deno.remove(temp);
  }
}

Deno.test("current loss operating review PDFs retain original expenses and only allowed deductions across Schedule E and Form 4835", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  for (
    const c of [
      {
        id: "mixed-allowed",
        farm: true,
        rent: 2000,
        loss: 500,
        propertyNet: -500,
        farmNet: 2000,
        line5: 1500,
        npa: 0,
      },
      {
        id: "all-suspended",
        farm: false,
        rent: 2000,
        loss: 0,
        propertyNet: 0,
        farmNet: 0,
        line5: 0,
        npa: 0,
      },
      {
        id: "recharacterized-land",
        farm: false,
        rent: 8000,
        loss: 0,
        propertyNet: 5000,
        farmNet: 0,
        line5: 5000,
        npa: 5000,
      },
      {
        id: "income-with-ordinary-loss",
        farm: false,
        rent: 4000,
        loss: 0,
        propertyNet: 1000,
        farmNet: 0,
        line5: 1000,
        npa: 0,
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
    const review = await buildCurrentLossOperatingReviewPdfs(
      pending,
      ".pdf-cache",
    );
    assertEquals(review.filingReady, false);
    assertEquals(review.issuerVerified, false);
    const fields = review.scheduleE.fields[0];
    assertEquals(fields.property_0_line3, c.rent);
    assertEquals(fields.property_0_expense_taxes, 3000);
    assertEquals(fields.property_0_line20, 3000);
    assertEquals(fields.property_0_line21, c.rent - 3000);
    assertEquals(fields.property_0_line22 ?? 0, c.loss);
    assertEquals(fields.line26, c.propertyNet);
    assertEquals(fields.farm_line40, c.farmNet);
    assertEquals(fields.trust_line41, c.line5);
    assertEquals(fields.nonpassive_activity_amount, c.npa);
    assertEquals(review.farms.length, 1);
    assertEquals(review.farms[0].fields.line7_gross, c.farm ? 9000 : 2000);
    assertEquals(review.farms[0].fields.line31_expenses, 7000);
    assertEquals(
      review.farms[0].fields.line32_income,
      c.farm ? 2000 : undefined,
    );
    assertEquals(
      review.farms[0].fields.line34c_allowed_loss,
      c.farm ? undefined : 0,
    );
    assertEquals(
      (await PDFDocument.load(review.scheduleE.bytes)).getPageCount(),
      2,
    );
    assertEquals(
      (await PDFDocument.load(review.farms[0].bytes)).getPageCount(),
      1,
    );
    const scheduleText = await textOf(review.scheduleE.bytes);
    const farmText = await textOf(review.farms[0].bytes);
    assertStringIncludes(scheduleText, "Alex Example");
    assertStringIncludes(scheduleText, "111223333");
    assertStringIncludes(scheduleText, "3000");
    assertStringIncludes(farmText, "Alex Example");
    assertStringIncludes(farmText, "7000");
    if (c.npa) assertStringIncludes(scheduleText, "NPA 5000");
    const farmProjection = form4835Pdf.projectFields!(pending.f4835, pending);
    assertEquals(
      (farmProjection.activities as Record<string, unknown>[])[0]
        .line34c_allowed_loss ?? 0,
      0,
    );
    assertEquals(pending, before);
    if (output) {
      await Deno.writeFile(
        `${output}/${c.id}-schedule-e.pdf`,
        review.scheduleE.bytes,
        { createNew: true, mode: 0o600 },
      );
      await Deno.writeFile(
        `${output}/${c.id}-4835.pdf`,
        review.farms[0].bytes,
        { createNew: true, mode: 0o600 },
      );
      await Deno.writeTextFile(
        `${output}/${c.id}-operating.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            scheduleFields: review.scheduleE.fields,
            farmFields: review.farms.map((r) => r.fields),
            filingReady: false,
            issuerVerified: false,
          },
          null,
          2,
        ),
        { createNew: true, mode: 0o600 },
      );
      await Deno.writeTextFile(
        `${output}/${c.id}-schedule-e.txt`,
        scheduleText,
        { createNew: true, mode: 0o600 },
      );
      await Deno.writeTextFile(`${output}/${c.id}-4835.txt`, farmText, {
        createNew: true,
        mode: 0o600,
      });
    }
  }
});
