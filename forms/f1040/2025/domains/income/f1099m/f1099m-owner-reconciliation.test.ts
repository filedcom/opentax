import { assertThrows } from "@std/assert";
import { irs1040 } from "../../../mef/forms/identity/f1040.ts";
import { irs1040Pdf } from "../../../pdf/forms/identity/f1040.ts";

const filed = {
  filing_status: "single",
  taxpayer_ssn: "111-22-3333",
};

function retained(recipient_tin: string) {
  return {
    f1099m: {
      f1099ms: [{
        payer_name: "Property Manager",
        payer_tin: "123456789",
        recipient_tin,
        source_document_reference: "misc-copy-1",
        box1_rents: 100,
        box1_rents_routing: "schedule_e",
      }],
    },
  };
}

Deno.test("positive 1099-MISC rent owner is checked by native and PDF Form 1040", () => {
  const source = retained("111223333");
  irs1040.build(filed, { pending: source });
  irs1040Pdf.projectFields?.(filed, source);
  const wrong = retained("999887777");
  assertThrows(
    () => irs1040.build(filed, { pending: wrong }),
    Error,
    "recipient TIN must match",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, wrong),
    Error,
    "recipient TIN must match",
  );
});

Deno.test("joint spouse 1099-MISC belongs on MFJ return only", () => {
  const source = retained("444556666");
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

Deno.test("positive other-income and federal-withholding copies also need filed owner", () => {
  for (
    const boxes of [
      {
        box3_other_income: 75,
        box3_other_income_routing: "other_income",
        box3_other_income_description: "Award",
      },
      { box4_federal_withheld: 25 },
    ]
  ) {
    const source = {
      f1099m: {
        f1099ms: [{
          payer_name: "Payer",
          payer_tin: "123456789",
          recipient_tin: "999887777",
          ...boxes,
        }],
      },
    };
    assertThrows(
      () => irs1040.build(filed, { pending: source }),
      Error,
      "recipient TIN must match",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, source),
      Error,
      "recipient TIN must match",
    );
  }
});

Deno.test("positive 1099-MISC withholding needs a nonblank payer name in both Form 1040 exports", () => {
  const pending = {
    f1099m: {
      f1099ms: [{
        payer_name: "   ",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        box4_federal_withheld: 25,
      }],
    },
  };
  assertThrows(
    () => irs1040.build(filed, { pending }),
    Error,
    "1099-MISC needs an identified payer name",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, pending),
    Error,
    "1099-MISC needs an identified payer name",
  );
});
