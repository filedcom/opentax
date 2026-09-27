import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { inputNodes } from "../inputs.ts";
import { registry } from "../registry.ts";
import { buildMefXml } from "./builder.ts";
import type { MefFormsPending } from "./types.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

Deno.test("Schedule B Part III taxpayer input reaches the filed return", () => {
  assertEquals(
    inputNodes.some((entry) => entry.node.nodeType === "schedule_b_part_iii"),
    true,
  );
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      schedule_b_part_iii: {
        foreign_accounts_question: true,
        fincen_form114_required: true,
        foreign_countries: [{ irs_code: "CA", name: "Canada" }],
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.foreign_country_codes, ["CA"]);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS1040ScheduleB ");
  assertStringIncludes(xml, "<FinCENForm114Ind>true</FinCENForm114Ind>");
  assertStringIncludes(xml, "<ForeignCountryCd>CA</ForeignCountryCd>");
});

Deno.test("Form 8814 child facts force Schedule B foreign answers and literals", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f8814: [{
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
        interest_income: 3000,
        child_had_foreign_account: true,
        child_foreign_trust_part_iii_event: true,
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        fincen_form114_required: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.foreign_accounts_question, true);
  assertEquals(result.pending.schedule_b?.foreign_trust_question, true);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<Form8814LiteralCd>FORM8814</Form8814LiteralCd>");
  assertStringIncludes(
    xml,
    "<TrustFormLiteralCd>FORM8814</TrustFormLiteralCd>",
  );
});

Deno.test("1099-INT adjustments reach gross Schedule B rows and MeF deductions", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f1099int: [{
        payer_name: "Bond Bank",
        box1: 2_000,
        nominee_interest: 100,
        accrued_interest_paid: 50,
        non_taxable_oid_adjustment: 75,
        box11: 125,
        elect_bond_premium_amortization: true,
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.print_line2_total, 1_650);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<InterestAmt>2000</InterestAmt>");
  assertStringIncludes(
    xml,
    '<NomineeInterestAmt nomineeInterestLiteralCd="NOMINEE DISTRIBUTION">100</NomineeInterestAmt>',
  );
  assertStringIncludes(
    xml,
    '<AccruedInterestAmt accruedInterestLiteralCd="ACCRUED INTEREST">50</AccruedInterestAmt>',
  );
  assertStringIncludes(
    xml,
    '<OriginalIssueDiscountAdjAmt originalIssueDiscountAdjLitCd="OID ADJUSTMENT">75</OriginalIssueDiscountAdjAmt>',
  );
  assertStringIncludes(
    xml,
    '<AmortizableBondPremAdjAmt amortizableBondPremiumAdjLitCd="ABP ADJUSTMENT">125</AmortizableBondPremAdjAmt>',
  );
  assertStringIncludes(
    xml,
    "<TaxableInterestSubtotalAmt>1650</TaxableInterestSubtotalAmt>",
  );
});
