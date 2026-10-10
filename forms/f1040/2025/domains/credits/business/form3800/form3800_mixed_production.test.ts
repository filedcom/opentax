import {
  assertEquals,
  assertExists,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form3800Pdf } from "../../../../pdf/forms/credits/business/f3800/f3800.ts";
import { form3800PartVFields } from "../../../../pdf/forms/credits/business/f3800/f3800_fields.ts";
import { projectForm3800PartVFields } from "../../../../pdf/forms/credits/business/f3800/f3800_detail_projection.ts";

import { fixture } from "./form3800_k1_inventory.fixture.ts";

import {
  type Feedstock,
  feedstockFields,
} from "./form3800_feedstock.fixture.ts";

interface Case {
  id: string;
  count: number;
  credit: number;
  mixed: boolean;
  facilities: number;
  kwh?: number;
  review?: boolean;
  lastFirst?: boolean;
  dates?: readonly (readonly [string, string])[];
  periodEnd?: string;
  closed?: boolean;
  feedstock?: Feedstock;
  lessee?: boolean;
}
function productionAmount(
  facility: {
    kwh_sold: number;
    energy_type: string;
    facility_placed_in_service_date: string;
    facility_construction_start_date: string;
  },
) {
  const old = facility.facility_placed_in_service_date < "2022-01-01";
  const half = ["BIOMASS_OPEN", "LANDFILL", "TRASH"].includes(
    facility.energy_type,
  );
  const gross = Math.round(
    facility.kwh_sold * (old ? .03 : .006) * (half ? .5 : 1),
  );
  const year = Number(facility.facility_construction_start_date.slice(0, 4));
  const reduction = old && facility.energy_type === "WIND"
    ? (year === 2017
      ? .2
      : year === 2019
      ? .6
      : [2018, 2020, 2021].includes(year)
      ? .4
      : 0)
    : 0;
  return gross - Math.round(gross * reduction);
}
function productionLine(
  facility: {
    facility_placed_in_service_date: string;
    production_period_end_date: string;
  },
): "1f" | "4e" {
  const anniversary =
    String(Number(facility.facility_placed_in_service_date.slice(0, 4)) + 4) +
    facility.facility_placed_in_service_date.slice(4);
  return facility.production_period_end_date < anniversary ? "4e" : "1f";
}
const cases: Case[] = [
  {
    id: "feedstock-cellulosic-owned",
    count: 2,
    credit: 1000,
    mixed: false,
    facilities: 1,
    feedstock: "cellulosic",
  },
  {
    id: "feedstock-livestock-owned",
    count: 2,
    credit: 1000,
    mixed: false,
    facilities: 1,
    feedstock: "livestock",
  },
  {
    id: "feedstock-cellulosic-lessee",
    count: 16,
    credit: 1000,
    mixed: true,
    facilities: 1,
    kwh: 6000000,
    feedstock: "cellulosic",
    lessee: true,
  },
  {
    id: "feedstock-livestock-lessee",
    count: 14,
    credit: 1000,
    mixed: true,
    facilities: 2,
    kwh: 6000000,
    feedstock: "livestock",
    lessee: true,
    review: true,
  },
  {
    id: "feedstock-landfill",
    count: 30,
    credit: 500,
    mixed: true,
    facilities: 1,
    kwh: 6000000,
    feedstock: "landfill",
  },
  {
    id: "feedstock-trash",
    count: 15,
    credit: 1000,
    mixed: true,
    facilities: 2,
    kwh: 6000000,
    feedstock: "trash",
    review: true,
  },
  {
    id: "feedstock-mixed-reviewed",
    count: 30,
    credit: 500,
    mixed: true,
    facilities: 4,
    kwh: 6000000,
    feedstock: "mixed",
    lessee: true,
    review: true,
    lastFirst: true,
  },
  {
    id: "later-closed-biomass",
    count: 2,
    credit: 1000,
    mixed: false,
    facilities: 1,
    kwh: 100000,
    closed: true,
    dates: [["2016-06-01", "2017-01-01"]],
  },
  {
    id: "later-geothermal-full",
    count: 2,
    credit: 1000,
    mixed: false,
    facilities: 1,
    kwh: 100000,
    dates: [["2015-12-01", "2016-01-01"]],
  },
  {
    id: "later-wind-20",
    count: 2,
    credit: 1000,
    mixed: true,
    facilities: 1,
    kwh: 100000,
    dates: [["2017-06-01", "2018-01-01"]],
  },
  {
    id: "later-wind-40-limited",
    count: 2,
    credit: 10000,
    mixed: true,
    facilities: 1,
    kwh: 1000000,
    dates: [["2018-06-01", "2020-01-01"]],
  },
  {
    id: "later-wind-60-limited",
    count: 16,
    credit: 1000,
    mixed: true,
    facilities: 1,
    kwh: 1000000,
    dates: [["2019-06-01", "2021-01-01"]],
  },
  {
    id: "later-mixed-single-per-class",
    count: 14,
    credit: 1000,
    mixed: true,
    facilities: 2,
    kwh: 100000,
    dates: [["2017-06-01", "2020-01-01"], ["2023-06-01", "2024-01-01"]],
  },
  {
    id: "later-mixed-reviewed",
    count: 30,
    credit: 500,
    mixed: true,
    facilities: 4,
    kwh: 3000000,
    review: true,
    lastFirst: true,
    dates: [["2016-06-01", "2020-01-01"], ["2017-06-01", "2020-01-01"], [
      "2023-06-01",
      "2024-01-01",
    ], ["2023-06-01", "2024-01-01"]],
  },
  {
    id: "later-first-four-period",
    count: 2,
    credit: 1000,
    mixed: false,
    facilities: 1,
    kwh: 100000,
    dates: [["2020-06-01", "2021-07-01"]],
    periodEnd: "2025-06-30",
  },
  {
    id: "review-two-full",
    count: 2,
    credit: 1000,
    mixed: false,
    facilities: 2,
    kwh: 100000,
    review: true,
  },
  {
    id: "review-two-partial",
    count: 2,
    credit: 10000,
    mixed: true,
    facilities: 2,
    kwh: 3000000,
    review: true,
  },
  {
    id: "review-fourteen-full",
    count: 14,
    credit: 100,
    mixed: true,
    facilities: 2,
    kwh: 100000,
    review: true,
  },
  {
    id: "review-fourteen-partial",
    count: 14,
    credit: 1000,
    mixed: false,
    facilities: 2,
    kwh: 3000000,
    review: true,
  },
  {
    id: "review-fifteen-partial",
    count: 15,
    credit: 1000,
    mixed: true,
    facilities: 2,
    kwh: 3000000,
    review: true,
  },
  {
    id: "review-thirty-partial",
    count: 30,
    credit: 500,
    mixed: true,
    facilities: 3,
    kwh: 3000000,
    review: true,
    lastFirst: true,
  },
  {
    id: "production-limited-two-full",
    count: 2,
    credit: 1000,
    mixed: false,
    facilities: 1,
    kwh: 5000000,
  },
  {
    id: "production-limited-two-partial",
    count: 2,
    credit: 10000,
    mixed: true,
    facilities: 1,
    kwh: 5000000,
  },
  {
    id: "production-limited-sixteen-partial",
    count: 16,
    credit: 1000,
    mixed: true,
    facilities: 1,
    kwh: 5000000,
  },
  { id: "two-full", count: 2, credit: 1000, mixed: false, facilities: 1 },
  { id: "two-partial", count: 2, credit: 10000, mixed: true, facilities: 1 },
  { id: "fourteen-full", count: 14, credit: 100, mixed: false, facilities: 2 },
  {
    id: "fourteen-partial",
    count: 14,
    credit: 1000,
    mixed: false,
    facilities: 2,
  },
  {
    id: "fifteen-partial",
    count: 15,
    credit: 1000,
    mixed: true,
    facilities: 2,
  },
  { id: "thirty-partial", count: 30, credit: 500, mixed: true, facilities: 2 },
];
function reviewedFixture(test: typeof cases[number]) {
  const input = fixture(test);
  const sources = [
    ...input.k1_partnership.map((k) => ({
      source_type: "partnership" as const,
      source_ein: k.partnership_ein,
      source_document_reference: k.source_document_reference,
      credit_amount: k.box15_code_z_orphan_drug_credit,
    })),
    ...(input.k1_s_corp ?? []).map((k) => ({
      source_type: "s_corporation" as const,
      source_ein: k.corporation_ein,
      source_document_reference: k.source_document_reference,
      credit_amount: k.box13_code_z_orphan_drug_credit,
    })),
  ].sort((a, b) => a.source_ein.localeCompare(b.source_ein));
  const expectedOrdinaryProduction = Array.from(
    { length: test.facilities },
    (_, index) => {
      const service = test.dates?.[index]?.[1] ?? "2024-01-01";
      const construction = test.dates?.[index]?.[0] ?? "2023-06-01";
      const facility = {
        energy_type: test.closed
          ? "BIOMASS_CLOSED"
          : (test.review ? index % 2 === 1 : (index === 1 || test.kwh)) &&
              test.mixed
          ? "WIND"
          : "GEOTHERMAL",
        kwh_sold: (test.kwh ?? 100000) + index * 10000,
        facility_placed_in_service_date: service,
        facility_construction_start_date: construction,
        production_period_end_date: test.periodEnd ?? "2025-12-31",
      };
      return productionLine(facility) === "1f" ? productionAmount(facility) : 0;
    },
  ).reduce((a, b) => a + b, 0);
  let remaining = Math.max(0, 8973 - expectedOrdinaryProduction);
  const allocated = sources.map((source) => {
    const applied_credit = Math.min(remaining, source.credit_amount);
    remaining -= applied_credit;
    return { ...source, applied_credit };
  });
  // The review deliberately uses a different order than either node's K-1 list.
  const combined = {
    ...input,
    f8835: Array.from({ length: test.facilities }, (_, index) => ({
      energy_type: test.closed
        ? "BIOMASS_CLOSED"
        : (test.review ? index % 2 === 1 : (index === 1 || test.kwh)) &&
            test.mixed
        ? "WIND"
        : "GEOTHERMAL",
      ...(test.closed
        ? {
          closed_loop_biomass_source: {
            facility_description: `Synthetic production facility ${index + 1}`,
            planting_record_reference: `Synthetic planting record ${index + 1}`,
            planted_exclusively_for_facility_verified: true,
            original_facility_not_cofired_verified: true,
            production_meter_record_reference: `Synthetic meter ${index + 1}`,
            metered_kwh_produced: (test.kwh ?? 100000) + index * 10000,
            unrelated_sale_invoice_reference: `Synthetic utility invoice ${
              index + 1
            }`,
            invoiced_kwh_sold: (test.kwh ?? 100000) + index * 10000,
            unrelated_buyer_verified: true,
            no_investment_credit_election_verified: true,
            no_section1603_grant_verified: true,
          },
        }
        : {}),
      subject_to_passive_activity_limit: false,
      kwh_produced: (test.kwh ?? 100000) + index * 10000,
      kwh_sold: (test.kwh ?? 100000) + index * 10000,
      facility_description: `Synthetic production facility ${index + 1}`,
      facility_us_address: {
        line1: `${10 + index} Plant Road`,
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      },
      facility_latitude: (39123456 + index * 100000) / 1000000,
      facility_longitude: -75.123456,
      facility_owned_by_filer: true,
      ac_nameplate_kw: 1500,
      maximum_net_output_mw: 1.5,
      facility_placed_in_service_date: test.dates?.[index]?.[1] ?? "2024-01-01",
      facility_construction_start_date: test.dates?.[index]?.[0] ??
        "2023-06-01",
      production_period_start_date: "2025-01-01",
      production_period_end_date: test.periodEnd ?? "2025-12-31",
      increased_credit_reason: "none",
      domestic_content_bonus: false,
      energy_community_bonus: false,
      is_fiscal_year: false,
      ...feedstockFields(
        test.feedstock,
        index,
        (test.kwh ?? 100000) + index * 10000,
        test.lessee,
      ),
    })),
    form3800_current_orphan_allocation: {
      tax_year: 2025 as const,
      return_primary_ssn: "111223333",
      review_reference:
        "Synthetic reviewed source-by-source current credit use",
      complete_current_orphan_drug_inventory_confirmed: true as const,
      sources: allocated.reverse(),
    },
  };
  const facilityReview = combined.f8835.map((facility) => ({
    facility_description: facility.facility_description,
    facility_us_address: facility.facility_us_address,
    facility_latitude: facility.facility_latitude,
    facility_longitude: facility.facility_longitude,
    energy_type: facility.energy_type,
    facility_placed_in_service_date: facility.facility_placed_in_service_date,
    production_period_start_date: facility.production_period_start_date,
    production_period_end_date: facility.production_period_end_date,
    form3800_line: productionLine(facility),
    credit_amount: productionAmount(facility),
    applied_credit: 0,
  })).reverse();
  const ordinaryUsed = Math.min(8973, expectedOrdinaryProduction);
  for (const line of ["1f", "4e"] as const) {
    const group = facilityReview.filter((f) => f.form3800_line === line);
    let remaining = Math.min(
      group.reduce((s, f) => s + f.credit_amount, 0),
      line === "1f" ? 8973 : 25050 - ordinaryUsed -
        allocated.reduce((s, f) => s + f.applied_credit, 0),
    );
    group.forEach((facility, index) => {
      const share = test.lastFirst
        ? remaining
        : Math.floor(remaining / (group.length - index));
      facility.applied_credit = Math.min(facility.credit_amount, share);
      remaining -= facility.applied_credit;
    });
    for (const facility of group) {
      const extra = Math.min(
        remaining,
        facility.credit_amount - facility.applied_credit,
      );
      facility.applied_credit += extra;
      remaining -= extra;
    }
    assertEquals(remaining, 0);
  }
  return {
    ...combined,
    ...(test.review
      ? {
        form3800_current_production_allocation: {
          tax_year: 2025 as const,
          return_primary_ssn: "111223333",
          review_reference: "Synthetic complete facility tax-use review",
          complete_current_production_inventory_confirmed: true as const,
          facilities: facilityReview,
        },
      }
      : {}),
  };
}
function evidenceRoot() {
  try {
    return Deno.env.get("FORM3800_PRODUCTION_EVIDENCE");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}
for (const test of cases) {
  Deno.test(`Form 3800 mixed K-1 and production-credit inventory: ${test.id}`, async () => {
    const input = reviewedFixture(test);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const total = test.count * test.credit + test.count * (test.count - 1) / 2;
    // Single filer: 150,000 wages less 15,750 deduction; AMT exemption 88,100.
    const regular = 25067, tmt = 16094;
    const productionByLine = (line: "1f" | "4e") =>
      input.f8835.filter((f) => productionLine(f) === line).reduce(
        (s, f) => s + productionAmount(f),
        0,
      );
    const ordinaryProductionAllowed = Math.min(
      productionByLine("1f"),
      regular - tmt,
    );
    const orphanAllowed = Math.min(
      total,
      regular - tmt - ordinaryProductionAllowed,
    );
    const productionCredit = productionByLine("1f") + productionByLine("4e");
    const specifiedProductionAllowed = Math.min(
      productionByLine("4e"),
      25050 - ordinaryProductionAllowed - orphanAllowed,
    );
    const productionAllowed = ordinaryProductionAllowed +
      specifiedProductionAllowed;
    const allowed = orphanAllowed + productionAllowed;
    const counts = {
      "1f": input.f8835.filter((f) => productionLine(f) === "1f").length,
      "4e": input.f8835.filter((f) => productionLine(f) === "4e").length,
    };
    const partVCount = test.count +
      Object.values(counts).reduce((s, n) => s + (n > 1 ? n : 0), 0);
    assertEquals(pending.f1040.line16_income_tax, regular);
    assertEquals(pending.schedule3.line6a_total, allowed);
    assertEquals(pending.f1040.line20_nonrefundable_credits, allowed);
    assertEquals(pending.f1040.line24_total_tax, regular - allowed);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    const parts = prepared.bundle.form3800Parts;
    assertExists(parts);
    assertEquals(parts.currentDetails.length, test.count + test.facilities);
    assertEquals(parts.lines.line17, orphanAllowed + ordinaryProductionAllowed);
    assertEquals(parts.lines.line30 ?? 0, productionByLine("4e"));
    assertEquals(parts.lines.line37 ?? 0, specifiedProductionAllowed);
    assertEquals(
      parts.currentDetails.reduce((s, r) => s + r.credit, 0),
      total + productionCredit,
    );
    assertEquals(
      parts.currentDetails.reduce((s, r) => s + r.appliedCredit, 0),
      allowed,
    );
    const instances = form3800Pdf.instances!(
      pending.f3800,
      filer,
      pending,
      parts,
    );
    assertEquals(instances.length, Math.ceil(partVCount / 15));
    const printed = instances.flatMap((fields) =>
      Array.from({ length: 15 }, (_, i) => {
        const keys = form3800PartVFields(i + 1);
        return {
          line: fields[keys.a],
          ein: fields[keys.c1],
          credit: fields[keys.e],
          used: fields[keys.i1],
          unused: fields[keys.k],
        };
      }).filter((r) => r.line !== undefined)
    );
    assertEquals(printed.length, partVCount);
    assertEquals(
      printed.map((r) => [r.ein, r.credit, r.used, r.unused]).sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
      ),
      parts.currentDetails.filter((r) =>
        r.line === "1h" || counts[r.line as "1f" | "4e"] > 1
      )
        .map(
          (r) => [
            r.passThroughEin,
            r.credit,
            r.appliedCredit,
            r.credit - r.appliedCredit,
          ],
        ).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    );
    if (partVCount > 15) {
      assertThrows(
        () => projectForm3800PartVFields(parts),
        Error,
        "continuation",
      );
    }
    const missing = {
      ...parts,
      currentDetails: parts.currentDetails.slice(0, -1),
    };
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, filer, pending, missing),
      Error,
    );
    const swapped = {
      ...parts,
      currentDetails: parts.currentDetails.map((row) =>
        row.line === "1h" &&
          row.passThroughEin ===
            parts.currentDetails.filter((r) => r.line === "1h").at(-1)
              ?.passThroughEin
          ? { ...row, passThroughEin: "999999999" }
          : row
      ),
    };
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, filer, pending, swapped),
      Error,
    );
    const wrongTaxUse = {
      ...parts,
      currentDetails: parts.currentDetails.map((row, index) =>
        index === 0
          ? { ...row, appliedCredit: row.appliedCredit - 1 }
          : index === test.count - 1
          ? { ...row, appliedCredit: row.appliedCredit + 1 }
          : row
      ),
    };
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, filer, pending, wrongTaxUse),
      Error,
    );
    assertEquals(
      parts.currentDetails.filter((row) => row.line === "1h").map((row) =>
        row.appliedCredit
      ),
      parts.currentDetails.filter((row) => row.line === "1h").map((row) =>
        input.form3800_current_orphan_allocation.sources.find((source) =>
          source.source_ein === row.passThroughEin
        )!.applied_credit
      ),
    );
    const wrongProductionLink = {
      ...parts,
      currentDetails: parts.currentDetails.map((row) =>
        (row.line === "4e" || row.line === "1f")
          ? { ...row, sourceDocumentId: "ChangedProductionDocument" }
          : row
      ),
    };
    assertThrows(
      () =>
        form3800Pdf.instances!(
          pending.f3800,
          filer,
          pending,
          wrongProductionLink,
        ),
      Error,
    );
    // Keep the aggregate and detail mutually consistent but contradict final tax.
    const wrongProductionUse = {
      ...parts,
      currentDetails: parts.currentDetails.map((row) =>
        (row.line === "4e" || row.line === "1f")
          ? { ...row, appliedCredit: row.appliedCredit - 1 }
          : row
      ),
      currentAmounts: parts.currentAmounts.map((row) =>
        (row.line === "4e" || row.line === "1f")
          ? { ...row, appliedCredit: row.appliedCredit - test.facilities }
          : row
      ),
    };
    assertThrows(
      () =>
        form3800Pdf.instances!(
          pending.f3800,
          filer,
          pending,
          wrongProductionUse,
        ),
      Error,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      origins.filter((o) => o.formKey === "f3800").length,
      9 + Math.ceil(partVCount / 15) - 1,
    );
    const mutations: Array<(p: typeof pending) => void> = [
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows[rows.length - 1].box15_code_z_orphan_drug_credit = 1;
      },
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows.pop();
      },
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows[0].source_document_reference = "Changed source";
      },
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows.push(structuredClone(rows[0]));
      },
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows[0].orphan_drug_credit_subject_to_passive_activity_limit = true;
      },
      (p) => {
        p.f3800.form8820_applied_credits_by_source = parts.currentDetails.map((
          row,
          i,
        ) => row.credit + Number(i === test.count - 1));
      },
      (p) => {
        Reflect.deleteProperty(p.f3800, "current_orphan_allocation_review");
      },
      (p) => {
        Reflect.deleteProperty(p, "form3800_current_orphan_allocation");
      },
      (p) => {
        p.form3800_current_orphan_allocation.return_primary_ssn = "999887777";
      },
      (p) => {
        p.form3800_current_orphan_allocation.review_reference =
          "Changed retained review";
      },
      (p) => {
        const facilities = p.f8835.f8835s as Array<Record<string, unknown>>;
        facilities[0].kwh_sold = 90000;
      },
      (p) => {
        Reflect.deleteProperty(p, "f8835");
      },
      (p) => {
        p.f1040.line20_nonrefundable_credits = allowed + 1;
      },
      (p) => {
        p.schedule3.line6a_total = allowed + 1;
      },
    ];
    if (test.review) {
      mutations.push(
        (p) => {
          Reflect.deleteProperty(p, "form3800_current_production_allocation");
        },
        (p) => {
          Reflect.deleteProperty(
            p.f3800,
            "current_production_allocation_review",
          );
        },
        (p) => {
          p.form3800_current_production_allocation.return_primary_ssn =
            "999887777";
        },
        (p) => {
          p.form3800_current_production_allocation.review_reference =
            "Changed review";
        },
        (p) => {
          const review = p.f3800.current_production_allocation_review as Record<
            string,
            unknown
          >;
          const rows = review.facilities as Array<Record<string, unknown>>;
          rows.pop();
          p.form3800_current_production_allocation = structuredClone(review);
        },
        (p) => {
          const review = p.f3800.current_production_allocation_review as Record<
            string,
            unknown
          >;
          const rows = review.facilities as Array<Record<string, unknown>>;
          rows[0].applied_credit = Number(rows[0].applied_credit) + 1;
          p.form3800_current_production_allocation = structuredClone(review);
        },
        (p) => {
          const review = p.f3800.current_production_allocation_review as Record<
            string,
            unknown
          >;
          const rows = review.facilities as Array<Record<string, unknown>>;
          rows[0].facility_description = "Changed facility";
          p.form3800_current_production_allocation = structuredClone(review);
        },
        (p) => {
          const review = p.f3800.current_production_allocation_review as Record<
            string,
            unknown
          >;
          const rows = review.facilities as Array<Record<string, unknown>>;
          rows[0].facility_latitude = 40;
          p.form3800_current_production_allocation = structuredClone(review);
        },
        (p) => {
          const review = p.f3800.current_production_allocation_review as Record<
            string,
            unknown
          >;
          const rows = review.facilities as Array<Record<string, unknown>>;
          rows[0] = structuredClone(rows[1]);
          p.form3800_current_production_allocation = structuredClone(review);
        },
        (p) => {
          p.f3800.form8835_applied_credits_by_facility = input
            .form3800_current_production_allocation!.facilities.map((r) =>
              r.applied_credit + 1
            );
        },
      );
    }
    if (test.feedstock) {
      const sourceKeys = [
        "open_loop_cellulosic_source",
        "open_loop_livestock_source",
        "landfill_gas_source",
        "trash_combustion_source",
      ];
      const changeSource =
        (change: (source: Record<string, unknown>) => void) =>
        (p: typeof pending) => {
          const facilities = p.f8835.f8835s as Array<Record<string, unknown>>;
          const key = sourceKeys.find((key) =>
            facilities[0][key] !== undefined
          )!;
          change(facilities[0][key] as Record<string, unknown>);
        };
      mutations.push(
        changeSource((s) => {
          s.metered_kwh_produced = 1;
        }),
        changeSource((s) => {
          s.invoiced_kwh_sold = 1;
        }),
        changeSource((s) => {
          s.meter_period_end_date = "2025-11-30";
        }),
        changeSource((s) => {
          s.unrelated_sale_invoice_date = "2026-01-01";
        }),
        changeSource((s) => {
          s.unrelated_sale_invoice_reference =
            s.production_meter_record_reference;
        }),
        changeSource((s) => {
          s.unrelated_buyer_verified = false;
        }),
        changeSource((s) => {
          s.facility_description = "Changed facility";
        }),
        (p) => {
          const fs = p.f8835.f8835s as Array<Record<string, unknown>>;
          for (const key of sourceKeys) Reflect.deleteProperty(fs[0], key);
        },
      );
      if (test.lessee) {
        mutations.push(
          (p) => {
            const f = (p.f8835.f8835s as Array<Record<string, unknown>>)[0];
            (f.facility_owner_business as Record<string, unknown>).ein =
              "999999999";
          },
          (p) => {
            const f = (p.f8835.f8835s as Array<Record<string, unknown>>)[0];
            Reflect.deleteProperty(f, "open_loop_nonowner_lessee_source");
          },
          (p) => {
            const f = (p.f8835.f8835s as Array<Record<string, unknown>>)[0];
            (f.open_loop_nonowner_lessee_source as Record<string, unknown>)
              .owner_not_producer_or_claimant_for_2025_verified = false;
          },
        );
      }
    }
    if (test.dates) {
      mutations.push(
        (p) => {
          const f = (p.f8835.f8835s as Array<Record<string, unknown>>)[0];
          f.facility_construction_start_date = "2014-01-01";
          f.facility_placed_in_service_date = "2015-01-01";
        },
        (p) => {
          const entries = p.f3800.f8835_credit_entries as Array<
            Record<string, unknown>
          >;
          entries[0].form3800_line = entries[0].form3800_line === "1f"
            ? "4e"
            : "1f";
        },
        (p) => {
          const f = (p.f8835.f8835s as Array<Record<string, unknown>>)[0];
          f.facility_placed_in_service_date = "2021-07-01";
          f.production_period_end_date = "2025-12-31";
        },
      );
    }
    for (const mutation of mutations) {
      const p = structuredClone(pending);
      mutation(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, filer), Error);
      await assertRejects(() => buildPdfBytes(p, filer), Error);
    }
    const root = evidenceRoot();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${test.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${test.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${test.id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            parts,
            origins,
            printed,
            expected: {
              total,
              productionCredit,
              productionAllowed,
              ordinaryProductionAllowed,
              specifiedProductionAllowed,
              orphanAllowed,
              regular,
              tmt,
              allowed,
              tax: regular - allowed,
            },
            rejectedNative: mutations.length,
            rejectedPdf: mutations.length,
            rejectedPrepared: 5,
          },
          null,
          2,
        ),
      );
    }
  });
}
