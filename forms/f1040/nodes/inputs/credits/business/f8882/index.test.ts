import { assertEquals, assertThrows } from "@std/assert";
import { form8882Fixture } from "./fixture.ts";
import { calculateForm8882, f8882, inputSchema } from "./index.ts";

Deno.test("f8882: direct Schedule C credit routes to typed Form 3800", () => {
  const source = inputSchema.parse(form8882Fixture());
  assertEquals(calculateForm8882(source), {
    line1: 40_000,
    line2: 10_000,
    line3: 10_000,
    line4: 1_000,
    line5: 0,
    line6: 11_000,
    line7: 11_000,
  });
  const [credit] = f8882.compute({ taxYear: 2025, formType: "f1040" }, source)
    .outputs;
  assertEquals(credit?.nodeType, "f3800");
  assertEquals(credit?.fields, {
    f8882_direct_employer_credit: {
      credit_amount: 11_000,
      schedule_c_business_reference: "SHOP-CHILDCARE-2025",
      subject_to_passive_activity_limit: false,
    },
  });
});

Deno.test("f8882: referral-only direct route calculates 10 percent", () => {
  const source = form8882Fixture();
  assertEquals(
    calculateForm8882(inputSchema.parse({
      ...source,
      facility_contract: undefined,
    })).line7,
    1_000,
  );
});

Deno.test("f8882: rejects unsupported legacy totals, missing contracts, and false qualification", () => {
  const source = form8882Fixture();
  assertThrows(() =>
    inputSchema.parse({ qualified_childcare_expenses: 40_000 })
  );
  assertThrows(() =>
    inputSchema.parse({
      ...source,
      facility_contract: undefined,
      referral_contract: undefined,
    })
  );
  assertThrows(() =>
    inputSchema.parse({
      ...source,
      facility_contract: {
        ...source.facility_contract,
        facility_complies_with_state_local_law_confirmed: false,
      },
    })
  );
  assertThrows(() =>
    inputSchema.parse({
      ...source,
      facility_contract: {
        ...source.facility_contract,
        fair_market_value_of_care_usd: 39_999,
      },
    })
  );
  assertThrows(() =>
    inputSchema.parse({
      ...source,
      referral_contract: {
        ...source.referral_contract,
        payment_ledger_reference:
          source.facility_contract.payment_ledger_reference,
      },
    })
  );
});

Deno.test("f8882: unsupported cap allocation and fractional line credit fail closed", () => {
  const source = form8882Fixture();
  assertThrows(() =>
    inputSchema.parse({
      ...source,
      facility_contract: {
        ...source.facility_contract,
        gross_expenditure_usd: 600_000,
        fair_market_value_of_care_usd: 600_000,
      },
      referral_contract: {
        ...source.referral_contract,
        gross_expenditure_usd: 10_000,
      },
    })
  );
  assertThrows(() =>
    inputSchema.parse({
      ...source,
      facility_contract: {
        ...source.facility_contract,
        gross_expenditure_usd: 40_001,
      },
    })
  );
});
