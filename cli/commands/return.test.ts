import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../scripts/support/sys.ts";
import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { appendInput } from "../store/store.ts";
import { createReturnCommand, getReturnCommand } from "./return.ts";
import { formAddCommand } from "./form.ts";

test("createReturnCommand creates return.json with meta and inputs", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });

    const returnJson = JSON.parse(
      await fs.readFile(`${tmpDir}/${result.returnId}/return.json`, "utf8"),
    );

    assertEquals(returnJson.meta.returnId, result.returnId);
    assertEquals(returnJson.meta.year, 2025);
    assertMatch(returnJson.meta.createdAt, /^\d{4}-\d{2}-\d{2}T/);
    assertEquals(typeof returnJson.inputs, "object");
    assertEquals(Array.isArray(returnJson.inputs), false);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

test("createReturnCommand returns a returnId string", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });
    assertEquals(typeof result.returnId, "string");
    assertEquals(result.returnId.length > 0, true);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

async function makeReturn(tmpDir: string): Promise<string> {
  const { returnId } = await createReturnCommand({
    year: 2025,
    baseDir: tmpDir,
  });
  return returnId;
}

test("getReturnCommand single W-2 returns line_1a = 85000", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 0,
    });

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });

    assertEquals(result.returnId, returnId);
    assertEquals(result.year, 2025);
    assertEquals(result.summary.line1z_total_wages, 85000);
    assertEquals(result.summary.line9_total_income, 85000);
    assertEquals(Array.isArray(result.forms), true);
    assertEquals(Array.isArray(result.warnings), true);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

test("getReturnCommand two W-2s returns line_1a = 130000", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 0,
    });
    await appendInput(returnPath, "w2", {
      box1_wages: 45000,
      box2_fed_withheld: 0,
    });

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });
    assertEquals(result.summary.line1z_total_wages, 130000);
    assertEquals(result.summary.line9_total_income, 130000);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

test("CLI return reports the Form 4952 limit and carryforward", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    for (
      const [nodeType, data] of [
        ["general", { filing_status: "single" }],
        ["w2", { box1_wages: 300_000, box2_fed_withheld: 60_000 }],
        ["f1099int", {
          payer_name: "Example Bank",
          box1: 2_000,
          investment_property_for_form4952: true,
        }],
        ["schedule_a", { line_8a_mortgage_interest_1098: 20_000 }],
        ["form4952", {
          investment_interest_expense: 50_000,
          amt_refigure: {
            prior_year_disallowed_interest: 0,
            interest_on_private_activity_bonds: 0,
            other_gross_income_adjustment: 0,
            qualified_dividends_adjustment: 0,
            net_disposition_gain_adjustment: 0,
            net_capital_gain_adjustment: 0,
            investment_expenses_adjustment: 0,
          },
        }],
      ] as const
    ) {
      await formAddCommand({
        returnId,
        nodeType,
        dataJson: JSON.stringify(data),
        baseDir: tmpDir,
      });
    }
    const result = await getReturnCommand({ returnId, baseDir: tmpDir });
    assertEquals(result.lines.line12c_deduction_total, 22_000);
    assertEquals(result.carryforwards.investment_interest_excess_4952, 48_000);
    assertEquals(result.forms.includes("form4952"), true);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

test("getReturnCommand reports the standard deduction selected over Schedule A", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "general", { filing_status: "mfj" });
    await appendInput(returnPath, "w2", {
      box1_wages: 100_000,
      box2_fed_withheld: 15_000,
    });
    await appendInput(returnPath, "schedule_a", {
      line_8a_mortgage_interest_1098: 18_349,
    });

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });
    assertEquals(result.lines.line12c_deduction_total, 31_500);
    assertEquals(result.summary.line15_taxable_income, 68_500);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

test("getReturnCommand empty return returns line_1a = 0", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });

    assertEquals(result.returnId, returnId);
    assertEquals(result.year, 2025);
    assertEquals(result.summary.line1z_total_wages, 0);
    assertEquals(result.summary.line9_total_income, 0);
    assertEquals(result.summary.line24_total_tax, 0);
    assertEquals(result.forms.length >= 0, true);
    assertEquals(result.warnings.length >= 0, true);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

test("getReturnCommand calculates above-threshold Schedule C QBI", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "general", {
      filing_status: "single",
      taxpayer_dob: "1985-06-01",
    });
    await appendInput(returnPath, "w2", {
      box1_wages: 180_000,
      box2_fed_withheld: 30_000,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.20,
      box5_medicare_wages: 180_000,
      box6_medicare_withheld: 2_610,
    });
    await appendInput(returnPath, "schedule_c", {
      line_a_principal_business: "Consulting",
      line_b_business_code: "541990",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 50_000,
    });

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });

    assertEquals(result.forms.includes("form8995a"), true);
    assertEquals(
      Math.round(result.summary.line15_taxable_income * 100) / 100,
      206_926,
    );
    assertEquals(
      Math.round(result.summary.line24_total_tax * 100) / 100,
      44_854,
    );
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

