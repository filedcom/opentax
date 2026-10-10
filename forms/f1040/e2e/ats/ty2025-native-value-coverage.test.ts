import { assertEquals } from "@std/assert";
import { compareAtsNativeValues } from "./ty2025-native-value-coverage.ts";

const targets = [{
  path: "f1040.line24_total_tax",
  expected: 0,
  basis: "printed-source",
  sourceLocation: "Form1040 line24",
}];
const packet = (contents: string) =>
  `<Return><ReturnData>${contents}</ReturnData></Return>`;
const check = (xml: string | null) =>
  compareAtsNativeValues(xml, targets).rows[0];

Deno.test("ATS native values distinguish a blocked packet, absent field and transmitted zero", () => {
  assertEquals(check(null).result, "not-evaluated");
  assertEquals(check(packet("<IRSW2/>")).result, "missing-document");
  assertEquals(check(packet("<IRS1040/>")).result, "missing-field");
  const zero = check(packet("<IRS1040><TotalTaxAmt>0</TotalTaxAmt></IRS1040>"));
  assertEquals([zero.result, zero.actual], ["match", 0]);
  const changed = check(
    packet("<IRS1040><TotalTaxAmt>1</TotalTaxAmt></IRS1040>"),
  );
  assertEquals([changed.result, changed.actual], ["different", 1]);
});

Deno.test("ATS native values reject malformed, duplicate and nested substitute fields", () => {
  assertEquals(check("<Return>").result, "invalid-xml");
  assertEquals(check(packet("<IRS1040/><IRS1040/>")).result, "ambiguous");
  assertEquals(
    check(
      packet(
        "<IRS1040><TotalTaxAmt>0</TotalTaxAmt><TotalTaxAmt>0</TotalTaxAmt></IRS1040>",
      ),
    ).result,
    "ambiguous",
  );
  assertEquals(
    check(
      packet("<IRS1040><Other><TotalTaxAmt>0</TotalTaxAmt></Other></IRS1040>"),
    ).result,
    "missing-field",
  );
  assertEquals(
    check(
      packet("<Other><IRS1040><TotalTaxAmt>0</TotalTaxAmt></IRS1040></Other>"),
    ).result,
    "missing-document",
  );
  assertEquals(
    check("<Return><ReturnData/><ReturnData/></Return>").result,
    "invalid-xml",
  );
});

Deno.test("ATS native numeric fields reject nonintegers and unsafe values", () => {
  for (
    const value of [
      "",
      "false",
      "0.0",
      "1e2",
      "9007199254740992",
      "<Nested>0</Nested>",
    ]
  ) {
    assertEquals(
      check(packet(`<IRS1040><TotalTaxAmt>${value}</TotalTaxAmt></IRS1040>`))
        .result,
      "invalid-value",
    );
  }
  assertEquals(
    check(packet("<IRS1040><TotalTaxAmt>-1</TotalTaxAmt></IRS1040>")).actual,
    -1,
  );
});

Deno.test("ATS native values report unsupported targets without conflating deduction lines", () => {
  const coverage = compareAtsNativeValues(
    packet(
      "<IRS1040><TotalItemizedOrStandardDedAmt>31500</TotalItemizedOrStandardDedAmt></IRS1040>",
    ),
    [
      {
        ...targets[0],
        path: "f1040.line12a_standard_deduction",
        expected: 31500,
      },
      { ...targets[0], path: "f1040.digital_assets", expected: false },
    ],
  );
  assertEquals(coverage.rows, []);
  assertEquals(coverage.unmappedTargetPaths, [
    "f1040.line12a_standard_deduction",
    "f1040.digital_assets",
  ]);
});
