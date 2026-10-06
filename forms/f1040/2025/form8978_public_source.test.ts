import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { form8978ReviewFixtures } from "./pdf/review-8978.fixture.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle, buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { form8978Pdf } from "./pdf/forms/f8978.ts";
import { form8978ScheduleAPdf } from "./pdf/forms/f8978_schedule_a.ts";
import { calculateFiling, inputSchema } from "../nodes/inputs/f8978/index.ts";
function prepared(i: number) {
  const f = form8978ReviewFixtures[i],
    r = f1040_2025.executeReturn({ ...f.inputs });
  assertEquals(r.diagnostics, []);
  return { f, p: buildPending(r.pending) };
}
Deno.test("Form8978 reviewed public positive/negative/multi-year sources join full native/PDF and source bytes", async () => {
  for (let i = 0; i < 3; i++) {
    const { f, p } = prepared(i);
    assertEquals(p.f8978?.line14, [1920, -1920, -8160][i]);
    assertEquals(p.f1040?.line24_total_tax, [9875, 6035, 0][i]);
    const b = await buildMefBundle(p, {
      filer: f.filer,
      attachments: [...f.attachments!],
    });
    assertEquals(b.attachments.length, [3, 3, 9][i]);
    assertStringIncludes(b.xml, "IRS8978ScheduleA");
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stderr: "piped",
      stdout: "piped",
    }).spawn();
    const w = child.stdin.getWriter();
    await w.write(new TextEncoder().encode(b.xml));
    await w.close();
    const v = await child.output();
    assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
    assertEquals(
      (await buildPdfBytes(p, f.filer, ".pdf-cache", b)).length > 1000,
      true,
    );
    if (i === 2) {
      const all = p as Record<string, Record<string, unknown>>;
      assertEquals(form8978Pdf.instances!({}, f.filer, all).length, 3);
      const sheets = form8978ScheduleAPdf.instances!({}, f.filer, all);
      assertEquals(sheets.length, 4);
      assertEquals(sheets[0].line2_3, -6000);
      assertEquals(sheets[1].line2_3, -2000);
      assertEquals(sheets[0].deduction_0_tracking, undefined);
      assertEquals(sheets[0].deduction_0_amount_3, -2000);
    }
  }
});
Deno.test("Form8978 native/PDF rejects partner, reviewed facts, tax totals, baseline and attachment conflicts", async () => {
  const { f, p } = prepared(2);
  const b = await buildMefBundle(p, {
    filer: f.filer,
    attachments: [...f.attachments!],
  });
  const mutations: ((p: any) => void)[] = [
    (q) => q.f8978.line14++,
    (q) => q.f1040.taxpayer_ssn = "111223333",
    (q) => q.f8978.reviewed_source.partner_ssn = "111223333",
    (q) => q.f8978.filings[0].columns[0].income_adjustments[0].amount++,
    (q) =>
      q.f8978.reviewed_source.filings[0].computation_document.sha256 = "0"
        .repeat(64),
    (q) => q.f8978.reviewed_source.filings[0].furnished_date = "2025-02-30",
    (q) => q.f1040.line24_total_tax = 1,
    (q) => q.form8978_reporting_year.negative_form8978_line14--,
    (q) =>
      q.f8978.filings[0].columns[3].deduction_adjustments[0].ein = "825555123",
  ];
  for (const mutation of mutations) {
    const q = structuredClone(p);
    mutation(q);
    await assertRejects(() =>
      buildMefBundle(q, { filer: f.filer, attachments: [...f.attachments!] })
    );
    await assertRejects(() => buildPdfBytes(q, f.filer, ".pdf-cache", b));
  }
  const baseline = structuredClone(p) as any;
  baseline.f8978.filings[2].columns[0].original_income++;
  baseline.f8978.reviewed_source.filings[2].reviewed_filing = structuredClone(
    baseline.f8978.filings[2],
  );
  baseline.f8978.calculated_filings = inputSchema.parse(baseline.f8978).filings
    .map(calculateFiling);
  baseline.f8978.line14 = baseline.f8978.calculated_filings.reduce(
    (s: number, r: any) => s + r.line14,
    0,
  );
  await assertRejects(() =>
    buildMefBundle(baseline, {
      filer: f.filer,
      attachments: [...f.attachments!],
    })
  );
  for (
    const attachments of [
      f.attachments!.slice(1),
      [...f.attachments!, f.attachments![0]],
      f.attachments!.map((a, i) =>
        i ? a : { ...a, bytes: new Uint8Array([...a.bytes, 10]) }
      ),
      b.attachments.map((a) =>
        a.fileName.startsWith("Form8978TaxCalculation")
          ? { ...a, bytes: new Uint8Array([...a.bytes, 10]) }
          : a
      ),
    ]
  ) {
    if (attachments.length !== b.attachments.length) {
      await assertRejects(() =>
        buildMefBundle(p, { filer: f.filer, attachments: [...attachments] })
      );
    }
    await assertRejects(() =>
      buildPdfBytes(p, f.filer, ".pdf-cache", { ...b, attachments })
    );
  }
  assertThrows(() => buildMefXml(p, f.filer));
  await assertRejects(() => buildPdfBytes(p, f.filer, ".pdf-cache"));
  const wrong = { ...f.filer, primarySSN: "111223333" };
  await assertRejects(() =>
    buildMefBundle(p, { filer: wrong, attachments: [...f.attachments!] })
  );
  await assertRejects(() => buildPdfBytes(p, wrong, ".pdf-cache", b));
});
