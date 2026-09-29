import { assertEquals, assertThrows } from "@std/assert";
import { f1040 } from "./index.ts";
import { FilingStatus } from "../../types.ts";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "../../inputs/f3800/calculation.ts";
import { CertifiedInterestDocumentKind } from "../../intermediate/forms/form8396/calculation.ts";

const ctx = {} as Parameters<typeof f1040.compute>[0];

// ─── Helper ───────────────────────────────────────────────────────────────────

function compute(input: Parameters<typeof f1040.compute>[1]) {
  return f1040.compute(ctx, input);
}

function fields(
  input: Parameters<typeof f1040.compute>[1],
): Record<string, unknown> {
  const result = compute(input);
  return result.outputs[0].fields as Record<string, unknown>;
}

// ─── Node identity ────────────────────────────────────────────────────────────

Deno.test("f1040: nodeType is f1040", () => {
  assertEquals(f1040.nodeType, "f1040");
});

Deno.test("f1040: outputNodeTypes is empty (no downstream routing)", () => {
  assertEquals(f1040.outputNodeTypes.length, 0);
});

// ─── Self-emit ────────────────────────────────────────────────────────────────

Deno.test("f1040: compute returns one self-referencing output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

Deno.test("f1040: empty input emits zeros for computed lines", () => {
  const f = fields({});
  assertEquals(f.line9_total_income, 0);
  assertEquals(f.line11_agi, 0);
  assertEquals(f.line15_taxable_income, 0);
  assertEquals(f.line24_total_tax, 0);
  assertEquals(f.line33_total_payments, 0);
  assertEquals(f.line35a_refund, 0);
});

Deno.test("f1040: verifies Form 1116 lines 18 and 20 against filed return sources", () => {
  const f = fields({
    line11_agi: 80_000,
    line12a_standard_deduction: 15_750,
    line13_qbi_deduction: 2_000,
    line13b_additional_deductions: 8_000,
    schedule1a_line37_senior_deduction: 6_000,
    line16_income_tax: 8_000,
    form1116_line18_worldwide_taxable_income: 60_250,
    form1116_line20_us_tax: 8_000,
  });
  assertEquals(f.line14_deductions_qbi_total, 25_750);
  assertEquals(f.line11_agi, 80_000);
});

Deno.test("f1040: Form 1116 preferential adjustment reconciles from the signed source base", () => {
  const source = {
    line11_agi: 80_000,
    line12a_standard_deduction: 15_750,
    line13b_additional_deductions: 8_000,
    schedule1a_line37_senior_deduction: 6_000,
    line16_income_tax: 8_000,
    form1116_line20_us_tax: 8_000,
  };
  assertEquals(
    fields({
      ...source,
      form1116_line18_worldwide_taxable_income: 58_304,
      form1116_line18_preferential_adjustment: 3_946,
    }).line11_agi,
    80_000,
  );
  assertThrows(
    () =>
      fields({
        ...source,
        form1116_line18_worldwide_taxable_income: 58_305,
        form1116_line18_preferential_adjustment: 3_946,
      }),
    Error,
    "line 18 does not reconcile",
  );
  assertThrows(
    () =>
      fields({
        ...source,
        credit_limit_form6251_line11: 1,
        form1116_line18_worldwide_taxable_income: 58_304,
        form1116_line18_preferential_adjustment: 3_946,
      }),
    Error,
    "with AMT needs separate limitation rules",
  );
  assertThrows(
    () =>
      fields({
        ...source,
        line17_additional_taxes: 1,
        credit_limit_schedule2_line1z: 0,
        form1116_line18_worldwide_taxable_income: 58_304,
        form1116_line18_preferential_adjustment: 3_946,
      }),
    Error,
    "with AMT needs separate limitation rules",
  );
});

Deno.test("f1040: Form 1116 line 18 cannot add back all Schedule 1-A deductions", () => {
  assertThrows(
    () =>
      fields({
        line11_agi: 80_000,
        line12a_standard_deduction: 15_750,
        line13b_additional_deductions: 8_000,
        schedule1a_line37_senior_deduction: 6_000,
        line16_income_tax: 8_000,
        form1116_line18_worldwide_taxable_income: 64_250,
        form1116_line20_us_tax: 8_000,
      }),
    Error,
    "line 18 does not reconcile its sourced preferential adjustment",
  );
});

Deno.test("f1040: Form 1116 line 18 floors the signed total after the senior addback", () => {
  const f = fields({
    line11_agi: 10_000,
    line12a_standard_deduction: 15_750,
    line13b_additional_deductions: 6_000,
    schedule1a_line37_senior_deduction: 6_000,
    line16_income_tax: 0,
    form1116_line18_worldwide_taxable_income: 0,
    form1116_line20_us_tax: 0,
  });
  assertEquals(f.line15_taxable_income, 0);
});

Deno.test("f1040: Form 1116 line 20 rejects an omitted Schedule 2 line 1z", () => {
  assertThrows(
    () =>
      fields({
        line11_agi: 80_000,
        line12a_standard_deduction: 15_750,
        line16_income_tax: 8_000,
        credit_limit_schedule2_line1z: 500,
        form1116_line18_worldwide_taxable_income: 64_250,
        form1116_line20_us_tax: 8_000,
      }),
    Error,
    "line 20 does not match",
  );
});

Deno.test("f1040: Form 1116 limitation requires the actual Form 1040 tax source", () => {
  assertThrows(
    () =>
      fields({
        line11_agi: 80_000,
        line12a_standard_deduction: 15_750,
        form1116_line18_worldwide_taxable_income: 64_250,
        form1116_line20_us_tax: 0,
      }),
    Error,
    "sourced Form 1040 line 16",
  );
});

Deno.test("f1040: Form 8396 uses its tax-liability worksheet before Schedule 3", () => {
  const result = compute({
    line16_income_tax: 1_500,
    line19_child_tax_credit: 100,
    line20_nonrefundable_credits: 300,
    form8396_source: {
      certificate_issuer_name: "Austin Housing Finance Corporation",
      certificate_number: "MCC-2022-104",
      certificate_issue_date: "2022-03-15",
      current_year_claim: true,
      interest_evidence: {
        kind: CertifiedInterestDocumentKind.Form1098,
        document_reference: "2025 Form 1098 loan A",
        reported_interest_paid: 15_000,
        taxpayer_interest_paid: 15_000,
        original_mortgage_amount: 200_000,
        certified_indebtedness_amount: 200_000,
      },
      interest_reporting_line: "8a",
      mcc_rate: 0.25,
      home_is_main_residence: true,
      home_in_issuer_jurisdiction: true,
      interest_paid_to_related_person: false,
      certificate_is_reissued: false,
      nonspouse_coowner: false,
      prior_2024_form8396: {
        document_reference: "Filed 2024 Form 8396",
        line14_2023_carryforward: 0,
        line16_2022_carryforward: 0,
        line17_2024_carryforward: 300,
      },
    },
    credit_limit_schedule3_lines: {
      ...emptySchedule3ForBusinessCredit,
      line1: 100,
      line5b: 50,
      line6dElderlyDisabled: 50,
      line6lForm8978: 100,
      line7: 150,
    },
  });
  const mortgage = result.finalizations?.find((item) =>
    item.nodeType === "form8396"
  );
  const schedule = result.finalizations?.find((item) =>
    item.nodeType === "schedule3"
  );
  assertEquals(mortgage?.fields.credit_limit_worksheet_line1, 1_500);
  assertEquals(mortgage?.fields.credit_limit_worksheet_line2, 400);
  assertEquals(mortgage?.fields.line3, 2_000);
  assertEquals(mortgage?.fields.line8, 1_100);
  assertEquals(mortgage?.fields.line9, 1_100);
  assertEquals(mortgage?.fields.line17, 900);
  assertEquals(schedule?.fields.line6g_mortgage_interest_credit, 1_100);
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 1_400);
});

