import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { executeDraftSources2026 } from "../execute.ts";
import { marketplaceGraph2026 } from "../inputs/marketplace-graph.fixture.ts";
import {
  marketplaceCopy2026,
  marketplaceSource2026,
} from "../inputs/marketplace.fixture.ts";
import { syntheticIso2026 } from "../inputs/iso.fixture.ts";
import {
  itemizedClaim2026,
  syntheticMedical2026,
} from "../schedule-a.fixture.ts";
import { refundAllocationGraph2026 } from "../inputs/refund-allocation.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  buildForm8962PdfBytes2026,
  type Form8962Destinations2026,
  type MarketplaceResult2026,
} from "./form8962.ts";
import { buildForm6251PdfBytes2026 } from "./form6251.ts";
import type { calculateForm6251_2026 } from "../nodes/form6251.ts";

async function calculation(graph = marketplaceGraph2026()) {
  const run = await executeDraftSources2026(graph);
  assertEquals(run.diagnostics, []);
  const m = run.pending.form8962.calculation_2026 as MarketplaceResult2026;
  const f = run.pending.f1040;
  const destinations: Form8962Destinations2026 = {
    form1040_line11b: Number(f.line11b_agi),
    form1040_line2a: Number(f.line2a_tax_exempt ?? 0),
    form1040_nontaxable_social_security: Number(f.line6a_ss_gross ?? 0) -
      Number(f.line6b_ss_taxable ?? 0),
    schedule3_line9: Number(
      run.pending.schedule3_final.line9_premium_tax_credit ?? 0,
    ),
    schedule2_line1a: Number(
      run.pending.schedule2.line1a_excess_advance_premium ?? 0,
    ),
    schedule2_line1z: Number(run.pending.schedule2.line1z_additions ?? 0),
    filing_status: String(f.filing_status),
    tax_family_tins: [String(f.taxpayer_ssn)],
  };
  const filer = {
    name: `${f.taxpayer_first_name} ${f.taxpayer_last_name}`,
    ssn: String(f.taxpayer_ssn),
  };
  return { run, m, destinations, filer };
}
async function render(graph = marketplaceGraph2026()) {
  const c = await calculation(graph);
  return buildForm8962PdfBytes2026(c.m.source_input, c.destinations, c.filer);
}
/** Read actual printed text in a PDF-space rectangle, independently of field names. */
async function inspect(
  bytes: Uint8Array,
  body: (
    read: (page?: number, rect?: number[]) => Promise<string>,
  ) => Promise<void>,
) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes);
    await body(async (page = 1, rect) => {
      const args = ["-layout", "-f", String(page), "-l", String(page)];
      if (rect) {
        const [x, y, w, h] = rect;
        args.push(
          "-x",
          String(x),
          "-y",
          String(792 - y - h),
          "-W",
          String(w),
          "-H",
          String(h),
        );
      }
      const r = await new Deno.Command("pdftotext", {
        args: [...args, file, "-"],
      }).output();
      assertEquals(r.code, 0);
      return new TextDecoder().decode(r.stdout).trim();
    });
  } finally {
    await Deno.remove(file);
  }
}
const row11 = [109, 360, 467, 12];
const totals = [505, 156, 71, 12];
const advances = [505, 132, 71, 12];
const credit = [505, 96, 71, 12];
const repayment = [505, 60, 71, 12];
const reserved = [505, 36, 71, 24];

Deno.test("2026 Form 8962 prints annual credit and full repayment in the revised line positions", async () => {
  for (const wages of [62600, 62601]) {
    const bytes = await render(marketplaceGraph2026(wages));
    assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
    await inspect(bytes, async (read) => {
      const over = wages === 62601;
      assertEquals(await read(1, totals), over ? "0" : "3765");
      assertEquals(await read(1, advances), "3000");
      assertEquals(await read(1, credit), over ? "" : "765");
      assertEquals(await read(1, repayment), over ? "3000" : "");
      assertEquals(await read(1, reserved), "");
      assertEquals(
        (await read(1, row11)).split(/\s+/),
        over ? ["3000"] : ["5000", "10000", "6235", "3765", "3765", "3000"],
      );
      assertEquals(await read(1, [504, 516, 72, 12]), over ? "" : "0.0996");
      assertStringIncludes(await read(), "DRAFT - NOT FOR FILING");
      assertEquals((await read()).includes("marketplace-issued-1"), false);
      assertEquals((await read(2)).includes("Example Reviewer"), false);
    });
  }
});

