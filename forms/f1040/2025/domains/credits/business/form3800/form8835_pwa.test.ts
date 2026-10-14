import { form8835Pdf } from "../../../../pdf/forms/credits/business/f8835.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { pwaCases, pwaFixture } from "./form8835_pwa.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  preparedSourceSha256,
  sha256Hex,
} from "../../../../return-processing/prepared-source.ts";
import {
  calculateForm8835,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { reconcileForm8835PwaPayroll } from "../../../../../nodes/inputs/credits/business/f8835/pwa-source.ts";
import { form8835PwaFields } from "../../../../mef/forms/credits/business/f8835_pwa_statement.ts";

for (const c of pwaCases) {
  Deno.test(`Form 8835 direct PWA complete return: ${c.id}`, async () => {
    const { input, attachments, expected } = await pwaFixture(c);
    const parsed = inputSchema.parse({ f8835s: input.f8835 });
    const payroll = reconcileForm8835PwaPayroll(parsed.f8835s[0].pwa_source!);
    const hours = c.start < "2024-01-01" ? 8 : 10;
    assertEquals(payroll.laborMinutes, c.employers * hours * 60);
    assertEquals(
      payroll.apprenticeMinutes,
      c.employers * (hours === 8 ? 60 : 90),
    );
    assertEquals(payroll.requiredBasisPoints, hours === 8 ? 1250 : 1500);
    assertEquals(
      payroll.wageRows.length,
      c.service >= "2025-01-01" || c.repairs ? c.employers : 0,
    );
    assertEquals(
      payroll.apprenticeRows.length,
      c.service >= "2025-01-01" ? c.employers : 0,
    );
    const execution = f1040_2025.executeReturn(input);
    assertEquals(execution.diagnostics, []);
    const filer = extractFilerIdentity(execution.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(
      execution.pending,
      filer,
      attachments,
    );
    const pending = prepared.bundle.pending;
    assertEquals(pending.f1040?.line16_income_tax, 25067);
    assertEquals(
      pending.f1040?.line20_nonrefundable_credits,
      2001 + expected.productionUsed,
    );
    assertEquals(pending.f1040?.line24_total_tax, expected.tax);
    assertEquals(pending.f1040?.line35a_refund, 30000 - expected.tax);
    assertStringIncludes(prepared.bundle.xml, "Pwa1.pdf");
    const projections = form8835Pdf.instances!(
      pending.f8835!,
      filer,
      normalizeAllPending(pending),
      prepared.bundle.form3800Parts,
    );
    for (const projection of projections) {
      assertEquals(projection.pwa_requirements, true);
      assertEquals(projection.under_one_mw, false);
      assertEquals(projection.early_construction, false);
      assertEquals(projection.no_increased_credit, false);
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals((await PDFDocument.load(pdf)).getForm().getFields().length, 0);
    const item = (p: typeof pending) => (p.f8835!.f8835s as any[])[0];
    const source = (p: typeof pending) => item(p).pwa_source;
    const mutations: Array<(p: typeof pending) => void> = [
      (p) => {
        delete item(p).pwa_source;
      },
      (p) => {
        source(p).taxpayer_tin = "999999999";
      },
      (p) => {
        source(p).taxpayer_name = "Other Person";
      },
      (p) => {
        source(p).metered_kwh++;
      },
      (p) => {
        source(p)
          .complete_construction_and_current_year_work_inventory_verified =
            false;
      },
      (p) => {
        source(p).payroll[0].cash_wages_paid_cents--;
      },
      (p) => {
        source(p).payroll[0].overtime_premium_cents++;
      },
      (p) => {
        source(p).payroll.find((r: any) =>
          r.worker_reference ===
            source(p).workers.find((w: any) => w.role === "apprentice")
              .reference
        ).minutes_worked--;
      },
      (p) => {
        source(p).programs[0].first_apprentice_journeyworkers = 4;
      },
      (p) => {
        source(p).workers[3].apprentice.registered_from = "2025-12-31";
      },
      (p) => {
        source(p).wage_determinations[0].basic_hourly_rate_cents++;
      },
      (p) => {
        source(p).payroll[0].paid_on = "2027-01-01";
      },
      (p) => {
        source(p).payroll[0].worker_reference = "missing-worker";
      },
      (p) => {
        source(p).alterations_or_repairs_in_2025 = !c.repairs;
      },
      (p) => {
        source(p).form7220_sha256 = "f".repeat(64);
      },
      (p) => {
        source(p).form7220_file_name = "Missing.pdf";
      },
      (p) => {
        source(p).statement_sha256 = "f".repeat(64);
      },
      (p) => {
        source(p).construction_history.earliest_qualifying_start_verified =
          false;
      },
      (p) => {
        source(p).generating_units[1].unit_reference =
          source(p).generating_units[0].unit_reference;
      },
    ];
    if (c.bonuses) {
      mutations.push((p) => {
        (p.f8835!.f8835s as any[])[1].pwa_source.construction_history.continuity
          .review_reference = "Conflicting history";
      });
    }
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, attachments)
      );
      await assertRejects(async () =>
        buildPdfBytes(changed, filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
          sourceSha256: await preparedSourceSha256(changed, filer),
        })
      );
    }
    let attachmentRejections = 0;
    for (
      const kind of [
        "missing",
        "amount",
        "answer",
        "unexpected",
        "page",
        "declaration",
      ]
    ) {
      const changed = structuredClone(pending),
        copies = attachments.map((a) => ({ ...a }));
      const s = source(changed);
      const target = copies.find((a) =>
        a.fileName ===
          (kind === "declaration"
            ? s.statement_file_name
            : s.form7220_file_name)
      )!;
      if (kind === "missing") copies.splice(copies.indexOf(target), 1);
      else {
        const altered = await PDFDocument.load(target.bytes);
        if (kind === "page") altered.removePage(4);
        else if (kind === "declaration") {
          altered.getForm().getTextField("Form8835Increase.Declaration")
            .setText("Unsupported declaration");
        } else if (kind === "answer") {
          altered.getForm().getCheckBox("topmostSubform[0].Page1[0].c1_4[0]")
            .check();
        } else if (kind === "unexpected") {
          altered.getForm().getTextField("topmostSubform[0].Page1[0].f1_3[0]")
            .setText("1234567890123456789");
        } else {altered.getForm().getTextField(
            "topmostSubform[0].Page2[0].Table_PartII[0].Line1[0].f2_6[0]",
          ).setText("999999");}
        target.bytes = await altered.save();
        if (kind === "declaration") {
          s.statement_sha256 = await sha256Hex(target.bytes);
        } else s.form7220_sha256 = await sha256Hex(target.bytes);
      }
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, copies)
      );
      attachmentRejections++;
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8835_PWA_EVIDENCE_DIR");
    } catch { /* optional private export */ }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${c.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${c.id}.xml`, prepared.bundle.xml);
      for (const a of attachments) {
        await Deno.writeFile(`${root}/${c.id}-${a.fileName}`, a.bytes);
      }
      await Deno.writeTextFile(
        `${root}/${c.id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            expected,
            origins,
            payroll,
            fields: parsed.f8835s.map(form8835PwaFields),
            nativeRejections: mutations.length,
            pdfRejections: mutations.length,
            attachmentRejections,
          },
          null,
          2,
        ),
      );
    }
  });
}