Deno.test("f1040: Form 8859 limits carryforward after the listed prior credits", () => {
  const result = compute({
    line16_income_tax: 1_000,
    line19_child_tax_credit: 100,
    line20_nonrefundable_credits: 70,
    form8859_source_carryforward: 1_200,
    credit_limit_schedule3_lines: {
      ...emptySchedule3ForBusinessCredit,
      line1: 50,
      line6dElderlyDisabled: 20,
      line7: 20,
    },
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 900);
  const schedule = result.finalizations?.find((item) =>
    item.nodeType === "schedule3"
  );
  const homebuyer = result.finalizations?.find((item) =>
    item.nodeType === "f8859"
  );
  assertEquals(schedule?.fields.line6h_dc_homebuyer_credit, 830);
  assertEquals(schedule?.fields.line7_total, 850);
  assertEquals(homebuyer?.fields.line1_carryforward, 1_200);
  assertEquals(homebuyer?.fields.line2_limit, 830);
  assertEquals(homebuyer?.fields.line3_allowed_credit, 830);
  assertEquals(homebuyer?.fields.line4_carryforward, 370);
});

Deno.test("f1040: Form 8859 uses Schedule 8812 Worksheet B line 14 when directed", () => {
  const result = compute({
    line16_income_tax: 1_000,
    line19_child_tax_credit: 100,
    form8859_source_carryforward: 1_200,
    form8859_worksheet_b_applies: true,
    form8859_worksheet_b_line14: 200,
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  });
  const homebuyer = result.finalizations?.find((item) =>
    item.nodeType === "f8859"
  );
  assertEquals(homebuyer?.fields.line2_limit, 800);
  assertEquals(homebuyer?.fields.line4_carryforward, 400);
});

Deno.test("f1040: Form 8859 carries all unused credit when no tax remains", () => {
  const result = compute({
    line16_income_tax: 0,
    form8859_source_carryforward: 500,
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  });
  const homebuyer = result.finalizations?.find((item) =>
    item.nodeType === "f8859"
  );
  assertEquals(homebuyer?.fields.line2_limit, 0);
  assertEquals(homebuyer?.fields.line3_allowed_credit, 0);
  assertEquals(homebuyer?.fields.line4_carryforward, 500);
});

Deno.test("f1040: Form 8859 needs completed tax and Worksheet B source", () => {
  assertThrows(
    () =>
      compute({
        form8859_source_carryforward: 500,
        credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
      }),
    Error,
    "finalized Form 1040 tax",
  );
  assertThrows(
    () =>
      compute({
        line16_income_tax: 1_000,
        form8859_source_carryforward: 500,
        form8859_worksheet_b_applies: true,
        credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
      }),
    Error,
    "Worksheet B line 14",
  );
});

Deno.test("f1040: Form 8834 limits an allowed passive credit against regular tax and TMT", () => {
  const result = compute({
    line16_income_tax: 1_000,
    line19_child_tax_credit: 100,
    line20_nonrefundable_credits: 150,
    form8834_source_credit: 600,
    credit_limit_schedule2_line1z: 0,
    credit_limit_form6251_line9: 300,
    credit_limit_schedule3_lines: {
      ...emptySchedule3ForBusinessCredit,
      line1: 100,
      line2: 50,
    },
  });
  const electric = result.finalizations?.find((item) =>
    item.nodeType === "f8834"
  );
  const schedule = result.finalizations?.find((item) =>
    item.nodeType === "schedule3"
  );
  assertEquals(electric?.fields.line1_source_credit, 600);
  assertEquals(electric?.fields.line3a_foreign_tax_credit, 100);
  assertEquals(electric?.fields.line3b_other_credits, 150);
  assertEquals(electric?.fields.line4_net_regular_tax, 750);
  assertEquals(electric?.fields.line6_adjusted_regular_tax, 450);
  assertEquals(electric?.fields.line7_allowed_credit, 450);
  assertEquals(schedule?.fields.line6i_qualified_electric_vehicle_credit, 450);
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 600);
});