test("getReturnCommand nonexistent returnId throws descriptive error", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    await assertRejects(
      () => getReturnCommand({ returnId: "nonexistent-id", baseDir: tmpDir }),
      Error,
    );
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

// 2025 Schedule 1-A instructions, Part V: the senior deduction needs a valid
// SSN, one valid for employment and issued before the return's due date.
test("getReturnCommand names the SSN answers a 65+ spouse's senior deduction needs", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    const general = {
      filing_status: "mfj",
      taxpayer_ssn: "400-45-6789",
      taxpayer_dob: "1961-05-10",
      spouse_ssn: "400-45-6788",
      spouse_dob: "1960-07-07",
      spouse_ssn_valid_for_employment: true,
    };
    await appendInput(returnPath, "general", general);
    await appendInput(returnPath, "w2", {
      box1_wages: 60000,
      box2_fed_withheld: 0,
    });

    const missing = await getReturnCommand({ returnId, baseDir: tmpDir });
    assertEquals(
      missing.warnings.filter((w) => w.startsWith("Schedule 1-A senior")),
      [
        "Schedule 1-A senior deduction not claimed for the spouse: Part V needs an SSN valid for employment and issued before the return's due date. If so, set spouse_ssn_valid_for_employment and spouse_ssn_issued_before_due_date to true on general.",
      ],
    );
    assertEquals(missing.lines.schedule1a_line37_senior_deduction, undefined);

    const json = JSON.parse(
      await fs.readFile(`${returnPath}/return.json`, "utf8"),
    );
    json.inputs.general[0].fields.spouse_ssn_issued_before_due_date = true;
    await fs.writeFile(`${returnPath}/return.json`, JSON.stringify(json));

    const claimed = await getReturnCommand({ returnId, baseDir: tmpDir });
    assertEquals(
      claimed.warnings.some((w) => w.startsWith("Schedule 1-A senior")),
      false,
    );
    assertEquals(claimed.lines.schedule1a_line37_senior_deduction, 6000);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

// 2025 Schedule R, Part I (boxes 2, 4, 5, 6, 9) and Part II: a filer under 65
// retired on permanent and total disability with taxable disability income.
test("getReturnCommand points disability income under 65 to Schedule R", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "general", {
      filing_status: "single",
      taxpayer_ssn: "400-45-6789",
      taxpayer_dob: "1975-10-06",
    });
    await appendInput(returnPath, "f1099r", {
      payer_name: "Plan",
      payer_ein: "123456789",
      box1_gross_distribution: 11000,
      box2a_taxable_amount: 11000,
      box7_distribution_code: "3",
      disability_flag: true,
      disability_as_wages: true,
    });
    const result = await getReturnCommand({ returnId, baseDir: tmpDir });
    const hints = result.warnings.filter((w) => w.includes("Schedule R"));
    assertEquals(hints.length, 1);
    assertMatch(hints[0], /taxpayer_disability_evidence/);
    assertMatch(hints[0], /physician_statement "prior_year"/);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

// A failed node never sends its outputs on, so the lines after it read zero:
// a general failure leaves no filing status for the tax, and total tax shows 0.
test("getReturnCommand marks the summary incomplete when a node fails", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "general", {
      filing_status: "single",
      taxpayer_ssn: "400-45-6789",
      spouse_can_be_claimed_as_dependent: true,
    });
    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 9000,
    });
    const result = await getReturnCommand({ returnId, baseDir: tmpDir });
    assertEquals(result.complete, false);
    assertEquals(result.failedNodes.includes("general"), true);
    assertMatch(result.warnings[0], /^\[SUMMARY_INCOMPLETE\]/);
    assertMatch(result.warnings[0], /general/);
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});

test("getReturnCommand marks a return without node failures complete", async () => {
  const tmpDir = await sys.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "general", {
      filing_status: "single",
      taxpayer_ssn: "400-45-6789",
      digital_assets: false,
    });
    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 9000,
      employee_ssn: "400456789",
    });
    const result = await getReturnCommand({ returnId, baseDir: tmpDir });
    assertEquals(result.failedNodes, []);
    assertEquals(result.complete, true);
    assertEquals(
      result.warnings.some((w) => w.startsWith("[SUMMARY_INCOMPLETE]")),
      false,
    );
  } finally {
    await sys.remove(tmpDir, { recursive: true });
  }
});
