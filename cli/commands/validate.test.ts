import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { appendInput } from "../store/store.ts";
import { createReturnCommand } from "./return.ts";
import { validateReturnCommand } from "./validate.ts";

Deno.test("CLI validation scopes rules to the emitted Form 1040 and W-2", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    const path = join(baseDir, returnId);
    await appendInput(path, "general", {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      taxpayer_signature_pin: "12345",
      taxpayer_signature_date: "2026-04-15",
    });
    await appendInput(path, "w2", {
      employee_ssn: "111-22-3333",
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Employer Road",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 40_000,
      box2_fed_withheld: 5_000,
      box3_ss_wages: 40_000,
      box4_ss_withheld: 2_480,
      box5_medicare_wages: 40_000,
      box6_medicare_withheld: 580,
    });

    const { report, formatted } = await validateReturnCommand({
      returnId,
      baseDir,
    });
    assertEquals(report.canFile, true);
    assertEquals(report.summary.rejected, 0);
    assertEquals(report.entries, []);
    assertEquals(JSON.parse(formatted), report);
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

Deno.test("CLI validation reports native assembly failure for an incomplete return", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    const { report } = await validateReturnCommand({ returnId, baseDir });
    assertEquals(report.canFile, false);
    assertEquals(
      report.entries.some((entry) => entry.ruleNumber === "MEF_ASSEMBLY"),
      true,
    );
    assertEquals(report.summary.rejected >= 1, true);
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});