Deno.test("f1040: Form 8834 records a zero allowed credit when TMT exhausts the limit", () => {
  const result = compute({
    line16_income_tax: 500,
    form8834_source_credit: 200,
    credit_limit_form6251_line9: 500,
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  });
  const electric = result.finalizations?.find((item) =>
    item.nodeType === "f8834"
  );
  assertEquals(electric?.fields.line6_adjusted_regular_tax, 0);
  assertEquals(electric?.fields.line7_allowed_credit, 0);
});

Deno.test("f1040: Form 8834 refuses unresolved joint credit ordering", () => {
  assertThrows(
    () =>
      compute({
        line16_income_tax: 1_000,
        form8834_source_credit: 200,
        form8859_source_carryforward: 100,
        credit_limit_form6251_line9: 0,
        credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
      }),
    Error,
    "joint credit-ordering",
  );
  assertThrows(
    () =>
      compute({
        line16_income_tax: 1_000,
        form8834_source_credit: 200,
        form8936_tentative_new_credit: 100,
        credit_limit_form6251_line9: 0,
        credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
      }),
    Error,
    "joint credit-ordering",
  );
});

Deno.test("f1040: Form 8912 needs finalized credit inputs", () => {
  assertThrows(
    () =>
      compute({
        form8912_source_lines: {
          line1: 100,
          line2: 0,
          line3: 0,
          line4: 100,
          hasPassThroughCrebCredit: false,
        },
        line2b_taxable_interest: 100,
      }),
    Error,
    "finalized Form 1040 tax, Form 6251 AMT, and Schedule 3 credits",
  );
});

