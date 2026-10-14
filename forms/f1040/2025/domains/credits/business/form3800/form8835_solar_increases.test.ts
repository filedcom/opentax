import { solarCases, solarFixture } from "./form8835_solar.fixture.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  preparedSourceSha256,
} from "../../../../return-processing/prepared-source.ts";
import { form8835Pdf } from "../../../../pdf/forms/credits/business/f8835.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

for (const c of solarCases) {
  Deno.test(`Form 8835 solar source-to-return: ${c.id}`, async () => {
    const { input, attachments } = await solarFixture(c.id);
    const credits = input.f8835.map((f: any) => {
      const base = Math.round(f.kwh_sold * 6 / 1000);
      const increased = base * (f.increased_credit_reason === "none" ? 1 : 5);
      return increased +
        (f.domestic_content_bonus ? Math.round(increased / 10) : 0) +
        (f.energy_community_bonus ? Math.round(increased / 10) : 0);
    });
    const produced = credits.reduce((a: number, b: number) => a + b, 0);
    const used = Math.min(produced, 23049);
    const tax = 25067 - 2001 - used;
    const execution = f1040_2025.executeReturn(input);
    assertEquals(execution.diagnostics, []);
    const filer = extractFilerIdentity(execution.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(
      execution.pending,
      filer,
      attachments,
    );
    const pending = prepared.bundle.pending;
    assertEquals(pending.f1040?.line20_nonrefundable_credits, 2001 + used);
    assertEquals(pending.f1040?.line24_total_tax, tax);
    assertEquals(pending.f1040?.line35a_refund, 30000 - tax);
    const projections = form8835Pdf.instances!(
      pending.f8835!,
      filer,
      normalizeAllPending(pending),
      prepared.bundle.form3800Parts,
    );
    for (let i = 0; i < credits.length; i++) {
      const f = input.f8835[i];
      const p = projections[i];
      assertEquals(p.dc_solar, true);
      assertEquals(p.dc_solar_nameplate_kw, f.solar_dc_nameplate_kw);
      assertEquals(p.line1d_quantity, f.kwh_sold);
      assertEquals(p.line1d_credit, Math.round(f.kwh_sold * 6 / 1000));
      assertEquals(p.line1a_quantity, undefined);
      assertEquals(p.line15, credits[i]);
      assertStringIncludes(
        prepared.bundle.xml,
        `<KwHrsPrdcdAndSoldSolarQty>${f.kwh_sold}</KwHrsPrdcdAndSoldSolarQty>`,
      );
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const mutations: ((f: any) => void)[] = [
      (f) => delete f.solar_production_source,
      (f) => f.solar_production_source.metered_kwh_produced++,
      (f) => f.solar_production_source.invoiced_kwh_sold++,
      (f) => f.solar_production_source.facility_description = "Wrong facility",
      (f) => f.solar_production_source.construction_began_on = "2025-01-01",
      (f) => f.solar_production_source.meter_period_end_date = "2025-11-30",
      (f) =>
        f.solar_production_source.unrelated_sale_invoice_date = "2026-01-01",
      (f) =>
        f.solar_production_source.section48_energy_credit_not_claimed_verified =
          false,
      (f) => f.solar_production_source.unrelated_buyer_verified = false,
      (f) =>
        f.solar_production_source.production_meter_record_reference =
          f.solar_production_source.unrelated_sale_invoice_reference,
      (f) => f.solar_dc_nameplate_kw = 0,
      (f) => f.ac_nameplate_kw = 0,
      (f) => f.facility_owned_by_filer = false,
      (f) => f.tax_exempt_bond_proceeds = 1,
      (f) => f.transfer_election_amount = 1,
      (f) => f.subject_to_passive_activity_limit = true,
    ];
    for (
      const key of [
        "small_facility_source",
        "early_construction_source",
        "pwa_source",
        "domestic_content_source",
        "energy_community_source",
      ]
    ) {
      if (input.f8835[0][key]) mutations.push((f) => delete f[key]);
    }
    for (const attachment of attachments) {
      await assertRejects(() =>
        f1040_2025.prepareReturn(
          pending,
          filer,
          attachments.filter((a) => a !== attachment),
        )
      );
    }
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate((changed.f8835 as any).f8835s[0]);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, attachments)
      );
      const fresh = {
        ...prepared.bundle,
        pending: changed,
        sourceSha256: await preparedSourceSha256(changed, filer),
      };
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", fresh)
      );
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8835_SOLAR_EVIDENCE_DIR");
    } catch { /* private evidence optional */ }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${c.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${c.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${c.id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            expected: { credits, produced, used, tax },
            origins,
            attachmentRejections: attachments.length,
            nativeRejections: mutations.length,
            pdfRejections: mutations.length,
          },
          null,
          2,
        ),
      );
      for (const a of attachments) {
        await Deno.writeFile(`${root}/${c.id}-${a.fileName}`, a.bytes);
      }
    }
  });
}
