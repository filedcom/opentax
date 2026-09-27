import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { ExclusionType } from "../../../nodes/intermediate/forms/form982/index.ts";
import { registry } from "../../registry.ts";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // IRS schema bundle is optional in CI.
}

const filer: FilerIdentity = {
  fullName: "Test Taxpayer",
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test("Form 982 QPRI cap must agree with the return filing status", () => {
  assertThrows(
    () =>
      buildMefXml({
        form982: {
          line2_excluded_cod: 100_000,
          exclusion_type: ExclusionType.Qpri,
          discharge_date: "2025-06-15",
          qpri_mfs: true,
          qpri_total_loan_balance_before_discharge: 100_000,
          qpri_qualified_loan_balance_before_discharge: 100_000,
          qpri_main_home_security_confirmed: true,
          qpri_discharge_reason: "financial_condition",
          qpri_discharge_reason_source: "Lender workout letter",
          principal_residence_retained: false,
        },
      }, filer),
    Error,
    "filing-status cap conflicts with the return",
  );
});

Deno.test({
  name:
    "XSD: 1099-C QPRI exclusion reaches Form 982 and Schedule 1 through graph",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    f1099c: [{
      creditor_name: "Mortgage Lender",
      box1_date: "2025-06-15",
      box2_cod_amount: 900_000,
      routing: "excluded",
      exclusion_type: ExclusionType.Qpri,
      qpri_mfs: false,
      qpri_actual_discharge_date: "2025-06-15",
      qpri_discharged_principal_amount: 900_000,
      qpri_total_loan_balance_before_discharge: 900_000,
      qpri_qualified_loan_balance_before_discharge: 900_000,
      qpri_main_home_security_confirmed: true,
      qpri_discharge_reason: "financial_condition",
      qpri_discharge_reason_source: "Lender workout letter",
      principal_residence_retained: false,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line11_agi, 150_000);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<TotalDischargedIndebtednessAmt>750000</TotalDischargedIndebtednessAmt>",
  );
  assertStringIncludes(
    xml,
    "<DebtCancellationAmt>150000</DebtCancellationAmt>",
  );
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});