Deno.test("f1040: Form 8912 finalizes Schedule 3 line 6k", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line16_income_tax: 1_000,
    form8912_source_lines: {
      line1: 100,
      line2: 175,
      line3: 25,
      line4: 300,
      hasPassThroughCrebCredit: false,
    },
    credit_limit_form6251_line11: 0,
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 300);
  assertEquals(result.finalizations?.[0].fields.line6k_tax_credit_bonds, 300);
  assertEquals(result.finalizations?.[1].fields.allowed_credit, 300);
  assertEquals(result.finalizations?.[1].fields.unused_credit, 0);
});

Deno.test("f1040: Form 8912 uses tax remaining after allowed Form 3800 credit", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line16_income_tax: 250,
    form3800_source_credits: {
      standardCredit: 200,
      specifiedCredit: 0,
      passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
    },
    form8912_source_lines: {
      line1: 300,
      line2: 0,
      line3: 0,
      line4: 300,
      hasPassThroughCrebCredit: false,
    },
    credit_limit_form6251_line9: 0,
    credit_limit_form6251_line11: 0,
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 250);
  assertEquals(result.finalizations?.[0].fields.line6a_total, 200);
  assertEquals(result.finalizations?.[0].fields.line6k_tax_credit_bonds, 50);
  assertEquals(result.finalizations?.[1].fields.allowed_credit, 200);
  assertEquals(result.finalizations?.[2].fields.allowed_credit, 50);
  assertEquals(result.finalizations?.[2].fields.unused_credit, 250);
});

const emptySchedule3ForBusinessCredit = {
  line1: 0,
  line2: 0,
  line3: 0,
  line4: 0,
  line5a: 0,
  line5b: 0,
  line6aGbc: 0,
  line6bPriorMinimumTax: 0,
  line6kBondCredit: 0,
  line7: 0,
};

