import { assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";

const filed = {
  filing_status: "single",
  taxpayer_ssn: "111-22-3333",
};

function personalDistribution(recipient_tin?: string) {
  return {
    f1099patr: {
      f1099patrs: [{
        payer_name: "Cooperative",
        payer_tin: "123456789",
        recipient_tin,
        source_document_reference: "patr-copy-1",
        box1_patronage_dividends: 100,
        distribution_treatment: {
          kind: "personal_basis_adjustment",
          purchase_reference: "purchase-1",
          verified_basis_reduction: 100,
        },
      }],
    },
  };
}

Deno.test("positive 1099-PATR distribution owner is checked by native and PDF Form 1040", () => {
  const source = personalDistribution("111223333");
  irs1040.build(filed, { pending: source });
  irs1040Pdf.projectFields?.(filed, source);
  for (
    const pending of [personalDistribution(), personalDistribution("999887777")]
  ) {
    const expected = pending.f1099patr.f1099patrs[0].recipient_tin
      ? "recipient TIN must match"
      : "needs a recipient TIN";
    assertThrows(() => irs1040.build(filed, { pending }), Error, expected);
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, pending),
      Error,
      expected,
    );
  }
});

Deno.test("joint spouse 1099-PATR belongs on MFJ return only", () => {
  const source = personalDistribution("444556666");
  const joint = {
    ...filed,
    filing_status: "mfj",
    spouse_ssn: "444-55-6666",
  };
  irs1040.build(joint, { pending: source });
  irs1040Pdf.projectFields?.(joint, source);
  assertThrows(
    () =>
      irs1040.build({ ...joint, filing_status: "mfs" }, { pending: source }),
    Error,
    "recipient TIN must match",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({ ...joint, filing_status: "mfs" }, source),
    Error,
    "recipient TIN must match",
  );
});

Deno.test("one 1099-PATR issued reference without an account cannot be counted twice", () => {
  const issued = personalDistribution("111223333").f1099patr.f1099patrs[0];
  const duplicate = {
    f1099patr: { f1099patrs: [issued, { ...issued }] },
  };
  assertThrows(
    () => irs1040.build(filed, { pending: duplicate }),
    Error,
    "1099-PATR repeats the same payer, recipient, and issued source reference",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, duplicate),
    Error,
    "1099-PATR repeats the same payer, recipient, and issued source reference",
  );
  const distinct = {
    f1099patr: {
      f1099patrs: [
        issued,
        { ...issued, source_document_reference: "patr-copy-2" },
      ],
    },
  };
  irs1040.build(filed, { pending: distinct });
  irs1040Pdf.projectFields?.(filed, distinct);
});

Deno.test("positive PATR withholding and cooperative deduction need a filed owner", () => {
  for (
    const box of [{ box4_federal_withheld: 20 }, {
      box6_section199ag_deduction: 40,
    }]
  ) {
    const source = { f1099patr: { f1099patrs: [box] } };
    assertThrows(
      () => irs1040.build(filed, { pending: source }),
      Error,
      "needs a recipient TIN",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, source),
      Error,
      "needs a recipient TIN",
    );
  }
});
