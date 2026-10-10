import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  communityCases,
  communityFixture,
} from "./form8835_community.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form8835Pdf } from "../../../../pdf/forms/credits/business/f8835.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";
import {
  calculateForm8835,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { energyCommunityCapacity } from "../../../../../nodes/inputs/credits/business/f8835/energy-community-source.ts";

for (const c of communityCases) {
  Deno.test(`Form 8835 annual energy community complete return: ${c.id}`, async () => {
    const { input, attachments, expected } = await communityFixture(c);
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
    const fields = form8835Pdf.instances!(
      pending.f8835!,
      filer,
      normalizeAllPending(pending),
      prepared.bundle.form3800Parts,
    );
    for (let i = 0; i < c.count; i++) {
      const base = Math.round(input.f8835[i].kwh_sold * .006) *
        (c.reason === "none" ? 1 : 5);
      assertEquals(fields[i].energy_community_bonus, true);
      assertEquals(fields[i].no_energy_community_bonus, false);
      assertEquals(fields[i].line9, base);
      assertEquals(fields[i].line10, c.domestic ? Math.round(base * .1) : 0);
      assertEquals(fields[i].line11, Math.round(base * .1));
      assertEquals(
        fields[i].line15,
        base + Math.round(base * .1) * (c.domestic ? 2 : 1),
      );
    }
    assertStringIncludes(
      prepared.bundle.xml,
      "<QlfyEgyComBonusCrInd>true</QlfyEgyComBonusCrInd>",
    );
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
    const source = (p: typeof pending) => item(p).energy_community_source;
    const mutations: Array<(p: typeof pending) => void> = [
      (p) => {
        delete item(p).energy_community_source;
      },
      (p) => {
        source(p).taxpayer_tin = "999999999";
      },
      (p) => {
        source(p).taxpayer_name = "Other Person";
      },
      (p) => {
        source(p).facility_city = "Other City";
      },
      (p) => {
        source(p).facility_latitude++;
      },
      (p) => {
        source(p).metered_kwh++;
      },
      (p) => {
        source(p).invoiced_kwh++;
      },
      (p) => {
        source(p).placed_in_service_on = "2023-12-31";
      },
      (p) => {
        source(p).qualification_date = "2024-12-31";
      },
      (p) => {
        source(p).complete_generating_unit_inventory_verified = false;
      },
      (p) => {
        source(p)
          .generating_units_unchanged_through_production_period_verified =
            false;
      },
      (p) => {
        source(p).generating_units[0].nameplate_kw_ac--;
        source(p).generating_units[1].nameplate_kw_ac++;
      },
      (p) => {
        source(p).generating_units[1].unit_reference =
          source(p).generating_units[0].unit_reference;
      },
      (p) => {
        source(p).generating_units[1].capacity_record_reference =
          source(p).generating_units[0].capacity_record_reference;
      },
      (p) => {
        source(p).generating_units[0].qualification = {
          category: "not_counted",
        };
      },
      (p) => {
        source(p).generating_units[0].us_or_territory_location_verified = false;
      },
      (p) => {
        source(p).method = "beginning_of_construction";
      },
    ];
    if (c.kind.includes("coal")) {
      mutations.push((p) => {
        source(p).generating_units[0].qualification.census_2020_tract_fips =
          "99999999999";
      });
    } else if (c.kind.includes("stat")) {
      mutations.push((p) => {
        source(p).generating_units[0].qualification.county_fips = "99999";
      });
    } else {mutations.push((p) => {
        source(p).generating_units[0].qualification
          .excluded_site_categories_absent_verified = false;
      });}
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, attachments)
      );
      const hash = await preparedSourceSha256(changed, filer);
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
          sourceSha256: hash,
        })
      );
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8835_COMMUNITY_EVIDENCE_DIR");
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
            fields,
            nativeRejections: mutations.length,
            pdfRejections: mutations.length,
          },
          null,
          2,
        ),
      );
    }
  });
}

Deno.test("Form 8835 community: exact half, published date/vintage, and brownfield safe harbors", async () => {
  const item = async (i: number) =>
    inputSchema.parse({
      f8835s: (await communityFixture(communityCases[i])).input.f8835,
    }).f8835s[0];
  const coal = await item(0);
  assertEquals(energyCommunityCapacity(coal.energy_community_source!), {
    total: 1800n,
    qualifying: 900n,
  });
  coal.energy_community_source!.generating_units[0].nameplate_kw_ac--;
  coal.energy_community_source!.generating_units[1].nameplate_kw_ac++;
  assertThrows(() => calculateForm8835(coal), Error, "50-percent");
  const earlyYear = await item(2);
  assertEquals(calculateForm8835(earlyYear).line11, 60); // no proration at June 22
  earlyYear.energy_community_source!.qualification_date = "2025-06-23";
  assertThrows(() => calculateForm8835(earlyYear), Error, "does not qualify");
  const newYear = await item(3);
  const q = newYear.energy_community_source!.generating_units[0].qualification;
  if (q.category !== "statistical_area") throw new Error("fixture category");
  q.vintage = "vintage1";
  assertThrows(() => calculateForm8835(newYear), Error, "does not qualify");
  q.vintage = "vintage2";
  newYear.energy_community_source!.qualification_date = "2025-06-22";
  assertThrows(() => calculateForm8835(newYear), Error, "does not qualify");
  const phase1 = await item(4);
  assertEquals(calculateForm8835(phase1).line11, 60);
  phase1.energy_community_source!.generating_units[1].nameplate_kw_ac++;
  assertThrows(() => calculateForm8835(phase1), Error, "does not qualify");
  phase1.energy_community_source!.generating_units[1].nameplate_kw_ac--;
  const brown =
    phase1.energy_community_source!.generating_units[0].qualification;
  if (brown.category !== "brownfield") throw new Error("fixture category");
  (brown.method as any)
    .presence_or_potential_contamination_identified_verified = false;
  assertThrows(() => inputSchema.parse({ f8835s: [phase1] }));
  (brown.method as any)
    .presence_or_potential_contamination_identified_verified = true;
  brown.report_completed_on = "2025-06-24";
  assertThrows(() => calculateForm8835(phase1), Error, "does not qualify");
  const newCoal = await item(1);
  newCoal.energy_community_source!.qualification_date = "2025-06-22";
  assertThrows(() => calculateForm8835(newCoal), Error, "does not qualify");
  const government = await item(7);
  const governmentReview = government.energy_community_source!
    .generating_units[0].qualification as any;
  governmentReview.method.government_level = "municipal";
  assertThrows(() => inputSchema.parse({ f8835s: [government] }));
  const phase2 = await item(5);
  assertEquals(calculateForm8835(phase2).line11, 60); // Phase II has no 5MW limit
});