Deno.test("f1040: source-backed Form 3800 posts only its allowed ordinary credit", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line16_income_tax: 40_000,
    line19_child_tax_credit: 2_000,
    line20_nonrefundable_credits: 1_000,
    form3800_source_credits: {
      standardCredit: 25_000,
      specifiedCredit: 0,
      passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
    },
    credit_limit_form6251_line9: 20_000,
    credit_limit_form6251_line11: 0,
    credit_limit_schedule3_lines: {
      ...emptySchedule3ForBusinessCredit,
      line2: 1_000,
      line7: 0,
    },
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 18_000);
  assertEquals(result.outputs[0].fields.line24_total_tax, 20_000);
  assertEquals(result.finalizations?.[0].fields.line6a_total, 17_000);
  assertEquals(result.finalizations?.[0].fields.line7_total, 17_000);
  assertEquals(result.finalizations?.[0].fields.line8_total, 18_000);
  assertEquals(result.finalizations?.[1].nodeType, "f3800");
  assertEquals(result.finalizations?.[1].fields.allowed_credit, 17_000);
});

Deno.test("f1040: passive Form 3800 credit is limited again by available tax", () => {
  const passiveLines = {
    ...ZERO_FORM3800_PASSIVE_ACTIVITY,
    line2: 1_000,
    line3: 500,
  };
  const input = {
    filing_status: FilingStatus.Single,
    form3800_source_credits: {
      standardCredit: 0,
      specifiedCredit: 0,
      passiveLines,
    },
    credit_limit_form6251_line9: 0,
    credit_limit_form6251_line11: 0,
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  };
  const partial = compute({ ...input, line16_income_tax: 250 });
  assertEquals(partial.finalizations?.[0].fields.line6a_total, 250);
  assertEquals(partial.finalizations?.[1].fields.allowed_credit, 250);
  assertEquals(partial.finalizations?.[1].fields.passive_lines, passiveLines);
  assertEquals(partial.outputs[0].fields.line20_nonrefundable_credits, 250);

  const full = compute({ ...input, line16_income_tax: 1_000 });
  assertEquals(full.finalizations?.[1].fields.allowed_credit, 500);
  assertEquals(full.outputs[0].fields.line20_nonrefundable_credits, 500);
});

Deno.test("f1040: specified Form 3800 credit uses its separate AMT limit", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line16_income_tax: 20_000,
    line17_additional_taxes: 5_000,
    form3800_source_credits: {
      standardCredit: 0,
      specifiedCredit: 10_000,
      passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
    },
    credit_limit_form6251_line9: 25_000,
    credit_limit_form6251_line11: 5_000,
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  });
  assertEquals(result.finalizations?.[1].fields.standard_credit_allowed, 0);
  assertEquals(
    result.finalizations?.[1].fields.specified_credit_allowed,
    10_000,
  );
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 10_000);
});

Deno.test("f1040: Form 3800 follows finalized personal clean-vehicle credit", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line16_income_tax: 10_000,
    line20_nonrefundable_credits: 7_500,
    form8936_tentative_new_credit: 7_500,
    form8936_tentative_used_credit: 0,
    form8936_priority_personal_credits: 0,
    form8936_schedule3_line7_tentative: 7_500,
    form3800_source_credits: {
      standardCredit: 5_000,
      specifiedCredit: 0,
      passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
    },
    credit_limit_form6251_line9: 0,
    credit_limit_form6251_line11: 0,
    credit_limit_schedule3_lines: {
      ...emptySchedule3ForBusinessCredit,
      line7: 7_500,
    },
  });
  assertEquals(result.finalizations?.[0].fields.line6a_total, 2_500);
  assertEquals(result.finalizations?.[0].fields.line6f_total, 7_500);
  assertEquals(result.finalizations?.[0].fields.line8_total, 10_000);
  assertEquals(result.outputs[0].fields.line22_tax_after_credits, 0);
});

