import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS8949 } from "./f8949.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

// ---------------------------------------------------------------------------
// Section 1: Empty transactions returns ""
// ---------------------------------------------------------------------------

Deno.test("empty transactions array returns empty string", () => {
  assertEquals(buildIRS8949([]), "");
});

// ---------------------------------------------------------------------------
// Section 2: Single Box A short-term transaction — full XML structure
// ---------------------------------------------------------------------------

Deno.test("single Box A transaction: wrapped in ShortTermCapitalGainAndLossGrp", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
  assertStringIncludes(result, "</ShortTermCapitalGainAndLossGrp>");
});

Deno.test("single Box A transaction: emits TransRptOn1099BThatShowBssInd checkbox", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<TransRptOn1099BThatShowBssInd>X</TransRptOn1099BThatShowBssInd>");
});

Deno.test("single Box A transaction: emits CapitalGainAndLossAssetGrp with all fields", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<CapitalGainAndLossAssetGrp>");
  assertStringIncludes(result, "<PropertyDesc>100 sh XYZ Corp</PropertyDesc>");
  assertStringIncludes(result, "<AcquiredDt>2025-01-15</AcquiredDt>");
  assertStringIncludes(result, "<SoldOrDisposedDt>2025-06-20</SoldOrDisposedDt>");
  assertStringIncludes(result, "<ProceedsSalesPriceAmt>5000</ProceedsSalesPriceAmt>");
  assertStringIncludes(result, "<CostOrOtherBasisAmt>3000</CostOrOtherBasisAmt>");
  assertStringIncludes(result, "<GainOrLossAmt>2000</GainOrLossAmt>");
});

Deno.test("single Box A transaction: emits totals", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<TotalProceedsSalesPriceAmt>5000</TotalProceedsSalesPriceAmt>");
  assertStringIncludes(result, "<TotalCostOrOtherBasisAmt>3000</TotalCostOrOtherBasisAmt>");
  assertStringIncludes(result, "<TotalGainOrLossAmt>2000</TotalGainOrLossAmt>");
});

Deno.test("single Box A transaction: result wrapped in IRS8949", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<IRS8949>");
  assertStringIncludes(result, "</IRS8949>");
});

// ---------------------------------------------------------------------------
// Section 3: Single Box D long-term transaction
// ---------------------------------------------------------------------------

Deno.test("single Box D transaction: wrapped in LongTermCapitalGainAndLossGrp", () => {
  const result = buildIRS8949([{
    part: "D",
    description: "200 sh ABC Fund",
    date_acquired: "2024-03-01",
    date_sold: "2025-09-15",
    proceeds: 8000,
    cost_basis: 6000,
    gain_loss: 2000,
    is_long_term: true,
  }]);
  assertStringIncludes(result, "<LongTermCapitalGainAndLossGrp>");
  assertStringIncludes(result, "</LongTermCapitalGainAndLossGrp>");
  assertNotIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
});

Deno.test("single Box D transaction: emits TransRptOn1099BThatShowBssInd checkbox", () => {
  const result = buildIRS8949([{
    part: "D",
    description: "200 sh ABC Fund",
    date_acquired: "2024-03-01",
    date_sold: "2025-09-15",
    proceeds: 8000,
    cost_basis: 6000,
    gain_loss: 2000,
    is_long_term: true,
  }]);
  assertStringIncludes(result, "<TransRptOn1099BThatShowBssInd>X</TransRptOn1099BThatShowBssInd>");
});

// ---------------------------------------------------------------------------
// Section 4: Box B (basis not reported) — correct checkbox indicator
// ---------------------------------------------------------------------------

