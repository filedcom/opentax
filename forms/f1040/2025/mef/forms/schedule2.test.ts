import { assertEquals, assertStringIncludes } from "@std/assert";
import { schedule2 } from "./schedule2.ts";

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

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(schedule2.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("line1_amt at zero is emitted", () => {
  const result = schedule2.build({ line1_amt: 0 });
  assertStringIncludes(
    result,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping — direct 1:1 fields
// ---------------------------------------------------------------------------

Deno.test("line1_amt maps to AlternativeMinimumTaxAmt", () => {
  const result = schedule2.build({ line1_amt: 5000 });
  assertStringIncludes(
    result,
    "<AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("line4_se_tax maps to SelfEmploymentTaxAmt", () => {
  const result = schedule2.build({ line4_se_tax: 14100 });
  assertStringIncludes(
    result,
    "<SelfEmploymentTaxAmt>14100</SelfEmploymentTaxAmt>",
  );
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

Deno.test("line17b_hsa_penalty maps to HSADistriAddnlPercentTaxAmt", () => {
  const result = schedule2.build({ line17b_hsa_penalty: 400 });
  assertStringIncludes(
    result,
    "<HSADistriAddnlPercentTaxAmt>400</HSADistriAddnlPercentTaxAmt>",
  );
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

Deno.test("lump_sum_tax maps to PartialTaxOnAccumDistriAmt", () => {
  const result = schedule2.build({ lump_sum_tax: 5500 });
  assertStringIncludes(
    result,
    "<PartialTaxOnAccumDistriAmt>5500</PartialTaxOnAccumDistriAmt>",
  );
});

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
    line1_amt: 3000,
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
  line1_amt: 100,
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
  line17b_hsa_penalty: 1400,
  line17e_archer_msa_tax: 1500,
  line17f_medicare_advantage_msa_tax: 1600,
  lump_sum_tax: 1700,
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
  assertStringIncludes(
    result,
    "<PartialTaxOnAccumDistriAmt>1700</PartialTaxOnAccumDistriAmt>",
  );
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
    line1_amt: 2500,
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
