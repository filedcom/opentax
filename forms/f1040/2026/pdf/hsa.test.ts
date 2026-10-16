import { hsaRolloverGraph2026 } from "../inputs/hsa-rollover.fixture.ts";
import {
  hsaNonreportableGraph2026,
  onlyNonreportableHsaGraph2026,
} from "../inputs/hsa-nonreportable.fixture.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  hsaGraph2026,
  inactiveHsaGraph2026,
  jointHsaGraph2026,
} from "../inputs/hsa-graph.fixture.ts";
import type { calculateHsaReturnSources2026 } from "../inputs/hsa-source.ts";
import type { calculateForm5329Sources2026 } from "../inputs/form5329-source.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildForm8889PdfBytes2026 } from "./form8889.ts";
import { buildCombinedForm5329PdfBytes2026 } from "./form5329.ts";

async function text(bytes: Uint8Array, page: number, rect: number[]) {
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const [x, y, w, h] = rect;
    const r = await new Deno.Command("pdftotext", {
      args: [
        "-layout",
        "-f",
        String(page),
        "-l",
        String(page),
        "-x",
        String(x),
        "-y",
        String(y),
        "-W",
        String(w),
        "-H",
        String(h),
        path,
        "-",
      ],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).trim();
  } finally {
    await Deno.remove(path);
  }
}
async function staticPdf(bytes: Uint8Array, pages?: number) {
  const d = await PDFDocument.load(bytes);
  if (pages !== undefined) assertEquals(d.getPageCount(), pages);
  assertEquals(d.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    d.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
}
Deno.test("2026 HSA drafts omit reconciled trustee debits and corrected mistake repayments from filed gross", async () => {
  for (const corrected of [false, true]) {
    const g = hsaNonreportableGraph2026(corrected, true),
      b = await buildDraftReturnPdf2026(g);
    const h = b.calculation.pending.hsa_accounts.calculation_2026 as ReturnType<
      typeof calculateHsaReturnSources2026
    >;
    const pdf = await buildForm8889PdfBytes2026(h.source_input, "taxpayer", h, {
      name: "Synthetic HSA Owner",
      ssn: g.general.taxpayer_ssn,
    });
    await staticPdf(pdf, 1);
    for (
      const [y, amount] of [
        [408, 2400],
        [444, 2630],
        [480, 1130],
        [492, 1500],
        [504, 500],
        [528, 1000],
        [588, 200],
      ]
    ) {
      assertEquals(await text(pdf, 1, [503, y, 74, 12]), String(amount));
    }
    assertEquals(
      b.attachments.filter((a) => a.form.startsWith("form8889:")).length,
      1,
    );
    assertEquals(b.calculation.pending.f1040.line23_other_taxes, 305);
  }
  const only = await buildDraftReturnPdf2026(onlyNonreportableHsaGraph2026());
  assertEquals(
    only.attachments.some((a) =>
      a.form.startsWith("form8889:") || a.form.startsWith("form5329:")
    ),
    false,
  );
});
Deno.test("2026 HSA bundle prints source-derived owner Form 8889, IRA HFD and combined Part I/VII", async () => {
  const g = hsaGraph2026(true), b = await buildDraftReturnPdf2026(g);
  const h = b.calculation.pending.hsa_accounts.calculation_2026 as ReturnType<
    typeof calculateHsaReturnSources2026
  >;
  const f = b.calculation.pending.form5329.calculation_2026 as ReturnType<
    typeof calculateForm5329Sources2026
  >;
  const filer = { name: "Synthetic HSA Owner", ssn: g.general.taxpayer_ssn };
  const standalone = await buildForm8889PdfBytes2026(
    h.source_input,
    "taxpayer",
    h,
    filer,
  );
  await staticPdf(standalone, 1);
  await staticPdf(b.bytes);
  assertEquals(await text(standalone, 1, [424, 102, 152, 12]), "400001037");
  // Independent printed-line coordinates from the pinned IRS draft, after flattening.
  for (
    const [y, amount] of [
      [204, 4000],
      [240, 4400],
      [372, 1000],
      [408, 2400],
      [444, 2630],
      [480, 630],
      [492, 2000],
      [504, 500],
      [528, 1500],
      [588, 300],
      [636, 0],
      [648, 0],
      [660, 0],
      [684, 0],
    ]
  ) {
    const x = y === 372 ? 410 : 503;
    assertEquals(
      await text(standalone, 1, [x, y, 74, 12]),
      String(amount),
      `Form 8889 at y=${y}`,
    );
  }
  assertEquals(
    b.attachments.filter((a) => a.form.startsWith("form8889:")).length,
    1,
  );
  assertEquals(
    b.attachments.filter((a) => a.form.startsWith("form5329:")).length,
    1,
  );
  const part = await buildCombinedForm5329PdfBytes2026(
    f.source_input,
    "taxpayer",
    45,
    filer,
    60,
  );
  await staticPdf(part, 3);
  assertEquals(await text(part, 1, [503, 300, 74, 12]), "45");
  for (
    const [y, amount] of [
      [384, 0],
      [408, 0],
      [420, 1500],
      [432, 1500],
      [444, 0],
      [456, 1000],
      [468, 1000],
      [492, 60],
    ]
  ) {
    const x = y === 408 || y === 420 ? 409 : 503;
    assertEquals(
      await text(part, 2, [x, y, 74, 12]),
      String(amount),
      `Form 5329 at y=${y}`,
    );
  }
  const f1040 = b.attachments.find((a) => a.form === "f1040")!;
  assertEquals(
    await text(b.bytes, f1040.formPages[0], [424, 618, 52, 13]),
    "HFD",
  );
  const s1 = b.attachments.find((a) => a.form === "schedule1")!;
  assertEquals(
    await text(b.bytes, s1.formPages[0], [410, 354, 72, 12]),
    "1500",
  );
  assertEquals(b.calculation.pending.schedule2.line18_form5329_excess_tax, 60);
  assertEquals(b.filingReady, false);
  await assertRejects(
    () =>
      buildForm8889PdfBytes2026(h.source_input, "taxpayer", {
        ...h,
        schedule1_line13: 2401,
      }, filer),
    Error,
    "destinations",
  );
  await assertRejects(
    () =>
      buildForm8889PdfBytes2026(h.source_input, "taxpayer", h, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
  await assertRejects(
    () =>
      buildCombinedForm5329PdfBytes2026(
        f.source_input,
        "taxpayer",
        45,
        filer,
        61,
      ),
    Error,
    "matching Schedule 2",
  );
});
Deno.test("2026 HSA PDF prints current testing recapture and rejects missing beneficiary", async () => {
  const g = hsaGraph2026(true),
    e = g.hsa_accounts.claim.excess_returns.contribution_sources
      .household_eligibility.owners[0];
  const renewed = structuredClone(e.plans[0]);
  e.plans[0].effective_through = "2026-06-15";
  renewed.effective_from = "2026-07-02";
  renewed.source_document_reference = "renewed-plan";
  e.plans.push(renewed);
  e.months[6].plan_references = [];
  for (const m of e.months.slice(7)) {
    m.plan_references = [renewed.source_document_reference];
  }
  const b = await buildDraftReturnPdf2026(g);
  const h = b.calculation.pending.hsa_accounts.calculation_2026 as ReturnType<
    typeof calculateHsaReturnSources2026
  >;
  const p =
    b.attachments.find((a) => a.form === "form8889:taxpayer")!.formPages[0];
  for (const [y, amount] of [[648, 1000], [660, 1000], [684, 100]]) {
    assertEquals(await text(b.bytes, p, [503, y, 74, 12]), String(amount));
  }
  assert(b.attachments.some((a) => a.form === "form5329:taxpayer"));
  await assertRejects(
    () =>
      buildForm8889PdfBytes2026(h.source_input, "spouse", h, {
        name: "Missing owner",
        ssn: "400001038",
      }),
    Error,
    "reportable HSA owner",
  );
});

Deno.test("2026 joint HSA PDF prints each beneficiary once and omits inactive account forms", async () => {
  const b = await buildDraftReturnPdf2026(jointHsaGraph2026());
  for (
    const [owner, ssn] of [["taxpayer", "400001037"], ["spouse", "400001038"]]
  ) {
    const attachments = b.attachments.filter((a) =>
      a.form === `form8889:${owner}`
    );
    assertEquals(attachments.length, 1);
    assertEquals(
      await text(b.bytes, attachments[0].formPages[0], [424, 102, 152, 12]),
      ssn,
    );
    assertEquals(
      await text(b.bytes, attachments[0].formPages[0], [503, 408, 74, 12]),
      "3375",
    );
    assertEquals(
      b.attachments.filter((a) => a.form === `form5329:${owner}`).length,
      1,
    );
  }
  const none = await buildDraftReturnPdf2026(inactiveHsaGraph2026());
  assertEquals(
    none.attachments.some((a) =>
      a.form.startsWith("form8889:") || a.form.startsWith("form5329:")
    ),
    false,
  );
});

Deno.test("2026 HSA rollover prints combined rollover/excess exclusion and reconciled return income", async () => {
  for (const crossYear of [false, true]) {
    const b = await buildDraftReturnPdf2026(
      hsaRolloverGraph2026(crossYear, true),
    );
    const p = b.attachments.find((a) =>
      a.form === "form8889:taxpayer"
    )!.formPages[0];
    for (
      const [y, amount] of [
        [372, 1000],
        [408, 2400],
        [444, 2630],
        [480, 1130],
        [492, 1500],
        [504, 500],
        [528, 1000],
        [588, 200],
      ]
    ) {
      assertEquals(
        await text(b.bytes, p, [y === 372 ? 410 : 503, y, 74, 12]),
        String(amount),
      );
    }
    const s1 = b.attachments.find((a) => a.form === "schedule1")!.formPages[0];
    assertEquals(await text(b.bytes, s1, [410, 354, 72, 12]), "1000");
    assertEquals(b.calculation.pending.f1040.line4b_ira_taxable, 450);
    assertEquals(b.calculation.pending.f1040.line23_other_taxes, 305);
    await staticPdf(b.bytes);
  }
});
