import { assertStringIncludes, assertThrows } from "@std/assert";
import { form8859 } from "./f8859.ts";

const fields = {
  f8859s: [{ carryforward_amount: 1_200 }],
  line1_carryforward: 1_200,
  line2_limit: 830,
  line3_allowed_credit: 830,
  line4_carryforward: 370,
};

Deno.test("Form 8859 XML preserves prior credit, tax limit, allowed credit, and next carryforward", () => {
  const xml = form8859.build(fields, {
    pending: { schedule3: { line6h_dc_homebuyer_credit: 830 } },
  });
  assertStringIncludes(xml, "<IRS8859>");
  assertStringIncludes(
    xml,
    "<DCHmByrCreditCarryforwardPYAmt>1200</DCHmByrCreditCarryforwardPYAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxLiabLmtFromCrLmtWrkshtAmt>830</TaxLiabLmtFromCrLmtWrkshtAmt>",
  );
  assertStringIncludes(
    xml,
    "<DCHmByrCurrentYearCreditAmt>830</DCHmByrCurrentYearCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<DCHmByrCreditCfwdNextYearAmt>370</DCHmByrCreditCfwdNextYearAmt>",
  );
});

Deno.test("Form 8859 XML rejects a source or Schedule 3 mismatch", () => {
  assertThrows(
    () =>
      form8859.build({
        ...fields,
        line3_allowed_credit: 900,
        line4_carryforward: 300,
      }, {
        pending: { schedule3: { line6h_dc_homebuyer_credit: 830 } },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8859.build({
        ...fields,
        line1_carryforward: 1_100,
      }, {
        pending: { schedule3: { line6h_dc_homebuyer_credit: 830 } },
      }),
    Error,
    "does not reconcile",
  );
});
