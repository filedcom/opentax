import { assertEquals, assertThrows } from "@std/assert";
import { form4972Pdf } from "./f4972.ts";

Deno.test("2025 Form 4972 PDF uses calculated line fields instead of 1099-R source boxes", () => {
  const byKey = new Map(
    form4972Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("line6"), "topmostSubform[0].Page1[0].f1_03[0]");
  assertEquals(
    byKey.get("recipient_name"),
    "topmostSubform[0].Page1[0].f1_01[0]",
  );
  assertEquals(byKey.get("line9"), "topmostSubform[0].Page1[0].f1_06[0]");
  assertEquals(
    byKey.get("line20_fraction"),
    "topmostSubform[0].Page1[0].Line20_ReadOrder[0].f1_18[0]",
  );
  assertEquals(byKey.get("line30"), "topmostSubform[0].Page1[0].f1_28[0]");
  assertEquals(byKey.has("lump_sum_amount"), false);
  const beneficiaryPrior = form4972Pdf.fields.filter((entry) =>
    entry.domainKey === "prior_beneficiary_election_after_1986"
  );
  assertEquals(beneficiaryPrior.length, 2);
  assertEquals(
    beneficiaryPrior.map((entry) => entry.pdfField),
    [
      "topmostSubform[0].Page1[0].c1_6[0]",
      "topmostSubform[0].Page1[0].c1_6[1]",
    ],
  );
  assertEquals(form4972Pdf.pageIndices?.({}), [0]);
});

Deno.test("2025 Form 4972 PDF splits line 20 at its printed decimal point", () => {
  const projected = form4972Pdf.projectFields?.(
    { recipient: "T", line6: 10_000, line20: 0.09123 },
    {
      general: {
        taxpayer_first_name: "Alex",
        taxpayer_last_name: "Taxpayer",
        taxpayer_ssn: "123456789",
      },
    },
  );
  assertEquals(projected?.recipient_name, "Alex Taxpayer");
  assertEquals(projected?.recipient_ssn, "123456789");
  assertEquals(projected?.line20_whole, "0");
  assertEquals(projected?.line20_fraction, "09123");
});

Deno.test("2025 Form 4972 PDF selects the spouse recipient without using taxpayer identity", () => {
  const projected = form4972Pdf.projectFields?.(
    { recipient: "S", line8: 20_000 },
    {
      general: {
        taxpayer_first_name: "Alex",
        taxpayer_last_name: "Taxpayer",
        taxpayer_ssn: "123456789",
        spouse_first_name: "Sam",
        spouse_last_name: "Taxpayer",
        spouse_ssn: "987654321",
      },
    },
  );
  assertEquals(projected?.recipient_name, "Sam Taxpayer");
  assertEquals(projected?.recipient_ssn, "987654321");
  assertEquals(form4972Pdf.includeWhen?.(projected ?? {}), true);
  assertEquals(form4972Pdf.includeWhen?.({ lump_sum_amount: 20_000 }), false);
});

Deno.test("2025 Form 4972 PDF refuses a calculated form without selected recipient identity", () => {
  assertThrows(
    () => form4972Pdf.projectFields?.({ recipient: "S", line8: 20_000 }, {}),
    Error,
    "needs the selected recipient name and SSN",
  );
});
