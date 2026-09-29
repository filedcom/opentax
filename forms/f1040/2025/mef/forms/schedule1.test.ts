import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { schedule1 } from "./schedule1.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(actual.includes(expected), false, `Unexpected XML: ${expected}`);
}

const nativeFields = [
  ["line1_state_refund", "StateLocalIncomeTaxRefundAmt", 100],
  ["line3_schedule_c", "BusinessIncomeLossAmt", 200],
  ["line4_other_gains", "OtherGainLossAmt", 300],
  ["line6_schedule_f", "NetFarmProfitLossAmt", 400],
  ["line7_unemployment", "UnemploymentCompAmt", 500],
  ["line8b_gambling_winnings", "GamblingReportableWinningAmt", 600],
  ["line8c_cod_income", "DebtCancellationAmt", 700],
  ["line8e_archer_msa_dist", "TotArcherMSAMedcrLTCAmt", 800],
  ["line8i_prizes_awards", "PrizesAwardsAmt", 900],
  ["line8j_f1099k_hobby_income", "ActivityNotForProfitIncmAmt", 1000],
  ["line8p_excess_business_loss", "ExcessBusinessLossAmt", 1100],
  ["line8z_nqdc", "NonqlfyDeferredCompensationAmt", 1200],
  ["line9_total_other_income", "TotalOtherIncomeAmt", 1300],
  ["line10_total_additional_income", "TotalAdditionalIncomeAmt", 1400],
  ["line11_educator_expenses", "EducatorExpensesAmt", 1500],
  ["line13_hsa_deduction", "HealthSavingsAccountDedAmt", 1600],
  ["line14_moving_expenses", "MovingExpenseAmt", 1700],
  ["line15_se_deduction", "DeductibleSelfEmploymentTaxAmt", 1800],
  ["line16_sep_simple", "SelfEmpldSepSimpleQlfyPlansAmt", 1900],
  ["line17_se_health_insurance", "SelfEmpldHealthInsDedAmt", 2000],
  ["line18_early_withdrawal", "PnltyOnErlyWthdrwOfSavingsAmt", 2100],
  ["line20_ira_deduction", "IRADeductionAmt", 2200],
  ["line21_student_loan_interest", "StudentLoanInterestDedAmt", 2300],
  ["line23_archer_msa_deduction", "ArcherMSADeductionAmt", 2400],
  ["line24f_501c18d", "Sect501c18DContriDedAmt", 2500],
  ["line26_total_adjustments", "TotalAdjustmentsAmt", 2600],
] as const;

for (const [field, tag, amount] of nativeFields) {
  Deno.test(`Schedule 1 ${field} uses TY2025 ${tag}`, () => {
    const xml = schedule1.build({ [field]: amount });
    assertStringIncludes(xml, `<${tag}>${amount}</${tag}>`);
    assertStringIncludes(xml, "<IRS1040Schedule1>");
    assertStringIncludes(xml, "</IRS1040Schedule1>");
  });
}

Deno.test("Schedule 1 omits absent values and ignores unknown fields", () => {
  assertEquals(schedule1.build({}), "");
  assertEquals(schedule1.build({ junk: 999 }), "");
  const xml = schedule1.build({ line7_unemployment: 4800, junk: 999 });
  assertStringIncludes(xml, "<UnemploymentCompAmt>4800</UnemploymentCompAmt>");
  assertNotIncludes(xml, "StateLocalIncomeTaxRefundAmt");
  assertNotIncludes(xml, "junk");
  assertNotIncludes(xml, "999");
});

Deno.test("Schedule 1 emits zero and signed source values", () => {
  assertStringIncludes(
    schedule1.build({ line1_state_refund: 0 }),
    "<StateLocalIncomeTaxRefundAmt>0</StateLocalIncomeTaxRefundAmt>",
  );
  assertStringIncludes(
    schedule1.build({ line3_schedule_c: -5000 }),
    "<BusinessIncomeLossAmt>-5000</BusinessIncomeLossAmt>",
  );
  assertStringIncludes(
    schedule1.build({ line4_other_gains: -2000 }),
    "<OtherGainLossAmt>-2000</OtherGainLossAmt>",
  );
  assertStringIncludes(
    schedule1.build({ line6_schedule_f: -3000 }),
    "<NetFarmProfitLossAmt>-3000</NetFarmProfitLossAmt>",
  );
});

Deno.test("Schedule 1 combines Schedule E contributions once", () => {
  const xml = schedule1.build({
    line4_other_gains: 1000,
    line5_schedule_e: [12_000, -5000],
    line6_schedule_f: 2000,
  });
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>7000</RentalRealEstateIncomeLossAmt>",
  );
  assertEquals(xml.match(/<RentalRealEstateIncomeLossAmt>/g)?.length, 1);
  assertEquals(
    xml.indexOf("<OtherGainLossAmt>") <
        xml.indexOf("<RentalRealEstateIncomeLossAmt>") &&
      xml.indexOf("<RentalRealEstateIncomeLossAmt>") <
        xml.indexOf("<NetFarmProfitLossAmt>"),
    true,
  );
});

Deno.test("Schedule 1 emits the TY2025 NOL and foreign exclusion as negative", () => {
  const xml = schedule1.build({
    line8a_nol_deduction: 500,
    line8d_foreign_earned_income_exclusion: 200,
  }, {
    documentIdsByPendingKey: { form2555: ["IRS2555-1"] },
  });
  assertStringIncludes(
    xml,
    "<NetOperatingLossDeductionAmt>-500</NetOperatingLossDeductionAmt>",
  );
  assertStringIncludes(
    xml,
    '<TotalIncomeExclusionAmt referenceDocumentId="IRS2555-1" referenceDocumentName="IRS2555">200</TotalIncomeExclusionAmt>',
  );
  assertEquals(
    xml.indexOf("<NetOperatingLossDeductionAmt>") <
      xml.indexOf("<TotalIncomeExclusionAmt"),
    true,
  );
});

