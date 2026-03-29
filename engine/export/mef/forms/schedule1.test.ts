import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS1040Schedule1 } from "./schedule1.ts";

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
  assertEquals(buildIRS1040Schedule1({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS1040Schedule1({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("line7_unemployment at zero is emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 0 });
  assertStringIncludes(result, "<UnemploymentCompAmt>0</UnemploymentCompAmt>");
});

Deno.test("line1_state_refund at zero is emitted", () => {
  const result = buildIRS1040Schedule1({ line1_state_refund: 0 });
  assertStringIncludes(
    result,
    "<StateLocalTaxRefundAmt>0</StateLocalTaxRefundAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Negative values
// ---------------------------------------------------------------------------

Deno.test("line3_schedule_c negative emits with minus sign", () => {
  const result = buildIRS1040Schedule1({ line3_schedule_c: -5000 });
  assertStringIncludes(
    result,
    "<BusinessIncomeLossAmt>-5000</BusinessIncomeLossAmt>",
  );
});

Deno.test("line17_schedule_e negative emits with minus sign", () => {
  const result = buildIRS1040Schedule1({ line17_schedule_e: -12000 });
  assertStringIncludes(
    result,
    "<RentalRealEstateIncomeLossAmt>-12000</RentalRealEstateIncomeLossAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Per-field mapping (one test per field, 15 total)
// ---------------------------------------------------------------------------

Deno.test("line1_state_refund maps to StateLocalTaxRefundAmt", () => {
  const result = buildIRS1040Schedule1({ line1_state_refund: 100 });
  assertStringIncludes(
    result,
    "<StateLocalTaxRefundAmt>100</StateLocalTaxRefundAmt>",
  );
});

Deno.test("line3_schedule_c maps to BusinessIncomeLossAmt", () => {
  const result = buildIRS1040Schedule1({ line3_schedule_c: 2500 });
  assertStringIncludes(
    result,
    "<BusinessIncomeLossAmt>2500</BusinessIncomeLossAmt>",
  );
});

Deno.test("line7_unemployment maps to UnemploymentCompAmt", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 4800 });
  assertStringIncludes(
    result,
    "<UnemploymentCompAmt>4800</UnemploymentCompAmt>",
  );
});

Deno.test("line8i_prizes_awards maps to PrizeAwardAmt", () => {
  const result = buildIRS1040Schedule1({ line8i_prizes_awards: 500 });
  assertStringIncludes(result, "<PrizeAwardAmt>500</PrizeAwardAmt>");
});

Deno.test("line8z_rtaa maps to RTAAPaymentsAmt", () => {
  const result = buildIRS1040Schedule1({ line8z_rtaa: 300 });
  assertStringIncludes(result, "<RTAAPaymentsAmt>300</RTAAPaymentsAmt>");
});

Deno.test("line8z_taxable_grants maps to TaxableGrantsAmt", () => {
  const result = buildIRS1040Schedule1({ line8z_taxable_grants: 1200 });
  assertStringIncludes(result, "<TaxableGrantsAmt>1200</TaxableGrantsAmt>");
});

Deno.test("line8z_substitute_payments maps to SubstitutePaymentsAmt", () => {
  const result = buildIRS1040Schedule1({ line8z_substitute_payments: 750 });
  assertStringIncludes(
    result,
    "<SubstitutePaymentsAmt>750</SubstitutePaymentsAmt>",
  );
});

Deno.test(
  "line8z_attorney_proceeds maps to GrossProeedsToAttorneyAmt (IRS typo: Proe not Proc)",
  () => {
    const result = buildIRS1040Schedule1({ line8z_attorney_proceeds: 2000 });
    assertStringIncludes(
      result,
      "<GrossProeedsToAttorneyAmt>2000</GrossProeedsToAttorneyAmt>",
    );
  },
);

Deno.test("line8z_nqdc maps to NQDCDistributionAmt", () => {
  const result = buildIRS1040Schedule1({ line8z_nqdc: 9000 });
  assertStringIncludes(
    result,
    "<NQDCDistributionAmt>9000</NQDCDistributionAmt>",
  );
});

Deno.test("line8z_other maps to OtherIncomeAmt", () => {
  const result = buildIRS1040Schedule1({ line8z_other: 400 });
  assertStringIncludes(result, "<OtherIncomeAmt>400</OtherIncomeAmt>");
});

Deno.test("line8z_golden_parachute maps to ExcessGoldenParachuteAmt", () => {
  const result = buildIRS1040Schedule1({ line8z_golden_parachute: 50000 });
  assertStringIncludes(
    result,
    "<ExcessGoldenParachuteAmt>50000</ExcessGoldenParachuteAmt>",
  );
});

Deno.test("line8c_cod_income maps to CancellationOfDebtAmt", () => {
  const result = buildIRS1040Schedule1({ line8c_cod_income: 3000 });
  assertStringIncludes(
    result,
    "<CancellationOfDebtAmt>3000</CancellationOfDebtAmt>",
  );
});

Deno.test("line17_schedule_e maps to RentalRealEstateIncomeLossAmt", () => {
  const result = buildIRS1040Schedule1({ line17_schedule_e: 8000 });
  assertStringIncludes(
    result,
    "<RentalRealEstateIncomeLossAmt>8000</RentalRealEstateIncomeLossAmt>",
  );
});

Deno.test("line18_early_withdrawal maps to EarlyWithdrawalPenaltyAmt", () => {
  const result = buildIRS1040Schedule1({ line18_early_withdrawal: 600 });
  assertStringIncludes(
    result,
    "<EarlyWithdrawalPenaltyAmt>600</EarlyWithdrawalPenaltyAmt>",
  );
});

Deno.test("line24f_501c18d maps to Sec501c18dContributionAmt", () => {
  const result = buildIRS1040Schedule1({ line24f_501c18d: 250 });
  assertStringIncludes(
    result,
    "<Sec501c18dContributionAmt>250</Sec501c18dContributionAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 6: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 4800 });
  assertStringIncludes(
    result,
    "<UnemploymentCompAmt>4800</UnemploymentCompAmt>",
  );
  assertNotIncludes(result, "<StateLocalTaxRefundAmt>");
  assertNotIncludes(result, "<BusinessIncomeLossAmt>");
  assertNotIncludes(result, "<PrizeAwardAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = buildIRS1040Schedule1({
    line1_state_refund: 500,
    line7_unemployment: 1200,
  });
  assertStringIncludes(
    result,
    "<StateLocalTaxRefundAmt>500</StateLocalTaxRefundAmt>",
  );
  assertStringIncludes(
    result,
    "<UnemploymentCompAmt>1200</UnemploymentCompAmt>",
  );
  assertNotIncludes(result, "<BusinessIncomeLossAmt>");
  assertNotIncludes(result, "<EarlyWithdrawalPenaltyAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  line1_state_refund: 100,
  line3_schedule_c: 200,
  line7_unemployment: 300,
  line8i_prizes_awards: 400,
  line8z_rtaa: 500,
  line8z_taxable_grants: 600,
  line8z_substitute_payments: 700,
  line8z_attorney_proceeds: 800,
  line8z_nqdc: 900,
  line8z_other: 1000,
  line8z_golden_parachute: 1100,
  line8c_cod_income: 1200,
  line17_schedule_e: 1300,
  line18_early_withdrawal: 1400,
  line24f_501c18d: 1500,
};

Deno.test("all 15 fields present: output wrapped in IRS1040Schedule1 tag", () => {
  const result = buildIRS1040Schedule1(allFields);
  assertStringIncludes(result, "<IRS1040Schedule1>");
  assertStringIncludes(result, "</IRS1040Schedule1>");
});

Deno.test("all 15 fields present: all elements emitted", () => {
  const result = buildIRS1040Schedule1(allFields);
  assertStringIncludes(
    result,
    "<StateLocalTaxRefundAmt>100</StateLocalTaxRefundAmt>",
  );
  assertStringIncludes(
    result,
    "<BusinessIncomeLossAmt>200</BusinessIncomeLossAmt>",
  );
  assertStringIncludes(
    result,
    "<UnemploymentCompAmt>300</UnemploymentCompAmt>",
  );
  assertStringIncludes(result, "<PrizeAwardAmt>400</PrizeAwardAmt>");
  assertStringIncludes(result, "<RTAAPaymentsAmt>500</RTAAPaymentsAmt>");
  assertStringIncludes(result, "<TaxableGrantsAmt>600</TaxableGrantsAmt>");
  assertStringIncludes(
    result,
    "<SubstitutePaymentsAmt>700</SubstitutePaymentsAmt>",
  );
  assertStringIncludes(
    result,
    "<GrossProeedsToAttorneyAmt>800</GrossProeedsToAttorneyAmt>",
  );
  assertStringIncludes(
    result,
    "<NQDCDistributionAmt>900</NQDCDistributionAmt>",
  );
  assertStringIncludes(result, "<OtherIncomeAmt>1000</OtherIncomeAmt>");
  assertStringIncludes(
    result,
    "<ExcessGoldenParachuteAmt>1100</ExcessGoldenParachuteAmt>",
  );
  assertStringIncludes(
    result,
    "<CancellationOfDebtAmt>1200</CancellationOfDebtAmt>",
  );
  assertStringIncludes(
    result,
    "<RentalRealEstateIncomeLossAmt>1300</RentalRealEstateIncomeLossAmt>",
  );
  assertStringIncludes(
    result,
    "<EarlyWithdrawalPenaltyAmt>1400</EarlyWithdrawalPenaltyAmt>",
  );
  assertStringIncludes(
    result,
    "<Sec501c18dContributionAmt>1500</Sec501c18dContributionAmt>",
  );
});

Deno.test("all 15 fields present: elements appear in field map order", () => {
  const result = buildIRS1040Schedule1(allFields);
  const idxFirst = result.indexOf("<StateLocalTaxRefundAmt>");
  const idxMiddle = result.indexOf("<BusinessIncomeLossAmt>");
  const idxLast = result.indexOf("<Sec501c18dContributionAmt>");
  assertEquals(
    idxFirst < idxMiddle,
    true,
    "StateLocalTaxRefundAmt must appear before BusinessIncomeLossAmt",
  );
  assertEquals(
    idxMiddle < idxLast,
    true,
    "BusinessIncomeLossAmt must appear before Sec501c18dContributionAmt",
  );
});

Deno.test(
  "all 15 fields present: field map order — unemployment before prizes before rtaa",
  () => {
    const result = buildIRS1040Schedule1(allFields);
    const idxUnemployment = result.indexOf("<UnemploymentCompAmt>");
    const idxPrizes = result.indexOf("<PrizeAwardAmt>");
    const idxRtaa = result.indexOf("<RTAAPaymentsAmt>");
    assertEquals(
      idxUnemployment < idxPrizes,
      true,
      "UnemploymentCompAmt must appear before PrizeAwardAmt",
    );
    assertEquals(
      idxPrizes < idxRtaa,
      true,
      "PrizeAwardAmt must appear before RTAAPaymentsAmt",
    );
  },
);

// ---------------------------------------------------------------------------
// Section 8: Mixed known/unknown
// ---------------------------------------------------------------------------

Deno.test("known field emitted, unknown field dropped", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 4800, junk: 999 });
  assertStringIncludes(
    result,
    "<UnemploymentCompAmt>4800</UnemploymentCompAmt>",
  );
  assertNotIncludes(result, "junk");
  assertNotIncludes(result, "999");
});

Deno.test("multiple known and unknown fields: only known emitted", () => {
  const result = buildIRS1040Schedule1({
    line1_state_refund: 1000,
    unknown_field_1: 500,
    line8z_other: 200,
    not_a_real_key: "ignored",
  });
  assertStringIncludes(
    result,
    "<StateLocalTaxRefundAmt>1000</StateLocalTaxRefundAmt>",
  );
  assertStringIncludes(result, "<OtherIncomeAmt>200</OtherIncomeAmt>");
  assertNotIncludes(result, "unknown_field_1");
  assertNotIncludes(result, "not_a_real_key");
});

// ---------------------------------------------------------------------------
// Section 9: Multiple line8z fields
// ---------------------------------------------------------------------------

Deno.test("multiple line8z fields each emit their own element", () => {
  const result = buildIRS1040Schedule1({
    line8z_rtaa: 300,
    line8z_taxable_grants: 1200,
    line8z_substitute_payments: 750,
    line8z_attorney_proceeds: 2000,
    line8z_nqdc: 9000,
    line8z_other: 400,
    line8z_golden_parachute: 50000,
  });
  assertStringIncludes(result, "<RTAAPaymentsAmt>300</RTAAPaymentsAmt>");
  assertStringIncludes(result, "<TaxableGrantsAmt>1200</TaxableGrantsAmt>");
  assertStringIncludes(
    result,
    "<SubstitutePaymentsAmt>750</SubstitutePaymentsAmt>",
  );
  assertStringIncludes(
    result,
    "<GrossProeedsToAttorneyAmt>2000</GrossProeedsToAttorneyAmt>",
  );
  assertStringIncludes(
    result,
    "<NQDCDistributionAmt>9000</NQDCDistributionAmt>",
  );
  assertStringIncludes(result, "<OtherIncomeAmt>400</OtherIncomeAmt>");
  assertStringIncludes(
    result,
    "<ExcessGoldenParachuteAmt>50000</ExcessGoldenParachuteAmt>",
  );
});

Deno.test(
  "multiple line8z fields: elements appear in field map order (rtaa before taxable_grants before substitute_payments)",
  () => {
    const result = buildIRS1040Schedule1({
      line8z_rtaa: 300,
      line8z_taxable_grants: 1200,
      line8z_substitute_payments: 750,
      line8z_attorney_proceeds: 2000,
      line8z_nqdc: 9000,
      line8z_other: 400,
      line8z_golden_parachute: 50000,
    });
    const idxRtaa = result.indexOf("<RTAAPaymentsAmt>");
    const idxGrants = result.indexOf("<TaxableGrantsAmt>");
    const idxSubs = result.indexOf("<SubstitutePaymentsAmt>");
    const idxAttorney = result.indexOf("<GrossProeedsToAttorneyAmt>");
    const idxNqdc = result.indexOf("<NQDCDistributionAmt>");
    const idxOther = result.indexOf("<OtherIncomeAmt>");
    const idxParachute = result.indexOf("<ExcessGoldenParachuteAmt>");
    assertEquals(idxRtaa < idxGrants, true, "RTAAPaymentsAmt before TaxableGrantsAmt");
    assertEquals(idxGrants < idxSubs, true, "TaxableGrantsAmt before SubstitutePaymentsAmt");
    assertEquals(idxSubs < idxAttorney, true, "SubstitutePaymentsAmt before GrossProeedsToAttorneyAmt");
    assertEquals(idxAttorney < idxNqdc, true, "GrossProeedsToAttorneyAmt before NQDCDistributionAmt");
    assertEquals(idxNqdc < idxOther, true, "NQDCDistributionAmt before OtherIncomeAmt");
    assertEquals(idxOther < idxParachute, true, "OtherIncomeAmt before ExcessGoldenParachuteAmt");
  },
);

// ---------------------------------------------------------------------------
// Section 10: Wrapper tag presence for non-empty output
// ---------------------------------------------------------------------------

Deno.test("single field: output is wrapped in IRS1040Schedule1 tag", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 4800 });
  assertStringIncludes(result, "<IRS1040Schedule1>");
  assertStringIncludes(result, "</IRS1040Schedule1>");
});

// ---------------------------------------------------------------------------
// Section 11: New fields (8 additions)
// ---------------------------------------------------------------------------

Deno.test("line4_other_gains maps to OtherGainLossAmt", () => {
  const result = buildIRS1040Schedule1({ line4_other_gains: 8500 });
  assertStringIncludes(result, "<OtherGainLossAmt>8500</OtherGainLossAmt>");
});
Deno.test("line4_other_gains negative emits with minus sign", () => {
  const result = buildIRS1040Schedule1({ line4_other_gains: -2000 });
  assertStringIncludes(result, "<OtherGainLossAmt>-2000</OtherGainLossAmt>");
});
Deno.test("line4_other_gains absent not emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 100 });
  assertNotIncludes(result, "<OtherGainLossAmt>");
});

Deno.test("line6_schedule_f maps to NetFarmProfitLossAmt", () => {
  const result = buildIRS1040Schedule1({ line6_schedule_f: 15000 });
  assertStringIncludes(result, "<NetFarmProfitLossAmt>15000</NetFarmProfitLossAmt>");
});
Deno.test("line6_schedule_f negative emits with minus sign", () => {
  const result = buildIRS1040Schedule1({ line6_schedule_f: -3000 });
  assertStringIncludes(result, "<NetFarmProfitLossAmt>-3000</NetFarmProfitLossAmt>");
});
Deno.test("line6_schedule_f absent not emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 100 });
  assertNotIncludes(result, "<NetFarmProfitLossAmt>");
});

Deno.test("line8e_archer_msa_dist maps to TotArcherMSAMedcrLTCAmt", () => {
  const result = buildIRS1040Schedule1({ line8e_archer_msa_dist: 6000 });
  assertStringIncludes(result, "<TotArcherMSAMedcrLTCAmt>6000</TotArcherMSAMedcrLTCAmt>");
});
Deno.test("line8e_archer_msa_dist absent not emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 100 });
  assertNotIncludes(result, "<TotArcherMSAMedcrLTCAmt>");
});

