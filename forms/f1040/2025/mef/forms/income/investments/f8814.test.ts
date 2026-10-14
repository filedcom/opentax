import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm8814,
  type F8814Item,
} from "../../../../../nodes/inputs/income/investments/f8814/index.ts";
import { form8814 } from "./f8814.ts";
import type { FilerIdentity } from "../../../types.ts";

const child: F8814Item = {
  child_name: "Alex Rivera",
  child_name_control: "RIVE",
  child_ssn: "987654321",
  child_age_eligible: true,
  child_required_to_file: true,
  child_income_only_permitted_types: true,
  child_no_joint_return: true,
  child_no_estimated_payments: true,
  child_no_withholding: true,
  parent_eligible_to_elect: true,
  interest_income: 3700,
};
const filer = { primarySSN: "123456789" } as FilerIdentity;
const reviewed = (item: F8814Item): F8814Item => ({
  ...item,
  source_review: {
    source_document_reference: "reviewed-child-income-packet",
    tax_year: 2025,
    child_ssn: item.child_ssn,
    electing_parent_ssn: "123456789",
    eligibility_reviewed: true,
    income: {
      interest_income: item.interest_income,
      tax_exempt_interest: item.tax_exempt_interest,
      private_activity_bond_interest: item.private_activity_bond_interest,
      dividend_income: item.dividend_income,
      dividend_nominee_distribution: item.dividend_nominee_distribution,
      qualified_dividends: item.qualified_dividends,
      capital_gain_distributions: item.capital_gain_distributions,
      capital_gain_nominee_distribution: item.capital_gain_nominee_distribution,
      alaska_pfd: item.alaska_pfd,
      nontaxable_social_security: item.nontaxable_social_security,
    },
    interest_adjustments: item.interest_adjustments,
  },
});

Deno.test("Form 8814 MeF: line 12, line 14, and line 15 follow 2025 form", () => {
  const xml = form8814.build({ items: [calculateForm8814(reviewed(child))] }, { filer });
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
      calculateForm8814(reviewed(child)),
      calculateForm8814(reviewed({ ...child, child_ssn: "111223333" })),
    ],
  }, { filer });
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], "<MultipleForm8814Ind>X</MultipleForm8814Ind>");
  assertStringIncludes(xml[1], "<MultipleForm8814Ind>X</MultipleForm8814Ind>");
});

Deno.test("Form 8814 MeF requires reviewed child income and electing-parent ownership", () => {
  assertThrows(
    () => form8814.build({ items: [calculateForm8814(child)] }, { filer }),
    Error,
    "reviewed child-income source",
  );
  assertThrows(
    () => form8814.build({
      items: [calculateForm8814(reviewed({ ...child, interest_income: 3701 }))],
    }, { filer: { ...filer, primarySSN: "111223333" } }),
    Error,
    "child/parent owner differs",
  );
  const source = reviewed(child);
  assertThrows(
    () => form8814.build({
      items: [calculateForm8814({
        ...source,
        source_review: {
          ...source.source_review!,
          income: { interest_income: 3699 },
        },
      })],
    }, { filer }),
    Error,
    "reviewed child income differs",
  );
});