Deno.test("f1040: Form 3800 needs AMT evidence and does not mix legacy gross GBC", () => {
  const source = {
    filing_status: FilingStatus.Single,
    line16_income_tax: 10_000,
    form3800_source_credits: {
      standardCredit: 1_000,
      specifiedCredit: 0,
      passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
    },
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  };
  assertThrows(
    () => compute(source),
    Error,
    "needs filing status, Form 1040 tax",
  );
  assertThrows(
    () =>
      compute({
        ...source,
        credit_limit_form6251_line9: 0,
        credit_limit_form6251_line11: 0,
        credit_limit_schedule3_lines: {
          ...emptySchedule3ForBusinessCredit,
          line6aGbc: 100,
          line7: 100,
        },
      }),
    Error,
    "unbounded Schedule 3",
  );
});

Deno.test("f1040: MFS Form 3800 requires the spouse business-credit answer", () => {
  const source = {
    filing_status: FilingStatus.MFS,
    line16_income_tax: 20_000,
    form3800_source_credits: {
      standardCredit: 5_000,
      specifiedCredit: 0,
      passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
    },
    credit_limit_form6251_line9: 0,
    credit_limit_form6251_line11: 0,
    credit_limit_schedule3_lines: emptySchedule3ForBusinessCredit,
  };
  assertThrows(() => compute(source), Error, "spouse business-credit answer");
  const withAnswer = compute({ ...source, spouse_has_business_credit: true });
  assertEquals(withAnswer.finalizations?.[1].fields.allowed_credit, 5_000);
});

// ─── Line computations ────────────────────────────────────────────────────────

Deno.test("f1040: computes taxable income from agi and standard deduction", () => {
  const f = fields({ line11_agi: 80_000, line12a_standard_deduction: 15_000 });
  assertEquals(f.line15_taxable_income, 65_000);
});

Deno.test("f1040: taxable income cannot go below zero", () => {
  const f = fields({ line11_agi: 5_000, line12a_standard_deduction: 30_000 });
  assertEquals(f.line15_taxable_income, 0);
});

Deno.test("f1040: selected standard deduction wins over a smaller Schedule A amount", () => {
  const f = fields({
    line11_agi: 100_000,
    line12a_standard_deduction: 31_500,
    line12e_itemized_deductions: 18_349,
  });
  assertEquals(f.line12c_deduction_total, 31_500);
  assertEquals(f.line14_deductions_qbi_total, 31_500);
  assertEquals(f.line15_taxable_income, 68_500);
});

Deno.test("f1040: itemized deduction is reported when standard was not selected", () => {
  const f = fields({
    line11_agi: 100_000,
    line12e_itemized_deductions: 33_000,
  });
  assertEquals(f.line12c_deduction_total, 33_000);
  assertEquals(f.line15_taxable_income, 67_000);
});

Deno.test("f1040: computes refund when payments exceed tax", () => {
  const f = fields({
    line11_agi: 50_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 4_000,
    line25a_w2_withheld: 6_000,
  });
  assertEquals(f.line24_total_tax, 4_000);
  assertEquals(f.line33_total_payments, 6_000);
  assertEquals(f.line35a_refund, 2_000);
});

Deno.test("f1040: computes amount owed when tax exceeds payments", () => {
  const f = fields({
    line11_agi: 120_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 20_000,
    line25a_w2_withheld: 15_000,
  });
  assertEquals(f.line24_total_tax, 20_000);
  assertEquals(f.line37_amount_owed, 5_000);
});

Deno.test("f1040: adds an underpayment penalty to amount owed", () => {
  const f = fields({
    line16_income_tax: 10_000,
    line25a_w2_withheld: 5_000,
    line38_underpayment_penalty: 250,
  });
  assertEquals(f.line37_amount_owed, 5_250);
});

Deno.test("f1040: subtracts an underpayment penalty from a refund", () => {
  const f = fields({
    line16_income_tax: 5_000,
    line25a_w2_withheld: 7_000,
    line38_underpayment_penalty: 250,
  });
  assertEquals(f.line34_overpayment, 2_000);
  assertEquals(f.line35a_refund, 1_750);
});

