import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { twoObligation453aFixture } from "../nodes/inputs/f453a_interest/fixture.ts";
import { schedule2Part2Total } from "../nodes/intermediate/aggregation/schedule2/index.ts";
import { schedule2 as nativeSchedule2 } from "./mef/forms/schedule2.ts";
import { schedule2Pdf } from "./pdf/forms/schedule2.ts";
import { fillFormPdf } from "./pdf/builder.ts";
import { FilingStatus } from "../mef/header.ts";

const line15 = 11_317;
const pending = {
  f453a_interest: twoObligation453aFixture,
  general: { taxpayer_ssn: "111-22-3333" },
};
const filer = {
  primarySSN: "111-22-3333",
  nameLine1: "Test Taxpayer",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("section 453A workpaper routes through Schedule 2 and Form 1040 line 23", () => {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    f453a_interest: twoObligation453aFixture,
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line15_section453a_interest, line15);
  assertEquals(result.pending.f1040?.line23_other_taxes, line15);
  assertEquals(schedule2Part2Total(result.pending.schedule2), line15);
});

Deno.test("section 453A line 15 prints separately in native and PDF Schedule 2", () => {
  const fields = { line15_section453a_interest: line15 };
  const xml = nativeSchedule2.build(fields, { pending, filer });
  assertStringIncludes(
    xml,
    "<IntDefrdTaxGainInstalSalesAmt>11317</IntDefrdTaxGainInstalSalesAmt>",
  );
  assertStringIncludes(xml, "<TotalOtherTaxesAmt>11317</TotalOtherTaxesAmt>");
  assertEquals(xml.includes("<IntTaxDueInstalSaleIncmAmt>"), false);
  const projected = schedule2Pdf.projectFields!(fields, pending);
  assertEquals(projected.line15_section453a_interest, line15);
  assertEquals(projected.line21_total, line15);
  assertEquals(
    schedule2Pdf.fields.find((entry) =>
      entry.domainKey === "line15_section453a_interest"
    )?.pdfField,
    "form1[0].Page1[0].f1_26[0]",
  );
});

Deno.test("section 453A amount renders on the filled Schedule 2 PDF", async () => {
  const projected = schedule2Pdf.projectFields!(
    { line15_section453a_interest: line15 },
    pending,
  );
  const bytes = await fillFormPdf(
    schedule2Pdf,
    projected,
    undefined,
    ".pdf-cache",
    pending,
  );
  assertEquals(bytes !== undefined, true);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes!);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(result.code, 0);
    assertStringIncludes(new TextDecoder().decode(result.stdout), "11317");
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("section 453A rejects bare or changed line 15 amounts at both exports", () => {
  for (
    const [fields, source] of [
      [{ line15_section453a_interest: line15 }, {}],
      [{ line15_section453a_interest: line15 - 1 }, pending],
    ] as const
  ) {
    assertThrows(
      () => nativeSchedule2.build(fields, { pending: source, filer }),
      Error,
      "Schedule 2 line 15",
    );
    assertThrows(
      () => schedule2Pdf.projectFields!(fields, source),
      Error,
      "Schedule 2 line 15",
    );
  }
  const otherSeller = {
    ...pending,
    f453a_interest: {
      ...twoObligation453aFixture,
      seller_taxpayer_ssn: "999887777",
    },
  };
  assertThrows(
    () =>
      nativeSchedule2.build({ line15_section453a_interest: line15 }, {
        pending: otherSeller,
        filer,
      }),
    Error,
    "seller differs from the filer",
  );
  assertThrows(
    () =>
      schedule2Pdf.projectFields!(
        { line15_section453a_interest: line15 },
        otherSeller,
      ),
    Error,
    "seller differs from the filer",
  );
});