Deno.test("Schedule 1 HSA income requires and links Form 8889", () => {
  const xml = schedule1.build({ line8f_hsa_income: 1100 }, {
    documentIdsByPendingKey: { form8889: ["IRS8889-1", "IRS8889-2"] },
  });
  assertStringIncludes(
    xml,
    '<TotHSADistriHDHPAmt referenceDocumentId="IRS8889-1 IRS8889-2" referenceDocumentName="IRS8889">1100</TotHSADistriHDHPAmt>',
  );
  assertThrows(
    () =>
      schedule1.build({ line8f_hsa_income: 1100 }, {
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs an attached Form 8889",
  );
});

Deno.test("Schedule 1 employee business expenses require and link Form 2106", () => {
  const xml = schedule1.build({ line12_business_expenses: 1200 }, {
    documentIdsByPendingKey: { f2106: ["IRS2106-1", "IRS2106-2"] },
  });
  assertStringIncludes(
    xml,
    '<BusExpnsReservistsAndOthersAmt referenceDocumentId="IRS2106-1 IRS2106-2" referenceDocumentName="IRS2106">1200</BusExpnsReservistsAndOthersAmt>',
  );
  assertThrows(
    () =>
      schedule1.build({ line12_business_expenses: 1200 }, {
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs attached Forms 2106",
  );
});

Deno.test("Schedule 1 line 8z sums typed sources once and links the statement", () => {
  const fields = {
    line8z_form8814: 50,
    line8z_hsa_excess_earnings: 100,
    line8z_hsa_excess_employer: 700,
    line8z_rtaa: 300,
    line8z_taxable_grants: 1200,
    line8z_substitute_payments: 750,
    line8z_golden_parachute: 500,
    line8z_form8621_qef: 200,
    line8z_form8621_mtm: -100,
    line8z_form8621_section1291: 25,
    line8z_f1099nec_nonbusiness: 300,
  };
  const xml = schedule1.build(fields, {
    documentIdsByPendingKey: {
      schedule1_other_income_statement: ["OtherIncomeTypeStatement-1"],
    },
  });
  assertStringIncludes(
    xml,
    '<OtherIncomeTotalAmt referenceDocumentId="OtherIncomeTypeStatement-1" referenceDocumentName="OtherIncomeTypeStatement">4025</OtherIncomeTotalAmt>',
  );
  assertEquals(xml.match(/<OtherIncomeTotalAmt /g)?.length, 1);
  for (
    const obsoleteTag of [
      "RTAAPaymentsAmt",
      "TaxableGrantsAmt",
      "SubstitutePaymentsAmt",
      "ExcessGoldenParachuteAmt",
      "OtherIncomeAmt",
    ]
  ) assertNotIncludes(xml, obsoleteTag);
});

Deno.test("Schedule 1 line 8z rejects generic amounts and missing or duplicate statement IDs", () => {
  for (const field of ["line8z_other", "line8z_other_income"]) {
    assertThrows(
      () => schedule1.build({ [field]: 25 }),
      Error,
      "generic income needs identified source types",
    );
  }
  const typed = { line8z_rtaa: 300 };
  for (const ids of [[], ["Statement-1", "Statement-2"]]) {
    assertThrows(
      () =>
        schedule1.build(typed, {
          documentIdsByPendingKey: { schedule1_other_income_statement: ids },
        }),
      Error,
      "needs its linked other-income type statement",
    );
  }
});

Deno.test("Schedule 1 rejects unsupported sources without required filing facts", () => {
  for (
    const field of [
      "line2a_alimony_received",
      "line8g_child_interest_dividends",
      "line8z_attorney_proceeds",
      "line13_depreciation",
      "line24h_dpad",
    ]
  ) {
    assertThrows(
      () => schedule1.build({ [field]: 100 }),
      Error,
      "source needs its TY2025 line identity",
    );
  }
});

Deno.test("Schedule 1 native elements follow TY2025 schema order", () => {
  const xml = schedule1.build({
    line1_state_refund: 100,
    line8a_nol_deduction: 50,
    line8c_cod_income: 20,
    line8z_nqdc: 40,
    line9_total_other_income: 40,
    line10_total_additional_income: 140,
    line11_educator_expenses: 10,
    line21_student_loan_interest: 15,
    line24f_501c18d: 5,
    line26_total_adjustments: 30,
  });
  const ordered = [
    "StateLocalIncomeTaxRefundAmt",
    "NetOperatingLossDeductionAmt",
    "DebtCancellationAmt",
    "NonqlfyDeferredCompensationAmt",
    "TotalOtherIncomeAmt",
    "TotalAdditionalIncomeAmt",
    "EducatorExpensesAmt",
    "StudentLoanInterestDedAmt",
    "Sect501c18DContriDedAmt",
    "TotalAdjustmentsAmt",
  ];
  for (let i = 1; i < ordered.length; i++) {
    assertEquals(
      xml.indexOf(`<${ordered[i - 1]}`) < xml.indexOf(`<${ordered[i]}`),
      true,
      `${ordered[i - 1]} must precede ${ordered[i]}`,
    );
  }
});
