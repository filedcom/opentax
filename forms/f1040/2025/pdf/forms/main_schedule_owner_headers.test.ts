import {
  assertEquals,
  assertFalse,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { join } from "@std/path";
import { fillFormPdf } from "../builder.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { returnHeaderNameLine1 } from "../../../mef/header.ts";
import { assertF1040FinalHeader } from "../../filer-source-reconciliation.ts";
import { schedule1Pdf } from "./schedule1.ts";
import { schedule1aPdf } from "./schedule1a.ts";
import { schedule2Pdf } from "./schedule2.ts";
import { schedule3Pdf } from "./schedule3.ts";
import { scheduleEPdf } from "./schedule_e.ts";

const source = {
  taxpayer_ssn: "123456789",
  taxpayer_first_name: "Alex",
  taxpayer_middle_initial: "B",
  taxpayer_last_name: "Example",
  filing_status: "single",
  digital_assets: false,
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const filer = extractFilerIdentity(source);
if (!filer) throw new Error("Missing retained Form 1040 filer");

Deno.test("official main schedules print the Form 1040 display-name order", async () => {
  assertF1040FinalHeader(source, filer);
  assertEquals(returnHeaderNameLine1(filer), "EXAMPLE<ALEX<B");
  assertEquals(filer.nameLine1, "EXAMPLE ALEX B");
  const temp = await Deno.makeTempDir();
  try {
    for (
      const [descriptor, fields, page] of [
        [schedule1Pdf, { line3_schedule_c: 12 }, 1],
        [schedule1aPdf, { line38_total: 12 }, 1],
        [schedule2Pdf, { line4_se_tax: 12 }, 1],
        [schedule3Pdf, { line9_premium_tax_credit: 12 }, 1],
        [scheduleEPdf, { line26: 12 }, 1],
        [scheduleEPdf, { trust_line37: 12 }, 2],
      ] as const
    ) {
      const bytes = await fillFormPdf(descriptor, fields, filer, ".pdf-cache");
      if (!bytes) throw new Error(`${descriptor.pendingKey} was not rendered`);
      const path = join(temp, `${descriptor.pendingKey}-${page}-owner.pdf`);
      await Deno.writeFile(path, bytes);
      const result = await new Deno.Command("pdftotext", {
        args: ["-f", String(page), "-l", String(page), "-layout", path, "-"],
      }).output();
      if (!result.success) {
        throw new Error(`pdftotext failed for ${descriptor.pendingKey}`);
      }
      const printed = new TextDecoder().decode(result.stdout);
      assertStringIncludes(printed, "Alex B Example");
      assertFalse(printed.includes(filer.nameLine1));
      assertStringIncludes(printed, filer.primarySSN);
    }
    await assertRejects(
      () =>
        fillFormPdf(
          schedule3Pdf,
          { line9_premium_tax_credit: 12 },
          { ...filer, firstNameWithInitial: undefined },
          ".pdf-cache",
        ),
      Error,
      "name shown on Form 1040 needs the identified first-name field and last name",
    );
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});
