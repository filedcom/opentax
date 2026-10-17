import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../scripts/support/sys.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { fileURLToPath as fromFileUrl } from "node:url";

test("CLI force and draft cannot export an empty return with invented identity", async () => {
  const cwd = await sys.makeTempDir();
  const main = fromFileUrl(new URL("../main.ts", import.meta.url));
  const run = (...args: string[]) =>
    new sys.Command(process.execPath, {
      args: [
        main,
        ...args,
      ],
      cwd,
      stdout: "piped",
      stderr: "piped",
    }).output();
  try {
    const created = await run("return", "create", "--year", "2025", "--json");
    assertEquals(created.code, 0);
    const { returnId } = JSON.parse(new TextDecoder().decode(created.stdout));
    const common = [
      "return",
      "export",
      "--returnId",
      returnId,
      "--type",
      "mef",
      "--force",
    ];
    for (const extra of [[], ["--draft=false"]]) {
      const finalized = await run(...common, ...extra);
      assertEquals(finalized.code, 1);
      assertEquals(
        new TextDecoder().decode(finalized.stdout).includes("<Return "),
        false,
      );
      assertStringIncludes(
        new TextDecoder().decode(finalized.stderr),
        "executor diagnostic",
      );
    }
    const draft = await run(...common, "--draft");
    assertEquals(draft.code, 1);
    assertEquals(
      new TextDecoder().decode(draft.stdout).includes("<Return "),
      false,
    );
    assertStringIncludes(
      new TextDecoder().decode(draft.stderr),
      "needs the identified taxpayer's SSN",
    );
  } finally {
    await sys.remove(cwd, { recursive: true });
  }
});

test("CLI exports a signed W-2 return without force once the header authenticates the signer", async () => {
  const cwd = await sys.makeTempDir();
  const main = fromFileUrl(new URL("../main.ts", import.meta.url));
  const run = (...args: string[]) =>
    new sys.Command(process.execPath, {
      args: [
        main,
        ...args,
      ],
      cwd,
      stdout: "piped",
      stderr: "piped",
    }).output();
  try {
    const created = await run("return", "create", "--year", "2025", "--json");
    assertEquals(created.code, 0);
    const { returnId } = JSON.parse(new TextDecoder().decode(created.stdout));
    const general = {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-01",
      taxpayer_prior_year_agi: 28_400,
      digital_assets: false,
      taxpayer_signature_pin: "12345",
      taxpayer_signature_date: "2026-09-29",
      address_line1: "123 Main St",
      address_city: "Springfield",
      address_state: "IL",
      address_zip: "62701",
    };
    const w2 = {
      employee_ssn: "111-22-3333",
      employer_ein: "12-3456789",
      employer_name: "ACME CORP",
      employer_address_line1: "500 Market St",
      employer_address_city: "Springfield",
      employer_address_state: "IL",
      employer_address_zip: "62701",
      box1_wages: 30_000,
      box2_fed_withheld: 3_000,
      box3_ss_wages: 30_000,
      box4_ss_withheld: 1_860,
      box5_medicare_wages: 30_000,
      box6_medicare_withheld: 435,
    };
    for (
      const [nodeType, data] of [["general", general], ["w2", w2]] as const
    ) {
      const added = await run(
        "form",
        "add",
        "--returnId",
        returnId,
        "--node_type",
        nodeType,
        JSON.stringify(data),
      );
      assertEquals(added.code, 0, new TextDecoder().decode(added.stderr));
    }
    const xmlPath = `${cwd}/return.xml`;
    const mef = await run(
      "return",
      "export",
      "--returnId",
      returnId,
      "--type",
      "mef",
      "--output",
      xmlPath,
    );
    assertEquals(mef.code, 0, new TextDecoder().decode(mef.stderr));
    const xml = await fs.readFile(xmlPath, "utf8");
    assertStringIncludes(
      xml,
      "<SelfSelectPINGrp><PrimaryBirthDt>1985-06-01</PrimaryBirthDt><PrimaryPriorYearAGIAmt>28400</PrimaryPriorYearAGIAmt></SelfSelectPINGrp>",
    );
    assertStringIncludes(xml, "<IRS1040 ");
    assertStringIncludes(xml, "<IRSW2 ");
    assertStringIncludes(
      xml,
      "<PrimarySignaturePIN>12345</PrimarySignaturePIN>",
    );
    assertStringIncludes(
      xml,
      "<PrimarySignatureDt>2026-09-29</PrimarySignatureDt>",
    );
    // Pub 4164 §12.5: first name, then "<", then last name.
    assertStringIncludes(xml, "<NameLine1Txt>TEST&lt;TAXPAYER</NameLine1Txt>");
    const schema = fromFileUrl(
      new URL(
        "../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        import.meta.url,
      ),
    );
    try {
      await sys.stat(schema);
      const validated = await new sys.Command("xmllint", {
        args: ["--noout", "--schema", schema, xmlPath],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(
        validated.code,
        0,
        new TextDecoder().decode(validated.stderr),
      );
    } catch (error) {
      throw error;
    }
    const pdfPath = `${cwd}/return.pdf`;
    const pdf = await run(
      "return",
      "export",
      "--returnId",
      returnId,
      "--type",
      "pdf",
      "--force",
      "--output",
      pdfPath,
    );
    assertEquals(pdf.code, 0, new TextDecoder().decode(pdf.stderr));
    const bytes = await sys.readBytes(pdfPath);
    assertEquals(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");
    assertEquals(bytes.length > 10_000, true);
  } finally {
    await sys.remove(cwd, { recursive: true });
  }
});
