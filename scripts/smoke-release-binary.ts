/** Exercise a compiled release asset with a synthetic TY2025 W-2 return. */
import { join, resolve } from "@std/path";
import { PDFDocument } from "pdf-lib";

const [asset, expectedVersion] = Deno.args;
if (!asset || !expectedVersion || Deno.args.length !== 2) {
  throw new Error(
    "Usage: deno run --allow-read --allow-write --allow-run --allow-net=www.irs.gov scripts/smoke-release-binary.ts <built-asset> <expected-version>",
  );
}

const binary = resolve(asset);
const decoder = new TextDecoder();
const workingDir = await Deno.makeTempDir({ prefix: "opentax-release-smoke-" });

async function invoke(...args: string[]): Promise<string> {
  const result = await new Deno.Command(binary, {
    args,
    cwd: workingDir,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = decoder.decode(result.stdout).trim();
  const stderr = decoder.decode(result.stderr).trim();
  if (!result.success) {
    throw new Error(
      `${args.slice(0, 2).join(" ")} exited ${result.code}: ${
        stderr || stdout
      }`,
    );
  }
  return stdout;
}

try {
  const version = await invoke("version");
  if (version !== `opentax ${expectedVersion}`) {
    throw new Error(
      `Built asset version ${version} differs from ${expectedVersion}`,
    );
  }

  const created = JSON.parse(
    await invoke("return", "create", "--year", "2025"),
  );
  const returnId = created.returnId;
  if (typeof returnId !== "string" || !/^[A-Za-z0-9_-]+$/.test(returnId)) {
    throw new Error("Built asset did not return a valid synthetic return ID");
  }

  const general = {
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
  };
  const w2 = {
    box1_wages: 75_000,
    box2_fed_withheld: 11_000,
    box3_ss_wages: 75_000,
    box4_ss_withheld: 4_650,
    box5_medicare_wages: 75_000,
    box6_medicare_withheld: 1_087.5,
    employer_ein: "12-3456789",
    employer_name: "Example Employer",
    employer_address_line1: "10 Employer Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    box12_entries: [],
  };

  await invoke(
    "form",
    "add",
    "--returnId",
    returnId,
    "--node_type",
    "general",
    JSON.stringify(general),
  );
  await invoke(
    "form",
    "add",
    "--returnId",
    returnId,
    "--node_type",
    "w2",
    JSON.stringify(w2),
  );

  const computed = JSON.parse(
    await invoke("return", "get", "--returnId", returnId),
  );
  if (
    computed.summary?.line1z_total_wages !== 75_000 ||
    computed.summary?.line33_total_payments !== 11_000 ||
    computed.lines?.line25a_w2_withheld !== 11_000
  ) {
    throw new Error(
      "Built asset W-2 calculation differs from synthetic source",
    );
  }

  const xml = await invoke(
    "return",
    "export",
    "--returnId",
    returnId,
    "--type",
    "mef",
  );
  if (
    !xml.includes("<Return") || !xml.includes("<IRS1040 documentId=") ||
    !xml.includes("<IRSW2 documentId=") || xml.includes("DRAFT/INCOMPLETE")
  ) {
    throw new Error("Built asset did not export a finalized W-2 MeF return");
  }

  const pdfPath = join(workingDir, "synthetic-return.pdf");
  await invoke(
    "return",
    "export",
    "--returnId",
    returnId,
    "--type",
    "pdf",
    "--output",
    pdfPath,
  );
  const pdfBytes = await Deno.readFile(pdfPath);
  if (decoder.decode(pdfBytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("Built asset did not write a PDF file");
  }
  const pdf = await PDFDocument.load(pdfBytes);
  if (pdf.getPageCount() < 2) {
    throw new Error("Built asset PDF omitted a Form 1040 page");
  }

  console.log(
    `Release smoke passed: ${expectedVersion}, synthetic W-2, finalized MeF, ${pdf.getPageCount()} PDF pages`,
  );
} finally {
  await Deno.remove(workingDir, { recursive: true });
}