function monthlyGraph(wages = 62600) {
  const graph = marketplaceGraph2026(wages);
  const copy = marketplaceCopy2026();
  copy.covered_individuals[0].enrolled_from = "2026-02-01";
  copy.monthly_premiums[0] = 0;
  copy.monthly_slcsps[0] = 0;
  copy.monthly_aptcs[0] = 0;
  copy.annual_premium = 4583.37;
  copy.annual_slcsp = 9166.63;
  copy.annual_aptc = 2750;
  graph.f1095a.claim = marketplaceSource2026([copy]).claim;
  return graph;
}
Deno.test("2026 Form 8962 monthly rows omit uncovered months and reconcile separately rounded entries", async () => {
  for (const wages of [62600, 62601]) {
    await inspect(await render(monthlyGraph(wages)), async (read) => {
      assertEquals(await read(1, row11), "");
      assertEquals(await read(1, [109, 300, 467, 12]), "");
      assertEquals(
        (await read(1, [109, 288, 467, 12])).split(/\s+/),
        wages === 62601 ? ["250"] : ["417", "833", "520", "313", "313", "250"],
      );
      assertEquals(await read(1, totals), wages === 62601 ? "0" : "3443");
      assertEquals(await read(1, advances), "2750");
      assertEquals(await read(1, reserved), "");
    });
  }
});

Deno.test("2026 Form 8962 reconciles rounded-zero advances and prints zero net credit on equality", async () => {
  for (const annual of [true, false]) {
    const graph = annual ? marketplaceGraph2026(62601) : monthlyGraph(62601);
    const copy = graph.f1095a.claim.copies[0];
    copy.monthly_aptcs = copy.monthly_premiums.map((p) => p ? .01 : 0);
    copy.annual_aptc = annual ? .12 : .11;
    graph.f1095a.claim = marketplaceSource2026([copy]).claim;
    const bundle = await buildDraftReturnPdf2026(graph);
    assert(bundle.attachments.some((a) => a.form === "form8962"));
    await inspect(await render(graph), async (read) => {
      assertEquals(await read(1, totals), "0");
      assertEquals(await read(1, advances), "0");
      assertEquals(await read(1, credit), "0");
      assertEquals(await read(1, repayment), "");
    });
  }
  for (const wage of [62600, 62601]) {
    const tiny = marketplaceCopy2026();
    tiny.monthly_premiums.fill(.01);
    tiny.monthly_slcsps.fill(.01);
    tiny.monthly_aptcs.fill(.01);
    tiny.annual_premium = .12;
    tiny.annual_slcsp = .12;
    tiny.annual_aptc = .12;
    const graph = marketplaceGraph2026(wage);
    graph.f1095a.claim = marketplaceSource2026([tiny]).claim;
    await inspect(await render(graph), async (read) => {
      assertEquals(await read(1, totals), "0");
      assertEquals(await read(1, advances), "0");
      assertEquals(await read(1, credit), "0");
    });
  }
  const graph = marketplaceGraph2026();
  const copy = graph.f1095a.claim.copies[0];
  copy.monthly_aptcs.fill(313.75);
  copy.annual_aptc = 3765;
  graph.f1095a.claim = marketplaceSource2026([copy]).claim;
  await inspect(await render(graph), async (read) => {
    assertEquals(await read(1, credit), "0");
    assertEquals(await read(1, repayment), "");
  });
});

