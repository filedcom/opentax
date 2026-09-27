import { assertEquals, assertThrows } from "@std/assert";
import { buildForm3800PartIIIXml } from "./f3800_part_iii.ts";

Deno.test("Form 3800 Part III puts source lines and subtotals in schema order", () => {
  assertEquals(
    buildForm3800PartIIIXml({
      rows: [
        { line: "4e", xml: "<SpecifiedProduction/>" },
        { line: "1h", xml: "<OrphanDrug/>" },
        { line: "3", xml: "<EmpowermentZone/>" },
        { line: "1e", xml: "<DisabledAccess/>" },
        { line: "4b", xml: "<WorkOpportunity/>" },
      ],
      standardSubtotal: "<StandardSubtotal/>",
      specifiedSubtotal: "<SpecifiedSubtotal/>",
      total: "<CurrentYearTotal/>",
    }),
    [
      "<DisabledAccess/>",
      "<OrphanDrug/>",
      "<StandardSubtotal/>",
      "<EmpowermentZone/>",
      "<WorkOpportunity/>",
      "<SpecifiedProduction/>",
      "<SpecifiedSubtotal/>",
      "<CurrentYearTotal/>",
    ],
  );
});

Deno.test("Form 3800 Part III rejects duplicate line groups and missing subtotals", () => {
  assertThrows(
    () =>
      buildForm3800PartIIIXml({
        rows: [
          { line: "1e", xml: "<One/>" },
          { line: "1e", xml: "<Two/>" },
        ],
        standardSubtotal: "<Subtotal/>",
        specifiedSubtotal: "",
        total: "<Total/>",
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      buildForm3800PartIIIXml({
        rows: [{ line: "4b", xml: "<WorkOpportunity/>" }],
        standardSubtotal: "",
        specifiedSubtotal: "",
        total: "<Total/>",
      }),
    Error,
    "do not reconcile",
  );
});
