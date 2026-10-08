import { assertEquals } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import type { CategorySummary } from "../../../../../nodes/intermediate/forms/form_1116/index.ts";
import { buildConversionExplanation } from "./f1116_conversion_explanation.ts";

Deno.test("Form 1116 conversion explanation replays exact bytes after time passes", async () => {
  const summary = {
    items: [{
      alternative_compensation_sourcing: {
        specific_compensation_description: "Reviewed foreign wage allocation",
      },
      foreign_income_source_document_reference: "employer statement 1",
      foreign_tax_currency: {
        source_document_reference: "paid foreign tax receipt 1",
        conversion_date: "2025-09-15",
        amount: 1_000,
        currency_code: "EUR",
        usd_per_foreign_unit: 1.1,
        conversion_rate_explanation: "Reviewed paid-date rate record",
      },
      irs_country_code: "GM",
      foreign_tax_paid: 1_100,
    }],
  } as unknown as CategorySummary;
  const filer = {
    primarySSN: "123456789",
    fullName: "Test Taxpayer",
    nameLine1: "TEST TAXPAYER",
    nameControl: "TEST",
    filingStatus: FilingStatus.Single,
    address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
  };
  const first = await buildConversionExplanation([summary], filer);
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  const second = await buildConversionExplanation([summary], filer);
  assertEquals(second?.bytes, first?.bytes);
});
