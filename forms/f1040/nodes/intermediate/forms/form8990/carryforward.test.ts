import { assertEquals, assertThrows } from "@std/assert";
import { proveZeroPriorForm8990Carryforward } from "./carryforward.ts";

const reviewed2024 = {
  tax_year: 2024 as const,
  filed_form8990_document_reference: "filed-2024-form8990",
  filed_taxpayer_ssn: "123456789",
  filed_line31_disallowed_business_interest: 0,
};

Deno.test("2025 Form 8990 current line 2 uses reviewed filed 2024 line 31", () => {
  const proof = proveZeroPriorForm8990Carryforward(
    reviewed2024,
    { taxpayer_ssn: "123456789" },
  );
  assertEquals(proof.sourceTaxYear, 2024);
  assertEquals(proof.targetTaxYear, 2025);
  assertEquals(proof.sourceLine31, 0);
  assertEquals(proof.targetLine2, 0);
});

Deno.test("2025 Form 8990 closes nonzero or mismatched prior carryforward", () => {
  assertThrows(
    () =>
      proveZeroPriorForm8990Carryforward(
        { ...reviewed2024, filed_line31_disallowed_business_interest: 500 },
        { taxpayer_ssn: "123456789" },
      ),
    Error,
    "does not yet calculate prior disallowed interest",
  );
  assertThrows(
    () =>
      proveZeroPriorForm8990Carryforward(
        reviewed2024,
        { taxpayer_ssn: "987654321" },
      ),
    Error,
    "taxpayer differs from current return",
  );
  assertThrows(
    () =>
      proveZeroPriorForm8990Carryforward(
        { ...reviewed2024, filed_form8990_document_reference: "" },
        { taxpayer_ssn: "123456789" },
      ),
    Error,
  );
});
