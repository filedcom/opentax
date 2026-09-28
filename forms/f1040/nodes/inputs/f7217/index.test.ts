import { assertEquals, assertThrows } from "@std/assert";
import { SCENARIO_1040_12_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import {
  computeForm7217Amounts,
  f7217,
  Form7217PropertyTreatment,
  inputSchema,
} from "./index.ts";

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

Deno.test("Form 7217 rejects the Scenario 12 Part I and Part II source discrepancy", () => {
  const amounts = computeForm7217Amounts(item);
  assertEquals(amounts.totalPartnershipBasis, 32_507);
  assertEquals(amounts.cashAndSecurities, 4_000);
  assertEquals(amounts.recognizedGain, 0);
  assertEquals(amounts.remainingPartnerBasis, 6_000);
  assertEquals(amounts.basisAllocatedToProperty, 6_000);
  assertEquals(amounts.totalPartnerBasisAfterSection732, 4_000);
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [item],
      }),
    Error,
    "Part II needs classified property",
  );
});

const fileableItem = {
  ...item,
  distributed_properties: [{
    ...item.distributed_properties[0],
    description: "EQUIPMENT",
    property_treatment: Form7217PropertyTreatment.Section732Property,
    fair_market_value: 9_000,
    partner_basis_after_section_732: 6_000,
  }],
};

const capitalGainItem = {
  ...fileableItem,
  cash_received: 15_000,
  us_tax_required_on_gain: true,
  distributed_properties: [{
    ...fileableItem.distributed_properties[0],
    partner_basis_after_section_732: 0,
  }],
  section_731_capital_gain_source: {
    k1_document_reference: "2025-k1-orchid",
    k1_box19_statement_reference: "2025-k1-orchid-march-01",
    k1_box19_statement_distribution_date: fileableItem.distribution_date,
    k1_partner_ssn: "123456789",
    k1_partnership_ein: fileableItem.partnership_ein,
    k1_box19_code_a_cash: 14_000,
    k1_box19_code_d_deemed_cash: 1_000,
    k1_box19_code_c_property_basis: 32_507,
    k1_box19_code_c_property_fmv: 9_000,
    k1_box19_code_b_section737_property: 0 as const,
    k1_box19_code_f_service_cash: 0 as const,
    k1_box19_code_g_service_property: 0 as const,
    outside_basis_workpaper_reference: "2025-outside-basis-orchid",
    outside_basis_workpaper_as_of_date: fileableItem.distribution_date,
    opening_outside_basis: 8_000,
    increases_before_distribution: 4_000,
    decreases_before_distribution: 2_000,
    partnership_interest_acquired_date: "2020-01-01",
    entire_interest_has_one_holding_period: true as const,
    not_section707_disguised_sale: true as const,
  },
};

Deno.test("Form 7217 routes reconciled long-term section 731 cash gain to Form 8949", () => {
  const result = f7217.compute({ taxYear: 2025, formType: "f1040" }, {
    form7217s: [capitalGainItem],
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "form8949");
  assertEquals(result.outputs[0].fields.transaction, {
    part: "F",
    description: `Section 731 distribution from ${capitalGainItem.partnership_name}`,
    source_transaction_id: `f7217:${capitalGainItem.partnership_ein.replaceAll("-", "")}:${capitalGainItem.distribution_date}`,
    date_acquired: "2020-01-01",
    date_sold: capitalGainItem.distribution_date,
    proceeds: 15_000,
    cost_basis: 10_000,
    gain_loss: 5_000,
    is_long_term: true,
  });
  const shortTerm = f7217.compute({ taxYear: 2025, formType: "f1040" }, {
    form7217s: [{ ...capitalGainItem, section_731_capital_gain_source: {
      ...capitalGainItem.section_731_capital_gain_source,
      partnership_interest_acquired_date: "2025-01-01",
    } }],
  });
  const shortTermTransaction = shortTerm.outputs[0].fields.transaction;
  assertEquals(
    typeof shortTermTransaction === "object" &&
        shortTermTransaction !== null && "part" in shortTermTransaction
      ? shortTermTransaction.part
      : undefined,
    "C",
  );
});

Deno.test("Form 7217 section 731 gain rejects K-1 and outside-basis mismatches", () => {
  for (const section_731_capital_gain_source of [
    { ...capitalGainItem.section_731_capital_gain_source, k1_box19_code_a_cash: 13_999 },
    { ...capitalGainItem.section_731_capital_gain_source, k1_box19_code_c_property_basis: 32_506 },
    { ...capitalGainItem.section_731_capital_gain_source, k1_box19_code_c_property_fmv: 8_999 },
    { ...capitalGainItem.section_731_capital_gain_source, opening_outside_basis: 7_999 },
    { ...capitalGainItem.section_731_capital_gain_source, k1_box19_statement_distribution_date: "2025-04-01" },
    { ...capitalGainItem.section_731_capital_gain_source, outside_basis_workpaper_as_of_date: "2025-04-01" },
  ]) {
    assertThrows(
      () => f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{ ...capitalGainItem, section_731_capital_gain_source }],
      }),
      Error,
      "exact K-1 box 19 cash/property, outside basis",
    );
  }
  assertThrows(
    () => f7217.compute({ taxYear: 2025, formType: "f1040" }, {
      form7217s: [{ ...capitalGainItem, section_731_capital_gain_source: undefined }],
    }),
    Error,
    "needs K-1, outside-basis",
  );
  assertThrows(
    () => f7217.compute({ taxYear: 2025, formType: "f1040" }, {
      form7217s: [{ ...capitalGainItem, section_751b_sale_or_exchange: true }],
    }),
    Error,
    "section 751(b)",
  );
  for (const section_731_capital_gain_source of [
    { ...capitalGainItem.section_731_capital_gain_source, k1_box19_code_b_section737_property: 1 },
    { ...capitalGainItem.section_731_capital_gain_source, k1_box19_code_f_service_cash: 1 },
    { ...capitalGainItem.section_731_capital_gain_source, not_section707_disguised_sale: false },
  ]) {
    assertThrows(() => f7217.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        form7217s: [{ ...capitalGainItem, section_731_capital_gain_source }],
      }),
    ));
  }
});

