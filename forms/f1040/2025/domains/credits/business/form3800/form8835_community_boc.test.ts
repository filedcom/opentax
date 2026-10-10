import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  communityBocCases,
  communityBocFixture,
} from "./form8835_community_boc.fixture.ts";
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

for (const c of communityBocCases) {
  Deno.test(`Form 8835 construction-date energy community complete return: ${c.id}`, async () => {
    const { input, attachments, expected } = await communityBocFixture(c);
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
    const history = (p: typeof pending) => source(p).construction_history;
    mutations.push(
      (p) => {
        delete source(p).construction_history;
      },
      (p) => {
        source(p).unit_locations_fixed_from_beginning_of_construction_verified =
          false;
      },
      (p) => {
        source(p).original_project_and_final_units_reconciled = false;
      },
      (p) => {
        history(p).earliest_qualifying_start_verified = false;
      },
      (p) => {
        const b = history(p).beginning;
        if (b.method === "five_percent") b.costs[1].eligible_cost_cents--;
        else b.work_began_on = "2022-12-31";
      },
      (p) => {
        const b = history(p).beginning;
        if (b.method === "five_percent") b.final_total_cost_cents++;
        else b.binding_contract_signed_on = b.work_began_on;
      },
      (p) => {
        const b = history(p).beginning;
        if (b.method === "five_percent") {
          b.paid_or_incurred_tax_timing_reviewed = false;
        } else b.significant_integral_physical_work_verified = false;
      },
    );
    if (c.history) {
      mutations.push((p) => {
        history(p).continuity.history[1].period_start = "2024-01-02";
      });
    }
    if (c.kind === "coal") {
      mutations.push((p) => {
        delete source(p).generating_units[0].qualification
          .historical_closure_review;
      });
    }
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
      root = Deno.env.get("FORM8835_COMMUNITY_BOC_EVIDENCE_DIR");
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

Deno.test("Form 8835 community construction: 2023 start, expired annual status, costs and continuity", async () => {
  const item = async (i: number) =>
    inputSchema.parse({
      f8835s: (await communityBocFixture(communityBocCases[i])).input.f8835,
    }).f8835s[0];
  const first = await item(0);
  assertEquals(calculateForm8835(first).line11, 300);
  const jan29 = await item(2);
  assertEquals(calculateForm8835(jan29).line11, 60);
  const source = jan29.energy_community_source as any;
  source.method = "annual_nameplate_capacity";
  delete source.construction_history;
  delete source.unit_locations_fixed_from_beginning_of_construction_verified;
  delete source.original_project_and_final_units_reconciled;
  delete source.independent_single_facility_reviewed;
  source.units_and_capacity_as_of_qualification_date_verified = true;
  source.qualification_date = "2025-01-01";
  assertThrows(() => calculateForm8835(jan29), Error, "does not qualify");
  const before = await item(2);
  const prior = before.energy_community_source as any;
  prior.qualification_date =
    prior.construction_began_on =
    before
      .facility_construction_start_date =
      "2022-12-31";
  prior.construction_history.beginning.work_began_on = "2022-12-31";
  assertThrows(() => calculateForm8835(before));
  const costs = await item(4);
  const s = costs.energy_community_source as any;
  s.construction_history.beginning.costs[0].eligible_cost_cents = 50000;
  s.construction_history.beginning.costs[1].eligible_cost_cents = 0;
  assertThrows(() => calculateForm8835(costs), Error, "first qualifying date");
  const historical = await item(3);
  (historical.energy_community_source as any).generating_units[0].qualification
    .notice_appendix = "2025-31-3";
  assertThrows(() => calculateForm8835(historical), Error, "does not qualify");
  const coal = await item(5);
  const closure =
    (coal.energy_community_source as any).generating_units[0].qualification
      .historical_closure_review;
  closure.closure_occurred_on = "2023-06-02";
  assertThrows(() => calculateForm8835(coal), Error, "does not qualify");
  closure.closure_occurred_on = "2009-12-31";
  assertThrows(() => calculateForm8835(coal), Error, "does not qualify");
  const history = await item(6);
  const h = (history.energy_community_source as any).construction_history;
  h.continuity.history[1].period_end = "2024-12-31";
  assertThrows(() => calculateForm8835(history), Error, "does not reach");
  const inconsistent = await item(0);
  (inconsistent.energy_community_source as any).construction_history.beginning
    .work_description += " Changed reviewed record";
  assertThrows(
    () => calculateForm8835(inconsistent),
    Error,
    "histories differ",
  );
});
