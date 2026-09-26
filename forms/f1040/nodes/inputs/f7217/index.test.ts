import { assertEquals, assertThrows } from "@std/assert";
import { SCENARIO_1040_12_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import { computeForm7217Amounts, f7217 } from "./index.ts";

const source = SCENARIO_1040_12_FACTS.form7217;
const item = {
  partnership_name: source.partnershipName,
  partnership_ein: source.partnershipEin,
  distribution_date: source.distributionDate,
  complete_liquidation: source.completeLiquidation,
  section_751b_sale_or_exchange: source.section751bSaleOrExchange,
  partner_adjusted_basis_before_distribution:
    source.partnerAdjustedBasisBeforeDistribution,
  cash_received: source.cashReceived,
  distributed_properties: source.distributedProperties.map((property) => ({
    description: property.description,
    partnership_basis_before_distribution:
      property.partnershipBasisBeforeDistribution,
    section_734b_basis_adjustment: property.section734bBasisAdjustment,
    partner_basis_after_section_732: property.partnerBasisAfterSection732,
  })),
};

Deno.test("Form 7217 preserves the Scenario 12 Part I and Part II source discrepancy", () => {
  const amounts = computeForm7217Amounts(item);
  assertEquals(amounts.totalPartnershipBasis, 32_507);
  assertEquals(amounts.cashAndSecurities, 4_000);
  assertEquals(amounts.recognizedGain, 0);
  assertEquals(amounts.remainingPartnerBasis, 6_000);
  assertEquals(amounts.basisAllocatedToProperty, 6_000);
  assertEquals(amounts.totalPartnerBasisAfterSection732, 4_000);
  assertEquals(
    f7217.compute({ taxYear: 2025, formType: "f1040" }, {
      form7217s: [item],
    }).outputs,
    [],
  );
});

Deno.test("Form 7217 refuses to drop recognized gain without a tax route", () => {
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{
          ...item,
          cash_received: 15_000,
        }],
      }),
    Error,
    "downstream Schedule D or Form 4797",
  );
});
