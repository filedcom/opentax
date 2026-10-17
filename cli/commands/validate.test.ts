import { test } from "bun:test";
import * as sys from "../../scripts/support/sys.ts";
import { assertEquals } from "@std/assert";
import { join } from "node:path";
import { appendInput } from "../store/store.ts";
import { createReturnCommand } from "./return.ts";
import { validateReturnCommand } from "./validate.ts";

test("CLI validation scopes rules to the emitted Form 1040 and W-2", async () => {
  const baseDir = await sys.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    const path = join(baseDir, returnId);
    const inputs = [
      ["general", {
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
      }],
      ["w2", {
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
      }],
    ] as const;
    for (const [nodeType, data] of inputs) {
      await appendInput(path, nodeType, data);
    }

    const { report, formatted } = await validateReturnCommand({
      returnId,
      baseDir,
    });
    // A Self-Select PIN signer with a birth date still needs prior-year AGI
    // or PIN (Pub 4164 §8.9.2).
    assertEquals(report.canFile, false);
    assertEquals(report.entries.map((entry) => entry.ruleNumber), [
      "IND-025-02",
      "IND-031-04",
    ]);
    assertEquals(JSON.parse(formatted), report);

    const authenticated = await createReturnCommand({ year: 2025, baseDir });
    const authenticatedPath = join(baseDir, authenticated.returnId);
    for (const [nodeType, data] of inputs) {
      await appendInput(
        authenticatedPath,
        nodeType,
        nodeType === "general"
          ? { ...data, taxpayer_prior_year_agi: 41_250 }
          : data,
      );
    }
    const signed = await validateReturnCommand({
      returnId: authenticated.returnId,
      baseDir,
    });
    assertEquals(signed.report.entries, []);
    assertEquals(signed.report.canFile, true);
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
});

test("CLI validation reports native assembly failure for an incomplete return", async () => {
  const baseDir = await sys.makeTempDir();
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
    await sys.remove(baseDir, { recursive: true });
  }
});
