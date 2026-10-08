/** Exercise a compiled release asset with a synthetic TY2025 W-2 return. */
import { join, resolve } from "@std/path";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from "pdf-lib";

const [asset, expectedVersion] = Deno.args;
if (!asset || !expectedVersion || Deno.args.length !== 2) {
  throw new Error(
    "Usage: deno run --allow-read --allow-write --allow-run --allow-net=www.irs.gov scripts/release/smoke-release-binary.ts <built-asset> <expected-version>",
  );
}

const binary = resolve(asset);
const decoder = new TextDecoder();
const workingDir = await Deno.makeTempDir({ prefix: "opentax-release-smoke-" });
const wages = 40_000;
const withholding = 5_000;

function decodedStream(stream: PDFRawStream): string {
  return decoder.decode(decodePDFRawStream(stream).decode());
}

function assertFlattenedPdfValues(pdf: PDFDocument): void {
  if (pdf.getForm().getFields().length !== 0) {
    throw new Error("Built asset PDF still contains form fields");
  }

  // The TY2025 IRS 1040 template places these flattened widgets at fixed
  // coordinates. Read the painted appearance XObjects at those coordinates,
  // rather than finding values elsewhere in the PDF or in a live AcroForm.
  const expected = [
    { page: 0, x: 36, y: 684, value: "Alex", label: "filer first name" },
    { page: 0, x: 253, y: 684, value: "Example", label: "filer last name" },
    {
      page: 0,
      x: 504,
      y: 330.001,
      value: String(wages),
      label: "line 1a wages",
    },
    {
      page: 1,
      x: 410.4,
      y: 504,
      value: String(withholding),
      label: "line 25a W-2 withholding",
    },
  ];

  for (const { page: pageIndex, x, y, value, label } of expected) {
    const page = pdf.getPage(pageIndex);
    const contents = page.node.Contents();
    if (!(contents instanceof PDFArray)) {
      throw new Error(
        `Built asset PDF page ${pageIndex + 1} has unexpected content`,
      );
    }
    const pageText = contents.asArray().map((ref) => {
      const stream = pdf.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) {
        throw new Error(
          `Built asset PDF page ${pageIndex + 1} has unexpected content`,
        );
      }
      return decodedStream(stream);
    }).join("\n");
    const xObjects = page.node.Resources()?.lookup(
      PDFName.of("XObject"),
      PDFDict,
    );
    if (!xObjects) {
      throw new Error(
        `Built asset PDF page ${pageIndex + 1} has no flattened widgets`,
      );
    }

    let found = false;
    // pdf-lib flatten() draws each field appearance through a page XObject.
    for (
      const match of pageText.matchAll(
        /q\s*1 0 0 1 ([\d.-]+) ([\d.-]+) cm\s*1 0 0 1 0 0 cm\s*1 0 0 1 0 0 cm\s*\/(FlatWidget-[\d]+) Do\s*Q/g,
      )
    ) {
      if (
        Math.abs(Number(match[1]) - x) > 0.01 ||
        Math.abs(Number(match[2]) - y) > 0.01
      ) continue;
      const stream = pdf.context.lookup(xObjects.get(PDFName.of(match[3])));
      if (!(stream instanceof PDFRawStream)) continue;
      const paintedText = [
        ...decodedStream(stream).matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g),
      ]
        .map((part) =>
          decoder.decode(Uint8Array.from(
            part[1].match(/../g)!.map((byte) => parseInt(byte, 16)),
          ))
        )
        .join("");
      if (paintedText === value) found = true;
    }
    if (!found) {
      throw new Error(`Built asset PDF ${label} differs from synthetic source`);
    }
  }
}

function oneDocument(xml: string, tag: string): string {
  const matches = [
    ...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "g")),
  ];
  if (matches.length !== 1) {
    throw new Error(`Built asset MeF return needs exactly one ${tag} document`);
  }
  return matches[0][0];
}

function assertXmlValue(xml: string, tag: string, expected: string): void {
  const matches = [
    ...xml.matchAll(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, "g")),
  ];
  if (matches.length !== 1 || matches[0][1] !== expected) {
    throw new Error(`Built asset MeF ${tag} differs from synthetic source`);
  }
}

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
    taxpayer_signature_pin: "12345",
    taxpayer_signature_date: "2026-04-15",
  };
  const w2 = {
    employee_ssn: "111-22-3333",
    box1_wages: wages,
    box2_fed_withheld: withholding,
    box3_ss_wages: wages,
    box4_ss_withheld: 2_480,
    box5_medicare_wages: wages,
    box6_medicare_withheld: 580,
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
    computed.summary?.line1z_total_wages !== wages ||
    computed.summary?.line33_total_payments !== withholding ||
    computed.lines?.line25a_w2_withheld !== withholding
  ) {
    throw new Error(
      "Built asset W-2 calculation differs from synthetic source",
    );
  }

  const validation = JSON.parse(
    await invoke("return", "validate", "--returnId", returnId),
  );
  if (
    validation.canFile !== true ||
    !Array.isArray(validation.entries) ||
    typeof validation.summary?.total !== "number" ||
    validation.summary?.rejected !== 0
  ) {
    throw new Error(
      `Built asset CLI validation rejected the synthetic return (${
        validation.summary?.rejected ?? "invalid"
      } rule failures)`,
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
  if (!xml.includes("<Return") || xml.includes("DRAFT/INCOMPLETE")) {
    throw new Error("Built asset did not export a finalized W-2 MeF return");
  }
  const form1040 = oneDocument(xml, "IRS1040");
  const formW2 = oneDocument(xml, "IRSW2");
  assertXmlValue(xml, "PrimarySSN", "111223333");
  assertXmlValue(form1040, "IndividualReturnFilingStatusCd", "1");
  assertXmlValue(form1040, "WagesAmt", String(wages));
  assertXmlValue(form1040, "WagesSalariesAndTipsAmt", String(wages));
  assertXmlValue(form1040, "FormW2WithheldTaxAmt", String(withholding));
  assertXmlValue(form1040, "TotalPaymentsAmt", String(withholding));
  assertXmlValue(formW2, "EmployeeSSN", "111223333");
  assertXmlValue(formW2, "EmployerEIN", "123456789");
  assertXmlValue(formW2, "WagesAmt", String(wages));
  assertXmlValue(formW2, "WithholdingAmt", String(withholding));

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
  assertFlattenedPdfValues(pdf);

  console.log(
    `Release smoke passed: ${expectedVersion}, synthetic W-2, finalized MeF, ${pdf.getPageCount()} PDF pages`,
  );
} finally {
  await Deno.remove(workingDir, { recursive: true });
}