Deno.test("2026 Marketplace PDF omits a form without credit or advances and rejects stale destination or family data", async () => {
  const graph = marketplaceGraph2026(62601);
  const copy = graph.f1095a.claim.copies[0];
  copy.monthly_aptcs.fill(0);
  copy.annual_aptc = 0;
  graph.f1095a.claim = marketplaceSource2026([copy]).claim;
  assertEquals(
    (await buildDraftReturnPdf2026(graph)).attachments.some((a) =>
      a.form === "form8962"
    ),
    false,
  );
  await assertRejects(() => render(graph), Error, "no filing trigger");
  const { m, destinations: d, filer } = await calculation();
  for (const key of Object.keys(d)) {
    const value = d[key as keyof typeof d];
    await assertRejects(
      () =>
        buildForm8962PdfBytes2026(m.source_input, {
          ...d,
          [key]: typeof value === "number"
            ? value + 1
            : key === "tax_family_tins"
            ? ["999887777"]
            : "MFJ",
        }, filer),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildForm8962PdfBytes2026(m.source_input, d, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
  await assertRejects(
    () =>
      buildForm8962PdfBytes2026(m.source_input, d, {
        ...filer,
        name: "Long name ".repeat(100),
      }),
    Error,
    "printable field",
  );
});

Deno.test("2026 Marketplace bundle reconciles itemized premiums AMT refund allocation and attachment order", async () => {
  const iso = syntheticIso2026();
  iso.f3921s[0].employee_tin = "400001037";
  const graph = marketplaceGraph2026(62601, true);
  graph.w2s[0].box2_fed_withheld = 30000;
  const medical = {
    ...syntheticMedical2026(),
    payer_ssn: "400001037",
    patient_ssn: "400001037",
  };
  const bundle = await buildDraftReturnPdf2026({
    ...graph,
    f3921: iso,
    schedule_a: { ...itemizedClaim2026, medical_payments: [medical] },
    refund_allocation: refundAllocationGraph2026().refund_allocation,
  });
  assertEquals(bundle.filingReady, false);
  const p = bundle.calculation.pending;
  const amt = p.form6251.calculation_2026 as ReturnType<
    typeof calculateForm6251_2026
  >;
  assertEquals(amt.lines.line10, Number(p.f1040.line16_income_tax) + 3000);
  const forms = bundle.attachments.map((a) => a.form);
  assert(forms.indexOf("form6251") < forms.indexOf("form8962"));
  assert(forms.indexOf("form8888") < forms.indexOf("form8962"));
  assertEquals(
    (p.schedule_a.calculation_2026 as { lines: { line1: number } }).lines.line1,
    21500,
  );
  const ptc = bundle.attachments.find((a) => a.form === "form8962")!;
  assertEquals(ptc.formPages.length, 2);
  await inspect(bundle.bytes, async (read) => {
    assertEquals(await read(ptc.formPages[0], repayment), "3000");
    assertStringIncludes(
      await read(
        bundle.attachments.find((a) => a.form === "form6251")!.formPages[0],
      ),
      String(amt.lines.line10),
    );
  });
  await assertRejects(
    () =>
      buildForm6251PdfBytes2026(amt.source_input, {
        form1040_line11b: Number(p.f1040.line11b_agi),
        form1040_line12e: Number(p.f1040.line12e_standard_or_itemized),
        form1040_line14: Number(p.f1040.line14_total_deductions),
        form1040_line15: Number(p.f1040.line15_taxable_income),
        form1040_line16: Number(p.f1040.line16_income_tax),
        schedule1a_line43: 0,
        schedule_a_line7: 0,
        schedule2_line2: amt.lines.line11,
      }, { name: "Example Taxpayer", ssn: "400001037" }),
    Error,
    "destinations disagree",
  );
});

Deno.test("2026 Marketplace PDFs bind Alaska and Hawaii poverty tables and omit void-only coverage", async () => {
  for (const [state, poverty] of [["AK", 19550], ["HI", 17990]] as const) {
    const graph = marketplaceGraph2026(4 * poverty);
    graph.f1095a.family_review.filer_residences[0].state = state;
    const copy = graph.f1095a.claim.copies[0];
    copy.coverage_state = state;
    graph.f1095a.claim = marketplaceSource2026([copy]).claim;
    await inspect(await render(graph), async (read) => {
      assertEquals(await read(1, [505, 588, 71, 12]), String(poverty));
      assertEquals(await read(1, [505, 576, 57, 12]), "400");
    });
  }
  const graph = marketplaceGraph2026();
  const copy = graph.f1095a.claim.copies[0];
  graph.f1095a.claim.copies.push({
    ...copy,
    source_document_reference: "void-notice",
    void_box_checked: true,
    voids_document_reference: copy.source_document_reference,
  });
  graph.f1095a.claim.month_reviews = [];
  assertEquals(
    (await buildDraftReturnPdf2026(graph)).attachments.some((a) =>
      a.form === "form8962"
    ),
    false,
  );
});

Deno.test("2026 Marketplace bundle accepts an actual dependent family and includes sourced nontaxable benefits", async () => {
  const { childCreditGraphFixture2026 } = await import(
    "../nodes/f8812.fixture.ts"
  );
  const base = childCreditGraphFixture2026(25000);
  const source = marketplaceGraph2026(25000).f1095a;
  const claim = JSON.parse(
    JSON.stringify(source).replaceAll("400001037", base.general.taxpayer_ssn),
  ) as typeof source;
  claim.family_review.dependent_returns = [{
    dependent_tin: base.general.dependents[0].ssn,
    record_reference: "child-income-review",
    reviewed_on: "2027-02-28",
    reviewer_name: "Example Reviewer",
    all_income_sources_reconciled_verified: true,
    source: {
      filing: "no_income",
      income_inventory_record_reference: "child-no-income",
      no_taxable_or_nontaxable_income_verified: true,
      no_other_filing_trigger_verified: true,
      return_filed: false,
    },
  }];
  const bundle = await buildDraftReturnPdf2026({ ...base, f1095a: claim });
  const page =
    bundle.attachments.find((a) => a.form === "form8962")!.formPages[0];
  await inspect(
    bundle.bytes,
    async (read) => assertEquals(await read(page, [505, 648, 71, 12]), "2"),
  );

  const { syntheticSocialSecurity2026 } = await import(
    "../inputs/social-security.fixture.ts"
  );
  const { filing_status: _status, taxpayer_ssn: _ssn, ...ssa } =
    syntheticSocialSecurity2026();
  ssa.statements[0].recipient_tin = "400001037";
  const benefits = await buildDraftReturnPdf2026({
    ...marketplaceGraph2026(52600),
    ssa1099: ssa,
  });
  assertEquals(
    benefits.calculation.pending.form8962.taxpayer_modified_agi,
    62600,
  );
  assertEquals(
    benefits.calculation.pending.form8962.net_premium_tax_credit,
    765,
  );
});
