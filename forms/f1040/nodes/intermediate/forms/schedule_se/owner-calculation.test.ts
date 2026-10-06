import { assertEquals, assertThrows } from "@std/assert";
import { ownedScheduleSE } from "./owner-calculation.ts";
const source = {
  identity: { primary_ssn: "111223333", spouse_ssn: "222334444" },
  businesses: [
    {
      recipient: "T",
      source_reference: "primary-profit",
      kind: "schedule_c",
      net_profit: 200000,
    },
    {
      recipient: "T",
      source_reference: "primary-loss",
      kind: "schedule_c",
      net_profit: -20000,
    },
    {
      recipient: "S",
      source_reference: "spouse-profit",
      kind: "schedule_f",
      net_profit: 60000,
    },
  ],
  wages: [
    {
      employee_ssn: "111223333",
      source_reference: "primary-w2",
      ss_wages_and_tips: 100000,
    },
    {
      employee_ssn: "222334444",
      source_reference: "spouse-w2",
      ss_wages_and_tips: 176100,
    },
  ],
};
Deno.test("owned SE nets each proprietor's businesses and applies only that owner's wage cap", () => {
  const result = ownedScheduleSE(source, 176100);
  assertEquals(
    result.instances.map((
      row,
    ) => [
      row.owner_ssn,
      row.line3,
      row.w2_ss_wages,
      row.line9,
      row.line12,
      row.line13,
    ]),
    [
      ["111223333", 180000, 100000, 76100, 14257, 7129],
      ["222334444", 60000, 176100, 0, 1607, 804],
    ],
  );
  assertEquals(result.tax, 15864);
  assertEquals(result.deduction, 7933);
});
Deno.test("owned SE does not let one spouse's loss erase the other's earnings or minimum threshold", () => {
  const copy = structuredClone(source);
  copy.businesses[0].net_profit = -5000;
  copy.businesses[1].net_profit = 0;
  copy.businesses[2].net_profit = 500;
  copy.wages = [];
  const result = ownedScheduleSE(copy, 176100);
  assertEquals(result.instances.length, 1);
  assertEquals(result.instances[0].recipient, "S");
  assertEquals(result.instances[0].line12, 70);
  assertEquals(result.instances[0].line13, 35);
});
Deno.test("owned SE combines a proprietor's subthreshold farm and business before the 400 test", () => {
  const copy = structuredClone(source);
  copy.businesses = [
    {
      recipient: "T",
      source_reference: "small-c",
      kind: "schedule_c",
      net_profit: 250,
    },
    {
      recipient: "T",
      source_reference: "small-f",
      kind: "schedule_f",
      net_profit: 250,
    },
  ];
  copy.wages = [];
  const result = ownedScheduleSE(copy, 176100);
  assertEquals(result.instances.length, 1);
  assertEquals(result.instances[0].line12, 70);
});
Deno.test("owned SE rejects third-party wages, duplicate records and false spouse identity", () => {
  for (
    const mutate of [
      (copy: typeof source) => {
        copy.identity.spouse_ssn = copy.identity.primary_ssn;
      },
      (copy: typeof source) => {
        copy.wages[0].employee_ssn = "999887777";
      },
      (copy: typeof source) => {
        copy.wages[1].source_reference = copy.wages[0].source_reference;
      },
      (copy: typeof source) => {
        copy.businesses[1].source_reference =
          copy.businesses[0].source_reference;
      },
    ]
  ) {
    const copy = structuredClone(source);
    mutate(copy);
    assertThrows(() => ownedScheduleSE(copy, 176100));
  }
});
Deno.test("owned farm optional method uses the separate proprietor's gross income and cap", () => {
  const result = ownedScheduleSE({
    ...source,
    wages: [],
    businesses: [
      {
        recipient: "T",
        source_reference: "primary-normal",
        kind: "schedule_c",
        net_profit: 20000,
      },
      {
        recipient: "S",
        source_reference: "spouse-optional",
        kind: "schedule_f",
        net_profit: -2000,
        gross_farm_income: 6000,
        farm_optional_method_elected: true,
      },
    ],
  }, 176100);
  assertEquals(result.instances[1].line15, 4000);
  assertEquals(result.instances[1].line12, 612);
  assertEquals(result.instances[1].line13, 306);
});
