import { fixture } from "./form3800_k1_inventory.fixture.ts";
import { attachReviewedTransfers } from "./form8835_transfers.fixture.ts";

export const mixedTransferCases = [
  {
    id: "mixed-transfer-old-geo",
    sources: 2,
    orphan: 1000,
    rows: [["GEOTHERMAL", "2015-12-01", "2016-01-01", 100000, 1000]],
  },
  {
    id: "mixed-transfer-wind-limit",
    sources: 2,
    orphan: 1000,
    rows: [["WIND", "2017-06-01", "2018-01-01", 1000000, 10000]],
  },
  {
    id: "mixed-transfer-both-classes",
    sources: 2,
    orphan: 1000,
    rows: [["GEOTHERMAL", "2016-06-01", "2020-01-01", 3000000, 20000], [
      "GEOTHERMAL",
      "2023-06-01",
      "2024-01-01",
      3000000,
      5000,
    ]],
  },
  {
    id: "mixed-transfer-full-specified",
    sources: 2,
    orphan: 1000,
    rows: [["WIND", "2018-06-01", "2020-01-01", 1000000, 9000], [
      "GEOTHERMAL",
      "2023-06-01",
      "2024-01-01",
      3000000,
      18000,
    ]],
  },
  {
    id: "mixed-transfer-overflow",
    sources: 14,
    orphan: 100,
    rows: [
      ["GEOTHERMAL", "2016-06-01", "2020-01-01", 100000, 1000],
      ["WIND", "2017-06-01", "2020-01-01", 110000, 640],
      ["GEOTHERMAL", "2023-06-01", "2024-01-01", 120000, 220],
      ["WIND", "2023-06-01", "2024-01-01", 130000, 280],
    ],
  },
] as const;

export async function mixedTransferFixture(
  c: typeof mixedTransferCases[number],
) {
  const base = fixture({ count: c.sources, credit: c.orphan, mixed: true });
  const f8835: any[] = c.rows.map((
    [energy, construction, service, kwh],
    i,
  ) => ({
    energy_type: energy,
    subject_to_passive_activity_limit: false,
    kwh_produced: kwh,
    kwh_sold: kwh,
    facility_description: `Synthetic transfer facility ${i + 1}`,
    facility_us_address: {
      line1: `${10 + i} Plant Road`,
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    facility_latitude: (39123456 + i * 100000) / 1000000,
    facility_longitude: -75.123456,
    facility_owned_by_filer: true,
    ac_nameplate_kw: 1500,
    maximum_net_output_mw: 1.5,
    facility_placed_in_service_date: service,
    facility_construction_start_date: construction,
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none",
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
  }));
  // Independent expected rates and wind reductions, not the production calculator.
  const credits = c.rows.map(([energy, construction, service, kwh]) => {
    const gross = Math.round(kwh * (service < "2022-01-01" ? .03 : .006));
    const year = construction.slice(0, 4);
    const phaseout = energy === "WIND" && service < "2022-01-01"
      ? year === "2017"
        ? .2
        : year === "2019"
        ? .6
        : ["2018", "2020", "2021"].includes(year)
        ? .4
        : 0
      : 0;
    return gross - Math.round(gross * phaseout);
  });
  const transfers = c.rows.map((r) => r[4]);
  const lines = c.rows.map((r) => r[2] < "2022-01-01" ? "1f" : "4e");
  const total = (line: string) =>
    credits.reduce(
      (s, v, i) => s + (lines[i] === line ? v - transfers[i] : 0),
      0,
    );
  const ordinaryUsed = Math.min(8973, total("1f"));
  const orphanTotal = c.sources * c.orphan + c.sources * (c.sources - 1) / 2;
  const orphanUsed = Math.min(orphanTotal, 8973 - ordinaryUsed);
  const specifiedUsed = Math.min(
    total("4e"),
    25050 - ordinaryUsed - orphanUsed,
  );
  let orphanRemaining = orphanUsed;
  const sources = [
    ...base.k1_partnership.map((k) => ({
      source_type: "partnership",
      source_ein: k.partnership_ein,
      source_document_reference: k.source_document_reference,
      credit_amount: k.box15_code_z_orphan_drug_credit,
    })),
    ...(base.k1_s_corp ?? []).map((k) => ({
      source_type: "s_corporation",
      source_ein: k.corporation_ein,
      source_document_reference: k.source_document_reference,
      credit_amount: k.box13_code_z_orphan_drug_credit,
    })),
  ].sort((a, b) => a.source_ein.localeCompare(b.source_ein)).map((s) => {
    const applied_credit = Math.min(orphanRemaining, s.credit_amount);
    orphanRemaining -= applied_credit;
    return { ...s, applied_credit };
  }).reverse();
  const remaining: Record<string, number> = {
    "1f": ordinaryUsed,
    "4e": specifiedUsed,
  };
  const facilities = f8835.map((f, i) => ({
    facility_description: f.facility_description,
    facility_us_address: f.facility_us_address,
    facility_latitude: f.facility_latitude,
    facility_longitude: f.facility_longitude,
    energy_type: f.energy_type,
    facility_placed_in_service_date: f.facility_placed_in_service_date,
    production_period_start_date: f.production_period_start_date,
    production_period_end_date: f.production_period_end_date,
    form3800_line: lines[i],
    credit_amount: credits[i],
    transfer_out_amount: transfers[i],
    applied_credit: 0,
  })).reverse().map((f) => {
    f.applied_credit = Math.min(
      remaining[f.form3800_line],
      f.credit_amount - f.transfer_out_amount,
    );
    remaining[f.form3800_line] -= f.applied_credit;
    return f;
  });
  const input = {
    ...base,
    f8835,
    form3800_current_orphan_allocation: {
      tax_year: 2025,
      return_primary_ssn: "111223333",
      review_reference: "Synthetic complete K-1 use review",
      complete_current_orphan_drug_inventory_confirmed: true,
      sources,
    },
    form3800_current_production_allocation: {
      tax_year: 2025,
      return_primary_ssn: "111223333",
      review_reference: "Synthetic complete production use review",
      complete_current_production_inventory_confirmed: true,
      facilities,
    },
  };
  const attachments: Array<
    { fileName: string; description: string; bytes: Uint8Array }
  > = [];
  await attachReviewedTransfers(input, attachments, transfers.map((v) => [v]));
  return {
    input,
    attachments,
    expected: {
      credits,
      transfers,
      lines,
      ordinaryUsed,
      orphanUsed,
      specifiedUsed,
      tax: 25067 - ordinaryUsed - orphanUsed - specifiedUsed,
    },
  };
}
