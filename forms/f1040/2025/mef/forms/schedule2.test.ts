import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { calculateForm8874Recapture } from "../../../nodes/inputs/f8874/recapture_node.ts";
import { FIELD_MAP, schedule2 } from "./schedule2.ts";

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
  assertEquals(schedule2.build({}), "");
});

Deno.test("Form 4255 source rows drive Schedule 2 net-EPE and EP groups", () => {
  const source = {
    rows: [{
      source_document_reference: "2024 Form 3800 and recapture workpaper",
      credit_line: "2a" as const,
      prior_credit_claimed: 10_000,
      gross_epe: 8_000,
      gross_epe_applied_regular_tax: 3_000,
      non_epe_applied_regular_tax: 1_000,
      recaptured_total: 2_000,
      recaptured_carryover: 500,
      recaptured_non_epe_applied: 0 as const,
      recaptured_gross_epe_applied: 0 as const,
      recaptured_net_epe: 1_500,
      excessive_payment_net_epe: 300,
      excessive_payment_other: 0 as const,
      excessive_payment_20_percent: 60,
    }],
  };
  const xml = schedule2.build({
    line1d_form4255_net_epe: 1_500,
    line1e_form4255_excessive_payment: 300,
    line1f_form4255_20_percent_ep: 60,
  }, { pending: { f4255: source } });
  assertStringIncludes(
    xml,
    "<RcptrPrtnNetEPECrAmt>1500</RcptrPrtnNetEPECrAmt>",
  );
  assertStringIncludes(
    xml,
    "<ApplicableCheckboxivInd>X</ApplicableCheckboxivInd>",
  );
  assertStringIncludes(xml, "<ExPymt100CrAmt>300</ExPymt100CrAmt>");
  assertStringIncludes(
    xml,
    "<TotEx20PrvlWgAprntcshpPnltyAmt>60</TotEx20PrvlWgAprntcshpPnltyAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalTaxAdditionsAmt>1860</TotalTaxAdditionsAmt>",
  );
  assertThrows(
    () => schedule2.build({ line1d_form4255_net_epe: 1_500 }),
    Error,
    "require source rows",
  );
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(schedule2.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("line2_amt at zero is emitted", () => {
  const result = schedule2.build({ line2_amt: 0 });
  assertStringIncludes(
    result,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping — direct 1:1 fields
// ---------------------------------------------------------------------------

Deno.test("line2_amt maps to AlternativeMinimumTaxAmt", () => {
  const result = schedule2.build({ line2_amt: 5000 });
  assertStringIncludes(
    result,
    "<AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("2025 Schedule 2 line 1a and line 2 retain distinct amounts in XSD order", () => {
  const result = schedule2.build({
    line1a_excess_advance_premium: 1_200,
    line2_amt: 5_000,
  });
  const repayment =
    "<PremiumTaxCreditTaxLiabAmt>1200</PremiumTaxCreditTaxLiabAmt>";
  const amt = "<AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt>";
  assertStringIncludes(result, repayment);
  assertStringIncludes(result, amt);
  assertEquals(result.indexOf(repayment) < result.indexOf(amt), true);
});

Deno.test("2025 Schedule 2 carries Part I totals through lines 1z and 3", () => {
  const result = schedule2.build({
    line1a_excess_advance_premium: 1_200,
    line2_amt: 5_000,
  });
  assertStringIncludes(
    result,
    "<TotalTaxAdditionsAmt>1200</TotalTaxAdditionsAmt>",
  );
  assertStringIncludes(result, "<AdditionalTaxAmt>6200</AdditionalTaxAmt>");
  assertEquals(
    result.indexOf("<TotalTaxAdditionsAmt>") <
      result.indexOf("<AlternativeMinimumTaxAmt>"),
    true,
  );
  assertEquals(
    result.indexOf("<AlternativeMinimumTaxAmt>") <
      result.indexOf("<AdditionalTaxAmt>"),
    true,
  );
});

Deno.test("dealer-transfer repayments reference the parent Form 8936, not its Schedule A", () => {
  const xml = schedule2.build({
    line1b_new_clean_vehicle_repayment: 7_500,
    line1c_prev_owned_clean_vehicle_repayment: 4_000,
  }, {
    documentIdsByTag: { IRS8936: ["IRS89362"] },
  });
  assertStringIncludes(
    xml,
    '<CrTrnsfrDlrSaleAmt referenceDocumentId="IRS89362" referenceDocumentName="IRS8936">7500</CrTrnsfrDlrSaleAmt>',
  );
  assertStringIncludes(
    xml,
    '<PrevOwnCrTrnsfrDlrSaleAmt referenceDocumentId="IRS89362" referenceDocumentName="IRS8936">4000</PrevOwnCrTrnsfrDlrSaleAmt>',
  );
});

Deno.test("line4_se_tax maps to SelfEmploymentTaxAmt", () => {
  const result = schedule2.build({ line4_se_tax: 14100 });
  assertStringIncludes(
    result,
    "<SelfEmploymentTaxAmt>14100</SelfEmploymentTaxAmt>",
  );
});

Deno.test("Form 8889 testing-period tax reaches Schedule 2 line 17d, 18, and 21", () => {
  const xml = schedule2.build({
    line17c_hsa_penalty: 120,
    line17d_hsa_eligibility_tax: 50,
  });
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>120</HSADistriAddnlPercentTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<HDHPCoverageAddnlTaxAmt>50</HDHPCoverageAddnlTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOtherAdditionalTaxesAmt>170</TotalOtherAdditionalTaxesAmt>",
  );
  assertStringIncludes(xml, "<TotalOtherTaxesAmt>170</TotalOtherTaxesAmt>");
});

Deno.test("line5_unreported_tip_tax maps to SocSecMedicareTaxUnrptdTipAmt", () => {
  const result = schedule2.build({ line5_unreported_tip_tax: 300 });
  assertStringIncludes(
    result,
    "<SocSecMedicareTaxUnrptdTipAmt>300</SocSecMedicareTaxUnrptdTipAmt>",
  );
});

Deno.test("line6_uncollected_8919 maps to UncollectedSocSecMedTaxAmt", () => {
  const result = schedule2.build({ line6_uncollected_8919: 1200 });
  assertStringIncludes(
    result,
    "<UncollectedSocSecMedTaxAmt>1200</UncollectedSocSecMedTaxAmt>",
  );
});

Deno.test("line8_form5329_tax maps to TaxOnIRAsAmt", () => {
  const result = schedule2.build({ line8_form5329_tax: 600 });
  assertStringIncludes(result, "<TaxOnIRAsAmt>600</TaxOnIRAsAmt>");
});

Deno.test("line9_household_employment maps to HouseholdEmploymentTaxAmt", () => {
  const result = schedule2.build({ line9_household_employment: 474 });
  assertStringIncludes(
    result,
    "<HouseholdEmploymentTaxAmt>474</HouseholdEmploymentTaxAmt>",
  );
});

Deno.test("line11_additional_medicare maps to TotalAMRRTTaxAmt", () => {
  const result = schedule2.build({ line11_additional_medicare: 900 });
  assertStringIncludes(result, "<TotalAMRRTTaxAmt>900</TotalAMRRTTaxAmt>");
});

Deno.test("line12_niit maps to IndivNetInvstIncomeTaxAmt", () => {
  const result = schedule2.build({ line12_niit: 3800 });
  assertStringIncludes(
    result,
    "<IndivNetInvstIncomeTaxAmt>3800</IndivNetInvstIncomeTaxAmt>",
  );
});

Deno.test("line17c_hsa_penalty maps to HSADistriAddnlPercentTaxAmt", () => {
  const result = schedule2.build({ line17c_hsa_penalty: 400 });
  assertStringIncludes(
    result,
    "<HSADistriAddnlPercentTaxAmt>400</HSADistriAddnlPercentTaxAmt>",
  );
});

Deno.test("Schedule 2 section 965 payment requires Form 965-A in a full bundle", () => {
  assertThrows(
    () =>
      schedule2.build(
        { line20_965_tax_installment: 8_000 },
        { documentIdsByPendingKey: {} },
      ),
    Error,
    "needs attached Form 965-A",
  );
  assertStringIncludes(
    schedule2.build(
      { line20_965_tax_installment: 8_000 },
      { documentIdsByPendingKey: { f965: ["d1"] } },
    ),
    "<Section965TaxInstallmentAmt>8000</Section965TaxInstallmentAmt>",
  );
});

Deno.test("TY2025 mortgage and housing recaptures use lines 17b and 16", () => {
  const result = schedule2.build({
    line16_lihtc_recapture: 750,
    line17b_mortgage_subsidy_recapture: 1_000,
    line17c_hsa_penalty: 400,
    uncollected_fica: 100,
  });
  assertStringIncludes(result, "<RecaptureTaxAmt>750</RecaptureTaxAmt>");
  assertStringIncludes(
    result,
    "<MortgSbsdyRecaptureTaxAmt>1000</MortgSbsdyRecaptureTaxAmt>",
  );
  const tags = [
    "UncollSSMedcrRRTAGrpInsTxAmt",
    "RecaptureTaxAmt",
    "MortgSbsdyRecaptureTaxAmt",
    "HSADistriAddnlPercentTaxAmt",
  ];
  const positions = tags.map((tag) => result.indexOf(`<${tag}>`));
  assertEquals(positions.every((position) => position >= 0), true);
  assertEquals(
    positions.every((position, index) =>
      index === 0 ||
      positions[index - 1] < position
    ),
    true,
  );
});

Deno.test("2025 Schedule 2 rejects generic 3468 recapture without a Form 4255 credit-line source", () => {
  assertThrows(
    () => schedule2.build({ line17a_investment_credit_recapture: 2_500 }),
    Error,
    "requires a specific Form 4255 credit-line source",
  );
});

Deno.test("2025 Schedule 2 keeps NMCR recapture source-linked", () => {
  const source = {
    recaptures: [{
      notice_reference: "2025 CDE notice",
      investment_reference: "2022 QEI designation",
      cde_name: "Community Development Entity",
      cde_ein: "123456789",
      notice_taxpayer_tin: "111223333",
      initial_investment_date: "2022-06-01",
      qualified_equity_investment_amount: 100_000,
      notice_credit_amount: 25_000,
      recapture_event_date: "2025-07-01",
      recapture_event: "cde_redeemed_investment",
      prior_years: [{
        tax_year: 2024,
        original_return_due_date: "2025-04-15",
        section38_credit_allowed_as_filed: 3_000,
        section38_credit_allowed_without_this_qei: 0,
        recomputation_reference: "2024 Form 3800 recomputation",
      }],
      carryover_ledger_reference: "2024 QEI carryover ledger",
      carryover_vintages: [],
    }],
  } as const;
  const nmcr = calculateForm8874Recapture({
    recaptures: source.recaptures.map((recapture) => ({
      ...recapture,
      prior_years: [...recapture.prior_years],
      carryover_vintages: [...recapture.carryover_vintages],
    })),
  });
  const result = schedule2.build({
    line17a_new_markets_credit_recapture: nmcr,
  }, { pending: { f8874_recapture: source } });
  assertStringIncludes(
    result,
    `<RecaptureOtherCreditsGrp><OtherCreditsCd>NMCR</OtherCreditsCd><OtherCreditsAmt>${nmcr}</OtherCreditsAmt></RecaptureOtherCreditsGrp>`,
  );
  assertStringIncludes(
    result,
    `<TotalRecaptureOtherCreditsAmt>${nmcr}</TotalRecaptureOtherCreditsAmt>`,
  );
  assertThrows(
    () => schedule2.build({ line17a_new_markets_credit_recapture: nmcr }),
    Error,
    "Form 8874-B recapture source",
  );
  assertThrows(
    () =>
      schedule2.build(
        { line17a_new_markets_credit_recapture: nmcr + 1 },
        { pending: { f8874_recapture: source } },
      ),
    Error,
    "does not match",
  );
});

Deno.test("section 965 installment stays on Schedule 2 line 20, outside line 21", () => {
  const result = schedule2.build({ line20_965_tax_installment: 8_000 });
  assertStringIncludes(
    result,
    "<Section965TaxInstallmentAmt>8000</Section965TaxInstallmentAmt>",
  );
  assertEquals(result.includes("<TotalOtherTaxesAmt>"), false);
});

Deno.test("2025 Schedule 2 line 7, 18, and 21 reconcile to supported tax sources", () => {
  const result = schedule2.build({
    line4_se_tax: 1_000,
    line5_unreported_tip_tax: 100,
    line6_uncollected_8919: 200,
    uncollected_fica: 50,
    line17c_hsa_penalty: 300,
    line20_965_tax_installment: 8_000,
  });
  assertStringIncludes(
    result,
    "<UnrprtdSocSecAndMedcrTaxAmt>300</UnrprtdSocSecAndMedcrTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalOtherAdditionalTaxesAmt>300</TotalOtherAdditionalTaxesAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalOtherTaxesAmt>1650</TotalOtherTaxesAmt>",
  );
  assertEquals(
    result.indexOf("<UncollectedSocSecMedTaxAmt>") <
      result.indexOf("<UnrprtdSocSecAndMedcrTaxAmt>"),
    true,
  );
});

Deno.test("negative Form 8978 adjustment reduces lines 17z, 18, and 21 together", () => {
  const result = schedule2.build({ line17c_hsa_penalty: 400 }, {
    pending: {
      form8978_reporting_year: {
        schedule2_line17z_reduction: 250,
        schedule2_line21: 150,
      },
    },
  });
  assertStringIncludes(
    result,
    "<TotalAnyOtherTaxesAmt>-250</TotalAnyOtherTaxesAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalOtherAdditionalTaxesAmt>150</TotalOtherAdditionalTaxesAmt>",
  );
  assertStringIncludes(result, "<TotalOtherTaxesAmt>150</TotalOtherTaxesAmt>");
});

Deno.test("negative Form 8978 adjustment stops when Schedule 2 line 18 cannot be represented", () => {
  assertThrows(
    () =>
      schedule2.build({ line8_form5329_tax: 100 }, {
        pending: {
          form8978_reporting_year: {
            schedule2_line17z_reduction: 100,
            schedule2_line21: 0,
          },
        },
      }),
    Error,
    "the TY2025 MeF schema cannot represent that result",
  );
});

Deno.test("source-free mapped Schedule 2 fields survive the schema-order builder", () => {
  // Form 4255 amounts need their own source rows and are tested separately.
  const mappings = FIELD_MAP.filter(([key]) =>
    key !== "line1d_form4255_net_epe" &&
    key !== "line19_form4255_net_epe"
  );
  const fields = Object.fromEntries(mappings.map(([key]) => [key, 1]));
  const result = schedule2.build(fields);
  for (const [, tag] of mappings) {
    assertStringIncludes(result, `<${tag}>1</${tag}>`);
  }
});

Deno.test("line17e_archer_msa_tax maps to ArcherMSAAddnlDistriTaxAmt", () => {
  const result = schedule2.build({ line17e_archer_msa_tax: 200 });
  assertStringIncludes(
    result,
    "<ArcherMSAAddnlDistriTaxAmt>200</ArcherMSAAddnlDistriTaxAmt>",
  );
});

Deno.test(
  "line17f_medicare_advantage_msa_tax maps to MedicareMSAAddnlDistriTaxAmt",
  () => {
    const result = schedule2.build({
      line17f_medicare_advantage_msa_tax: 150,
    });
    assertStringIncludes(
      result,
      "<MedicareMSAAddnlDistriTaxAmt>150</MedicareMSAAddnlDistriTaxAmt>",
    );
  },
);

// ---------------------------------------------------------------------------
// Section 5: Aggregated field tests
// ---------------------------------------------------------------------------

Deno.test(
  "uncollected_fica(500) + uncollected_fica_gtl(300) emits UncollSSMedcrRRTAGrpInsTxAmt=800",
  () => {
    const result = schedule2.build({
      uncollected_fica: 500,
      uncollected_fica_gtl: 300,
    });
    assertStringIncludes(
      result,
      "<UncollSSMedcrRRTAGrpInsTxAmt>800</UncollSSMedcrRRTAGrpInsTxAmt>",
    );
  },
);

Deno.test(
  "uncollected_fica(500) alone emits UncollSSMedcrRRTAGrpInsTxAmt=500",
  () => {
    const result = schedule2.build({ uncollected_fica: 500 });
    assertStringIncludes(
      result,
      "<UncollSSMedcrRRTAGrpInsTxAmt>500</UncollSSMedcrRRTAGrpInsTxAmt>",
    );
  },
);

Deno.test(
  "uncollected_fica_gtl(300) alone emits UncollSSMedcrRRTAGrpInsTxAmt=300",
  () => {
    const result = schedule2.build({ uncollected_fica_gtl: 300 });
    assertStringIncludes(
      result,
      "<UncollSSMedcrRRTAGrpInsTxAmt>300</UncollSSMedcrRRTAGrpInsTxAmt>",
    );
  },
);

Deno.test(
  "section409a_excise(1000) + line17h_nqdc_tax(500) emits IncmNonqlfyDefrdCompPlanAmt=1500",
  () => {
    const result = schedule2.build({
      section409a_excise: 1000,
      line17h_nqdc_tax: 500,
    });
    assertStringIncludes(
      result,
      "<IncmNonqlfyDefrdCompPlanAmt>1500</IncmNonqlfyDefrdCompPlanAmt>",
    );
  },
);

Deno.test(
  "section409a_excise(1000) alone emits IncmNonqlfyDefrdCompPlanAmt=1000",
  () => {
    const result = schedule2.build({ section409a_excise: 1000 });
    assertStringIncludes(
      result,
      "<IncmNonqlfyDefrdCompPlanAmt>1000</IncmNonqlfyDefrdCompPlanAmt>",
    );
  },
);

Deno.test(
  "golden_parachute_excise(2000) + line17k_golden_parachute_excise(3000) emits ExcessParachutePaymentAmt=5000",
  () => {
    const result = schedule2.build({
      golden_parachute_excise: 2000,
      line17k_golden_parachute_excise: 3000,
    });
    assertStringIncludes(
      result,
      "<ExcessParachutePaymentAmt>5000</ExcessParachutePaymentAmt>",
    );
  },
);

Deno.test(
  "golden_parachute_excise(2000) alone emits ExcessParachutePaymentAmt=2000",
  () => {
    const result = schedule2.build({ golden_parachute_excise: 2000 });
    assertStringIncludes(
      result,
      "<ExcessParachutePaymentAmt>2000</ExcessParachutePaymentAmt>",
    );
  },
);

// ---------------------------------------------------------------------------
// Section 6: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = schedule2.build({ line4_se_tax: 14100 });
  assertStringIncludes(
    result,
    "<SelfEmploymentTaxAmt>14100</SelfEmploymentTaxAmt>",
  );
  assertNotIncludes(result, "<AlternativeMinimumTaxAmt>");
  assertNotIncludes(result, "<TaxOnIRAsAmt>");
  assertNotIncludes(result, "<IndivNetInvstIncomeTaxAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = schedule2.build({
    line2_amt: 3000,
    line12_niit: 1900,
  });
  assertStringIncludes(
    result,
    "<AlternativeMinimumTaxAmt>3000</AlternativeMinimumTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<IndivNetInvstIncomeTaxAmt>1900</IndivNetInvstIncomeTaxAmt>",
  );
  assertNotIncludes(result, "<SelfEmploymentTaxAmt>");
  assertNotIncludes(result, "<TaxOnIRAsAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  line2_amt: 100,
  line4_se_tax: 200,
  line5_unreported_tip_tax: 300,
  line6_uncollected_8919: 400,
  line8_form5329_tax: 500,
  line11_additional_medicare: 600,
  line12_niit: 700,
  uncollected_fica: 800,
  uncollected_fica_gtl: 900,
  section409a_excise: 1000,
  line17h_nqdc_tax: 1100,
  golden_parachute_excise: 1200,
  line17k_golden_parachute_excise: 1300,
  line17c_hsa_penalty: 1400,
  line17e_archer_msa_tax: 1500,
  line17f_medicare_advantage_msa_tax: 1600,
};

Deno.test("all fields present: output wrapped in IRS1040Schedule2 tag", () => {
  const result = schedule2.build(allFields);
  assertStringIncludes(result, "<IRS1040Schedule2>");
  assertStringIncludes(result, "</IRS1040Schedule2>");
});

Deno.test("all fields present: all direct-mapped elements emitted", () => {
  const result = schedule2.build(allFields);
  assertStringIncludes(
    result,
    "<AlternativeMinimumTaxAmt>100</AlternativeMinimumTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<SelfEmploymentTaxAmt>200</SelfEmploymentTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<SocSecMedicareTaxUnrptdTipAmt>300</SocSecMedicareTaxUnrptdTipAmt>",
  );
  assertStringIncludes(
    result,
    "<UncollectedSocSecMedTaxAmt>400</UncollectedSocSecMedTaxAmt>",
  );
  assertStringIncludes(result, "<TaxOnIRAsAmt>500</TaxOnIRAsAmt>");
  assertStringIncludes(result, "<TotalAMRRTTaxAmt>600</TotalAMRRTTaxAmt>");
  assertStringIncludes(
    result,
    "<IndivNetInvstIncomeTaxAmt>700</IndivNetInvstIncomeTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<HSADistriAddnlPercentTaxAmt>1400</HSADistriAddnlPercentTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<ArcherMSAAddnlDistriTaxAmt>1500</ArcherMSAAddnlDistriTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<MedicareMSAAddnlDistriTaxAmt>1600</MedicareMSAAddnlDistriTaxAmt>",
  );
  assertEquals(result.includes("PartialTaxOnAccumDistriAmt"), false);
});

Deno.test("all fields present: aggregated elements summed correctly", () => {
  const result = schedule2.build(allFields);
  // uncollected_fica(800) + uncollected_fica_gtl(900) = 1700
  assertStringIncludes(
    result,
    "<UncollSSMedcrRRTAGrpInsTxAmt>1700</UncollSSMedcrRRTAGrpInsTxAmt>",
  );
  // section409a_excise(1000) + line17h_nqdc_tax(1100) = 2100
  assertStringIncludes(
    result,
    "<IncmNonqlfyDefrdCompPlanAmt>2100</IncmNonqlfyDefrdCompPlanAmt>",
  );
  // golden_parachute_excise(1200) + line17k_golden_parachute_excise(1300) = 2500
  assertStringIncludes(
    result,
    "<ExcessParachutePaymentAmt>2500</ExcessParachutePaymentAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 8: Mixed known/unknown keys
// ---------------------------------------------------------------------------

Deno.test("known field emitted, unknown field dropped", () => {
  const result = schedule2.build({ line4_se_tax: 14100, junk: 999 });
  assertStringIncludes(
    result,
    "<SelfEmploymentTaxAmt>14100</SelfEmploymentTaxAmt>",
  );
  assertNotIncludes(result, "junk");
  assertNotIncludes(result, "999");
});

Deno.test("multiple known and unknown fields: only known emitted", () => {
  const result = schedule2.build({
    line2_amt: 2500,
    unknown_field_1: 500,
    line12_niit: 800,
    not_a_real_key: "ignored",
  });
  assertStringIncludes(
    result,
    "<AlternativeMinimumTaxAmt>2500</AlternativeMinimumTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<IndivNetInvstIncomeTaxAmt>800</IndivNetInvstIncomeTaxAmt>",
  );
  assertNotIncludes(result, "unknown_field_1");
  assertNotIncludes(result, "not_a_real_key");
});
