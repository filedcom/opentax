import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { schedule1 } from "./schedule1.ts";
import { schedule1OtherIncomeStatement } from "./schedule1_other_income_statement.ts";

const sourced = {
  line8z_form8814: 200,
  line8z_hsa_excess_earnings: 100,
  line8z_rtaa: 300,
  line9_total_other_income: 600,
};

Deno.test("TY2025 Schedule 1 line 8z links its type statement", () => {
  const statement = schedule1OtherIncomeStatement.build({}, {
    pending: { schedule1: sourced },
  });
  assertStringIncludes(
    statement,
    "<OtherIncomeLitCd>FORM 8814</OtherIncomeLitCd>",
  );
  assertStringIncludes(
    statement,
    "<OtherIncomeCodeTxt>HSA excess earnings</OtherIncomeCodeTxt>",
  );
  assertStringIncludes(statement, "<OtherIncomeAmt>300</OtherIncomeAmt>");
  const xml = schedule1.build(sourced, {
    documentIdsByPendingKey: {
      schedule1_other_income_statement: ["OtherIncomeTypeStatement4"],
    },
  });
  assertStringIncludes(
    xml,
    '<OtherIncomeTotalAmt referenceDocumentId="OtherIncomeTypeStatement4" referenceDocumentName="OtherIncomeTypeStatement">600</OtherIncomeTotalAmt>',
  );
});

Deno.test("TY2025 Schedule 1 line 8z rejects missing type and link", () => {
  assertThrows(
    () => schedule1.build({ line8z_other: 25 }),
    Error,
    "generic income needs identified source types",
  );
  assertThrows(
    () =>
      schedule1OtherIncomeStatement.build({}, {
        pending: { schedule1: { line8z_other_income: 25 } },
      }),
    Error,
    "generic income needs identified source types",
  );
  assertThrows(
    () => schedule1.build(sourced, { documentIdsByPendingKey: {} }),
    Error,
    "needs its linked other-income type statement",
  );
  assertEquals(schedule1OtherIncomeStatement.build({}, { pending: {} }), "");
});

Deno.test("TY2025 Form 8621 income types remain separate on Schedule 1 line 8z", () => {
  const fields = {
    line8z_form8621_qef: 2_000,
    line8z_form8621_mtm: -500,
    line8z_form8621_section1291: 300,
  };
  const statement = schedule1OtherIncomeStatement.build({}, {
    pending: { schedule1: fields },
  });
  assertStringIncludes(statement, "Form 8621 QEF ordinary income");
  assertStringIncludes(statement, "Form 8621 mark-to-market gain or loss");
  assertStringIncludes(statement, "Form 8621 section 1291 current-year income");
  assertStringIncludes(statement, "<OtherIncomeAmt>-500</OtherIncomeAmt>");
  const xml = schedule1.build(fields, {
    documentIdsByPendingKey: {
      schedule1_other_income_statement: ["OtherIncomeTypeStatement1"],
    },
  });
  assertStringIncludes(xml, "OtherIncomeTotalAmt");
  assertStringIncludes(xml, ">1800</OtherIncomeTotalAmt>");
});

Deno.test("TY2025 nonbusiness Form 1099-NEC has a typed line 8z statement row", () => {
  const fields = { line8z_f1099nec_nonbusiness: 2_000 };
  const statement = schedule1OtherIncomeStatement.build({}, {
    pending: { schedule1: fields },
  });
  assertStringIncludes(statement, "Form 1099-NEC nonbusiness services");
  assertStringIncludes(statement, "<OtherIncomeAmt>2000</OtherIncomeAmt>");
});

Deno.test("TY2025 Form 1098 taxable mortgage-interest recovery has a typed line 8z row", () => {
  const fields = { line8z_f1098_interest_recovery: 1_200 };
  const statement = schedule1OtherIncomeStatement.build({}, {
    pending: { schedule1: fields },
  });
  assertStringIncludes(statement, "Form 1098 mortgage interest refund");
  assertStringIncludes(statement, "<OtherIncomeAmt>1200</OtherIncomeAmt>");
});

Deno.test("TY2025 S corporation K-1 tax-benefit recovery has a typed line 8z row", () => {
  const fields = { line8z_k1_s_corp_tax_benefit_recovery: 400 };
  const statement = schedule1OtherIncomeStatement.build({}, {
    pending: { schedule1: fields },
  });
  assertStringIncludes(statement, "S corporation tax-benefit recovery");
  assertStringIncludes(statement, "<OtherIncomeAmt>400</OtherIncomeAmt>");
  const xml = schedule1.build(fields, {
    documentIdsByPendingKey: {
      schedule1_other_income_statement: ["OtherIncomeTypeStatement1"],
    },
  });
  assertStringIncludes(xml, ">400</OtherIncomeTotalAmt>");
});
