import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  calculateForm8814,
  type F8814Item,
} from "../../../nodes/inputs/f8814/index.ts";
import { form8814 } from "./f8814.ts";

const child: F8814Item = {
  child_name: "Alex Rivera",
  child_name_control: "RIVE",
  child_ssn: "123456789",
  child_age_eligible: true,
  child_required_to_file: true,
  child_income_only_permitted_types: true,
  child_no_joint_return: true,
  child_no_estimated_payments: true,
  child_no_withholding: true,
  parent_eligible_to_elect: true,
  interest_income: 3700,
};

Deno.test("Form 8814 MeF: line 12, line 14, and line 15 follow 2025 form", () => {
  const xml = form8814.build({ items: [calculateForm8814(child)] });
  assertEquals(xml.length, 1);
  assertStringIncludes(
    xml[0],
    "<ChildNetAdjustedIncomeAmt>1000</ChildNetAdjustedIncomeAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<ChildInterestAndDivTaxBasisAmt>2350</ChildInterestAndDivTaxBasisAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<ChildInterestAndDividendTaxAmt>135</ChildInterestAndDividendTaxAmt>",
  );
  assertEquals(xml[0].includes("MultipleForm8814Ind"), false);
});

Deno.test("Form 8814 MeF: multiple children emit separate documents with line C", () => {
  const xml = form8814.build({
    items: [
      calculateForm8814(child),
      calculateForm8814({ ...child, child_ssn: "987654321" }),
    ],
  });
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], "<MultipleForm8814Ind>X</MultipleForm8814Ind>");
  assertStringIncludes(xml[1], "<MultipleForm8814Ind>X</MultipleForm8814Ind>");
});
