import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  buildForm8854Annual,
  buildForm8854PartIII,
} from "../../../2025/mef/forms/f8854_annual.ts";
import { annualInputSchema } from "./annual.ts";
import { ExpatriateType } from "./index.ts";

function annualInput(overrides: Record<string, unknown> = {}) {
  return {
    expatriation_date: "2020-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    part_i: {
      mailing_address: {
        kind: "US",
        line1: "1 Main St",
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      },
      telephone: { kind: "US", number: "3025550123" },
      notification: {
        kind: "CITIZEN_STATE_DEPARTMENT",
        date: "2020-06-15",
      },
      citizenships: [{ country_code: "US", acquired_date: "1980-01-01" }],
      us_citizenship_acquisition: "BIRTH",
    },
    prior_form8854_obligations_confirmed_complete: true,
    deferred_properties: [],
    eligible_deferred_compensation_items: [{
      item_id: "plan",
      prior_form8854_document_id: "DOC-PRIOR",
      distributions: [],
    }],
    nongrantor_trust_interests: [],
    ...overrides,
  };
}

function distribution() {
  return {
    distribution_date: "2025-04-15",
    gross_distribution_amount: 1_000,
    amount_includible_if_us_resident: 800,
    tax_withheld_amount: 240,
    source_document_id: "DOC-DISTRIBUTION",
  };
}

Deno.test("annual Form 8854 certifies no distributions from a remaining eligible item", () => {
  const parsed = annualInputSchema.parse(annualInput());
  const xml = buildForm8854Annual(parsed, "DOC-8854-ANNUAL");
  assertStringIncludes(xml, '<IRS8854 documentId="DOC-8854-ANNUAL">');
  assertStringIncludes(
    xml,
    "<AnnualExptrtStmtBfrSpcfdYrInd>X</AnnualExptrtStmtBfrSpcfdYrInd>",
  );
  assertStringIncludes(xml, "<AnnualExptrtStmtBfrSpcfdYrGrp>");
  assertStringIncludes(
    xml,
    "<EligDeferredCompItemsDistriInd>false</EligDeferredCompItemsDistriInd>",
  );
  assertStringIncludes(
    xml,
    "<NongrantorTrustDistriInd>false</NongrantorTrustDistriInd>",
  );
  assertEquals(xml.includes("ExpatriationInformationGrp"), false);
  assertEquals(xml.includes("InitialExptrtStmtSpcfdYrInd"), false);
});

Deno.test("annual Form 8854 lists prior deferred property and 2025 distributions", () => {
  const parsed = annualInputSchema.parse(annualInput({
    deferred_properties: [{
      item_id: "stock",
      description: "Stock holding",
      prior_form8854_document_id: "DOC-PRIOR",
      prior_mark_to_market_gain_or_loss_amount: 111_000,
      prior_deferred_tax_amount: 50_000,
      disposition: {
        disposed_in_2025: true,
        disposition_date: "2025-05-20",
        reported_transaction_id: "TX-STOCK",
        deferred_tax_and_interest_payment_document_id: "DOC-PAYMENT",
      },
    }],
    eligible_deferred_compensation_items: [{
      item_id: "plan",
      prior_form8854_document_id: "DOC-PRIOR",
      distributions: [distribution()],
    }],
    nongrantor_trust_interests: [{
      item_id: "trust",
      prior_form8854_document_id: "DOC-PRIOR",
      no_prior_full_value_election_confirmed: true,
      distributions: [{
        ...distribution(),
        source_document_id: "DOC-TRUST-PAYMENT",
      }],
    }],
  }));
  const xml = buildForm8854PartIII(parsed);
  assertStringIncludes(
    xml,
    "<MarkToMarketGainOrLossAmt>111000</MarkToMarketGainOrLossAmt>",
  );
  assertStringIncludes(xml, "<DeferredTaxAmt>50000</DeferredTaxAmt>");
  assertStringIncludes(xml, "<DispositionDt>2025-05-20</DispositionDt>");
  assertStringIncludes(
    xml,
    "<EligDeferredCompItemsDistriInd>true</EligDeferredCompItemsDistriInd>",
  );
  assertStringIncludes(
    xml,
    "<EligDeferredCompItemsDistriDtl><DistributionAmt>800</DistributionAmt><TotalTaxWithheldAmt>240</TotalTaxWithheldAmt></EligDeferredCompItemsDistriDtl>",
  );
  assertStringIncludes(
    xml,
    "<NongrantorTrustDistriInd>true</NongrantorTrustDistriInd>",
  );
  assertEquals((xml.match(/<NongrantorTrustDistriDtl>/g) ?? []).length, 1);
});

Deno.test("annual Form 8854 rejects missing obligations and unsupported years", () => {
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      deferred_properties: [],
      eligible_deferred_compensation_items: [],
      nongrantor_trust_interests: [],
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      expatriation_date: "2008-06-16",
      part_i: {
        ...annualInput().part_i,
        notification: {
          kind: "CITIZEN_STATE_DEPARTMENT",
          date: "2008-06-16",
        },
      },
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      expatriation_date: "2025-01-01",
      part_i: {
        ...annualInput().part_i,
        notification: {
          kind: "CITIZEN_STATE_DEPARTMENT",
          date: "2025-01-01",
        },
      },
    })).success,
    false,
  );
  assertThrows(
    () => buildForm8854Annual(annualInputSchema.parse(annualInput()), "bad id"),
    Error,
    "MeF IdType",
  );
});

Deno.test("annual Form 8854 enforces source and three-row distribution limits", () => {
  const centsInput = annualInputSchema.parse(annualInput({
    eligible_deferred_compensation_items: [{
      item_id: "plan",
      prior_form8854_document_id: "DOC-PRIOR",
      distributions: [{
        ...distribution(),
        gross_distribution_amount: 1_000.51,
        amount_includible_if_us_resident: 800.51,
        tax_withheld_amount: 240.49,
      }],
    }],
  }));
  assertStringIncludes(
    buildForm8854PartIII(centsInput),
    "<EligDeferredCompItemsDistriDtl><DistributionAmt>801</DistributionAmt><TotalTaxWithheldAmt>240</TotalTaxWithheldAmt></EligDeferredCompItemsDistriDtl>",
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      eligible_deferred_compensation_items: [{
        item_id: "plan",
        prior_form8854_document_id: "DOC-PRIOR",
        distributions: [
          distribution(),
          distribution(),
          distribution(),
          distribution(),
        ],
      }],
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      eligible_deferred_compensation_items: [{
        item_id: "plan",
        prior_form8854_document_id: "DOC-PRIOR",
        distributions: [{
          ...distribution(),
          amount_includible_if_us_resident: 1_001,
        }],
      }],
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      nongrantor_trust_interests: [{
        item_id: "trust",
        prior_form8854_document_id: "DOC-PRIOR",
        no_prior_full_value_election_confirmed: false,
        distributions: [],
      }],
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      deferred_properties: [{
        item_id: "stock",
        description: "Stock holding",
        prior_form8854_document_id: "DOC-PRIOR",
        prior_mark_to_market_gain_or_loss_amount: 111_000,
        prior_deferred_tax_amount: 50_000,
        disposition: { disposed_in_2025: true, disposition_date: "2025-05-20" },
      }],
    })).success,
    false,
  );
});
