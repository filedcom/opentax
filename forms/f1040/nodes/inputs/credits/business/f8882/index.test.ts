import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { form8882Fixture } from "./fixture.ts";
import { calculateForm8882, f8882, inputSchema } from "./index.ts";

test("f8882: direct Schedule C credit routes to typed Form 3800", () => {
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

test("f8882: referral-only direct route calculates 10 percent", () => {
  const source = form8882Fixture();
  assertEquals(
    calculateForm8882(inputSchema.parse({
      ...source,
      facility_contract: undefined,
    })).line7,
    1_000,
  );
});

test("f8882: rejects unsupported legacy totals, missing contracts, and false qualification", () => {
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

test("f8882: unsupported cap allocation and fractional line credit fail closed", () => {
  const source = form8882Fixture();
  assertThrows(() =>
    calculateForm8882({
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
    calculateForm8882({
      ...source,
      facility_contract: {
        ...source.facility_contract,
        gross_expenditure_usd: 40_001,
      },
    })
  );
});

// Draft Form 8882 (Rev. December 2026), item A and lines 2 and 8: 40% of
// facility expenditures (50% for an IRC §45F(c)(4) eligible small business),
// limited to $500,000 ($600,000); P.L. 119-21 §70401.
test("f8882: 2026 facility credit applies the P.L. 119-21 rates and limits", () => {
  const source = form8882Fixture();
  const in2026 = (eligible_small_business?: boolean) => ({
    ...source,
    eligible_small_business,
    facility_contract: {
      ...source.facility_contract,
      paid_or_incurred_date: "2026-03-15",
    },
    referral_contract: {
      ...source.referral_contract,
      paid_or_incurred_date: "2026-04-15",
    },
  });
  assertEquals(calculateForm8882(in2026(false)).line2, 16_000);
  assertEquals(calculateForm8882(in2026(false)).line7, 17_000);
  assertEquals(calculateForm8882(in2026(true)).line2, 20_000);
  assertThrows(
    () => calculateForm8882(in2026()),
    Error,
    "needs item A",
  );
  assertThrows(
    () => f8882.compute({ taxYear: 2026, formType: "f1040" }, source),
    Error,
    "paid or incurred in 2026",
  );
  const large = (eligible_small_business: boolean, spent: number) => ({
    ...in2026(eligible_small_business),
    facility_contract: {
      ...in2026(eligible_small_business).facility_contract,
      gross_expenditure_usd: spent,
      fair_market_value_of_care_usd: spent,
    },
    referral_contract: undefined,
  });
  assertEquals(calculateForm8882(large(true, 1_200_000)).line7, 600_000);
  assertEquals(calculateForm8882(large(false, 1_250_000)).line7, 500_000);
  assertThrows(
    () => calculateForm8882(large(false, 1_300_000)),
    Error,
    "separate deduction workpaper",
  );
});
