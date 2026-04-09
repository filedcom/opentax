/**
 * XSD Validation Tests — verifies generated MeF XML conforms to IRS 2025v3.0 schemas.
 *
 * Runs xmllint against the IRS XSD files in .research/docs/IMF_Series_2025v3.0/.
 * Any structural issue (wrong element order, missing required field, bad namespace,
 * type mismatch) surfaces as a test failure before it can reach the IRS.
 *
 * Requires: xmllint (pre-installed on macOS/Linux via libxml2)
 * Permissions: --allow-read --allow-write --allow-run=xmllint
 */

import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { f1040_2025 } from "../2025/index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { FilingStatus } from "../nodes/types.ts";
import { SS_WAGE_BASE_2025 } from "../nodes/config/2025.ts";
import { DependentRelationship } from "../nodes/inputs/general/index.ts";

// ── XSD paths ────────────────────────────────────────────────────────────────

const XSD_RETURN1040 = new URL(
  "../../../.research/docs/IMF_Series_2025v3.0/1040x_2025v3.0/1040x_Schema_2025v3.0/2025v3.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

// Skip XSD tests when the IRS schema files are not present locally.
let xsdAvailable = false;
try {
  Deno.statSync(XSD_RETURN1040);
  xsdAvailable = true;
} catch {
  // .research/docs not checked in; skip on machines without the IRS schema bundle
}

// ── Shared setup ─────────────────────────────────────────────────────────────

const ctx = { taxYear: 2025 };
const plan = buildExecutionPlan(registry);

function runReturn(inputs: Record<string, unknown>): ExecuteResult {
  return execute(plan, registry, inputs, ctx);
}

/** Generate MeF XML from an execution result. */
function buildXml(result: ExecuteResult): string {
  const pending = f1040_2025.buildPending(result.pending) as Record<string, unknown>;
  const f1040 = (result.pending["f1040"] ?? {}) as Record<string, unknown>;
  const filer = extractFilerIdentity(f1040);
  return f1040_2025.buildMefXml(pending, filer);
}

/**
 * Write XML to a temp file, validate with xmllint, clean up.
 * Returns stderr output (empty string on success).
 */
async function validateXml(xml: string): Promise<{ success: boolean; stderr: string }> {
  const tmpFile = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpFile, xml);
    const cmd = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_RETURN1040, tmpFile],
      stderr: "piped",
      stdout: "null",
    });
    const { code, stderr } = await cmd.output();
    return {
      success: code === 0,
      stderr: new TextDecoder().decode(stderr).trim(),
    };
  } finally {
    await Deno.remove(tmpFile).catch(() => {});
  }
}

// ── Input helpers (mirrors scenarios.test.ts) ────────────────────────────────

// Use dashes-free SSNs (IRS SSNType: [0-9]{9}) and a valid address for XSD compliance.
const BASE_IDENTITY = {
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1985-06-15",
  address_line1: "123 Main St",
  address_city: "Springfield",
  address_state: "IL",
  address_zip: "62701",
};

function singleGeneral() {
  return { ...BASE_IDENTITY, filing_status: FilingStatus.Single };
}

function mfjGeneral() {
  return {
    ...BASE_IDENTITY,
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Spouse",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "444556666",
    spouse_dob: "1987-03-10",
  };
}

function hohGeneral() {
  return { ...BASE_IDENTITY, filing_status: FilingStatus.HOH };
}

function w2Item(wages: number, withheld: number) {
  const ssWages = Math.min(wages, SS_WAGE_BASE_2025);
  return {
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: ssWages,
    box4_ss_withheld: ssWages * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
    employer_ein: "12-3456789",
    employer_name: "ACME Corp",
    box12_entries: [],
  };
}

// ── XSD Validation Tests ─────────────────────────────────────────────────────

Deno.test({ name: "XSD: Single W-2 $75K — conforms to Return1040.xsd", ignore: !xsdAvailable }, async () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(75_000, 11_000)],
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({ name: "XSD: MFJ dual W-2s $150K — conforms to Return1040.xsd", ignore: !xsdAvailable }, async () => {
  const result = runReturn({
    general: mfjGeneral(),
    w2: [
      w2Item(85_000, 10_200),
      { ...w2Item(65_000, 7_800), employer_ein: "98-7654321", employer_name: "Beta Inc" },
    ],
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({ name: "XSD: Single self-employed Schedule C $80K — conforms to Return1040.xsd", ignore: !xsdAvailable }, async () => {
  const result = runReturn({
    general: singleGeneral(),
    schedule_c: [{
      line_a_principal_business: "Consulting",
      line_b_business_code: "541600",
      line_c_business_name: "Test LLC",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 80_000,
    }],
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({ name: "XSD: Single itemized deductions Schedule A $33K — conforms to Return1040.xsd", ignore: !xsdAvailable }, async () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(200_000, 40_000)],
    schedule_a: {
      line_5a_state_income_tax: 10_000,
      line_8a_mortgage_interest_1098: 18_000,
      line_11_cash_contributions: 5_000,
    },
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({ name: "XSD: Single AMT via PAB interest $100K — conforms to Return1040.xsd", ignore: !xsdAvailable }, async () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(100_000, 18_000)],
    f1099int: [{
      payer_name: "Muni Bond Fund",
      box8: 100_000,
      box9: 100_000,
    }],
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({ name: "XSD: HOH EITC 2 qualifying children $32K — conforms to Return1040.xsd", ignore: !xsdAvailable }, async () => {
  const result = runReturn({
    general: {
      ...hohGeneral(),
      dependents: [
        {
          first_name: "Child1",
          last_name: "Taxpayer",
          dob: "2017-06-15",
          relationship: DependentRelationship.Son,
          months_in_home: 12,
          ssn: "111-22-3334",
        },
        {
          first_name: "Child2",
          last_name: "Taxpayer",
          dob: "2015-03-20",
          relationship: DependentRelationship.Daughter,
          months_in_home: 12,
          ssn: "111-22-3335",
        },
      ],
    },
    w2: [w2Item(32_000, 3_500)],
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});
