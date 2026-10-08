import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { schedule1 } from "../../../general/return-assembly/schedule1/schedule1.ts";
import { schedule1OtherIncomeStatement } from "./schedule1_other_income_statement.ts";

const sourced = {
  line8z_form8814: 200,
  line8z_hsa_excess_earnings: 100,
  line9_total_other_income: 300,
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
  assertStringIncludes(statement, "<OtherIncomeAmt>200</OtherIncomeAmt>");
  const xml = schedule1.build(sourced, {
    documentIdsByPendingKey: {
      schedule1_other_income_statement: ["OtherIncomeTypeStatement4"],
    },
  });
  assertStringIncludes(
    xml,
    '<OtherIncomeTotalAmt referenceDocumentId="OtherIncomeTypeStatement4" referenceDocumentName="OtherIncomeTypeStatement">300</OtherIncomeTotalAmt>',
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

Deno.test("TY2025 Schedule 1 rejects bare disallowed business interest income", () => {
  const fields = { biz_interest_disallowed_add_back: 300 };
  assertThrows(
    () =>
      schedule1OtherIncomeStatement.build({}, {
        pending: { schedule1: fields },
      }),
    Error,
    "disallowed business interest needs a retained Form 8990 source",
  );
  assertThrows(
    () => schedule1.build(fields),
    Error,
    "disallowed business interest needs a retained Form 8990 source",
  );
});

Deno.test("TY2025 Schedule 1 gives each 1099-MISC box 8 payer a statement row", () => {
  const fields = {
    line8z_substitute_payments: 750,
    f1099m_box8_substitute_sources: [
      {
        payer_name: "Broker One",
        payer_tin: "123456789",
        recipient_tin: "987654321",
        amount: 300,
      },
      {
        payer_name: "Broker Two",
        payer_tin: "234567890",
        recipient_tin: "987654321",
        amount: 450,
      },
    ],
  };
  const statement = schedule1OtherIncomeStatement.build({}, {
    pending: { schedule1: fields },
  });
  assertEquals((statement.match(/<OtherIncomeAmt>/g) ?? []).length, 2);
  assertStringIncludes(statement, "Substitute payments 123456789");
  assertStringIncludes(statement, "Substitute payments 234567890");
  assertStringIncludes(statement, "<OtherIncomeAmt>300</OtherIncomeAmt>");
  assertStringIncludes(statement, "<OtherIncomeAmt>450</OtherIncomeAmt>");
  assertThrows(
    () =>
      schedule1OtherIncomeStatement.build({}, {
        pending: { schedule1: { ...fields, line8z_substitute_payments: 749 } },
      }),
    Error,
    "differ from 1099-MISC box 8 sources",
  );
  assertThrows(
    () =>
      schedule1OtherIncomeStatement.build({}, {
        pending: { schedule1: { line8z_substitute_payments: 750 } },
      }),
    Error,
    "differ from 1099-MISC box 8 sources",
  );
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

Deno.test("TY2025 nonbusiness Form 1099-NEC uses line 8j and rejects the old 8z scalar", () => {
  assertThrows(
    () => schedule1.build({ line8z_f1099nec_nonbusiness: 2_000 }),
    Error,
    "needs Schedule 1 line 8j source rows",
  );
  const xml = schedule1.build({
    line8j_f1099k_hobby_income: 100,
    f1099nec_nonbusiness_sources: [{
      payer_name: "Occasional Payer",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      description: "Occasional service",
      amount: 2_000,
    }],
  });
  assertStringIncludes(
    xml,
    "<ActivityNotForProfitIncmAmt>2100</ActivityNotForProfitIncmAmt>",
  );
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
  const fields = {
    line8z_k1_s_corp_tax_benefit_recovery: 400,
    k1_s_corp_box10_code_j_sources: [{
      corporation_ein: "123456789",
      source_document_reference: "2025 K-1 code J",
      recipient_tin: "111223333",
      recovery: 500,
      taxable_amount: 400,
      tax_benefit_workpaper_reference: "2024 benefit review",
      prior_year_tax_benefit_reviewed: true,
    }],
  };
  const statement = schedule1OtherIncomeStatement.build({}, {
    pending: { schedule1: fields },
  });
  assertStringIncludes(
    statement,
    "S corporation K-1 code J recovery 123456789",
  );
  assertStringIncludes(statement, "<OtherIncomeAmt>400</OtherIncomeAmt>");
});