Deno.test("Form 8835 PWA excludes overtime premiums and separately checks employer participation", async () => {
  const { input } = await pwaFixture(pwaCases[0]);
  const parsed = inputSchema.parse({ f8835s: input.f8835 });
  const s = parsed.f8835s[0].pwa_source!;
  // One employer with four journeyworkers cannot borrow the other employer's apprentice.
  const second = structuredClone(s.employers[0]);
  second.reference = "second";
  second.ein = "980000000";
  s.employers.push(second);
  const worker = structuredClone(s.workers[0]);
  worker.reference = "fourth";
  s.workers.push(worker);
  s.workers[3].employer_reference = "second";
  // Give the second employer journeyworkers to keep its daily ratio valid.
  for (let i = 0; i < 3; i++) {
    const w = structuredClone(s.workers[i]);
    w.reference = `second-${i}`;
    w.employer_reference = "second";
    s.workers.push(w);
    const p = structuredClone(s.payroll[i]);
    p.reference = w.reference;
    p.worker_reference = w.reference;
    p.time_record_reference = w.reference;
    s.payroll.push(p);
  }
  const extra = structuredClone(s.payroll[0]);
  extra.reference = "fourth";
  extra.worker_reference = "fourth";
  extra.time_record_reference = "fourth";
  s.payroll.push(extra);
  // 8 laborers, with ample apprentice hours; all are still paid at required rates.
  s.payroll[3].minutes_worked = 240;
  s.payroll[3].cash_wages_paid_cents = 7200;
  s.payroll[3].bona_fide_fringe_paid_cents = 4800;
  assertThrows(
    () => calculateForm8835(parsed.f8835s[0]),
    Error,
    "participation",
  );
});
