import { assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

Deno.test("CLI force and draft cannot export an empty return with invented identity", async () => {
  const cwd = await Deno.makeTempDir();
  const main = fromFileUrl(new URL("../main.ts", import.meta.url));
  const run = (...args: string[]) =>
    new Deno.Command("deno", {
      args: [
        "run",
        "--frozen",
        "--cached-only",
        "--allow-read",
        "--allow-write",
        "--allow-net=www.irs.gov",
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
      "requires a real filer identity",
    );
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("CLI exports a signed W-2 return as MeF XML and a filled PDF without force", async () => {
  const cwd = await Deno.makeTempDir();
  const main = fromFileUrl(new URL("../main.ts", import.meta.url));
  const run = (...args: string[]) =>
    new Deno.Command("deno", {
      args: [
        "run",
        "--frozen",
        "--cached-only",
        "--allow-read",
        "--allow-write",
        "--allow-net=www.irs.gov",
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
      taxpayer_signature_pin: "12345",
      taxpayer_signature_date: "2026-09-29",
      address_line1: "123 Main St",
      address_city: "Springfield",
      address_state: "IL",
      address_zip: "62701",
    };
    const w2 = {
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
    const mef = await run(
      "return",
      "export",
      "--returnId",
      returnId,
      "--type",
      "mef",
    );
    assertEquals(mef.code, 0, new TextDecoder().decode(mef.stderr));
    const xml = new TextDecoder().decode(mef.stdout);
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
    assertStringIncludes(xml, "<NameLine1Txt>TAXPAYER&lt;TEST</NameLine1Txt>");
    const schema = fromFileUrl(
      new URL(
        "../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        import.meta.url,
      ),
    );
    try {
      await Deno.stat(schema);
      const xmlPath = `${cwd}/return.xml`;
      await Deno.writeTextFile(xmlPath, xml);
      const validated = await new Deno.Command("xmllint", {
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
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    const pdfPath = `${cwd}/return.pdf`;
    const pdf = await run(
      "return",
      "export",
      "--returnId",
      returnId,
      "--type",
      "pdf",
      "--output",
      pdfPath,
    );
    assertEquals(pdf.code, 0, new TextDecoder().decode(pdf.stderr));
    const bytes = await Deno.readFile(pdfPath);
    assertEquals(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");
    assertEquals(bytes.length > 10_000, true);
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});
