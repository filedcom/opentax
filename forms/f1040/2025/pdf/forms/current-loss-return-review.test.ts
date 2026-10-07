import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../index.ts";
import { normalizeAllPending } from "../../pending.ts";
import { passivePropertyInputs } from "../../eic_passive_property.fixture.ts";
import { buildCurrentLossReturnReviewPdfs } from "./current-loss-return-review.ts";
import { irs1040Pdf } from "./f1040.ts";
import { form8582Pdf } from "./f8582.ts";

function source(farmIncome: boolean, rent: number, above = false) {
  const inputs = passivePropertyInputs(-3000);
  const p = inputs.schedule_e[0];
  p.passive_property_sales[0].current_loss_source_reference =
    p.current_property_source.source_reference;
  p.rent_income = rent;
  p.current_property_source.rent_payments[0].amount = rent;
  if (farmIncome) {
    inputs.f4835[0].livestock_crop_income = 9000;
    inputs.f4835[0].current_qbi_source.current_receipts[0].amount = 9000;
  }
  if (above) inputs.f1099int[0].box8 = 11951;
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  return { inputs, pending: normalizeAllPending(result.pending) };
}

async function textOf(bytes: Uint8Array) {
  const temp = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(temp, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", temp, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0);
    return new TextDecoder().decode(result.stdout);
  } finally {
    await Deno.remove(temp);
  }
}

Deno.test("current loss return review prints finalized Schedule 1 and Form 1040 including both EIC limit sides", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  for (
    const c of [
      {
        id: "mixed-allowed",
        farm: true,
        rent: 2000,
        above: false,
        line4: -1500,
        line5: 1500,
        agi: 5000,
        eic: 384,
      },
      {
        id: "above-eic-limit",
        farm: true,
        rent: 2000,
        above: true,
        line4: -1500,
        line5: 1500,
        agi: 5000,
        eic: 0,
      },
      {
        id: "all-suspended",
        farm: false,
        rent: 2000,
        above: false,
        line4: 0,
        line5: 0,
        agi: 5000,
        eic: 384,
      },
      {
        id: "recharacterized-land",
        farm: false,
        rent: 8000,
        above: false,
        line4: -3000,
        line5: 5000,
        agi: 7000,
        eic: 384,
      },
      {
        id: "income-with-ordinary-loss",
        farm: false,
        rent: 4000,
        above: false,
        line4: -1000,
        line5: 1000,
        agi: 5000,
        eic: 384,
      },
    ]
  ) {
    const facts = source(c.farm, c.rent, c.above);
    const before = structuredClone(facts.pending);
    const review = await buildCurrentLossReturnReviewPdfs(
      facts.pending,
      ".pdf-cache",
    );
    assertEquals(review.filingReady, false);
    assertEquals(review.issuerVerified, false);
    assertEquals(review.schedule1.fields.line4_other_gains ?? 0, c.line4);
    assertEquals(review.schedule1.fields.line5_schedule_e ?? 0, c.line5);
    assertEquals(
      review.schedule1.fields.print_line4_form4797 ?? false,
      c.line4 !== 0,
    );
    assertEquals(
      review.f1040.fields.line8_additional_income ?? 0,
      c.line4 + c.line5,
    );
    assertEquals(review.f1040.fields.line11_agi, c.agi);
    assertEquals(review.f1040.fields.line27_eitc ?? 0, c.eic);
    assertEquals(review.f1040.fields.line35a_refund ?? 0, c.eic);
    assertEquals(
      facts.pending.eitc.investment_income_floor,
      c.above ? 11951 : 11950,
    );
    const filedReturn = irs1040Pdf.projectFields!(
      facts.pending.f1040,
      facts.pending,
    );
    assertEquals(filedReturn.line27_eitc ?? 0, c.eic);
    form8582Pdf.projectFields!(facts.pending.form8582, facts.pending);
    for (
      const [key, pdf] of [["f1040", review.f1040], [
        "schedule1",
        review.schedule1,
      ]] as const
    ) {
      if (!pdf.bytes) {
        assertEquals(key, "schedule1");
        assertEquals(c.id, "all-suspended");
        continue;
      }
      assertEquals((await PDFDocument.load(pdf.bytes)).getPageCount(), 2);
      const text = await textOf(pdf.bytes);
      assertStringIncludes(text.replace(/\s/g, ""), "111223333");
      if (key === "f1040") {
        assertStringIncludes(text, String(c.agi));
        assertStringIncludes(text, c.above ? "11951" : "11950");
        if (c.eic) assertStringIncludes(text, "384");
        else assertEquals(/\b384\b/.test(text), false);
      } else if (c.line4) {
        assertStringIncludes(text, String(c.line4));
        assertStringIncludes(text, String(c.line5));
      }
      if (output) {
        await Deno.writeFile(`${output}/${c.id}-${key}.pdf`, pdf.bytes, {
          createNew: true,
          mode: 0o600,
        });
        await Deno.writeTextFile(`${output}/${c.id}-${key}.txt`, text, {
          createNew: true,
          mode: 0o600,
        });
      }
    }
    assertEquals(facts.pending, before);
    if (output) {
      await Deno.writeTextFile(
        `${output}/${c.id}-return-review.json`,
        JSON.stringify(
          {
            ...facts,
            returnFields: review.f1040.fields,
            scheduleFields: review.schedule1.fields,
            schedule1Present: !!review.schedule1.bytes,
            filingReady: false,
            issuerVerified: false,
          },
          null,
          2,
        ),
        { createNew: true, mode: 0o600 },
      );
    }
  }
});

Deno.test("current loss return review rejects detached source, changed Schedule 1, AGI, EIC and refund", async () => {
  const original = source(true, 2000).pending;
  for (
    const [index, mutate] of [
      (p: any) =>
        p.form4797.passive_property_sales[0].current_loss_source_reference =
          "Detached closing",
      (p: any) => p.schedule1.line4_other_gains = -3000,
      (p: any) => p.f1040.line11_agi = 5001,
      (p: any) => p.f1040.line27_eitc = 383,
      (p: any) => p.f1040.line35a_refund = 383,
      (p: any) => {
        p.f1040.line27_eitc = 383;
        p.f1040.line32_refundable_credits_total = 383;
        p.f1040.line33_total_payments = 383;
        p.f1040.line34_overpayment = 383;
        p.f1040.line35a_refund = 383;
      },
    ]
      .entries()
  ) {
    const changed = structuredClone(original);
    mutate(changed);
    await assertRejects(
      () => buildCurrentLossReturnReviewPdfs(changed, ".pdf-cache"),
      Error,
      index === 5
        ? "Current loss return review differs from finalized EIC"
        : undefined,
    );
  }
  assertEquals(source(true, 2000).pending, original);
});
