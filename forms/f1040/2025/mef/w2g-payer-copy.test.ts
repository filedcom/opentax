import { assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { type FilerIdentity, FilingStatus } from "../../mef/header.ts";
import { w2gPdf } from "../pdf/forms/w2g.ts";
import { assertW2GPayerCopyContents } from "./w2g-payer-copy.ts";
import type { MefFormsPending } from "./types.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  fullName: "Test Taxpayer",
  nameLine1: "Test Taxpayer",
  nameControl: "TAXP",
  address: {
    line1: "123 Main St",
    city: "Springfield",
    state: "IL",
    zip: "62701",
  },
  filingStatus: FilingStatus.Single,
};

const item = {
  calendar_year: 2025,
  source_document_reference: "2025 payer-issued W-2G",
  issued_copy_attachment_file_name: "IssuedW2G.pdf",
  issued_copy_pdf_sha256: "a".repeat(64),
  payer_name: "Casino Inc",
  payer_name_control: "CASI",
  payer_us_address: {
    line1: "500 Casino Way",
    city: "Las Vegas",
    state: "NV",
    zip: "89101",
  },
  payer_ein: "12-3456789",
  winner_name: "Test Taxpayer",
  winner_us_address: filer.address,
  box9_winner_tin: "111-22-3333",
  box1_winnings: 10_000,
  box4_federal_withheld: 2_400,
  standard_or_nonstandard_code: "S",
};

const pending = {
  w2g: { w2gs: [item] },
  f1040: { line25c_total: 2_400 },
} as MefFormsPending;

async function copy(changed: Record<string, string> = {}): Promise<Uint8Array> {
  const projected = w2gPdf.instances?.(
    { w2gs: [item] },
    filer,
    { f1040: { line25c_total: 2_400 } },
  )?.[0];
  if (!projected) throw new Error("Missing W-2G recipient projection");
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const form = pdf.getForm();
  for (const field of w2gPdf.fields) {
    if (field.kind !== "text" || field.domainKey === "payer_phone") continue;
    const value = changed[field.domainKey] ?? projected[field.domainKey];
    form.createTextField(field.pdfField).setText(String(value ?? ""));
  }
  return pdf.save();
}

Deno.test("W-2G bundle matches readable payer-copy contents to source", async () => {
  const bytes = await copy();
  await assertW2GPayerCopyContents(pending, filer, [{
    fileName: "IssuedW2G.pdf",
    description: "Payer-issued W-2G",
    bytes,
  }]);
  await assertRejects(
    async () =>
      assertW2GPayerCopyContents(pending, filer, [{
        fileName: "IssuedW2G.pdf",
        description: "Payer-issued W-2G",
        bytes: await copy({ box4_federal_withheld: "2399" }),
      }]),
    Error,
    "box4_federal_withheld differs",
  );
});
