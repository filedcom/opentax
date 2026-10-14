import { assertEquals, assertThrows } from "@std/assert";
import {
  disclosureSchema,
  EntityType,
  publicSourceSchema,
  ReportableCategory,
  TaxBenefit,
} from "./source.ts";

import { disclosureFixture as disclosure } from "./source.fixture.ts";

Deno.test("Form 8886 retains initial participation separately from initial disclosure and total life benefits", () => {
  const result = disclosureSchema.parse(disclosure);
  assertEquals(result.transactions[0].initial_participation_year, 2024);
  assertEquals(result.initial_year_filer, true);
  assertEquals(result.benefits[0].affected_tax_years, [2025, 2026]);
  assertEquals(result.transactions[0].reportable_transaction_numbers, [
    "MA123456789",
  ]);
});

Deno.test("Form 8886 cannot detach a current-year benefit or fee from its identified source", () => {
  assertThrows(() =>
    disclosureSchema.parse({
      ...disclosure,
      benefits: [{
        ...disclosure.benefits[0],
        current_return_source_references: [],
      }],
    })
  );
  assertThrows(() =>
    disclosureSchema.parse({
      ...disclosure,
      fee_recipients: [{
        ...disclosure.fee_recipients[0],
        party_id: "unknown advisor",
      }],
    })
  );
});

Deno.test("Form 8886 requires category-specific disclosure rather than protective or generic assurances", () => {
  for (
    const category of [
      ReportableCategory.Listed,
      ReportableCategory.TransactionOfInterest,
      ReportableCategory.Confidential,
      ReportableCategory.ContractualProtection,
    ]
  ) {
    assertThrows(() =>
      disclosureSchema.parse({
        ...disclosure,
        protective_disclosure: true,
        categories: [category],
      })
    );
  }
  assertThrows(() =>
    disclosureSchema.parse({
      ...disclosure,
      transaction_steps: "Details available upon request",
    })
  );
});

Deno.test("Form 8886 grouped and repeated disclosures cannot silently reuse a transaction", () => {
  assertThrows(() =>
    publicSourceSchema.parse({
      disclosures: [disclosure, {
        ...disclosure,
        disclosure_id: "another disclosure",
      }],
    })
  );
  assertThrows(() =>
    disclosureSchema.parse({
      ...disclosure,
      transactions: [disclosure.transactions[0], {
        ...disclosure.transactions[0],
        transaction_id: "second loss",
      }],
    })
  );
});

Deno.test("Form 8886 subsequent disclosure requires the prior disclosure record, not the prior participation year", () => {
  assertThrows(() =>
    disclosureSchema.parse({ ...disclosure, initial_year_filer: false })
  );
  const result = disclosureSchema.parse({
    ...disclosure,
    initial_year_filer: false,
    previous_disclosure_reference: "2024 accepted disclosure record",
  });
  assertEquals(
    result.previous_disclosure_reference,
    "2024 accepted disclosure record",
  );
});

Deno.test("Form 8886 K-1 identity and receipt dates cannot contradict the disclosed parties", () => {
  const entity = {
    party_id: "advisor",
    entity_type: EntityType.Partnership,
    no_k1_received: false,
    k1_received_date: "2025-02-30",
    k1_source_reference: "K-1 receipt",
  };
  assertThrows(() =>
    disclosureSchema.parse({ ...disclosure, through_entities: [entity] })
  );
  assertThrows(() =>
    disclosureSchema.parse({
      ...disclosure,
      through_entities: [{ ...entity, k1_received_date: "2025-02-28" }],
    })
  );
});

Deno.test("Form 8886 shared arrangements retain two separately reviewed participant copies", () => {
  const primary = {
    ...disclosure,
    transactions: [{
      ...disclosure.transactions[0],
      shared_transaction_review_reference: "reviewed shared arrangement",
    }],
  };
  const spouse = {
    ...primary,
    disclosure_id: "spouse-copy",
    taxpayer_ssn: "444556666",
  };
  const parsed = publicSourceSchema.parse({ disclosures: [primary, spouse] });
  assertEquals(parsed.disclosures.map((copy) => copy.taxpayer_ssn), [
    "111223333",
    "444556666",
  ]);
  assertEquals(
    parsed.disclosures.map((copy) => copy.transactions[0].transaction_id),
    ["asset-loss-2025", "asset-loss-2025"],
  );
  assertThrows(() => publicSourceSchema.parse({ disclosures: [primary] }));
  assertThrows(() =>
    publicSourceSchema.parse({
      disclosures: [primary, { ...spouse, taxpayer_ssn: primary.taxpayer_ssn }],
    })
  );
  assertThrows(() =>
    publicSourceSchema.parse({
      disclosures: [primary, {
        ...spouse,
        transactions: [{
          ...spouse.transactions[0],
          shared_transaction_review_reference: "different review",
        }],
      }],
    })
  );
  assertThrows(() =>
    publicSourceSchema.parse({
      disclosures: [primary, {
        ...spouse,
        transactions: [{
          ...spouse.transactions[0],
          shared_transaction_review_reference: undefined,
        }],
      }],
    })
  );
  assertThrows(() =>
    publicSourceSchema.parse({
      disclosures: [primary, spouse, {
        ...spouse,
        disclosure_id: "third-copy",
        taxpayer_ssn: "555667777",
      }],
    })
  );
});

Deno.test("Form 8886 shared review cannot override conflicting issued transaction numbers", () => {
  const primary = {
    ...disclosure,
    transactions: [{
      ...disclosure.transactions[0],
      shared_transaction_review_reference: "shared review",
    }],
  };
  const spouse = {
    ...primary,
    disclosure_id: "spouse",
    taxpayer_ssn: "444556666",
    transactions: [{
      ...primary.transactions[0],
      reportable_transaction_numbers: ["MA987654321"],
    }],
  };
  assertThrows(() =>
    publicSourceSchema.parse({ disclosures: [primary, spouse] })
  );
});
