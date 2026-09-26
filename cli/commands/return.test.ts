import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { appendInput } from "../store/store.ts";
import { createReturnCommand, getReturnCommand } from "./return.ts";

Deno.test("createReturnCommand creates return.json with meta and inputs", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });

    const returnJson = JSON.parse(
      await Deno.readTextFile(`${tmpDir}/${result.returnId}/return.json`),
    );

    assertEquals(returnJson.meta.returnId, result.returnId);
    assertEquals(returnJson.meta.year, 2025);
    assertMatch(returnJson.meta.createdAt, /^\d{4}-\d{2}-\d{2}T/);
    assertEquals(typeof returnJson.inputs, "object");
    assertEquals(Array.isArray(returnJson.inputs), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("createReturnCommand returns a returnId string", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });
    assertEquals(typeof result.returnId, "string");
    assertEquals(result.returnId.length > 0, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

async function makeReturn(tmpDir: string): Promise<string> {
  const { returnId } = await createReturnCommand({
    year: 2025,
    baseDir: tmpDir,
  });
  return returnId;
}

Deno.test("getReturnCommand single W-2 returns line_1a = 85000", async () => {
  const tmpDir = await Deno.makeTempDir();
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
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand two W-2s returns line_1a = 130000", async () => {
  const tmpDir = await Deno.makeTempDir();
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
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand reports the standard deduction selected over Schedule A", async () => {
  const tmpDir = await Deno.makeTempDir();
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
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand empty return returns line_1a = 0", async () => {
  const tmpDir = await Deno.makeTempDir();
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
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand calculates above-threshold Schedule C QBI", async () => {
  const tmpDir = await Deno.makeTempDir();
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
      206_926.86,
    );
    assertEquals(
      Math.round(result.summary.line24_total_tax * 100) / 100,
      44_854.25,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand nonexistent returnId throws descriptive error", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => getReturnCommand({ returnId: "nonexistent-id", baseDir: tmpDir }),
      Error,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
