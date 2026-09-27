import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { combineForm3800CurrentCreditAmounts } from "./f3800_current_rows.ts";
import { buildForm3800PartIIIXml } from "./f3800_part_iii.ts";

Deno.test("Form 3800 Part III puts source lines and subtotals in schema order", () => {
  const amounts = combineForm3800CurrentCreditAmounts([
    {
      line: "1e",
      grossCredit: 100.25,
      transferOutCredit: 0,
      appliedCredit: 80,
    },
    { line: "1h", grossCredit: 200, transferOutCredit: 0, appliedCredit: 150 },
    { line: "4b", grossCredit: 300, transferOutCredit: 0, appliedCredit: 200 },
    { line: "4e", grossCredit: 400, transferOutCredit: 0, appliedCredit: 300 },
  ], [{
    line: "3",
    beforePassiveLimit: 100,
    afterPassiveLimit: 50,
    appliedCredit: 40,
  }]);
  const rows = buildForm3800PartIIIXml({
    rows: [
      { line: "4e", xml: "<SpecifiedProduction/>" },
      { line: "1h", xml: "<OrphanDrug/>" },
      { line: "3", xml: "<EmpowermentZone/>" },
      { line: "1e", xml: "<DisabledAccess/>" },
      { line: "4b", xml: "<WorkOpportunity/>" },
    ],
    amounts,
  });
  assertEquals(rows.map((row) => row.match(/^<[^\s/>]+/)?.[0]), [
    "<DisabledAccess",
    "<OrphanDrug",
    "<GenBusCYCreditsSubTotGrp",
    "<EmpowermentZone",
    "<WorkOpportunity",
    "<SpecifiedProduction",
    "<GenBusCYCreditsSubTot2Grp",
    "<TotGenBusCYCreditAmtGrp",
  ]);
  assertStringIncludes(
    rows[2],
    "<TotalGeneralBusCreditsAmt>300</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    rows[6],
    "<TotalGeneralBusCreditsAppTxAmt>500</TotalGeneralBusCreditsAppTxAmt>",
  );
  assertStringIncludes(
    rows[7],
    "<CrSubjToPassiveActyLmtAmt>100</CrSubjToPassiveActyLmtAmt>",
  );
  assertStringIncludes(
    rows[7],
    "<TotalGeneralBusCreditsAmt>1050</TotalGeneralBusCreditsAmt>",
  );
});

Deno.test("Form 3800 Part III rejects duplicate and unmatched line groups", () => {
  const amounts = combineForm3800CurrentCreditAmounts([{
    line: "1e",
    grossCredit: 100,
    transferOutCredit: 0,
    appliedCredit: 50,
  }], []);
  assertThrows(
    () =>
      buildForm3800PartIIIXml({
        rows: [
          { line: "1e", xml: "<One/>" },
          { line: "1e", xml: "<Two/>" },
        ],
        amounts,
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      buildForm3800PartIIIXml({
        rows: [{ line: "4b", xml: "<WorkOpportunity/>" }],
        amounts,
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      buildForm3800PartIIIXml({
        rows: [{ line: "1e", xml: "<DisabledAccess/>" }],
        amounts: amounts.map((row) => ({ ...row, appliedCredit: 101 })),
      }),
    Error,
    "amount row does not reconcile",
  );
});

Deno.test("Form 3800 Part III omits current-year groups on a carryover-only return", () => {
  assertEquals(buildForm3800PartIIIXml({ rows: [], amounts: [] }), []);
});
