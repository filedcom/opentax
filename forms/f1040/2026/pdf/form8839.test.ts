import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { XMLParser } from "fast-xml-parser";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { adoptionGraphFixture2026 } from "../inputs/adoption-graph.fixture.ts";
import { adoptionAccountReview2026 } from "../inputs/adoption.fixture.ts";
import { adoptionOverflowFixture2026 } from "./form8839.fixture.ts";
import type { calculateChildCredit2026 } from "../nodes/f8812.ts";
import type { calculateAdoptionExclusion2026 } from "../inputs/adoption-settlement.ts";
import {
  type AdoptionPdfDestinations2026,
  adoptionPrintPlan2026,
  buildForm8839PdfBytes2026,
} from "./form8839.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
function operands(raw: Record<string, unknown>) {
  const r = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    raw,
    { taxYear: 2026, formType: "f1040" },
  );
  assertEquals(r.diagnostics, []);
  const p = r.pending,
    f = p.f1040,
    c = p.f8812.calculation_2026 as ReturnType<typeof calculateChildCredit2026>,
    e = p.agi_aggregator.adoption_exclusion_2026 as ReturnType<
      typeof calculateAdoptionExclusion2026
    >;
  const destinations: AdoptionPdfDestinations2026 = {
    form1040_line1f: Number(f.line1f_taxable_adoption_benefits),
    form1040_line11b: Number(f.line11b_agi),
    form1040_line18: Number(f.line18_total_tax_before_credits),
    form1040_line19: Number(f.line19_child_tax_credit),
    form1040_line28: Number(f.line28_actc),
    form1040_line30: Number(f.line30_refundable_adoption),
    schedule3_line6c: Number(
      p.schedule3_final.line6c_adoption_credit ??
        p.schedule3.line6c_adoption_credit,
    ),
  };
  return {
    c,
    e,
    destinations,
    bridge: { source: e.source_input, income: e.income },
    filer: { name: "Synthetic Investor", ssn: "123456789" },
  };
}
async function render(raw: Record<string, unknown>) {
  const o = operands(raw);
  return {
    ...o,
    bytes: await buildForm8839PdfBytes2026(
      o.c.source_input,
      o.bridge,
      o.destinations,
      o.filer,
    ),
  };
}
type Word = {
  "#text": string;
  "@_xMin": number;
  "@_xMax": number;
  "@_yMin": number;
  "@_yMax": number;
};
async function inspect(bytes: Uint8Array, footerPages: number[] = []) {
  const doc = await PDFDocument.load(bytes);
  assert(!doc.catalog.has(PDFName.of("AcroForm")));
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-bbox", file, "-"],
    }).output();
    assertEquals(r.code, 0);
    assertEquals(new TextDecoder().decode(r.stderr), "");
    for (const page of footerPages) {
      const rendered = await new Deno.Command("pdftoppm", {
        args: [
          "-f",
          String(page),
          "-l",
          String(page),
          "-r",
          "72",
          "-x",
          "36",
          "-y",
          "774",
          "-W",
          "250",
          "-H",
          "10",
          "-gray",
          "-singlefile",
          file,
        ],
      }).output();
      assertEquals(rendered.code, 0);
      assertEquals(new TextDecoder().decode(rendered.stderr), "");
      const header = new TextDecoder().decode(rendered.stdout.subarray(0, 40));
      assert(header.startsWith("P5\n250 10\n255\n"));
      const pixels = rendered.stdout.subarray("P5\n250 10\n255\n".length);
      assert(
        pixels.filter((v) => v < 200).length > 40,
        "Draft footer must paint visible pixels outside the template clip",
      );
    }
    const parsed = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: false,
    }).parse(new TextDecoder().decode(r.stdout));
    const pages = Array.isArray(parsed.html.body.doc.page)
      ? parsed.html.body.doc.page
      : [parsed.html.body.doc.page];
    const words = pages.map((p: { word: Word[] }) => p.word);
    return {
      count: doc.getPageCount(),
      text: words.map((w: Word[]) => w.map((w) => w["#text"]).join(" ")),
      at: (page: number, rect: number[]) =>
        words[page].filter((w: Word) => {
          const x = (w["@_xMin"] + w["@_xMax"]) / 2,
            y = 792 - (w["@_yMin"] + w["@_yMax"]) / 2;
          return x >= rect[0] && x <= rect[2] && y >= rect[1] && y <= rect[3];
        }).map((w: Word) => w["#text"]).join(" "),
    };
  } finally {
    await Deno.remove(file);
  }
}
Deno.test("2026 adoption PDF reconciles every return destination and prints signed Part III", async () => {
  for (const special of [false, true]) {
    const raw = adoptionGraphFixture2026(
      special ? 10000 : 50000,
      special ? 0 : 4000,
      special,
    );
    const r = await render(raw), pdf = await inspect(r.bytes, [1, 2]);
    assertEquals(pdf.count, 2);
    assertEquals(pdf.at(0, [504, 192, 576, 204]), "5120");
    assertEquals(
      pdf.at(0, [504, 108, 576, 120]),
      String(r.destinations.schedule3_line6c),
    );
    assertEquals(pdf.at(1, [504, 390, 576, 403]), special ? "-17670" : "0");
    assertEquals(pdf.at(1, [504, 432, 576, 444]), special ? "17670" : "4000");
    assertStringIncludes(pdf.text[0], "DRAFT - NOT FOR FILING");
    assert(!pdf.text[0].includes("draft you are looking for"));
    const bundle = await buildDraftReturnPdf2026(raw);
    const names = bundle.attachments.map((a) => a.form);
    assert(names.includes("form8839"));
    if (names.includes("schedule8812")) {
      assert(names.indexOf("form8839") < names.indexOf("schedule8812"));
    }
    for (
      const key of Object.keys(
        r.destinations,
      ) as (keyof AdoptionPdfDestinations2026)[]
    ) {
      await assertRejects(
        () =>
          buildForm8839PdfBytes2026(r.c.source_input, r.bridge, {
            ...r.destinations,
            [key]: r.destinations[key] + 1,
          }, r.filer),
        Error,
        "calculated return destinations",
      );
    }
    await assertRejects(
      () =>
        buildForm8839PdfBytes2026(r.c.source_input, r.bridge, r.destinations, {
          ...r.filer,
          ssn: "987654321",
        }),
      Error,
      "matching owner",
    );
    const changed = structuredClone(r.bridge);
    changed.source.claim.record_reference = "different-inventory";
    assertThrows(
      () => adoptionPrintPlan2026(r.c.source_input, changed),
      Error,
      "same source inventory",
    );
  }
});
Deno.test("2026 adoption overflow retains prior child columns and prints aggregate amounts only once", async () => {
  const input = adoptionOverflowFixture2026(),
    r = await render(input),
    pdf = await inspect(r.bytes, [1, 2, 3, 4]);
  assertEquals(pdf.count, 4);
  assertEquals(pdf.at(0, [58, 539, 137, 552]), "Child1");
  assertEquals(pdf.at(0, [58, 587, 137, 600]), "Child2");
  assertEquals(pdf.at(2, [58, 587, 137, 600]), "Child4");
  assertStringIncludes(pdf.text[0], "See Attached");
  assertEquals(pdf.at(0, [550, 288, 576, 300]), "373");
  assertEquals(pdf.at(0, [504, 192, 576, 204]), "25600");
  assertEquals(pdf.at(2, [504, 192, 576, 204]), "");
  assertEquals(pdf.at(2, [424, 348, 482, 360]), "");
  assertEquals(pdf.at(0, [424, 420, 482, 432]), "1000");
  assertEquals(pdf.at(0, [309, 252, 367, 264]), "5120");
  assertEquals(pdf.at(2, [367, 252, 425, 264]), "5120");
  const before = structuredClone(input);
  const bundle = await buildDraftReturnPdf2026(input);
  assertEquals(input, before);
  const a = bundle.attachments.find((a) => a.form === "form8839")!;
  assertEquals(a.formPages.length, 4);
  assertEquals(a.statementPages, []);
  assertEquals(bundle.filingReady, false);
});
Deno.test("2026 adoption copies preserve Part III aggregate exclusion across more than three children", async () => {
  const input = adoptionOverflowFixture2026();
  input.form8839.claim.children.forEach((ch, i) => {
    ch.current_benefits = [{
      record_reference: `benefit-${i}`,
      paid_on: "2026-04-01",
      amount: 1000,
      program_reference: input.form8839.claim.programs[0].record_reference,
      expense_allocations: [{
        expense_reference: ch.expenses[0].record_reference,
        amount: 1000,
      }],
    }];
  });
  input.w2s[0].box12_entries[0].amount = 5000;
  const r = await render(input), pdf = await inspect(r.bytes);
  assertEquals(pdf.at(1, [504, 588, 576, 600]), "5000");
  assertEquals(pdf.at(3, [504, 588, 576, 600]), "");
  assertEquals(pdf.at(1, [504, 432, 576, 444]), String(r.e.lines.line30));
  assertEquals(pdf.at(3, [504, 432, 576, 444]), "");
  assertEquals(pdf.at(3, [309, 600, 367, 612]), "1000");
});
Deno.test("2026 adoption carryforward-only and empty inventories have distinct attachment rules", async () => {
  const input = adoptionGraphFixture2026(50000, 0);
  input.form8839.claim.children = [];
  input.form8839.claim.programs = [];
  const empty = await buildDraftReturnPdf2026(input);
  assert(!empty.attachments.some((a) => a.form === "form8839"));
  input.form8839.claim.carryforward = {
    filed_2025_return_reference: "2025-return",
    parent_tin: "123456789",
    irs_2025_account_review: adoptionAccountReview2026(),
    current_filed_2025_nonrefundable_carryforward_total: 6000,
    complete_origin_history_and_no_intervening_use_verified: true,
    origins: [2021, 2023, 2025].map((tax_year) => ({
      tax_year,
      amount: 2000,
      origin_return_reference: `return-${tax_year}`,
      eligible_joint_return_when_married_verified: true,
    })),
  };
  const r = await render(input), pdf = await inspect(r.bytes);
  assertEquals(pdf.at(0, [504, 156, 576, 168]), "6000");
  assertEquals(pdf.at(0, [504, 192, 576, 204]), "0");
  assertEquals(pdf.at(1, [504, 432, 576, 444]), "");
});
Deno.test("2026 pending foreign benefits retain the separate taxable income reconciliation", async () => {
  const input = adoptionGraphFixture2026();
  input.form8839.claim.children[0].origin = "foreign";
  input.form8839.claim.children[0].finalization = {
    kind: "not_final",
    status_record_reference: "pending-foreign",
  };
  const r = await buildDraftReturnPdf2026(input),
    a = r.attachments.find((a) => a.form === "form8839")!;
  assertEquals(a.formPages.length, 2);
  assertEquals(a.statementPages.length, 1);
  const pdf = await inspect(r.bytes);
  assertStringIncludes(
    pdf.text[a.statementPages[0] - 1],
    "Form 1040 line 1f: 4000",
  );
  assertEquals(pdf.at(a.formPages[1] - 1, [504, 390, 576, 403]), "");
});
Deno.test("2026 prior adoption source copies allow distinct children and reject duplicate or conflicting slots", () => {
  const input = adoptionOverflowFixture2026(),
    [first, second] = input.form8839.claim.children;
  delete second.no_prior_form8839_claim_verified;
  second.prior_form8839 = {
    ...first.prior_form8839!,
    child_tin: second.identifying_number,
    child_column: 2,
  };
  const r = operands(input),
    plan = adoptionPrintPlan2026(r.c.source_input, r.bridge);
  assertEquals(plan.copies[0].map((r) => r?.source.first_name), [
    "Child3",
    "Child2",
    "Child1",
  ]);
  const bad = structuredClone(r.c.source_input);
  bad.adoption_sources_2026!.claim.children[1].prior_form8839!.child_column = 3;
  assertThrows(
    () => adoptionPrintPlan2026(bad, r.bridge),
    Error,
    "distinct child positions",
  );
  bad.adoption_sources_2026!.claim.children[1].prior_form8839!.child_column = 2;
  bad.adoption_sources_2026!.claim.children[1].prior_form8839!.tax_year = 2024;
  assertThrows(
    () => adoptionPrintPlan2026(bad, r.bridge),
    Error,
    "consistent ownership",
  );
});