Deno.test("line8p_excess_business_loss maps to ExcessBusinessLossAmt", () => {
  const result = buildIRS1040Schedule1({ line8p_excess_business_loss: 12000 });
  assertStringIncludes(result, "<ExcessBusinessLossAmt>12000</ExcessBusinessLossAmt>");
});
Deno.test("line8p_excess_business_loss absent not emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 100 });
  assertNotIncludes(result, "<ExcessBusinessLossAmt>");
});

Deno.test("line13_hsa_deduction maps to HealthSavingsAccountDedAmt", () => {
  const result = buildIRS1040Schedule1({ line13_hsa_deduction: 3850 });
  assertStringIncludes(result, "<HealthSavingsAccountDedAmt>3850</HealthSavingsAccountDedAmt>");
});
Deno.test("line13_hsa_deduction absent not emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 100 });
  assertNotIncludes(result, "<HealthSavingsAccountDedAmt>");
});

Deno.test("line15_se_deduction maps to DeductibleSelfEmploymentTaxAmt", () => {
  const result = buildIRS1040Schedule1({ line15_se_deduction: 7065 });
  assertStringIncludes(result, "<DeductibleSelfEmploymentTaxAmt>7065</DeductibleSelfEmploymentTaxAmt>");
});
Deno.test("line15_se_deduction absent not emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 100 });
  assertNotIncludes(result, "<DeductibleSelfEmploymentTaxAmt>");
});

