import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { schedule3 } from "./schedule3.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

// ---------------------------------------------------------------------------
// Section 1: Empty input
// ---------------------------------------------------------------------------

Deno.test("empty object returns empty string", () => {
  assertEquals(schedule3.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(schedule3.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("line2_childcare_credit at zero is emitted", () => {
  const result = schedule3.build({ line2_childcare_credit: 0 });
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>0</CreditForChildAndDepdCareAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (direct 1:1 mappings)
// ---------------------------------------------------------------------------

Deno.test("line2_childcare_credit maps to CreditForChildAndDepdCareAmt", () => {
  const result = schedule3.build({ line2_childcare_credit: 1200 });
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
});

Deno.test("Schedule 3 line 13a links exactly the sourced Form 2439 documents", () => {
  const source = {
    f2439s: [
      { box1a: 10_000, box2: 1_500 },
      { box1a: 5_000, box2: 750 },
    ],
  };
  assertThrows(
    () =>
      schedule3.build(
        { line13a_total: 2_249 },
        { pending: { f2439: source } },
      ),
    Error,
    "must equal sourced Form 2439",
  );
  const xml = schedule3.build(
    { line13a_total: 2_250 },
    {
      pending: { f2439: source },
      documentIdsByPendingKey: { f2439: ["IRS2439_1", "IRS2439_2"] },
    },
  );
  assertStringIncludes(
    xml,
    '<TaxPaidByRICOrREITAmt referenceDocumentId="IRS2439_1 IRS2439_2" referenceDocumentName="IRS2439">2250</TaxPaidByRICOrREITAmt>',
  );
});

Deno.test("Schedule 3 line 13a skips a gain-only Form 2439 document ID", () => {
  const xml = schedule3.build(
    { line13a_total: 2_250 },
    {
      pending: {
        f2439: {
          f2439s: [
            { box1a: 1_000 },
            { box1a: 10_000, box2: 1_500 },
            { box1a: 5_000, box2: 750 },
          ],
        },
      },
      documentIdsByPendingKey: {
        f2439: ["IRS2439_gain_only", "IRS2439_credit_1", "IRS2439_credit_2"],
      },
    },
  );
  assertStringIncludes(
    xml,
    '<TaxPaidByRICOrREITAmt referenceDocumentId="IRS2439_credit_1 IRS2439_credit_2" referenceDocumentName="IRS2439">2250</TaxPaidByRICOrREITAmt>',
  );
});

Deno.test("line3_education_credit maps to EducationCreditAmt", () => {
  const result = schedule3.build({ line3_education_credit: 2500 });
  assertStringIncludes(result, "<EducationCreditAmt>2500</EducationCreditAmt>");
});

Deno.test("line4_retirement_savings_credit maps to RtrSavingsContributionsCrAmt", () => {
  const result = schedule3.build({
    line4_retirement_savings_credit: 400,
  });
  assertStringIncludes(
    result,
    "<RtrSavingsContributionsCrAmt>400</RtrSavingsContributionsCrAmt>",
  );
});

Deno.test("Form 5695 credits retain separate Schedule 3 line 5a and 5b amounts", () => {
  const result = schedule3.build({
    line5a_residential_clean_energy: 300,
    line5b_energy_efficient_home: 1_200,
  });
  assertStringIncludes(
    result,
    "<ResidentialCleanEnergyCrAmt>300</ResidentialCleanEnergyCrAmt>",
  );
  assertStringIncludes(
    result,
    "<EgyEffcntHmImprvCrAmt>1200</EgyEffcntHmImprvCrAmt>",
  );
  assertEquals(
    result.indexOf("ResidentialCleanEnergyCrAmt") <
      result.indexOf("EgyEffcntHmImprvCrAmt"),
    true,
  );
});

Deno.test("line6c_adoption_credit maps to NonrefundableAdoptionCreditAmt", () => {
  const result = schedule3.build({ line6c_adoption_credit: 15950 });
  assertStringIncludes(
    result,
    "<NonrefundableAdoptionCreditAmt>15950</NonrefundableAdoptionCreditAmt>",
  );
});

Deno.test("Form 8911 allowed personal credit maps to Schedule 3 line 6j", () => {
  const result = schedule3.build({ line6j_alt_fuel_vehicle_refueling: 162 });
  assertStringIncludes(
    result,
    "<TotalPersonalUsePartOfCrAmt>162</TotalPersonalUsePartOfCrAmt>",
  );
});

Deno.test("Schedule 3 has distinct 2025 lines 6h, 6k, and 12", () => {
  const result = schedule3.build({
    line6h_dc_homebuyer_credit: 300,
    line6k_tax_credit_bonds: 450,
    line12_fuel_tax_credit: 125,
  });
  assertStringIncludes(
    result,
    "<DCHmByrCurrentYearCreditAmt>300</DCHmByrCurrentYearCreditAmt>",
  );
  assertStringIncludes(
    result,
    "<CurrentYearAllowableCreditAmt>450</CurrentYearAllowableCreditAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalFuelTaxCreditAmt>125</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Schedule 3 source-credit lines require their attached filing forms", () => {
  for (
    const fields of [
      { line6a_total: 500 },
      { line6h_dc_homebuyer_credit: 300 },
      { line6i_qualified_electric_vehicle_credit: 400 },
      { line6k_tax_credit_bonds: 450 },
      { line12_fuel_tax_credit: 125 },
    ]
  ) {
    assertThrows(() =>
      schedule3.build(fields, { documentIdsByPendingKey: {} })
    );
  }
  const xml = schedule3.build(
    { line6k_tax_credit_bonds: 450 },
    { documentIdsByPendingKey: { f8912: ["IRS8912_1"] } },
  );
  assertStringIncludes(xml, 'referenceDocumentId="IRS8912_1"');
  const form3800Xml = schedule3.build(
    { line6a_total: 500 },
    { documentIdsByPendingKey: { f3800: ["IRS3800_1"] } },
  );
  assertStringIncludes(
    form3800Xml,
    'referenceDocumentId="IRS3800_1" referenceDocumentName="IRS3800"',
  );
});

Deno.test("Schedule 3 rejects elderly or disabled credit without native Schedule R", () => {
  assertThrows(
    () =>
      schedule3.build({ line6d_elderly_disabled_credit: 750 }, {
        documentIdsByPendingKey: { schedule_r: [] },
      }),
    Error,
    "one linked Schedule R",
  );
  assertStringIncludes(
    schedule3.build({ line6d_elderly_disabled_credit: 750 }, {
      documentIdsByPendingKey: { schedule_r: ["IRS1040ScheduleR1"] },
    }),
    'referenceDocumentId="IRS1040ScheduleR1"',
  );
});

Deno.test("2025 Schedule 3 lines 6a, 6b, 6f, 6g, and 6m use distinct XML elements", () => {
  const result = schedule3.build({
    line6a_total: 1_000,
    line6b_prior_year_min_tax_credit: 200,
    line6f_total: 3_750,
    line6g_mortgage_interest_credit: 500,
    line6m_total: 4_000,
    line7_total: 9_450,
    line8_total: 9_450,
  });
  for (
    const [tag, value] of [
      ["CurrentYearCreditAllowedAmt", 1_000],
      ["MinAMTCrAmt", 200],
      ["CleanVehPrsnlUsePartCrAmt", 3_750],
      ["MortgageInterestCreditAmt", 500],
      ["MaxPrevOwnedCleanVehCrAmt", 4_000],
      ["OtherCreditsAmt", 9_450],
      ["TotalNonrefundableCreditsAmt", 9_450],
    ] as const
  ) {
    assertStringIncludes(result, `<${tag}>${value}</${tag}>`);
  }
});

Deno.test("line10_amount_paid_extension maps to RequestForExtensionAmt", () => {
  const result = schedule3.build({ line10_amount_paid_extension: 3000 });
  assertStringIncludes(
    result,
    "<RequestForExtensionAmt>3000</RequestForExtensionAmt>",
  );
});

Deno.test("line11_excess_ss maps to ExcessSocSecAndTier1RRTATaxAmt", () => {
  const result = schedule3.build({ line11_excess_ss: 5000 });
  assertStringIncludes(
    result,
    "<ExcessSocSecAndTier1RRTATaxAmt>5000</ExcessSocSecAndTier1RRTATaxAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: finalized line 1 amount
// ---------------------------------------------------------------------------

Deno.test("finalized Schedule 3 line 1 maps to ForeignTaxCreditAmt", () => {
  const result = schedule3.build({ line1_total: 1200 });
  assertStringIncludes(
    result,
    "<ForeignTaxCreditAmt>1200</ForeignTaxCreditAmt>",
  );
});

Deno.test("raw foreign-tax sources cannot be exported as a finalized line", () => {
  assertEquals(schedule3.build({ line1_foreign_tax_credit: 1000 }), "");
});

Deno.test("both line1 fields absent: ForeignTaxCreditAmt not emitted", () => {
  const result = schedule3.build({ line2_childcare_credit: 500 });
  assertNotIncludes(result, "<ForeignTaxCreditAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = schedule3.build({ line3_education_credit: 2500 });
  assertStringIncludes(result, "<EducationCreditAmt>2500</EducationCreditAmt>");
  assertNotIncludes(result, "<ForeignTaxCreditAmt>");
  assertNotIncludes(result, "<CreditForChildAndDepdCareAmt>");
  assertNotIncludes(result, "<NonrefundableAdoptionCreditAmt>");
  assertNotIncludes(result, "<RequestForExtensionAmt>");
  assertNotIncludes(result, "<ExcessSocSecAndTier1RRTATaxAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = schedule3.build({
    line2_childcare_credit: 1200,
    line11_excess_ss: 5000,
  });
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcessSocSecAndTier1RRTATaxAmt>5000</ExcessSocSecAndTier1RRTATaxAmt>",
  );
  assertNotIncludes(result, "<ForeignTaxCreditAmt>");
  assertNotIncludes(result, "<EducationCreditAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  line1_total: 1000,
  line2_childcare_credit: 1200,
  line3_education_credit: 2500,
  line4_retirement_savings_credit: 400,
  line6c_adoption_credit: 15950,
  line10_amount_paid_extension: 3000,
  line11_excess_ss: 5000,
};

Deno.test("all present: output wrapped in IRS1040Schedule3 tag", () => {
  const result = schedule3.build(allFields);
  assertStringIncludes(result, "<IRS1040Schedule3>");
  assertStringIncludes(result, "</IRS1040Schedule3>");
});

Deno.test("all present: all expected elements emitted", () => {
  const result = schedule3.build(allFields);
  assertStringIncludes(
    result,
    "<ForeignTaxCreditAmt>1000</ForeignTaxCreditAmt>",
  );
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
  assertStringIncludes(result, "<EducationCreditAmt>2500</EducationCreditAmt>");
  assertStringIncludes(
    result,
    "<RtrSavingsContributionsCrAmt>400</RtrSavingsContributionsCrAmt>",
  );
  assertStringIncludes(
    result,
    "<NonrefundableAdoptionCreditAmt>15950</NonrefundableAdoptionCreditAmt>",
  );
  assertStringIncludes(
    result,
    "<RequestForExtensionAmt>3000</RequestForExtensionAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcessSocSecAndTier1RRTATaxAmt>5000</ExcessSocSecAndTier1RRTATaxAmt>",
  );
});

Deno.test("all present: ForeignTaxCreditAmt appears before CreditForChildAndDepdCareAmt (XSD order)", () => {
  const result = schedule3.build(allFields);
  const foreignIdx = result.indexOf("<ForeignTaxCreditAmt>");
  const childcareIdx = result.indexOf("<CreditForChildAndDepdCareAmt>");
  assertEquals(
    foreignIdx < childcareIdx,
    true,
    "ForeignTaxCreditAmt must appear before CreditForChildAndDepdCareAmt",
  );
});

Deno.test("all present: CreditForChildAndDepdCareAmt before ExcessSocSecAndTier1RRTATaxAmt", () => {
  const result = schedule3.build(allFields);
  const childcareIdx = result.indexOf("<CreditForChildAndDepdCareAmt>");
  const excessSsIdx = result.indexOf("<ExcessSocSecAndTier1RRTATaxAmt>");
  assertEquals(
    childcareIdx < excessSsIdx,
    true,
    "CreditForChildAndDepdCareAmt must appear before ExcessSocSecAndTier1RRTATaxAmt",
  );
});

// ---------------------------------------------------------------------------
// Section 8: Mixed known/unknown keys
// ---------------------------------------------------------------------------

Deno.test("known field emitted, unknown field dropped", () => {
  const result = schedule3.build({
    line2_childcare_credit: 1200,
    junk: 999,
  });
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
  assertNotIncludes(result, "junk");
  assertNotIncludes(result, "999");
});

Deno.test("multiple known and unknown fields: only known emitted", () => {
  const result = schedule3.build({
    line3_education_credit: 2500,
    unknown_field_1: 500,
    line11_excess_ss: 5000,
    not_a_real_key: "ignored",
  });
  assertStringIncludes(result, "<EducationCreditAmt>2500</EducationCreditAmt>");
  assertStringIncludes(
    result,
    "<ExcessSocSecAndTier1RRTATaxAmt>5000</ExcessSocSecAndTier1RRTATaxAmt>",
  );
  assertNotIncludes(result, "unknown_field_1");
  assertNotIncludes(result, "not_a_real_key");
});
