import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { general } from "../../../../nodes/inputs/general/index.ts";
import { fillFormPdf } from "../../builder.ts";
import { irs1040Pdf } from "./f1040.ts";

Deno.test("official 2025 Form 1040 prints retained joint spouse middle initial", async () => {
  const source = {
    taxpayer_ssn: "123456789",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    spouse_ssn: "987654321",
    spouse_first_name: "Sam",
    spouse_middle_initial: "B",
    spouse_last_name: "Sample",
    filing_status: "mfj",
    address_line1: "1 Main St",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  };
  const computed = general.compute(
    { taxYear: 2025, formType: "f1040" },
    general.inputSchema.parse(source),
  );
  const f1040 = computed.outputs.find((output) => output.nodeType === "f1040")
    ?.fields;
  assertEquals(f1040?.spouse_middle_initial, "B");
  const filer = extractFilerIdentity(f1040!);
  assertEquals(filer?.spouse?.middleInitial, "B");
  const projected = irs1040Pdf.instances?.({}, filer)?.[0];
  assertEquals(projected?.print_spouse_first_name_with_initial, "Sam B");
  const temp = await Deno.makeTempDir();
  try {
    const bytes = await fillFormPdf(
      irs1040Pdf,
      projected!,
      filer,
      ".pdf-cache",
    );
    if (!bytes) throw new Error("Form 1040 was not rendered");
    const path = join(temp, "form1040-spouse.pdf");
    await Deno.writeFile(path, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-f", "1", "-l", "1", "-layout", path, "-"],
    }).output();
    if (!result.success) throw new Error("pdftotext failed for Form 1040");
    const printed = new TextDecoder().decode(result.stdout);
    assertStringIncludes(printed, "Sam B");
    assertStringIncludes(printed, "Sample");

    const mfsFiler = extractFilerIdentity({ ...f1040, filing_status: "mfs" });
    const mfsFields = irs1040Pdf.instances?.({ filing_status: "mfs" }, mfsFiler)
      ?.[0];
    assertEquals(mfsFields?.print_mfs_spouse_full_name, "Sam B Sample");
    const mfsBytes = await fillFormPdf(
      irs1040Pdf,
      mfsFields!,
      mfsFiler,
      ".pdf-cache",
    );
    if (!mfsBytes) throw new Error("MFS Form 1040 was not rendered");
    const mfsPath = join(temp, "form1040-mfs-spouse.pdf");
    await Deno.writeFile(mfsPath, mfsBytes);
    const mfsResult = await new Deno.Command("pdftotext", {
      args: ["-f", "1", "-l", "1", "-layout", mfsPath, "-"],
    }).output();
    if (!mfsResult.success) throw new Error("pdftotext failed for MFS 1040");
    assertStringIncludes(
      new TextDecoder().decode(mfsResult.stdout),
      "Sam B Sample",
    );
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});
