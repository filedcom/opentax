import { PDFDocument } from "pdf-lib";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { increasedFixture } from "./form8835_increased.fixture.ts";
import { earlyCases, earlyFixture } from "./form8835_early.fixture.ts";
import { domesticCases, domesticFixture } from "./form8835_domestic.fixture.ts";
import { communityFixture } from "./form8835_community.fixture.ts";
import { pwaCases, pwaFixture } from "./form8835_pwa.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  preparedSourceSha256,
  sha256Hex,
} from "../../../../return-processing/prepared-source.ts";
import { form8835Pdf } from "../../../../pdf/forms/credits/business/f8835.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

const cases = [
  {
    id: "solar-small-999-ac-1399-dc",
    make: () => increasedFixture(1, 100000, 999, true),
  },
  { id: "solar-early-physical", make: () => earlyFixture(earlyCases[0]) },
  { id: "solar-early-cost", make: () => earlyFixture(earlyCases[1]) },
  { id: "solar-domestic-base", make: () => domesticFixture(domesticCases[0]) },
  {
    id: "solar-small-both-bonuses",
    make: () =>
      communityFixture({
        id: "solar-both",
        kind: "phase_ii",
        reason: "small",
        capacity: 900,
        count: 1,
        kwh: 100000,
        domestic: true,
      }),
  },
  { id: "solar-pwa-current-repairs", make: () => pwaFixture(pwaCases[1]) },
  { id: "solar-pwa-two-both-bonuses", make: () => pwaFixture(pwaCases[7]) },
];

for (const c of cases) {
  Deno.test(`Form 8835 solar source-to-return: ${c.id}`, async () => {
    const fixture = await c.make();
    const input: any = fixture.input;
    const { attachments } = fixture;
    for (const f of input.f8835) {
      f.energy_type = "SOLAR";
      f.solar_dc_nameplate_kw = Math.ceil(f.ac_nameplate_kw * 1.4);
      const s = f.small_facility_source ?? f.early_construction_source ??
        f.pwa_source;
      f.solar_production_source = {
        facility_description: f.facility_description,
        construction_record_reference: s?.construction_record_reference ??
          "Synthetic solar construction",
        construction_began_on: f.facility_construction_start_date,
        production_meter_record_reference: s?.production_meter_reference ??
          "Synthetic solar production meter",
        meter_period_start_date: f.production_period_start_date,
        meter_period_end_date: f.production_period_end_date,
        metered_kwh_produced: f.kwh_produced,
        unrelated_sale_invoice_reference: s?.unrelated_sale_invoice_reference ??
          "Synthetic solar invoice",
        unrelated_sale_invoice_date: f.production_period_end_date,
        invoiced_kwh_sold: f.kwh_sold,
        unrelated_buyer_verified: true,
        section48_energy_credit_not_claimed_verified: true,
      };
    }
    for (const f of input.f8835) {
      if (!f.domestic_content_source) continue;
      const source = f.domestic_content_source;
      const attachment = attachments.find((a) =>
        a.fileName === source.statement_file_name
      )!;
      const pdf = await PDFDocument.load(attachment.bytes);
      pdf.getForm().getTextField("Form8835Domestic.FacilityType").setText(
        "Solar energy facility",
      );
      attachment.bytes = await pdf.save();
      source.statement_sha256 = await sha256Hex(attachment.bytes);
      if (source.prior_certification) {
        source.prior_certification.originally_submitted_sha256 =
          source.statement_sha256;
      }
    }
    for (const f of input.form3800_current_production_allocation.facilities) {
      f.energy_type = "SOLAR";
    }
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
