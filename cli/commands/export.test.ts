import {
  assertEquals,
  assertMatch,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { exists } from "@std/fs";
import { appendInput } from "../store/store.ts";
import { createReturnCommand } from "./return.ts";
import {
  ExportExecutionError,
  exportMefCommand,
  exportPdfCommand,
  ExportRejectedError,
} from "./export.ts";
import { FilingStatus } from "../../forms/f1040/nodes/types.ts";

async function makeReturn(tmpDir: string): Promise<string> {
  const { returnId } = await createReturnCommand({
    year: 2025,
    baseDir: tmpDir,
  });
  return returnId;
}

function w2Data(box1Wages: number, box2FedWithheld: number) {
  return {
    employer_ein: "12-3456789",
    employer_name: "ACME CORP",
    employer_address_line1: "500 Market St",
    employer_address_city: "Springfield",
    employer_address_state: "IL",
    employer_address_zip: "62701",
    box1_wages: box1Wages,
    box2_fed_withheld: box2FedWithheld,
  };
}

Deno.test("exportMefCommand blocks empty finalized return with --force", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir, force: true }),
      ExportExecutionError,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand with W-2 includes wages in f1040 XML (force)", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "general", {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-01",
      address_line1: "123 Main St",
      address_city: "Springfield",
      address_state: "IL",
      address_zip: "62701",
    });
    await appendInput(returnPath, "f2441", {});

    await appendInput(returnPath, "w2", w2Data(85000, 10000));

    const xml = await exportMefCommand({
      returnId,
      baseDir: tmpDir,
      force: true,
    });
    assertStringIncludes(xml, "<IRS1040");
    assertStringIncludes(xml, "<TotalIncomeAmt>85000</TotalIncomeAmt>");
    assertStringIncludes(
      xml,
      "<AdjustedGrossIncomeAmt>85000</AdjustedGrossIncomeAmt>",
    );
    assertStringIncludes(xml, "<TaxableIncomeAmt>");
    assertStringIncludes(xml, "<TotalTaxAmt>");
    assertStringIncludes(xml, "<IRSW2 ");
    assertStringIncludes(xml, "<WagesAmt>85000</WagesAmt>");
    assertMatch(xml, /85000/);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("plain W-2 MeF validation does not report missing 1040 totals or Form 8959", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "general", {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-01",
      address_line1: "123 Main St",
      address_city: "Springfield",
      address_state: "IL",
      address_zip: "62701",
    });
    await appendInput(returnPath, "w2", {
      ...w2Data(30_000, 3_000),
      box3_ss_wages: 30_000,
      box4_ss_withheld: 1_860,
      box5_medicare_wages: 30_000,
      box6_medicare_withheld: 435,
    });

    const error = await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir }),
      ExportRejectedError,
    );
    const falseRejects = error.entries.filter((entry) =>
      entry.ruleNumber === "F1040-066-09" ||
      entry.ruleNumber.startsWith("F8959-")
    );
    assertEquals(falseRejects, []);

    const xml = await exportMefCommand({
      returnId,
      baseDir: tmpDir,
      force: true,
    });
    assertStringIncludes(xml, "<TotalIncomeAmt>30000</TotalIncomeAmt>");
    assertStringIncludes(
      xml,
      "<AdjustedGrossIncomeAmt>30000</AdjustedGrossIncomeAmt>",
    );
    assertStringIncludes(xml, "<TaxableIncomeAmt>14250</TaxableIncomeAmt>");
    assertStringIncludes(xml, "<TotalTaxAmt>1472</TotalTaxAmt>");
    assertStringIncludes(xml, "<RefundAmt>1528</RefundAmt>");
    assertStringIncludes(xml, "<IRSW2 ");
    assertEquals(xml.includes("<IRS1040ScheduleA "), false);
    assertEquals(xml.includes("<IRS6251 "), false);
    assertEquals(xml.includes("<IRS8880 "), false);
    assertEquals(xml.includes("<IRS8959 "), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand draft empty return labels diagnostic XML", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const xml = await exportMefCommand({
      returnId,
      baseDir: tmpDir,
      force: true,
      draft: true,
    });
    assertStringIncludes(xml, "DRAFT/INCOMPLETE");
    assertStringIncludes(xml, "<Return ");
    assertStringIncludes(xml, "</Return>");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand blocks calculation diagnostics before reject rules", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir }),
      ExportExecutionError,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand blocks finalized export on any executor diagnostic, even with --force", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "w2", {
      box1_wages: "not-a-number",
      box2_fed_withheld: 1000,
    });

    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir, force: true }),
      ExportExecutionError,
      "Finalized export blocked by",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand blocks missing filing status diagnostics instead of whitelisting them", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "w2", w2Data(85000, 10000));

    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir, force: true }),
      ExportExecutionError,
      "Finalized export blocked by",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportPdfCommand blocks executor diagnostics before writing or overwriting PDF", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    const outputPath = `${tmpDir}/export.pdf`;
    const original = new TextEncoder().encode("keep me");
    await Deno.writeFile(outputPath, original);

    await appendInput(returnPath, "w2", {
      box1_wages: "not-a-number",
      box2_fed_withheld: 1000,
    });

    await assertRejects(
      () =>
        exportPdfCommand({
          returnId,
          baseDir: tmpDir,
          force: true,
          outputPath,
        }),
      ExportExecutionError,
    );
    assertEquals(await Deno.readFile(outputPath), original);

    const unwrittenPath = `${tmpDir}/should-not-exist.pdf`;
    await assertRejects(
      () =>
        exportPdfCommand({
          returnId,
          baseDir: tmpDir,
          force: true,
          outputPath: unwrittenPath,
        }),
      ExportExecutionError,
    );
    assertEquals(await exists(unwrittenPath), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand preserves business-rule force override after clean calculation", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "general", {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      address_line1: "123 Main St",
      address_city: "Springfield",
      address_state: "IL",
      address_zip: "62701",
    });
    await appendInput(returnPath, "f2441", {});
    await appendInput(returnPath, "w2", w2Data(85000, 10000));

    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir }),
      ExportRejectedError,
    );

    const xml = await exportMefCommand({
      returnId,
      baseDir: tmpDir,
      force: true,
    });
    assertStringIncludes(xml, "<IRS1040");
    assertMatch(xml, /85000/);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand nonexistent returnId throws", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => exportMefCommand({ returnId: "nonexistent-id", baseDir: tmpDir }),
      Error,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
