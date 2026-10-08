import { assertThrows } from "@std/assert";
import { irs1040 } from "../../../../mef/forms/general/return-assembly/f1040.ts";
import { irs1040Pdf } from "../../../../pdf/forms/general/return-assembly/f1040.ts";

const filed = {
  filing_status: "single",
  taxpayer_ssn: "111223333",
  line2b_taxable_interest: 100,
};

function retained(recipient_tin?: string) {
  return {
    f1099oid: {
      f1099oids: [{
        payer_name: "Issuer",
        payer_tin: "123456789",
        source_document_reference: "oid-copy-1",
        recipient_tin,
        box1_oid: 100,
      }],
    },
  };
}

Deno.test("positive 1099-OID owner is checked by native and PDF Form 1040", () => {
  const source = retained("111223333");
  irs1040.build(filed, { pending: source });
  irs1040Pdf.projectFields?.(filed, source);
  irs1040.build({ ...filed, taxpayer_ssn: "111-22-3333" }, { pending: source });
  irs1040Pdf.projectFields?.({ ...filed, taxpayer_ssn: "111-22-3333" }, source);
  for (const pending of [retained(), retained("999887777")]) {
    const expected = pending.f1099oid.f1099oids[0].recipient_tin
      ? "recipient TIN must match"
      : "needs a recipient TIN";
    assertThrows(
      () => irs1040.build(filed, { pending }),
      Error,
      expected,
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, pending),
      Error,
      expected,
    );
  }
});

Deno.test("joint spouse 1099-OID belongs on MFJ return only", () => {
  const source = retained("444556666");
  const joint = {
    ...filed,
    filing_status: "mfj",
    spouse_ssn: "444556666",
  };
  irs1040.build(joint, { pending: source });
  irs1040Pdf.projectFields?.(joint, source);
  irs1040.build({ ...joint, spouse_ssn: "444-55-6666" }, { pending: source });
  irs1040Pdf.projectFields?.({ ...joint, spouse_ssn: "444-55-6666" }, source);
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

Deno.test("positive 1099-OID needs a nonblank payer name in both Form 1040 exports", () => {
  const pending = retained("111223333");
  pending.f1099oid.f1099oids[0].payer_name = "   ";
  const message = "1099-OID needs an identified payer name";
  assertThrows(() => irs1040.build(filed, { pending }), Error, message);
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, pending),
    Error,
    message,
  );
});

Deno.test("tax-exempt OID still requires owner at export", () => {
  const pending = {
    f1099oid: {
      f1099oids: [{ payer_name: "Issuer", box11_tax_exempt_oid: 50 }],
    },
  };
  assertThrows(
    () => irs1040.build({ ...filed, line2b_taxable_interest: 0 }, { pending }),
    Error,
    "needs a recipient TIN",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...filed, line2b_taxable_interest: 0 },
        pending,
      ),
    Error,
    "needs a recipient TIN",
  );
});