Deno.test("Form 7217 accepts a complete one-date Part I/II basis reconciliation", () => {
  assertEquals(
    f7217.compute({ taxYear: 2025, formType: "f1040" }, {
      form7217s: [fileableItem],
    }).outputs,
    [],
  );
});

Deno.test("Form 7217 rejects duplicate partnership/date forms and unequal Part II basis", () => {
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [fileableItem, fileableItem],
      }),
    Error,
    "one aggregate filing record",
  );
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{
          ...fileableItem,
          distributed_properties: [{
            ...fileableItem.distributed_properties[0],
            partner_basis_after_section_732: 4_000,
          }],
        }],
      }),
    Error,
    "must equal Part I line 10",
  );
});

Deno.test("Form 7217 reconciles section 731(c) securities on line 5b to Part II FMV", () => {
  const securities = {
    ...fileableItem,
    marketable_securities_fmv: 2_000,
    distributed_properties: [
      {
        ...fileableItem.distributed_properties[0],
        partner_basis_after_section_732: 5_000,
      },
      {
        description: "Listed shares",
        property_treatment:
          Form7217PropertyTreatment.Section731cMarketableSecurityTreatedAsMoney,
        section_731c_reduction_amount: 0,
        partnership_basis_before_distribution: 1_000,
        fair_market_value: 2_000,
        partner_basis_after_section_732: 1_000,
      },
    ],
  };
  assertEquals(
    f7217.compute({ taxYear: 2025, formType: "f1040" }, {
      form7217s: [securities],
    }).outputs,
    [],
  );
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{
          ...securities,
          distributed_properties: [
            securities.distributed_properties[0],
            {
              ...securities.distributed_properties[1],
              section_731c_reduction_amount: undefined,
            },
          ],
        }],
      }),
    Error,
    "explicit zero section 731(c) reduction",
  );
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{
          ...securities,
          distributed_properties: [securities.distributed_properties[1]],
        }],
      }),
    Error,
    "only money or marketable securities",
  );
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{ ...securities, marketable_securities_fmv: 1_999 }],
      }),
    Error,
    "must match their Part II FMV rows",
  );
});

Deno.test("Form 7217 requires real 2025 dates and explicit Part I answers", () => {
  for (const distribution_date of ["2025-02-29", "2024-12-31"]) {
    assertThrows(
      () =>
        f7217.compute({ taxYear: 2025, formType: "f1040" }, {
          form7217s: [{ ...fileableItem, distribution_date }],
        }),
      Error,
      "actual 2025 distribution date",
    );
  }
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{
          ...fileableItem,
          section_751b_sale_or_exchange: undefined,
        }],
      }),
    Error,
    "explicit Part I",
  );
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{ ...fileableItem, section_751b_sale_or_exchange: true }],
      }),
    Error,
    "gain/loss statement",
  );
});

Deno.test("Form 7217 refuses to drop recognized gain without a tax route", () => {
  assertThrows(
    () =>
      f7217.compute({ taxYear: 2025, formType: "f1040" }, {
        form7217s: [{
          ...fileableItem,
          cash_received: 15_000,
        }],
    }),
    Error,
    "needs K-1, outside-basis",
  );
});