Deno.test("Box B transaction: emits TransRptOn1099BNotShowBasisInd checkbox", () => {
  const result = buildIRS8949([{
    part: "B",
    description: "50 sh DEF Corp",
    date_acquired: "2025-02-10",
    date_sold: "2025-08-05",
    proceeds: 2500,
    cost_basis: 1500,
    gain_loss: 1000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<TransRptOn1099BNotShowBasisInd>X</TransRptOn1099BNotShowBasisInd>");
  assertNotIncludes(result, "<TransRptOn1099BThatShowBssInd>");
  assertNotIncludes(result, "<TransactionsNotRptedOn1099BInd>");
});

Deno.test("Box B transaction: wrapped in ShortTermCapitalGainAndLossGrp", () => {
  const result = buildIRS8949([{
    part: "B",
    description: "50 sh DEF Corp",
    date_acquired: "2025-02-10",
    date_sold: "2025-08-05",
    proceeds: 2500,
    cost_basis: 1500,
    gain_loss: 1000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
});

// ---------------------------------------------------------------------------
// Section 5: Box C (no 1099-B) — correct checkbox indicator
// ---------------------------------------------------------------------------

Deno.test("Box C transaction: emits TransactionsNotRptedOn1099BInd checkbox", () => {
  const result = buildIRS8949([{
    part: "C",
    description: "Coin XYZ",
    date_acquired: "2025-03-01",
    date_sold: "2025-10-01",
    proceeds: 1200,
    cost_basis: 800,
    gain_loss: 400,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<TransactionsNotRptedOn1099BInd>X</TransactionsNotRptedOn1099BInd>");
  assertNotIncludes(result, "<TransRptOn1099BThatShowBssInd>");
  assertNotIncludes(result, "<TransRptOn1099BNotShowBasisInd>");
});

// ---------------------------------------------------------------------------
// Section 6: Transaction with adjustments — codes and amounts emitted
// ---------------------------------------------------------------------------

Deno.test("transaction with adjustment_codes emits AdjustmentsToGainOrLossCd", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "Wash sale stock",
    date_acquired: "2025-04-01",
    date_sold: "2025-05-01",
    proceeds: 900,
    cost_basis: 1200,
    adjustment_codes: "W",
    adjustment_amount: 100,
    gain_loss: -200,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<AdjustmentsToGainOrLossCd>W</AdjustmentsToGainOrLossCd>");
});

Deno.test("transaction with adjustment_amount emits AdjustmentsToGainOrLossAmt", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "Wash sale stock",
    date_acquired: "2025-04-01",
    date_sold: "2025-05-01",
    proceeds: 900,
    cost_basis: 1200,
    adjustment_codes: "W",
    adjustment_amount: 100,
    gain_loss: -200,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<AdjustmentsToGainOrLossAmt>100</AdjustmentsToGainOrLossAmt>");
});

Deno.test("transaction with adjustments: TotAdjustmentsToGainOrLossAmt emitted in totals", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "Wash sale stock",
    date_acquired: "2025-04-01",
    date_sold: "2025-05-01",
    proceeds: 900,
    cost_basis: 1200,
    adjustment_codes: "W",
    adjustment_amount: 100,
    gain_loss: -200,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<TotAdjustmentsToGainOrLossAmt>100</TotAdjustmentsToGainOrLossAmt>");
});

Deno.test("transaction without adjustments: no AdjustmentsToGainOrLossCd emitted", () => {
  const result = buildIRS8949([{
    part: "A",
    description: "Simple stock",
    date_acquired: "2025-01-01",
    date_sold: "2025-06-01",
    proceeds: 1000,
    cost_basis: 700,
    gain_loss: 300,
    is_long_term: false,
  }]);
  assertNotIncludes(result, "<AdjustmentsToGainOrLossCd>");
  assertNotIncludes(result, "<AdjustmentsToGainOrLossAmt>");
  assertNotIncludes(result, "<TotAdjustmentsToGainOrLossAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: Two transactions in same category — totals summed
// ---------------------------------------------------------------------------

Deno.test("two Box A transactions: both appear in same ShortTermCapitalGainAndLossGrp", () => {
  const result = buildIRS8949([
    {
      part: "A",
      description: "Stock 1",
      date_acquired: "2025-01-01",
      date_sold: "2025-03-01",
      proceeds: 3000,
      cost_basis: 2000,
      gain_loss: 1000,
      is_long_term: false,
    },
    {
      part: "A",
      description: "Stock 2",
      date_acquired: "2025-02-01",
      date_sold: "2025-04-01",
      proceeds: 4000,
      cost_basis: 2500,
      gain_loss: 1500,
      is_long_term: false,
    },
  ]);
  // Only one group tag
  const openCount = (result.match(/<ShortTermCapitalGainAndLossGrp>/g) || []).length;
  assertEquals(openCount, 1);
  // Both descriptions appear
  assertStringIncludes(result, "<PropertyDesc>Stock 1</PropertyDesc>");
  assertStringIncludes(result, "<PropertyDesc>Stock 2</PropertyDesc>");
});

Deno.test("two Box A transactions: totals are summed", () => {
  const result = buildIRS8949([
    {
      part: "A",
      description: "Stock 1",
      date_acquired: "2025-01-01",
      date_sold: "2025-03-01",
      proceeds: 3000,
      cost_basis: 2000,
      gain_loss: 1000,
      is_long_term: false,
    },
    {
      part: "A",
      description: "Stock 2",
      date_acquired: "2025-02-01",
      date_sold: "2025-04-01",
      proceeds: 4000,
      cost_basis: 2500,
      gain_loss: 1500,
      is_long_term: false,
    },
  ]);
  assertStringIncludes(result, "<TotalProceedsSalesPriceAmt>7000</TotalProceedsSalesPriceAmt>");
  assertStringIncludes(result, "<TotalCostOrOtherBasisAmt>4500</TotalCostOrOtherBasisAmt>");
  assertStringIncludes(result, "<TotalGainOrLossAmt>2500</TotalGainOrLossAmt>");
});

// ---------------------------------------------------------------------------
// Section 8: Mixed short-term and long-term — both groups present
// ---------------------------------------------------------------------------

Deno.test("one Box A and one Box D: both ShortTerm and LongTerm groups emitted", () => {
  const result = buildIRS8949([
    {
      part: "A",
      description: "ST stock",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 2000,
      cost_basis: 1500,
      gain_loss: 500,
      is_long_term: false,
    },
    {
      part: "D",
      description: "LT stock",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 3000,
      gain_loss: 2000,
      is_long_term: true,
    },
  ]);
  assertStringIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
  assertStringIncludes(result, "<LongTermCapitalGainAndLossGrp>");
});

// ---------------------------------------------------------------------------
// Section 9: Part G grouped with A, Part J grouped with D
// ---------------------------------------------------------------------------

Deno.test("Part G transaction: grouped in ShortTermCapitalGainAndLossGrp with TransRptOn1099BThatShowBssInd", () => {
  const result = buildIRS8949([{
    part: "G",
    description: "Digital asset G",
    date_acquired: "2025-05-01",
    date_sold: "2025-07-01",
    proceeds: 3500,
    cost_basis: 2000,
    gain_loss: 1500,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
  assertStringIncludes(result, "<TransRptOn1099BThatShowBssInd>X</TransRptOn1099BThatShowBssInd>");
  assertNotIncludes(result, "<LongTermCapitalGainAndLossGrp>");
});

Deno.test("Part G and Part A transactions grouped together in same group", () => {
  const result = buildIRS8949([
    {
      part: "A",
      description: "Regular A",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1000,
      cost_basis: 800,
      gain_loss: 200,
      is_long_term: false,
    },
    {
      part: "G",
      description: "Digital G",
      date_acquired: "2025-02-01",
      date_sold: "2025-07-01",
      proceeds: 2000,
      cost_basis: 1500,
      gain_loss: 500,
      is_long_term: false,
    },
  ]);
  // Both in same group (one opening tag)
  const openCount = (result.match(/<ShortTermCapitalGainAndLossGrp>/g) || []).length;
  assertEquals(openCount, 1);
  assertStringIncludes(result, "<PropertyDesc>Regular A</PropertyDesc>");
  assertStringIncludes(result, "<PropertyDesc>Digital G</PropertyDesc>");
});

Deno.test("Part J transaction: grouped in LongTermCapitalGainAndLossGrp with TransRptOn1099BThatShowBssInd", () => {
  const result = buildIRS8949([{
    part: "J",
    description: "Digital asset J",
    date_acquired: "2024-01-01",
    date_sold: "2025-06-01",
    proceeds: 4000,
    cost_basis: 2500,
    gain_loss: 1500,
    is_long_term: true,
  }]);
  assertStringIncludes(result, "<LongTermCapitalGainAndLossGrp>");
  assertStringIncludes(result, "<TransRptOn1099BThatShowBssInd>X</TransRptOn1099BThatShowBssInd>");
  assertNotIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
});

// ---------------------------------------------------------------------------
// Section 10: All 6 categories — 6 groups emitted
// ---------------------------------------------------------------------------

Deno.test("all 6 categories produce 6 groups (3 short, 3 long)", () => {
  const transactions = [
    { part: "A", description: "ST-reported", date_acquired: "2025-01-01", date_sold: "2025-06-01", proceeds: 1000, cost_basis: 800, gain_loss: 200, is_long_term: false },
    { part: "B", description: "ST-not-reported", date_acquired: "2025-01-01", date_sold: "2025-06-01", proceeds: 1100, cost_basis: 900, gain_loss: 200, is_long_term: false },
    { part: "C", description: "ST-no-1099b", date_acquired: "2025-01-01", date_sold: "2025-06-01", proceeds: 1200, cost_basis: 1000, gain_loss: 200, is_long_term: false },
    { part: "D", description: "LT-reported", date_acquired: "2024-01-01", date_sold: "2025-06-01", proceeds: 2000, cost_basis: 1600, gain_loss: 400, is_long_term: true },
    { part: "E", description: "LT-not-reported", date_acquired: "2024-01-01", date_sold: "2025-06-01", proceeds: 2100, cost_basis: 1700, gain_loss: 400, is_long_term: true },
    { part: "F", description: "LT-no-1099b", date_acquired: "2024-01-01", date_sold: "2025-06-01", proceeds: 2200, cost_basis: 1800, gain_loss: 400, is_long_term: true },
  ];
  const result = buildIRS8949(transactions);
  const stGroups = (result.match(/<ShortTermCapitalGainAndLossGrp>/g) || []).length;
  const ltGroups = (result.match(/<LongTermCapitalGainAndLossGrp>/g) || []).length;
  assertEquals(stGroups, 3);
  assertEquals(ltGroups, 3);
});

Deno.test("all 6 categories: each category has its correct checkbox indicator", () => {
  const transactions = [
    { part: "A", description: "ST-reported", date_acquired: "2025-01-01", date_sold: "2025-06-01", proceeds: 1000, cost_basis: 800, gain_loss: 200, is_long_term: false },
    { part: "B", description: "ST-not-reported", date_acquired: "2025-01-01", date_sold: "2025-06-01", proceeds: 1100, cost_basis: 900, gain_loss: 200, is_long_term: false },
    { part: "C", description: "ST-no-1099b", date_acquired: "2025-01-01", date_sold: "2025-06-01", proceeds: 1200, cost_basis: 1000, gain_loss: 200, is_long_term: false },
    { part: "D", description: "LT-reported", date_acquired: "2024-01-01", date_sold: "2025-06-01", proceeds: 2000, cost_basis: 1600, gain_loss: 400, is_long_term: true },
    { part: "E", description: "LT-not-reported", date_acquired: "2024-01-01", date_sold: "2025-06-01", proceeds: 2100, cost_basis: 1700, gain_loss: 400, is_long_term: true },
    { part: "F", description: "LT-no-1099b", date_acquired: "2024-01-01", date_sold: "2025-06-01", proceeds: 2200, cost_basis: 1800, gain_loss: 400, is_long_term: true },
  ];
  const result = buildIRS8949(transactions);
  // 2 reported groups (A short + D long) = 2 TransRptOn1099BThatShowBssInd
  const reported = (result.match(/<TransRptOn1099BThatShowBssInd>/g) || []).length;
  assertEquals(reported, 2);
  // 2 not-reported groups (B short + E long)
  const notReported = (result.match(/<TransRptOn1099BNotShowBasisInd>/g) || []).length;
  assertEquals(notReported, 2);
  // 2 no-1099b groups (C short + F long)
  const no1099b = (result.match(/<TransactionsNotRptedOn1099BInd>/g) || []).length;
  assertEquals(no1099b, 2);
});

Deno.test("short-term groups emitted before long-term groups in XSD order", () => {
  const transactions = [
    { part: "D", description: "LT first", date_acquired: "2024-01-01", date_sold: "2025-06-01", proceeds: 2000, cost_basis: 1600, gain_loss: 400, is_long_term: true },
    { part: "A", description: "ST second", date_acquired: "2025-01-01", date_sold: "2025-06-01", proceeds: 1000, cost_basis: 800, gain_loss: 200, is_long_term: false },
  ];
  const result = buildIRS8949(transactions);
  const stIdx = result.indexOf("<ShortTermCapitalGainAndLossGrp>");
  const ltIdx = result.indexOf("<LongTermCapitalGainAndLossGrp>");
  assertEquals(stIdx < ltIdx, true);
});
