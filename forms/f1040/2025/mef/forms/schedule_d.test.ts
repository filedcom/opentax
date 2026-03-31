import { assertEquals, assertStringIncludes } from "@std/assert";
import { scheduleD } from "./schedule_d.ts";

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
  assertEquals(scheduleD.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys returns empty string
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(scheduleD.build({ junk: 999, foo: "bar" }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("line_6_carryover at zero is emitted", () => {
  const result = scheduleD.build({ line_6_carryover: 0 });
  assertStringIncludes(
    result,
    "<STCapitalLossCarryoverAmt>0</STCapitalLossCarryoverAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-scalar-field mapping tests
// ---------------------------------------------------------------------------

Deno.test("line_4_other_st maps to STGainOrLossFromFormsAmt", () => {
  const result = scheduleD.build({ line_4_other_st: 1500 });
  assertStringIncludes(
    result,
    "<STGainOrLossFromFormsAmt>1500</STGainOrLossFromFormsAmt>",
  );
});

Deno.test("line_5_k1_st maps to NetSTGainOrLossFromSchK1Amt", () => {
  const result = scheduleD.build({ line_5_k1_st: 2000 });
  assertStringIncludes(
    result,
    "<NetSTGainOrLossFromSchK1Amt>2000</NetSTGainOrLossFromSchK1Amt>",
  );
});

Deno.test("line_6_carryover maps to STCapitalLossCarryoverAmt", () => {
  const result = scheduleD.build({ line_6_carryover: 3000 });
  assertStringIncludes(
    result,
    "<STCapitalLossCarryoverAmt>3000</STCapitalLossCarryoverAmt>",
  );
});

Deno.test("line_11_form2439 maps to LTGainOrLossFromFormsAmt", () => {
  const result = scheduleD.build({ line_11_form2439: 4000 });
  assertStringIncludes(
    result,
    "<LTGainOrLossFromFormsAmt>4000</LTGainOrLossFromFormsAmt>",
  );
});

Deno.test("line_12_k1_lt maps to NetLTGainOrLossFromSchK1Amt", () => {
  const result = scheduleD.build({ line_12_k1_lt: 5000 });
  assertStringIncludes(
    result,
    "<NetLTGainOrLossFromSchK1Amt>5000</NetLTGainOrLossFromSchK1Amt>",
  );
});

Deno.test("line_14_carryover maps to LTCapitalLossCarryoverAmt", () => {
  const result = scheduleD.build({ line_14_carryover: 6000 });
  assertStringIncludes(
    result,
    "<LTCapitalLossCarryoverAmt>6000</LTCapitalLossCarryoverAmt>",
  );
});

Deno.test("line19_unrecaptured_1250 maps to UnrcptrSect1250GainWrkshtAmt", () => {
  const result = scheduleD.build({ line19_unrecaptured_1250: 7000 });
  assertStringIncludes(
    result,
    "<UnrcptrSect1250GainWrkshtAmt>7000</UnrcptrSect1250GainWrkshtAmt>",
  );
});

Deno.test("line13_cap_gain_distrib maps to CapitalGainDistributionsAmt", () => {
  const result = scheduleD.build({ line13_cap_gain_distrib: 800 });
  assertStringIncludes(
    result,
    "<CapitalGainDistributionsAmt>800</CapitalGainDistributionsAmt>",
  );
});

Deno.test("line_12_cap_gain_dist maps to CapitalGainDistributionsAmt", () => {
  const result = scheduleD.build({ line_12_cap_gain_dist: 900 });
  assertStringIncludes(
    result,
    "<CapitalGainDistributionsAmt>900</CapitalGainDistributionsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Line 1a nested group — short-term
// ---------------------------------------------------------------------------

Deno.test(
  "line_1a_proceeds + line_1a_cost emit TotalSTCGL1099BBssRptNoAdjGrp with child elements",
  () => {
    const result = scheduleD.build({
      line_1a_proceeds: 10000,
      line_1a_cost: 8000,
    });
    assertStringIncludes(result, "<TotalSTCGL1099BBssRptNoAdjGrp>");
    assertStringIncludes(
      result,
      "<TotalProceedsSalesPriceAmt>10000</TotalProceedsSalesPriceAmt>",
    );
    assertStringIncludes(
      result,
      "<TotalCostOrOtherBasisAmt>8000</TotalCostOrOtherBasisAmt>",
    );
    assertStringIncludes(
      result,
      "<TotalGainOrLossAmt>2000</TotalGainOrLossAmt>",
    );
    assertStringIncludes(result, "</TotalSTCGL1099BBssRptNoAdjGrp>");
  },
);

Deno.test("line_1a group emits loss when cost > proceeds", () => {
  const result = scheduleD.build({
    line_1a_proceeds: 5000,
    line_1a_cost: 8000,
  });
  assertStringIncludes(
    result,
    "<TotalGainOrLossAmt>-3000</TotalGainOrLossAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 6: Line 8a nested group — long-term
// ---------------------------------------------------------------------------

Deno.test(
  "line_8a_proceeds + line_8a_cost emit TotalLTCGL1099BBssRptNoAdjGrp with child elements",
  () => {
    const result = scheduleD.build({
      line_8a_proceeds: 20000,
      line_8a_cost: 15000,
    });
    assertStringIncludes(result, "<TotalLTCGL1099BBssRptNoAdjGrp>");
    assertStringIncludes(
      result,
      "<TotalProceedsSalesPriceAmt>20000</TotalProceedsSalesPriceAmt>",
    );
    assertStringIncludes(
      result,
      "<TotalCostOrOtherBasisAmt>15000</TotalCostOrOtherBasisAmt>",
    );
    assertStringIncludes(
      result,
      "<TotalGainOrLossAmt>5000</TotalGainOrLossAmt>",
    );
    assertStringIncludes(result, "</TotalLTCGL1099BBssRptNoAdjGrp>");
  },
);

// ---------------------------------------------------------------------------
// Section 7: Partial group — only proceeds (no cost)
// ---------------------------------------------------------------------------

Deno.test("line_1a with only proceeds emits group with just TotalProceedsSalesPriceAmt", () => {
  const result = scheduleD.build({ line_1a_proceeds: 5000 });
  assertStringIncludes(result, "<TotalSTCGL1099BBssRptNoAdjGrp>");
  assertStringIncludes(
    result,
    "<TotalProceedsSalesPriceAmt>5000</TotalProceedsSalesPriceAmt>",
  );
  assertNotIncludes(result, "<TotalCostOrOtherBasisAmt>");
  assertStringIncludes(result, "</TotalSTCGL1099BBssRptNoAdjGrp>");
});

Deno.test("line_1a with only cost emits group with just TotalCostOrOtherBasisAmt", () => {
  const result = scheduleD.build({ line_1a_cost: 3000 });
  assertStringIncludes(result, "<TotalSTCGL1099BBssRptNoAdjGrp>");
  assertStringIncludes(
    result,
    "<TotalCostOrOtherBasisAmt>3000</TotalCostOrOtherBasisAmt>",
  );
  assertNotIncludes(result, "<TotalProceedsSalesPriceAmt>");
  assertStringIncludes(result, "</TotalSTCGL1099BBssRptNoAdjGrp>");
});

// ---------------------------------------------------------------------------
// Section 8: Sparse output — known field emits only that element
// ---------------------------------------------------------------------------

Deno.test("single known scalar field: only that element emitted, absent fields omitted", () => {
  const result = scheduleD.build({ line_4_other_st: 500 });
  assertStringIncludes(
    result,
    "<STGainOrLossFromFormsAmt>500</STGainOrLossFromFormsAmt>",
  );
  assertNotIncludes(result, "<NetSTGainOrLossFromSchK1Amt>");
  assertNotIncludes(result, "<STCapitalLossCarryoverAmt>");
  assertNotIncludes(result, "<TotalSTCGL1099BBssRptNoAdjGrp>");
  assertNotIncludes(result, "<TotalLTCGL1099BBssRptNoAdjGrp>");
});

// ---------------------------------------------------------------------------
// Section 9: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  line_1a_proceeds: 100,
  line_1a_cost: 80,
  line_4_other_st: 200,
  line_5_k1_st: 300,
  line_6_carryover: 400,
  line_8a_proceeds: 500,
  line_8a_cost: 450,
  line_11_form2439: 600,
  line_12_k1_lt: 700,
  line13_cap_gain_distrib: 800,
  line_14_carryover: 900,
  line19_unrecaptured_1250: 1000,
};

Deno.test("all fields present: output wrapped in IRS1040ScheduleD tag", () => {
  const result = scheduleD.build(allFields);
  assertStringIncludes(result, "<IRS1040ScheduleD>");
  assertStringIncludes(result, "</IRS1040ScheduleD>");
});

Deno.test("all fields present: line 1a nested group emitted", () => {
  const result = scheduleD.build(allFields);
  assertStringIncludes(result, "<TotalSTCGL1099BBssRptNoAdjGrp>");
  assertStringIncludes(
    result,
    "<TotalProceedsSalesPriceAmt>100</TotalProceedsSalesPriceAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalCostOrOtherBasisAmt>80</TotalCostOrOtherBasisAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalGainOrLossAmt>20</TotalGainOrLossAmt>",
  );
});

Deno.test("all fields present: line 8a nested group emitted", () => {
  const result = scheduleD.build(allFields);
  assertStringIncludes(result, "<TotalLTCGL1099BBssRptNoAdjGrp>");
  assertStringIncludes(result, "</TotalLTCGL1099BBssRptNoAdjGrp>");
});

Deno.test("all fields present: scalar fields emitted correctly", () => {
  const result = scheduleD.build(allFields);
  assertStringIncludes(
    result,
    "<STGainOrLossFromFormsAmt>200</STGainOrLossFromFormsAmt>",
  );
  assertStringIncludes(
    result,
    "<NetSTGainOrLossFromSchK1Amt>300</NetSTGainOrLossFromSchK1Amt>",
  );
  assertStringIncludes(
    result,
    "<STCapitalLossCarryoverAmt>400</STCapitalLossCarryoverAmt>",
  );
  assertStringIncludes(
    result,
    "<LTGainOrLossFromFormsAmt>600</LTGainOrLossFromFormsAmt>",
  );
  assertStringIncludes(
    result,
    "<NetLTGainOrLossFromSchK1Amt>700</NetLTGainOrLossFromSchK1Amt>",
  );
  assertStringIncludes(
    result,
    "<LTCapitalLossCarryoverAmt>900</LTCapitalLossCarryoverAmt>",
  );
  assertStringIncludes(
    result,
    "<UnrcptrSect1250GainWrkshtAmt>1000</UnrcptrSect1250GainWrkshtAmt>",
  );
  assertStringIncludes(
    result,
    "<CapitalGainDistributionsAmt>800</CapitalGainDistributionsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 10: Capital gain distributions aggregated from both sources
// ---------------------------------------------------------------------------

Deno.test(
  "line13_cap_gain_distrib(400) + line_12_cap_gain_dist(200) aggregated to CapitalGainDistributionsAmt=600",
  () => {
    const result = scheduleD.build({
      line13_cap_gain_distrib: 400,
      line_12_cap_gain_dist: 200,
    });
    assertStringIncludes(
      result,
      "<CapitalGainDistributionsAmt>600</CapitalGainDistributionsAmt>",
    );
  },
);

Deno.test(
  "line13_cap_gain_distrib(400) alone emits CapitalGainDistributionsAmt=400",
  () => {
    const result = scheduleD.build({ line13_cap_gain_distrib: 400 });
    assertStringIncludes(
      result,
      "<CapitalGainDistributionsAmt>400</CapitalGainDistributionsAmt>",
    );
  },
);

// ---------------------------------------------------------------------------
// Section 11: Transaction arrays, filing_status, booleans ignored
// ---------------------------------------------------------------------------

Deno.test("transaction array is silently ignored", () => {
  const result = scheduleD.build({
    transaction: {
      part: "A",
      description: "test",
      date_acquired: "01/01/2025",
      date_sold: "12/31/2025",
      proceeds: 10000,
      cost_basis: 8000,
      gain_loss: 2000,
      is_long_term: false,
    },
    line_4_other_st: 500,
  });
  assertStringIncludes(
    result,
    "<STGainOrLossFromFormsAmt>500</STGainOrLossFromFormsAmt>",
  );
  assertNotIncludes(result, "transaction");
  assertNotIncludes(result, "10000");
});

Deno.test("filing_status is silently ignored", () => {
  const result = scheduleD.build({
    filing_status: "MFJ",
    line_6_carryover: 3000,
  });
  assertStringIncludes(
    result,
    "<STCapitalLossCarryoverAmt>3000</STCapitalLossCarryoverAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});

Deno.test("box2c_qsbs boolean field is silently ignored", () => {
  const result = scheduleD.build({
    box2c_qsbs: 5000,
    line_14_carryover: 1000,
  });
  assertStringIncludes(
    result,
    "<LTCapitalLossCarryoverAmt>1000</LTCapitalLossCarryoverAmt>",
  );
  assertNotIncludes(result, "box2c_qsbs");
  assertNotIncludes(result, "5000");
});

Deno.test("capital_loss_carryover is silently ignored", () => {
  const result = scheduleD.build({
    capital_loss_carryover: 9999,
    line19_unrecaptured_1250: 2000,
  });
  assertStringIncludes(
    result,
    "<UnrcptrSect1250GainWrkshtAmt>2000</UnrcptrSect1250GainWrkshtAmt>",
  );
  assertNotIncludes(result, "capital_loss_carryover");
  assertNotIncludes(result, "9999");
});
