import { setDefaultTimeout, test } from "bun:test";
import { existsSync } from "node:fs";
import { fileURLToPath as fromFileUrl } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import * as sys from "../../../../scripts/support/sys.ts";
import { catalog } from "../../../../catalog.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../../cli/commands/export.ts";
import { normalizeAllPending } from "../../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { FilingStatus } from "../../nodes/types.ts";

const SCHEMA = fromFileUrl(
  new URL(
    "../../../../irs/mef/2026v1.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ),
);

// Each case runs a full return, MeF build and xmllint.
setDefaultTimeout(60_000);

const TAXPAYER_SSN = "400001037";
const SPOUSE_SSN = "400001038";

function general(filingStatus: FilingStatus): Record<string, unknown> {
  return {
    filing_status: filingStatus,
    taxpayer_first_name: "Sam",
    taxpayer_last_name: "Wheat",
    taxpayer_ssn: TAXPAYER_SSN,
    taxpayer_dob: "1980-02-07",
    taxpayer_prior_year_agi: 0,
    address_line1: "2525 Main Street",
    address_city: "Round Rock",
    address_state: "TX",
    address_zip: "78680",
    digital_assets: false,
    ats_test_submission: true,
    ...(filingStatus === FilingStatus.MFJ
      ? {
        spouse_first_name: "Pat",
        spouse_last_name: "Wheat",
        spouse_ssn: SPOUSE_SSN,
        spouse_dob: "1981-03-08",
        spouse_prior_year_agi: 0,
      }
      : {}),
  };
}

/** A W-2 whose withholding boxes follow the 2026 FICA rates and wage base. */
function w2(wages: number, withheld: number): Record<string, unknown> {
  const ssWages = Math.min(wages, 184_500);
  return {
    source_document_reference: `w2-${wages}`,
    employer_name: "Doughnut Castle",
    employer_ein: "000000057",
    employee_ssn: TAXPAYER_SSN,
    employer_address_line1: "1518 North Mays Lane",
    employer_address_city: "Round Rock",
    employer_address_state: "TX",
    employer_address_zip: "78664",
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: ssWages,
    box4_ss_withheld: Math.round(ssWages * 0.062),
    box5_medicare_wages: wages,
    box6_medicare_withheld: Math.round(
      wages * 0.0145 + Math.max(0, wages - 200_000) * 0.009,
    ),
  };
}

function run(inputs: Record<string, unknown>) {
  const def = catalog["f1040:2026"];
  const input = signed(inputs);
  const g = input.general as Record<string, unknown>;
  g.taxpayer_signature_date = "2027-02-01";
  if (g.spouse_signature_date) g.spouse_signature_date = "2027-02-01";
  const result = def.executeReturn(input);
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  const xml = def.buildMefXml(pending, filer);
  // buildMefXml carries no transmission timestamp, so the receipt-date
  // header rules IND-002 and IND-689-01 cannot be evaluated here.
  const rejects = businessRuleReport(pending, filer, emittedValidationScope(xml))
    .entries.filter((entry) => entry.severity !== "alert")
    .map((entry) => entry.ruleNumber)
    .filter((rule) => rule !== "IND-002" && rule !== "IND-689-01");
  return { result, f: pending.f1040 ?? {}, xml, rejects };
}

async function assertSchemaValid(xml: string): Promise<void> {
  if (!existsSync(SCHEMA)) return;
  const dir = await sys.makeTempDir();
  const path = `${dir}/return.xml`;
  await sys.writeText(path, xml);
  const validated = await new sys.Command("xmllint", {
    args: ["--noout", "--schema", SCHEMA, path],
    stdout: "piped",
    stderr: "piped",
  }).output();
  await sys.remove(dir, { recursive: true });
  assertEquals(
    validated.code,
    0,
    new TextDecoder().decode(validated.stderr),
  );
}

// MFJ, two educators spending $400 each: $700 at the $350 per-educator cap
// (Rev. Proc. 2025-32 §4.12). One Form 1098-E with $3,000 interest is capped
// at $2,500 (IRC §221(b)(1)); MAGI $119,300 is under the $175,000 joint
// phaseout start (Rev. Proc. 2025-32 §4.29). AGI $120,000 - $700 - $2,500 =
// $116,800; line 15 is $116,800 - $32,200 = $84,600; line 16 at the
// $84,600-$84,650 midpoint: $2,480 + 12% x ($84,625 - $24,800) = $9,659.
test("TY2026 educator expenses and student loan interest reach AGI and Schedule 1", async () => {
  const { result, f, xml, rejects } = run({
    general: general(FilingStatus.MFJ),
    w2: [w2(120_000, 12_000)],
    educator_expenses: {
      educator1_expenses: 400,
      educator2_expenses: 400,
      filing_status: FilingStatus.MFJ,
    },
    f1098e: [{
      box1_student_loan_interest: 3_000,
      lender_name: "Example Student Lender",
      lender_tin: "00-0000058",
      borrower_tin: TAXPAYER_SSN,
      borrower_name: "Sam Wheat",
      account_number: "SL-1",
      source_document_reference: "2026 Form 1098-E",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(f.line10_adjustments, 3_200);
  assertEquals(f.line11_agi, 116_800);
  assertEquals(f.line15_taxable_income, 84_600);
  assertEquals(f.line16_income_tax, 9_659);
  assertStringIncludes(xml, "<EducatorExpensesAmt>700<");
  assertStringIncludes(xml, "<StudentLoanInterestDedAmt>2500<");
  assertEquals(rejects, []);
  await assertSchemaValid(xml);
});
