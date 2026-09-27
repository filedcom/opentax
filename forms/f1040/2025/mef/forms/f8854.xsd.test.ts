import { assertEquals } from "@std/assert";
import { buildForm8854Annual } from "./f8854_annual.ts";
import { buildForm8854InitialBundle } from "./f8854_initial.ts";
import {
  ExpatriateType,
  inputSchema as initialSchema,
} from "../../../nodes/inputs/f8854/index.ts";
import { annualInputSchema } from "../../../nodes/inputs/f8854/annual.ts";
import { ReportedFormCode } from "../../../nodes/inputs/f8854/section-c.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS8854/IRS8854.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is local-only.
}

const partI = {
  mailing_address: {
    kind: "US" as const,
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  telephone: { kind: "US" as const, number: "3025550123" },
  notification: {
    kind: "CITIZEN_STATE_DEPARTMENT" as const,
    date: "2025-06-15",
  },
  citizenships: [{ country_code: "US", acquired_date: "1980-01-01" }],
  us_citizenship_acquisition: "BIRTH" as const,
};

function withNamespace(xml: string): string {
  return xml.replace(
    "<IRS8854",
    '<IRS8854 documentId="IRS88540" xmlns="http://www.irs.gov/efile"',
  );
}

async function validate8854(xml: string): Promise<void> {
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, withNamespace(xml));
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
}

Deno.test({
  name: "XSD: initial Form 8854 with identified Form 8949 deemed sale",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const input = initialSchema.parse({
    expatriation_date: "2025-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    part_i: partI,
    prior_year_us_income_tax_less_foreign_tax_credit: {
      year_2024: 0,
      year_2023: 0,
      year_2022: 0,
      year_2021: 0,
      year_2020: 0,
    },
    balance_sheet: {
      asset_categories_confirmed_complete: true,
      liabilities_confirmed_complete: true,
      cash_and_bank_deposits: {
        fair_market_value: 1_000_000,
        us_adjusted_basis: 1_000_000,
      },
      marketable_us_securities: {
        fair_market_value: 1_000_000,
        us_adjusted_basis: 100_000,
      },
      foreign_cfc_securities_within_line5: [],
      partnership_interests: [],
      owned_trust_assets: [],
      nongrantor_trust_interests: [],
      other_assets: [],
      installment_obligations_liability: 0,
      mortgage_liability: 0,
      other_liabilities: [],
    },
    certified_tax_compliance: true,
    exception_facts: { dual_citizen: null, minor: null },
    significant_asset_liability_changes_prior_5_years: false,
    section_c: {
      property_inventory_confirmed_complete: true,
      mark_to_market_assets: [{
        item_id: "stock",
        description: "100 shares of stock",
        fmv_day_before_expatriation: 1_000_000,
        us_adjusted_basis: 100_000,
        basis_irrevocable_election_h2: false,
        reported_form_code: ReportedFormCode.Form8949,
        reported_transaction_id: "TX-STOCK",
      }],
      eligible_deferred_compensation: [],
      ineligible_deferred_compensation: [],
      specified_tax_deferred_accounts: [],
      nongrantor_trust_interests: [],
    },
    section_d: { elect_deferral: false },
  });
  const bundle = buildForm8854InitialBundle(input, {
    balanceSheet: {},
    sectionC: { computation: "DOC-COMP" },
    binaryAttachments: [],
  }, {
    form8949: [{
      part: "F",
      description: "100 shares of stock",
      source_transaction_id: "TX-STOCK",
      date_acquired: "2020-01-01",
      date_sold: "2025-06-14",
      proceeds: 1_000_000,
      cost_basis: 100_000,
      adjustment_codes: "O",
      adjustment_amount: -890_000,
      gain_loss: 10_000,
      is_long_term: true,
    }],
  });
  await validate8854(bundle.formXml);
});

Deno.test({
  name: "XSD: annual Form 8854 with prior deferred property",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const input = annualInputSchema.parse({
    expatriation_date: "2020-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    part_i: {
      ...partI,
      notification: {
        kind: "CITIZEN_STATE_DEPARTMENT",
        date: "2020-06-15",
      },
    },
    prior_form8854_obligations_confirmed_complete: true,
    deferred_properties: [{
      item_id: "stock",
      description: "Stock holding",
      prior_form8854_document_id: "DOC-PRIOR",
      prior_mark_to_market_gain_or_loss_amount: 111_000,
      prior_deferred_tax_amount: 50_000,
      disposition: { disposed_in_2025: false },
    }],
    eligible_deferred_compensation_items: [],
    nongrantor_trust_interests: [],
  });
  await validate8854(buildForm8854Annual(input));
});
