import { PDFDocument } from "pdf-lib";
import { increasedFixture } from "./form8835_increased.fixture.ts";
import { earlyCases, earlyFixture } from "./form8835_early.fixture.ts";
import { domesticCases, domesticFixture } from "./form8835_domestic.fixture.ts";
import { communityFixture } from "./form8835_community.fixture.ts";
import { pwaCases, pwaFixture } from "./form8835_pwa.fixture.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const solarCases = [
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

export async function solarFixture(id: string, onlyFirst = false) {
  const c = solarCases.find((c) => c.id === id);
  if (!c) throw new Error(`Unknown solar fixture ${id}`);
  const fixture = await c.make();
  const input: any = fixture.input;
  const { attachments } = fixture;
  for (const [index, f] of input.f8835.entries()) {
    if (onlyFirst && index !== 0) continue;
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
  for (const [index, f] of input.f8835.entries()) {
    if (onlyFirst && index !== 0) continue;
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
  for (
    const [index, f] of input.form3800_current_production_allocation.facilities
      .entries()
  ) {
    if (onlyFirst && index !== 0) continue;
    f.energy_type = "SOLAR";
  }

  return { input, attachments };
}
