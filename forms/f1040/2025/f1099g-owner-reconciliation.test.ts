import { assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";

const filed = {
  filing_status: "single",
  taxpayer_ssn: "111223333",
  line8_additional_income: 100,
};

function unemployment(recipient_tin?: string) {
  return {
    f1099g: {
      f1099gs: [{
        payer_name: "State Agency",
        payer_tin: "123456789",
        source_document_reference: "g-copy-1",
        recipient_tin,
        box_1_unemployment: 100,
      }],
    },
  };
}

Deno.test("positive 1099-G unemployment owner is checked by native and PDF Form 1040", () => {
  const source = unemployment("111223333");
  irs1040.build(filed, { pending: source });
  irs1040Pdf.projectFields?.(filed, source);
  for (const pending of [unemployment(), unemployment("999887777")]) {
    const expected = pending.f1099g.f1099gs[0].recipient_tin
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

Deno.test("joint spouse 1099-G belongs on MFJ return only", () => {
  const source = unemployment("444556666");
  const joint = {
    ...filed,
    filing_status: "mfj",
    spouse_ssn: "444556666",
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

Deno.test("positive state refund 1099-G needs the filed recipient", () => {
  const source = {
    f1099g: {
      f1099gs: [{
        box_2_state_refund: 100,
        box_2_prior_year_itemized: true,
        box_2_taxable_recovery_verified_amount: 100,
        box_2_recovery_workpaper_reference: "refund-workpaper",
      }],
    },
  };
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
});
