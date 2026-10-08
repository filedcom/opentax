import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { schedule1 } from "./schedule1.ts";
import { FilingStatus } from "../../../../../mef/header.ts";

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

Deno.test("Schedule 1 line 8n/8o XML stays closed until required foreign corporation forms are native", () => {
  assertThrows(
    () => schedule1.build({ line8n_section951a_inclusion: 11_000 }),
    Error,
    "complete native Form 5471 schedules",
  );
  assertThrows(
    () => schedule1.build({ line8o_section951aa_inclusion: 42_000 }),
    Error,
    "Form 8992 with Schedule A",
  );
});

Deno.test("Schedule 1 native rejects Form 1098 box 4 recovery without its payer source", () => {
  const filer = {
    primarySSN: "111223333",
    nameLine1: "TEST TAXPAYER",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  assertThrows(
    () => schedule1.build({ line8z_f1098_interest_recovery: 1_200 }, { filer }),
    Error,
    "needs payer source rows",
  );
  const source = {
    f1098s: [{
      box1_mortgage_interest: 0,
      box4_refund_overpaid: 2_000,
      box4_prior_year_refund: true,
      box4_taxable_recovery_verified_amount: 1_200,
      box4_recovery_workpaper_reference: "Pub. 525 review",
      lender_name: "Home Lender",
      recipient_tin: "999887777",
      source_document_reference: "issued 1098",
    }],
  };
  assertThrows(
    () =>
      schedule1.build({ line8z_f1098_interest_recovery: 1_200 }, {
        filer,
        pending: { f1098: source },
      }),
    Error,
    "recipient must match",
  );
  assertThrows(
    () =>
      schedule1.build({ line8z_f1098_interest_recovery: 1_199 }, {
        filer,
        pending: {
          f1098: {
            f1098s: [{ ...source.f1098s[0], recipient_tin: filer.primarySSN }],
          },
        },
      }),
    Error,
    "must match sourced taxable recovery",
  );
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
    line8z_taxable_grants: 1500,
    f1099g_taxable_grant_sources: [{
      payer_name: "State Grant Agency",
      payer_tin: "123456789",
      recipient_tin: "111223333",
      source_document_reference: "issued-grant-1",
      amount: 1500,
    }],
    line8z_substitute_payments: 750,
    f1099m_box8_substitute_sources: [{
      payer_name: "Broker Payer",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      amount: 750,
    }],
    line8z_form8621_qef: 200,
    line8z_form8621_mtm: -100,
    line8z_form8621_section1291: 25,
    f1099nec_nonbusiness_sources: [{
      payer_name: "Occasional Payer",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      description: "Occasional service",
      amount: 300,
    }],
  };
  const xml = schedule1.build(fields, {
    filer: {
      primarySSN: "111223333",
      nameLine1: "TEST TAXPAYER",
      nameControl: "TAXP",
      address: {
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      filingStatus: FilingStatus.Single,
    },
    pending: {
      f1099g: {
        f1099gs: [{
          box_6_taxable_grants: 1_500,
          box_6_schedule1_nonbusiness_reviewed: true,
          recipient_tin: "111223333",
          payer_name: "State Grant Agency",
          payer_tin: "123456789",
          source_document_reference: "issued-grant-1",
        }],
      },
    },
    documentIdsByPendingKey: {
      schedule1_other_income_statement: ["OtherIncomeTypeStatement-1"],
    },
  });
  assertStringIncludes(
    xml,
    '<OtherIncomeTotalAmt referenceDocumentId="OtherIncomeTypeStatement-1" referenceDocumentName="OtherIncomeTypeStatement">3225</OtherIncomeTotalAmt>',
  );
  assertStringIncludes(
    xml,
    "<ActivityNotForProfitIncmAmt>300</ActivityNotForProfitIncmAmt>",
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
  const typed = { line8z_hsa_excess_earnings: 300 };
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

Deno.test("Schedule 1 native replays 1099-G box 6 grants before writing line 8z", () => {
  const filer = {
    primarySSN: "111223333",
    nameLine1: "TEST TAXPAYER",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  const copies = {
    f1099gs: [{
      box_6_taxable_grants: 400,
      box_6_schedule1_nonbusiness_reviewed: true,
      recipient_tin: "111223333",
      payer_name: "State Grant Agency A",
      payer_tin: "123456789",
      source_document_reference: "issued-grant-a",
    }, {
      box_6_taxable_grants: 600,
      box_6_schedule1_nonbusiness_reviewed: true,
      recipient_tin: "111223333",
      payer_name: "State Grant Agency B",
      payer_tin: "987654321",
      source_document_reference: "issued-grant-b",
    }],
  };
  const sourceRows = copies.f1099gs.map((copy) => ({
    payer_name: copy.payer_name,
    payer_tin: copy.payer_tin,
    recipient_tin: copy.recipient_tin,
    source_document_reference: copy.source_document_reference,
    amount: copy.box_6_taxable_grants,
  }));
  const fields = {
    line8z_taxable_grants: 1_000,
    f1099g_taxable_grant_sources: sourceRows,
  };
  const xml = schedule1.build(fields, {
    filer,
    pending: { f1099g: copies },
  });
  assertStringIncludes(xml, "<OtherIncomeTotalAmt>1000</OtherIncomeTotalAmt>");
  assertThrows(
    () =>
      schedule1.build({ ...fields, line8z_taxable_grants: 999 }, {
        filer,
        pending: { f1099g: copies },
      }),
    Error,
    "taxable-grant rows and total differ from distinct Form 1099-G box 6 copies",
  );
  assertThrows(
    () => schedule1.build(fields, { filer }),
    Error,
    "taxable-grant rows and total differ from distinct Form 1099-G box 6 copies",
  );
  assertThrows(
    () => schedule1.build({ ...fields, line8z_taxable_grants: -1 }, { filer }),
    Error,
    "taxable-grant rows and total differ from distinct Form 1099-G box 6 copies",
  );
  for (const recipient of [undefined, "999887777"]) {
    assertThrows(
      () =>
        schedule1.build(fields, {
          filer,
          pending: {
            f1099g: {
              f1099gs: [copies.f1099gs[0], {
                ...copies.f1099gs[1],
                recipient_tin: recipient,
              }],
            },
          },
        }),
      Error,
      "box 6",
    );
  }
  assertThrows(
    () =>
      schedule1.build(fields, {
        filer,
        pending: {
          f1099g: {
            f1099gs: [{
              ...copies.f1099gs[0],
              box_6_schedule1_nonbusiness_reviewed: false,
            }, copies.f1099gs[1]],
          },
        },
      }),
    Error,
    "reviewed nonbusiness Schedule 1 classification",
  );
});

Deno.test("Schedule 1 rejects unsupported sources without required filing facts", () => {
  for (
    const field of [
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

Deno.test("Schedule 1 line 2a requires its dated alimony source", () => {
  assertThrows(
    () => schedule1.build({ line2a_alimony_received: 100 }),
    Error,
    "needs dated alimony agreement source",
  );
});

Deno.test("Schedule 1 native elements follow TY2025 schema order", () => {
  const xml = schedule1.build({
    line1_state_refund: 100,
    line8a_nol_deduction: 50,
    line8c_cod_income: 20,
    line8i_prizes_awards: 40,
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
    "PrizesAwardsAmt",
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

Deno.test("Schedule 1 line 24k reconciles distinct final trust K-1 sources and beneficiary", () => {
  const source = {
    estate_trust_name: "Family Trust",
    estate_trust_ein: "123456789",
    source_document_reference: "K-1 A",
    box11_code_a_section67e_excess_deduction: 500,
    box11_code_a_statement_reference: "Final deduction statement",
    box11_final_k1: true,
    box11_beneficiary_succeeds_to_property: true,
    beneficiary_ssn: "111223333",
  };
  const context = {
    filer: { primarySSN: "111223333" } as never,
    pending: { k1_trust: { k1_trusts: [source] } },
  };
  const xml = schedule1.build({
    line24k_section67e_excess_deduction: 500,
    line26_total_adjustments: 500,
  }, context);
  assertStringIncludes(
    xml,
    "<Section67eExcessDeductionAmt>500</Section67eExcessDeductionAmt>",
  );
  assertThrows(() =>
    schedule1.build({ line24k_section67e_excess_deduction: 499 }, context)
  );
  assertThrows(() =>
    schedule1.build({
      line24k_section67e_excess_deduction: 500,
      line25_total_other_adjustments: 499,
    }, context)
  );
  assertThrows(() =>
    schedule1.build({ line24k_section67e_excess_deduction: 500 }, {
      ...context,
      filer: { primarySSN: "987654321" } as never,
    })
  );
  assertThrows(() =>
    schedule1.build({ line24k_section67e_excess_deduction: 500 }, {
      ...context,
      pending: { k1_trust: { k1_trusts: [source, source] } },
    })
  );
});
