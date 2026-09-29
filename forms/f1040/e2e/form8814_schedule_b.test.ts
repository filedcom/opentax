import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { type FilerIdentity, FilingStatus } from "../2025/mef/types.ts";
import { buildPending } from "../2025/mef/pending.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TEST TAXPAYER",
  nameControl: "TEST",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test("Form 8814 and a below-threshold 1099-DIV trigger Schedule B once", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    f1099div: [{
      payerName: "Fund A",
      isNominee: false,
      box11: false,
      box1a: 1_200,
    }],
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
      interest_income: 1_850,
      dividend_income: 1_850,
      qualified_dividends: 1_850,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line3b_ordinary_dividends, 1_700);
  assertEquals(pending.schedule_b?.print_line6_total, 1_700);
  assertEquals(pending.schedule_b?.print_div_payer_2, "Form 8814");
  const xml = buildMefXml(pending, filer);
  assertStringIncludes(xml, "<IRS1040ScheduleB");
  assertStringIncludes(
    xml,
    "<TotalOrdinaryDividendsAmt>1700</TotalOrdinaryDividendsAmt>",
  );
  assertStringIncludes(xml, "<IRS8814");
  const xsdPath = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsdPath);
  } catch {
    return;
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Form 8814 investment income cannot enter the limited Form 4952 export route", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    form4952: {
      investment_interest_expense: 600,
      other_investment_property_gross_income: 900,
      other_investment_property_qualified_dividends: 200,
      amt_refigure: {
        prior_year_disallowed_interest: 0,
        interest_on_private_activity_bonds: 0,
        other_gross_income_adjustment: 0,
        qualified_dividends_adjustment: 0,
        net_disposition_gain_adjustment: 0,
        net_capital_gain_adjustment: 0,
        investment_expenses_adjustment: 0,
      },
    },
    f1099int: [{
      payer_name: "Savings Bank",
      box1: 100,
      investment_property_for_form4952: true,
    }],
    f1099div: [{
      payerName: "Fund B",
      isNominee: false,
      box11: false,
      box1a: 200,
      box1b: 50,
      box2a: 25,
      investment_property_for_form4952: true,
    }],
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
      interest_income: 1_850,
      dividend_income: 1_850,
      qualified_dividends: 1_850,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.form4952?.line4a, 2_200);
  assertEquals(pending.form4952?.line4b, 750);
  assertEquals(pending.form4952?.line4d, 25);
  assertEquals(pending.form4952?.line4e, 25);
  assertEquals(pending.form4952?.line6, 1_450);
  assertEquals(pending.form4952?.line8, 600);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 4952 combined path needs 1099 interest and dividend sources",
  );
});
