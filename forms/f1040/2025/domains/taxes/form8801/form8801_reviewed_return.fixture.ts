import { passiveK1Inputs } from "../../credits/earned-income/eic_passive_k1.fixture.ts";
import { sha256Hex } from "../../execution/prepared-source.ts";

// Constructed review facts and public records, not accepted prior filing.
export function packageFacts() {
  return {
    tax_year: 2025,
    prior_tax_year: 2024,
    taxpayer_ssn: "111223333",
    reviewer: "Prior return reviewer",
    reviewed_on: "2026-04-01",
    prior_filing_status: "single",
    prior_form6251: {
      reference: "reviewed-2024-6251",
      line1: 100_000,
      line2e: 0,
      line2a: 20_000,
      line2b: 0,
      line2c: 0,
      line2d: 0,
      line2g: 0,
      line2h: 0,
      line10: 8_000,
      line11: 5_000,
    },
    additional_exclusion_items: [],
    minimum_tax_credit_nol_workpaper: { reference: "mtcnol", amount: 0 },
    minimum_tax_foreign_credit_exclusion_workpaper: {
      reference: "mtftce",
      amount: 0,
    },
    prior_credit_carryforward: {
      reference: "reviewed-2024-8801",
      amount: 1_000,
    },
    prior_unallowed_qualified_electric_vehicle_credit: {
      reference: "qev",
      amount: 100,
    },
  };
}
export async function fixture(facts: unknown = packageFacts()) {
  const template = passiveK1Inputs();
  const inputs: any = {
    general: template.general,
    w2: [{ ...template.w2[0], box1_wages: 120_000, box2_fed_withheld: 20_000 }],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(facts));
  const binding: any = {
    reference: "review-2024.json",
    sha256: await sha256Hex(bytes),
    current_return_reference: "2025 public pre-credit return",
  };
  const documents = [{ reference: binding.reference, bytes }];
  return { inputs, binding, documents };
}