Deno.test("f1040: penalty above overpayment becomes amount owed", () => {
  const f = fields({
    line16_income_tax: 5_000,
    line25a_w2_withheld: 5_100,
    line38_underpayment_penalty: 250,
  });
  assertEquals(f.line34_overpayment, 100);
  assertEquals(f.line35a_refund, 0);
  assertEquals(f.line37_amount_owed, 150);
});

Deno.test("f1040: AMT added to line16 for total tax before credits", () => {
  const f = fields({
    line16_income_tax: 10_000,
    line17_additional_taxes: 2_000,
  });
  assertEquals(f.line18_total_tax_before_credits, 12_000);
  assertEquals(f.line24_total_tax, 12_000);
});

Deno.test("f1040: Form 8936 new credit is capped at remaining line 18 tax", () => {
  const input = {
    line16_income_tax: 5_000,
    line20_nonrefundable_credits: 7_500,
    form8936_tentative_new_credit: 7_500,
    form8936_tentative_used_credit: 0,
    form8936_priority_personal_credits: 0,
    form8936_schedule3_line7_tentative: 7_500,
  };
  const result = compute(input);
  const f = result.outputs[0].fields;
  assertEquals(f.line20_nonrefundable_credits, 5_000);
  assertEquals(f.line21_credits_total, 5_000);
  assertEquals(f.line22_tax_after_credits, 0);
  const schedule3 = result.finalizations?.[0].fields;
  assertEquals(schedule3?.line6f_total, 5_000);
  assertEquals(schedule3?.line6m_total, undefined);
  assertEquals(schedule3?.line7_total, 5_000);
  assertEquals(schedule3?.line8_total, 5_000);
});

