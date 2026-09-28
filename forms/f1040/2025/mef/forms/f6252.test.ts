import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import type { F6252Item } from "../../../nodes/intermediate/forms/form6252/index.ts";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form6252 } from "./f6252.ts";

const sale = {
  property_description: "Vacant land",
  date_acquired: "2020-01-01",
  date_sold: "2025-03-01",
  sold_to_related_party: false,
  selling_price_determinable: true,
  selling_price: 100_000,
  mortgage_assumed: 60_000,
  cost_basis: 40_000,
  payments_received: 10_000,
};

function buildSale(item: F6252Item): string {
  return form6252.build({ f6252s: [item] })[0];
}

Deno.test("Form 6252 emits no document for absent data", () => {
  assertEquals(buildMefXml({}, testFiler()).includes("<IRS6252"), false);
});

Deno.test("Form 6252 reports debt over basis as year-of-sale payment", () => {
  const xml = buildSale(sale);
  assertStringIncludes(
    xml,
    "<SellingPriceIncludingMortgAmt>100000</SellingPriceIncludingMortgAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetAdjBasisCommIncmRcptrAmt>20000</NetAdjBasisCommIncmRcptrAmt>",
  );
  assertStringIncludes(xml, "<ContractPriceAmt>60000</ContractPriceAmt>");
  assertStringIncludes(xml, "<YearOfSaleAmt>20000</YearOfSaleAmt>");
  assertStringIncludes(
    xml,
    "<InstallmentSaleIncomeAmt>30000</InstallmentSaleIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<InstalSaleLessOrdnryIncmAmt>30000</InstalSaleLessOrdnryIncmAmt>",
  );
});

Deno.test("Form 6252 prior-year sale does not repeat the debt-over-basis payment", () => {
  const xml = buildSale({
    ...sale,
    date_sold: "2024-03-01",
    payments_received_prior_years: 25_000,
  });
  assertStringIncludes(xml, "<YearOfSaleAmt>0</YearOfSaleAmt>");
  assertStringIncludes(
    xml,
    "<InstallmentSaleIncomeAmt>10000</InstallmentSaleIncomeAmt>",
  );
});

Deno.test("Form 6252 retains a prior-year obligation paid in full during 2025", () => {
  const xml = buildSale({
    ...sale,
    date_sold: "2024-03-01",
    mortgage_assumed: 0,
    payments_received_prior_years: 80_000,
    payments_received: 20_000,
  });
  assertStringIncludes(
    xml,
    "<PaymentsReceivedPriorYearsAmt>80000</PaymentsReceivedPriorYearsAmt>",
  );
  assertStringIncludes(
    xml,
    "<PaymentsReceivedCurrentYearAmt>20000</PaymentsReceivedCurrentYearAmt>",
  );
  assertStringIncludes(
    xml,
    "<InstallmentSaleIncomeAmt>12000</InstallmentSaleIncomeAmt>",
  );
});

Deno.test("Form 6252 rejects incomplete or unsupported sale data", () => {
  assertThrows(
    () => buildSale({ ...sale, property_description: undefined }),
    Error,
    "needs property",
  );
  assertThrows(
    () => buildSale({ ...sale, sold_to_related_party: true }),
    Error,
    "unrelated-party",
  );
  assertThrows(
    () => buildSale({ ...sale, depreciation_recapture: 5_000 }),
    Error,
    "Part III",
  );
  assertThrows(
    () => buildSale({ ...sale, depreciation_allowed: 5_000 }),
    Error,
    "depreciated property",
  );
  assertThrows(
    () => buildSale({ ...sale, gross_profit: 10_000 }),
    Error,
    "gross_profit must match",
  );
  assertThrows(
    () => buildSale({ ...sale, date_sold: "2024-03-01" }),
    Error,
    "prior-year payment history",
  );
  assertThrows(
    () => buildSale({ ...sale, payments_received_prior_years: 1 }),
    Error,
    "cannot have prior-year payments",
  );
  assertThrows(
    () =>
      buildSale({
        ...sale,
        mortgage_assumed: 0,
        payments_received: 100_000,
      }),
    Error,
    "needs a payment after the sale year",
  );
  assertThrows(
    () =>
      buildSale({
        ...sale,
        date_acquired: "2024-06-01",
        is_long_term: true,
      }),
    Error,
    "holding period",
  );
  assertThrows(
    () =>
      buildSale({
        ...sale,
        date_acquired: "2024-06-01",
        is_capital_asset: false,
      }),
    Error,
    "Part II detail",
  );
});

Deno.test("Form 6252 requires its destination gain in a complete return", () => {
  assertThrows(
    () => buildMefXml({ form6252: { f6252s: [sale] } }, testFiler()),
    Error,
    "Schedule D gain source",
  );
  assertThrows(
    () =>
      buildMefXml({
        form6252: { f6252s: [{ ...sale, is_capital_asset: false }] },
      }, testFiler()),
    Error,
    "Form 4797 line 4",
  );
});

Deno.test("Form 6252 reconciles two source sales to one Schedule D gain", () => {
  const secondSale = {
    ...sale,
    property_description: "Second vacant lot",
    mortgage_assumed: 0,
    cost_basis: 80_000,
    payments_received: 20_000,
  };
  const fields = { f6252s: [sale, secondSale] };
  const documents = form6252.build(fields, {
    pending: { schedule_d: { gain_form6252_lt: 34_000 } },
  });
  assertEquals(documents.length, 2);
  assertStringIncludes(
    documents[0],
    "<PropertyDesc>Vacant land</PropertyDesc>",
  );
  assertStringIncludes(
    documents[0],
    "<InstalSaleLessOrdnryIncmAmt>30000</InstalSaleLessOrdnryIncmAmt>",
  );
  assertStringIncludes(
    documents[1],
    "<InstalSaleLessOrdnryIncmAmt>4000</InstalSaleLessOrdnryIncmAmt>",
  );

  assertThrows(
    () =>
      form6252.build(fields, {
        pending: { schedule_d: { gain_form6252_lt: 33_999 } },
      }),
    Error,
    "Schedule D gain source",
  );
});
