import {
  solarBondCases,
  solarBondFixture,
} from "./form8835_solar_bonds.fixture.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  preparedSourceSha256,
} from "../../../../return-processing/prepared-source.ts";
import { form8835Pdf } from "../../../../pdf/forms/credits/business/f8835.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

for (const c of solarBondCases) {
  Deno.test(`Form 8835 financed solar source-to-return: ${c.id}`, async () => {
    const { input, attachments, expected } = await solarBondFixture(c);
    const { credits, produced, used, tax } = expected;
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
      const solar = f.energy_type === "SOLAR";
      assertEquals(p.dc_solar, solar);
      assertEquals(
        p.dc_solar_nameplate_kw,
        solar ? f.solar_dc_nameplate_kw : undefined,
      );
      assertEquals(p.line1d_quantity, solar ? f.kwh_sold : undefined);
      assertEquals(
        p.line1d_credit,
        solar ? Math.round(f.kwh_sold * 6 / 1000) : undefined,
      );
      assertEquals(p.line5a, c.ratios[i].toFixed(2));
      const base = Math.round(f.kwh_sold * 6 / 1000);
      assertEquals(p.line5b, Math.round(base * c.ratios[i]));
      assertEquals(p.line5c, Math.round(base * .15));
      assertEquals(
        p.line5d,
        Math.min(Math.round(base * c.ratios[i]), Math.round(base * .15)),
      );
      assertEquals(p.line15, credits[i]);
      if (solar) {
        assertStringIncludes(
          prepared.bundle.xml,
          `<KwHrsPrdcdAndSoldSolarQty>${f.kwh_sold}</KwHrsPrdcdAndSoldSolarQty>`,
        );
      }
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
      (f) => delete f.tax_exempt_bond_source,
      (f) => f.tax_exempt_bond_proceeds++,
      (f) => f.aggregate_capital_additions++,
      (f) => f.tax_exempt_bond_source.facility_description = "Wrong facility",
      (f) => f.tax_exempt_bond_source.facility_address_line1 = "Wrong street",
      (f) => f.tax_exempt_bond_source.facility_latitude = 40,
      (f) => f.tax_exempt_bond_source.construction_began_on = "2024-12-31",
      (f) => f.tax_exempt_bond_source.as_of = "2024-12-31",
      (f) =>
        f.tax_exempt_bond_source
          .complete_current_and_prior_year_financing_confirmed = false,
      (f) =>
        f.tax_exempt_bond_source
          .complete_current_and_prior_year_capital_additions_confirmed = false,
      (f) => f.tax_exempt_bond_source.financing[0].proceeds_used += .01,
      (f) => f.tax_exempt_bond_source.financing.pop(),
      (f) => f.tax_exempt_bond_source.capital_additions.pop(),
      (f) =>
        f.tax_exempt_bond_source.capital_additions[0].added_on = "2026-01-01",
      (f) =>
        f.tax_exempt_bond_source.financing[0].used_for_facility_on =
          "2026-01-01",
      (f) => f.tax_exempt_bond_source.financing[0].issued_on = "2025-01-01",
      (f) =>
        f.tax_exempt_bond_source.financing[0].record_reference =
          f.tax_exempt_bond_source.capital_additions[0].record_reference,
      (f) =>
        f.tax_exempt_bond_source.financing[0]
          .section103_interest_exempt_verified = false,
      (f) => delete f.solar_production_source,
      (f) => f.solar_production_source.metered_kwh_produced++,
      (f) =>
        f.solar_production_source.section48_energy_credit_not_claimed_verified =
          false,
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
      root = Deno.env.get("FORM8835_SOLAR_BOND_EVIDENCE_DIR");
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
            expected,
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