Deno.test("f1040: previously owned credit takes priority over new clean vehicle credit", () => {
  const result = compute({
    line16_income_tax: 9_000,
    line20_nonrefundable_credits: 12_500,
    form8936_tentative_new_credit: 7_500,
    form8936_tentative_used_credit: 4_000,
    form8936_priority_personal_credits: 1_000,
    form8936_schedule3_line7_tentative: 11_500,
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 9_000);
  assertEquals(result.finalizations?.[0].fields.line6m_total, 4_000);
  assertEquals(result.finalizations?.[0].fields.line6f_total, 4_000);
  assertEquals(result.finalizations?.[0].fields.line7_total, 8_000);
});

Deno.test("f1040: Form 8936 personal credit is zero when line 18 is zero", () => {
  const result = compute({
    line20_nonrefundable_credits: 7_500,
    form8936_tentative_new_credit: 7_500,
    form8936_tentative_used_credit: 0,
    form8936_priority_personal_credits: 0,
    form8936_schedule3_line7_tentative: 7_500,
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 0);
  assertEquals(result.finalizations?.[0].fields.line6f_total, undefined);
  assertEquals(result.finalizations?.[0].fields.line8_total, undefined);
});

Deno.test("f1040: child tax credit reduces tax", () => {
  const f = fields({
    line16_income_tax: 5_000,
    line19_child_tax_credit: 2_000,
  });
  assertEquals(f.line22_tax_after_credits, 3_000);
  assertEquals(f.line24_total_tax, 3_000);
});

Deno.test("f1040: credits cannot make tax negative", () => {
  const f = fields({
    line16_income_tax: 1_000,
    line19_child_tax_credit: 2_000,
    line20_nonrefundable_credits: 500,
  });
  assertEquals(f.line22_tax_after_credits, 0);
  assertEquals(f.line24_total_tax, 0);
});

Deno.test("f1040: nonrefundable credits cannot offset Schedule 2 Part II taxes", () => {
  const f = fields({
    line16_income_tax: 300,
    line20_nonrefundable_credits: 2_000,
    line23_other_taxes: 2_800,
  });
  assertEquals(f.line18_total_tax_before_credits, 300);
  assertEquals(f.line22_tax_after_credits, 0);
  assertEquals(f.line24_total_tax, 2_800);
});

Deno.test("f1040: credits reduce Part I tax before Part II tax is added", () => {
  const f = fields({
    line16_income_tax: 1_000,
    line17_additional_taxes: 500,
    line19_child_tax_credit: 750,
    line23_other_taxes: 2_000,
  });
  assertEquals(f.line18_total_tax_before_credits, 1_500);
  assertEquals(f.line22_tax_after_credits, 750);
  assertEquals(f.line24_total_tax, 2_750);
});

Deno.test("f1040: EITC included in total payments", () => {
  const f = fields({
    line16_income_tax: 500,
    line27_eitc: 3_600,
    line25a_w2_withheld: 1_000,
  });
  assertEquals(f.line33_total_payments, 4_600);
  assertEquals(f.line35a_refund, 4_100);
});

Deno.test("f1040: ACTC and refundable AOC included in payments", () => {
  const f = fields({ line28_actc: 1_500, line29_refundable_aoc: 1_000 });
  assertEquals(f.line33_total_payments, 2_500);
  assertEquals(f.line35a_refund, 2_500);
});

Deno.test("f1040: withholding from multiple sources aggregated", () => {
  const f = fields({
    line25a_w2_withheld: 10_000,
    line25b_withheld_1099: 2_000,
    line25c_additional_medicare_withheld: 500,
  });
  assertEquals(f.line33_total_payments, 12_500);
  assertEquals(f.line25c_total, 500);
});

Deno.test("f1040: Form 8805 withholding joins other line 25c withholding", () => {
  const f = fields({
    line25c_additional_medicare_withheld: 500,
    line25c_other_withheld: [3_000, 2_000],
  });
  assertEquals(f.line25c_total, 5_500);
  assertEquals(f.line25d_total_withholding, 5_500);
  assertEquals(f.line33_total_payments, 5_500);
});

Deno.test("f1040: wage lines summed to line 1z", () => {
  const f = fields({
    line1a_wages: 60_000,
    line1c_unreported_tips: 500,
    line1g_wages_8919: 1_000,
  });
  assertEquals(f.line1z_total_wages, 61_500);
  assertEquals(f.line9_total_income, 61_500);
});

Deno.test("f1040: total income includes capital gains and interest", () => {
  const f = fields({
    line1a_wages: 50_000,
    line2b_taxable_interest: 500,
    line3b_ordinary_dividends: 1_000,
    line7_capital_gain: 5_000,
  });
  assertEquals(f.line9_total_income, 56_500);
});

Deno.test("f1040: ordinary dividends from multiple sources are summed", () => {
  const f = fields({ line3b_ordinary_dividends: [400, 300, 125] });
  assertEquals(f.line3b_ordinary_dividends, 825);
  assertEquals(f.line9_total_income, 825);
  assertEquals(f.line11_agi, 825);
});

Deno.test("f1040: QBI deduction reduces taxable income", () => {
  const f = fields({
    line11_agi: 100_000,
    line12a_standard_deduction: 15_000,
    line13_qbi_deduction: 5_000,
  });
  assertEquals(f.line15_taxable_income, 80_000);
});

Deno.test("f1040: Schedule 1-A deduction reduces taxable income and increases line 14", () => {
  const f = fields({
    line11_agi: 30_000,
    line12a_standard_deduction: 15_750,
    line13b_additional_deductions: 5_000,
  });
  assertEquals(f.line14_deductions_qbi_total, 20_750);
  assertEquals(f.line15_taxable_income, 9_250);
});

Deno.test("f1040: accepts explicit line9 total income override", () => {
  const f = fields({
    line9_total_income: 200_000,
    line11_agi: 180_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 40_000,
  });
  assertEquals(f.line9_total_income, 200_000);
  assertEquals(f.line15_taxable_income, 165_000);
});
