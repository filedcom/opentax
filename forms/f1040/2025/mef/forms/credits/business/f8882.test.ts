import { assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { form8882PreparedFixture } from "./f8882.fixture.ts";
import { form8882 } from "./f8882.ts";

const filer = {
  primarySSN: "111223333",
  filingStatus: FilingStatus.Single,
} as FilerIdentity;

Deno.test("staged Form 8882 native XML projects direct employer lines 1-7", () => {
  const { source, pending } = form8882PreparedFixture();
  const discovery = form8882.build(source, {
    phase: "discovery",
    pending,
    filer,
  });
  assertStringIncludes(discovery, "<IRS8882>");
  const xml = form8882.build(source, {
    pending,
    filer,
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(
    xml,
    "<QlfyChldCareFcltyExpendAmt>40000</QlfyChldCareFcltyExpendAmt>",
  );
  assertStringIncludes(
    xml,
    "<TwentyFivePctOfFcltyExpendAmt>10000</TwentyFivePctOfFcltyExpendAmt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedChildCareRscExpendAmt>10000</QualifiedChildCareRscExpendAmt>",
  );
  assertStringIncludes(
    xml,
    "<TenPercentOfResourceExpendAmt>1000</TenPercentOfResourceExpendAmt>",
  );
  assertStringIncludes(
    xml,
    "<SumOfPassThruEntCostsAndCrAmt>11000</SumOfPassThruEntCostsAndCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<SmllrOfEntitiesSumOr150000Amt>11000</SmllrOfEntitiesSumOr150000Amt>",
  );
  if (xml.includes("<EmplrChldCareFcltsAndSrvcCrAmt>")) {
    throw new Error(
      "Direct employer cannot project pass-through credit line 5",
    );
  }
});

Deno.test("staged Form 8882 refuses tampered Schedule C deduction and owner", () => {
  const { source, pending } = form8882PreparedFixture();
  assertThrows(() =>
    form8882.build(source, {
      phase: "final",
      pending,
      filer,
      documentIdsByPendingKey: { f3800: [] },
    })
  );
  assertThrows(() =>
    form8882.build(source, {
      pending: {
        ...pending,
        schedule_c: {
          schedule_cs: [{
            ...pending.schedule_c.schedule_cs[0],
            part_v_other_expenses: [
              {
                description: "Childcare facility net of 45F credit",
                amount: 40_000,
              },
              {
                description: "Childcare referral net of 45F credit",
                amount: 9_000,
              },
            ],
          }],
        },
      },
      filer,
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    })
  );
  assertThrows(() =>
    form8882.build(source, {
      pending,
      filer: { ...filer, primarySSN: "999999999" },
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    })
  );
  assertThrows(() =>
    form8882.build(source, {
      pending: { ...pending, f1040: { taxpayer_ssn: "999999999" } },
      filer,
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    })
  );
});
