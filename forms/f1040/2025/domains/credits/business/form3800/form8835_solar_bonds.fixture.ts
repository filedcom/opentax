import { PDFDocument } from "pdf-lib";
import { solarFixture } from "./form8835_solar.fixture.ts";
import { bondFields } from "./form3800_bonds.fixture.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const solarBondCases = [
  {
    id: "solar-bond-domestic-below-cap",
    source: "solar-domestic-base",
    proceeds: [10000],
    ratios: [.10],
    mixed: false,
  },
  {
    id: "solar-bond-small-capped",
    source: "solar-small-999-ac-1399-dc",
    proceeds: [40000],
    ratios: [.40],
    mixed: false,
  },
  {
    id: "solar-bond-small-rounded-zero",
    source: "solar-small-999-ac-1399-dc",
    proceeds: [400],
    ratios: [.00],
    mixed: false,
  },
  {
    id: "solar-bond-early-half-percent",
    source: "solar-early-cost",
    proceeds: [125000],
    ratios: [.13],
    mixed: false,
  },
  {
    id: "solar-bond-small-bonuses-cents",
    source: "solar-small-both-bonuses",
    proceeds: [14999.96],
    ratios: [.15],
    mixed: false,
  },
  {
    id: "solar-bond-pwa-current-repairs",
    source: "solar-pwa-current-repairs",
    proceeds: [12500],
    ratios: [.13],
    mixed: false,
  },
  {
    id: "solar-geothermal-bonds-pwa-bonuses",
    source: "solar-pwa-two-both-bonuses",
    proceeds: [10000, 40000],
    ratios: [.10, .40],
    mixed: true,
  },
];

export async function solarBondFixture(c: typeof solarBondCases[number]) {
  const { input, attachments } = await solarFixture(c.source, c.mixed);
  const credits: number[] = [];
  let available = 23049;
  for (const [index, f] of input.f8835.entries()) {
    Object.assign(f, bondFields(index, c.proceeds[index]));
    const b = f.tax_exempt_bond_source;
    Object.assign(b, {
      facility_description: f.facility_description,
      facility_address_line1: f.facility_us_address.line1,
      facility_latitude: f.facility_latitude,
      facility_longitude: f.facility_longitude,
      construction_began_on: f.facility_construction_start_date,
    });
    const beginning = f.early_construction_source?.beginning;
    if (beginning?.method === "five_percent") {
      f.aggregate_capital_additions = beginning.final_total_cost_cents / 100;
      b.capital_additions = beginning.costs.map((cost: any) => ({
        record_reference: cost.record_reference,
        added_on: cost.paid_or_incurred_on,
        amount: cost.eligible_cost_cents / 100,
      }));
    }
    const base = Math.round(f.kwh_sold * 6 / 1000);
    const reduced = base -
      Math.min(Math.round(base * c.ratios[index]), Math.round(base * .15));
    const increased = reduced * (f.increased_credit_reason === "none" ? 1 : 5);
    const domestic = f.domestic_content_bonus ? Math.round(increased / 10) : 0;
    const credit = increased + domestic +
      (f.energy_community_bonus ? Math.round(increased / 10) : 0);
    credits.push(credit);
    const allocation =
      input.form3800_current_production_allocation.facilities[index];
    allocation.credit_amount = credit;
    allocation.applied_credit = Math.min(available, credit);
    available -= allocation.applied_credit;
    if (f.domestic_content_source?.certification_year === 2025) {
      const s = f.domestic_content_source;
      s.first_year_bonus_credit = domestic;
      const a = attachments.find((a) => a.fileName === s.statement_file_name)!;
      const pdf = await PDFDocument.load(a.bytes);
      pdf.getForm().getTextField("Form8835Domestic.FirstYearBonusCredit")
        .setText(String(domestic));
      a.bytes = await pdf.save();
      s.statement_sha256 = await sha256Hex(a.bytes);
    }
  }
  const produced = credits.reduce((a, b) => a + b, 0);
  const used = 23049 - available;
  return {
    input,
    attachments,
    expected: {
      credits,
      produced,
      used,
      tax: 25067 - 2001 - used,
      ratios: c.ratios,
    },
  };
}
