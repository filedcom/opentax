import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form5471 } from "./f5471.ts";

const xsd = new URL(
  "../../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS5471/IRS5471.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // Research schema bundle is optional in another workspace.
}

Deno.test("Category 4/5a Form 5471 parent joins A, B, C, F, G, and I", () => {
  const xml = form5471.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(xml, "<CategoryOfFiler5aInd>X</CategoryOfFiler5aInd>");
  assertStringIncludes(xml, "<CategoryOfFiler4Ind>X</CategoryOfFiler4Ind>");
  assertStringIncludes(
    xml,
    "<VotingStockOwnedPct>1.00000</VotingStockOwnedPct>",
  );
  assertStringIncludes(xml, "<DirectShareholdersForeignCorp>");
  assertStringIncludes(xml, "<StockOfTheForeignCorporation>");
  assertStringIncludes(xml, "<USShareholdersOfForeignCorp>");
  assertStringIncludes(xml, "<IRS5471ScheduleC>");
  assertStringIncludes(xml, "<IRS5471ScheduleF>");
  assertStringIncludes(
    xml,
    "<ForeignCYNetIncomePerBooksAmt>60000</ForeignCYNetIncomePerBooksAmt>",
  );
  assertStringIncludes(
    xml,
    "<EndAcctPrdTotalAssetsAmt>170000</EndAcctPrdTotalAssetsAmt>",
  );
  assertStringIncludes(
    xml,
    "<ProRataShareSubpartFIncomeRt>1.00000</ProRataShareSubpartFIncomeRt>",
  );
  assertStringIncludes(
    xml,
    "<AnnualAcctPeriodEndShareCnt>100</AnnualAcctPeriodEndShareCnt>",
  );
  assertStringIncludes(
    xml,
    "<SubpartFSalesIncomeAmt>10000</SubpartFSalesIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<EarningsInvestedInUSPropAmt>1000</EarningsInvestedInUSPropAmt>",
  );
  assertStringIncludes(xml, "<IRS5471ScheduleG>");
  assertStringIncludes(
    xml,
    "<FrgnCorpPartcpCostShrInd>false</FrgnCorpPartcpCostShrInd>",
  );
  assertStringIncludes(
    xml,
    "<PayOrAccrueTopUpTaxInd>false</PayOrAccrueTopUpTaxInd>",
  );
  // The reviewed 2025 question 22 facts are required by source validation;
  // the available v5.4 parent schema stops at question 21.
  assertEquals(xml.includes("TransitionRuleDividend"), false);
});

Deno.test("Form 5471 parent rejects unreviewed stock events and Schedule I facts", () => {
  const source = (cfc: unknown) => ({
    ...form8992Pending,
    f5471: { f5471s: [cfc] },
  });
  assertThrows(() =>
    form5471.build({}, {
      filer: form8992Filer,
      pending: source({
        ...form8992Cfc,
        form5471_identity: {
          ...form8992Cfc.form5471_identity,
          direct_shares_end: 0,
        },
      }),
    }), Error);
  assertThrows(() =>
    form5471.build({}, {
      filer: form8992Filer,
      pending: source({
        ...form8992Cfc,
        form5471_identity: {
          ...form8992Cfc.form5471_identity,
          no_stock_acquisition_disposition_or_reorganization: false,
        },
      }),
    }), Error);
  assertThrows(() =>
    form5471.build({}, {
      filer: form8992Filer,
      pending: source({
        ...form8992Cfc,
        form5471_identity: {
          ...form8992Cfc.form5471_identity,
          no_section_338_election: false,
        },
      }),
    }), Error);
  assertThrows(() =>
    form5471.build({}, {
      filer: form8992Filer,
      pending: source({
        ...form8992Cfc,
        schedule_i: { ...form8992Cfc.schedule_i, line5a_eligible_dividends: 1 },
      }),
    }), Error);
  assertThrows(() =>
    form5471.build({}, {
      filer: form8992Filer,
      pending: source({
        ...form8992Cfc,
        schedule_g: { ...form8992Cfc.schedule_g, q7_cost_sharing: true },
      }),
    }), Error);
  for (
    const key of [
      "q22a_section951a2b_distributions",
      "q22b_transition_rule_dividends",
    ] as const
  ) {
    assertThrows(() =>
      form5471.build({}, {
        filer: form8992Filer,
        pending: source({
          ...form8992Cfc,
          schedule_g: { ...form8992Cfc.schedule_g, [key]: true },
        }),
      }), Error);
  }
  assertThrows(() =>
    form5471.build({}, {
      filer: form8992Filer,
      pending: source({
        ...form8992Cfc,
        schedule_g: {
          ...form8992Cfc.schedule_g,
          source_workpaper_reference: "",
        },
      }),
    }), Error);
});

Deno.test({
  name: "Category 5a Form 5471 partial parent XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471/,
      '<IRS5471 xmlns="http://www.irs.gov/efile" documentId="IRS5471Test1"',
    );
    const command = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = command.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const result = await command.output();
    assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  },
});