Deno.test("line20_ira_deduction maps to IRADeductionAmt", () => {
  const result = buildIRS1040Schedule1({ line20_ira_deduction: 6000 });
  assertStringIncludes(result, "<IRADeductionAmt>6000</IRADeductionAmt>");
});
Deno.test("line20_ira_deduction absent not emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 100 });
  assertNotIncludes(result, "<IRADeductionAmt>");
});

Deno.test("line23_archer_msa_deduction maps to ArcherMSADeductionAmt", () => {
  const result = buildIRS1040Schedule1({ line23_archer_msa_deduction: 2400 });
  assertStringIncludes(result, "<ArcherMSADeductionAmt>2400</ArcherMSADeductionAmt>");
});
Deno.test("line23_archer_msa_deduction absent not emitted", () => {
  const result = buildIRS1040Schedule1({ line7_unemployment: 100 });
  assertNotIncludes(result, "<ArcherMSADeductionAmt>");
});

// ---------------------------------------------------------------------------
// Section 12: All 23 fields present
// ---------------------------------------------------------------------------

Deno.test("all 23 fields present: all elements emitted and wrapped", () => {
  const result = buildIRS1040Schedule1({
    line1_state_refund: 100,
    line3_schedule_c: 200,
    line4_other_gains: 300,
    line6_schedule_f: 400,
    line7_unemployment: 500,
    line8c_cod_income: 600,
    line8e_archer_msa_dist: 700,
    line8i_prizes_awards: 800,
    line8p_excess_business_loss: 900,
    line8z_rtaa: 1000,
    line8z_taxable_grants: 1100,
    line8z_substitute_payments: 1200,
    line8z_attorney_proceeds: 1300,
    line8z_nqdc: 1400,
    line8z_other: 1500,
    line8z_golden_parachute: 1600,
    line13_hsa_deduction: 1700,
    line15_se_deduction: 1800,
    line17_schedule_e: 1900,
    line18_early_withdrawal: 2000,
    line20_ira_deduction: 2100,
    line23_archer_msa_deduction: 2200,
    line24f_501c18d: 2300,
  });

  assertStringIncludes(result, "<IRS1040Schedule1>");
  assertStringIncludes(result, "</IRS1040Schedule1>");
  assertStringIncludes(result, "<StateLocalTaxRefundAmt>100</StateLocalTaxRefundAmt>");
  assertStringIncludes(result, "<BusinessIncomeLossAmt>200</BusinessIncomeLossAmt>");
  assertStringIncludes(result, "<OtherGainLossAmt>300</OtherGainLossAmt>");
  assertStringIncludes(result, "<NetFarmProfitLossAmt>400</NetFarmProfitLossAmt>");
  assertStringIncludes(result, "<UnemploymentCompAmt>500</UnemploymentCompAmt>");
  assertStringIncludes(result, "<CancellationOfDebtAmt>600</CancellationOfDebtAmt>");
  assertStringIncludes(result, "<TotArcherMSAMedcrLTCAmt>700</TotArcherMSAMedcrLTCAmt>");
  assertStringIncludes(result, "<PrizeAwardAmt>800</PrizeAwardAmt>");
  assertStringIncludes(result, "<ExcessBusinessLossAmt>900</ExcessBusinessLossAmt>");
  assertStringIncludes(result, "<RTAAPaymentsAmt>1000</RTAAPaymentsAmt>");
  assertStringIncludes(result, "<TaxableGrantsAmt>1100</TaxableGrantsAmt>");
  assertStringIncludes(result, "<SubstitutePaymentsAmt>1200</SubstitutePaymentsAmt>");
  assertStringIncludes(result, "<GrossProeedsToAttorneyAmt>1300</GrossProeedsToAttorneyAmt>");
  assertStringIncludes(result, "<NQDCDistributionAmt>1400</NQDCDistributionAmt>");
  assertStringIncludes(result, "<OtherIncomeAmt>1500</OtherIncomeAmt>");
  assertStringIncludes(result, "<ExcessGoldenParachuteAmt>1600</ExcessGoldenParachuteAmt>");
  assertStringIncludes(result, "<HealthSavingsAccountDedAmt>1700</HealthSavingsAccountDedAmt>");
  assertStringIncludes(result, "<DeductibleSelfEmploymentTaxAmt>1800</DeductibleSelfEmploymentTaxAmt>");
  assertStringIncludes(result, "<RentalRealEstateIncomeLossAmt>1900</RentalRealEstateIncomeLossAmt>");
  assertStringIncludes(result, "<EarlyWithdrawalPenaltyAmt>2000</EarlyWithdrawalPenaltyAmt>");
  assertStringIncludes(result, "<IRADeductionAmt>2100</IRADeductionAmt>");
  assertStringIncludes(result, "<ArcherMSADeductionAmt>2200</ArcherMSADeductionAmt>");
  assertStringIncludes(result, "<Sec501c18dContributionAmt>2300</Sec501c18dContributionAmt>");
});
