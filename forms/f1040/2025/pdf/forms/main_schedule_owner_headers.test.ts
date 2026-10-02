import { assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { fillFormPdf } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { schedule3Pdf } from "./schedule3.ts";
import { scheduleEPdf } from "./schedule_e.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "OWNER EXAMPLE",
  nameControl: "EXAM",
  filingStatus: FilingStatus.Single,
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  // fullName is deliberately absent: it is optional in FilerIdentity.
};

Deno.test("official Schedule 3 and Schedule E retained pages print required filer identity", async () => {
  const temp = await Deno.makeTempDir();
  try {
    for (
      const [descriptor, fields, page] of [
        [schedule3Pdf, { line9_premium_tax_credit: 12 }, 1],
        [scheduleEPdf, { line26: 12 }, 1],
        [scheduleEPdf, { trust_line37: 12 }, 2],
      ] as const
    ) {
      const bytes = await fillFormPdf(descriptor, fields, filer, temp);
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
      assertStringIncludes(printed, filer.nameLine1);
      assertStringIncludes(printed, filer.primarySSN);
    }
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});
