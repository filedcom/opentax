/**
 * XSD Validation Tests — validates generated MeF XML against the IRS
 * 2025v3.0 Return1040.xsd schema using xmllint as a subprocess.
 *
 * Purpose: catch namespace errors, element ordering violations, and type
 * mismatches before IRS submission. All scenarios must produce XML that
 * xmllint accepts with exit code 0.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { registry } from "../registry.ts";
import { buildMefXml } from "./builder.ts";
import type { MefFormsPending } from "./types.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { SS_WAGE_BASE_2025 } from "../../nodes/config/2025.ts";

// ── Constants ────────────────────────────────────────────────────────────────

const XSD_PATH = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v3.0/1040x_2025v3.0/1040x_Schema_2025v3.0/2025v3.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

// Skip XSD tests when the IRS schema files are not present locally.
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // .research/docs not checked in; skip on machines without the IRS schema bundle
}

// ── Shared helpers ───────────────────────────────────────────────────────────

const plan = buildExecutionPlan(registry);

function runReturn(inputs: Record<string, unknown>) {
  return execute(plan, registry, inputs, { taxYear: 2025 });
}

function singleGeneral() {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
  };
}

/** Build a W-2 item, capping SS wages at the 2025 wage base. */
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

/**
 * Validates XML against the IRS Return1040.xsd via xmllint subprocess.
 * Writes to a temp file, runs xmllint --noout --schema, then cleans up.
 * Asserts exit code 0 — any schema violation surfaces as a test failure.
 */
async function validateXsd(xml: string, label: string): Promise<void> {
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  await Deno.writeTextFile(tmpPath, xml);

  const cmd = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", XSD_PATH, tmpPath],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();

  const stderr = new TextDecoder().decode(output.stderr);
  await Deno.remove(tmpPath);

  assertEquals(
    output.code,
    0,
    `${label} XSD validation failed:\n${stderr}`,
  );
}

// ── Scenario 1: Single W-2 $75K ─────────────────────────────────────────────

Deno.test(
  {
    name: "XSD: Single W-2 $75K validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      w2: [w2Item(75_000, 11_000)],
    });
    const xml = buildMefXml(result.pending as MefFormsPending);
    await validateXsd(xml, "Single W-2 $75K");
  },
);

// ── Scenario 2: Self-employed Schedule C $80K ───────────────────────────────

Deno.test(
  {
    name: "XSD: Self-employed Schedule C $80K validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      schedule_c: [
        {
          line_a_principal_business: "Consulting",
          line_b_business_code: "541600",
          line_c_business_name: "Test LLC",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: 80_000,
        },
      ],
    });
    const xml = buildMefXml(result.pending as MefFormsPending);
    await validateXsd(xml, "Self-employed Schedule C $80K");
  },
);

// ── Scenario 3: Itemized deductions Schedule A ($200K income, $33K deductions)

Deno.test(
  {
    name: "XSD: Itemized deductions Schedule A validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      w2: [w2Item(200_000, 40_000)],
      schedule_a: {
        line_5a_state_income_tax: 10_000,
        line_8a_mortgage_interest_1098: 18_000,
        line_11_cash_contributions: 5_000,
      },
    });
    const xml = buildMefXml(result.pending as MefFormsPending);
    await validateXsd(xml, "Itemized deductions Schedule A");
  },
);

// ── returnVersion check ──────────────────────────────────────────────────────

Deno.test("XSD: returnVersion matches 2025v3.0", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(50_000, 8_000)],
  });
  const xml = buildMefXml(result.pending as MefFormsPending);
  assertStringIncludes(xml, 'returnVersion="2025v3.0"');
});
