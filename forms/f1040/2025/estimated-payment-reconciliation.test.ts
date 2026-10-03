import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
import { estimatedPaymentTotal } from "../nodes/inputs/f1040es/index.ts";
import {
  agreedJointPayment,
  agreedMfsJointPayment,
} from "../nodes/inputs/f1040es/agreed-payment.fixture.ts";

const source = {
  payment_q1: 400,
  payment_q2: 300,
  payment_q3: 200,
  payment_q4: 100,
  quarter_payment_records: [
    {
      quarter: "q1",
      amount: 400,
      payer_tin: "111223333",
      payment_date: "2025-04-15",
      payment_record_reference: "2025 Q1 payment",
    },
    {
      quarter: "q2",
      amount: 300,
      payer_tin: "111223333",
      payment_date: "2025-06-16",
      payment_record_reference: "2025 Q2 payment",
    },
    {
      quarter: "q3",
      amount: 200,
      payer_tin: "111223333",
      payment_date: "2025-09-15",
      payment_record_reference: "2025 Q3 payment",
    },
    {
      quarter: "q4",
      amount: 100,
      payer_tin: "111223333",
      payment_date: "2026-01-15",
      payment_record_reference: "2025 Q4 payment",
    },
  ],
};
const pending = { f1040es: source };
const filed = { taxpayer_ssn: "111223333", line26_estimated_tax: 1_000 };

Deno.test("2025 agreed joint estimated payment prints former spouse SSN on native and PDF line 26", () => {
  const jointFiled = {
    filing_status: "single",
    taxpayer_ssn: "111223333",
    line26_estimated_tax: 300,
  };
  const jointPending = {
    general: { filing_status: "single", taxpayer_ssn: "111-22-3333" },
    f1040es: agreedJointPayment,
  };
  assertStringIncludes(
    irs1040.build(jointFiled, { pending: jointPending }),
    '<EstimatedTaxPaymentsAmt divorcedSpouseSSN="222334444">300</EstimatedTaxPaymentsAmt>',
  );
  const printed = irs1040Pdf.projectFields?.(jointFiled, jointPending);
  assertEquals(printed?.print_former_spouse_estimated_tax_ssn, "222334444");
  const widget = irs1040Pdf.fields.find((entry) =>
    entry.domainKey === "print_former_spouse_estimated_tax_ssn"
  );
  assertEquals(
    widget?.pdfField,
    "topmostSubform[0].Page2[0].SSN_ReadOrder[0].f2_22[0]",
  );
  for (
    const exportFields of [
      { ...jointFiled, line26_estimated_tax: 299 },
      { ...jointFiled, filing_status: "mfj" },
      { ...jointFiled, taxpayer_ssn: "999887777" },
    ]
  ) {
    assertThrows(
      () => irs1040.build(exportFields, { pending: jointPending }),
      Error,
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(exportFields, jointPending),
      Error,
    );
  }
});

Deno.test("signed MFS joint payment uses current spouse identity without former-spouse line 26 mark", () => {
  const mfsFiled = {
    filing_status: "mfs",
    taxpayer_ssn: "111223333",
    spouse_ssn: "222334444",
    line26_estimated_tax: 300,
  };
  const mfsPending = {
    general: {
      filing_status: "mfs",
      taxpayer_ssn: "111-22-3333",
      spouse_ssn: "222-33-4444",
    },
    f1040es: agreedMfsJointPayment,
  };
  assertEquals(estimatedPaymentTotal(agreedMfsJointPayment), 300);
  const xml = irs1040.build(mfsFiled, { pending: mfsPending });
  assertStringIncludes(
    xml,
    "<EstimatedTaxPaymentsAmt>300</EstimatedTaxPaymentsAmt>",
  );
  assertEquals(xml.includes("divorcedSpouseSSN"), false);
  const printed = irs1040Pdf.projectFields?.(mfsFiled, mfsPending);
  assertEquals(printed?.print_former_spouse_estimated_tax_ssn, undefined);
  for (
    const changed of [
      { ...mfsFiled, filing_status: "single" },
      { ...mfsFiled, spouse_ssn: "999887777" },
      { ...mfsFiled, taxpayer_ssn: "999887777" },
    ]
  ) {
    assertThrows(
      () => irs1040.build(changed, { pending: mfsPending }),
      Error,
      "joint MFS allocation needs both current spouse identities",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(changed, mfsPending),
      Error,
      "joint MFS allocation needs both current spouse identities",
    );
  }
});

Deno.test("2025 sourced quarterly payments reach filed line 26", () => {
  assertEquals(estimatedPaymentTotal(source), 1_000);
  assertStringIncludes(
    irs1040.build(filed, { pending }),
    "<EstimatedTaxPaymentsAmt>1000</EstimatedTaxPaymentsAmt>",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(filed, pending)?.line26_estimated_tax,
    1_000,
  );
});

Deno.test("prior-year applied credit stays guarded without accepted filing and account evidence", () => {
  const attached = {
    f1040es: { ...source, applied_from_prior_year: 250 },
  };
  assertEquals(estimatedPaymentTotal(attached.f1040es), 1_250);
  const claim = { ...filed, line26_estimated_tax: 1_250 };
  for (
    const exportReturn of [
      () => irs1040.build(claim, { pending: attached }),
      () => irs1040Pdf.projectFields?.(claim, attached),
    ]
  ) {
    assertThrows(
      exportReturn,
      Error,
      "prior-year applied credit needs the accepted 2024 return and IRS-account credit evidence",
    );
  }
});

Deno.test("both Form 1040 exports reject unsourced or changed estimated payments", () => {
  for (
    const [changed, attached, reason] of [
      [filed, {}, "needs its 1040-ES payment source"],
      [{ line26_estimated_tax: 999 }, pending, "differs from its 1040-ES"],
      [{ line26_estimated_tax: 1_000 }, {
        f1040es: { ...source, payment_q2: 299 },
      }, "q2 differs from payment records"],
      [{}, pending, "differs from its 1040-ES"],
    ] as const
  ) {
    assertThrows(
      () => irs1040.build(changed, { pending: attached }),
      Error,
      reason,
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(changed, attached),
      Error,
      reason,
    );
  }
});

Deno.test("line 26 requires distinct filer-owned quarter payment records", () => {
  const owned = {
    filing_status: "single",
    taxpayer_ssn: "111223333",
    line26_estimated_tax: 400,
  };
  const one = {
    f1040es: {
      payment_q1: 400,
      quarter_payment_records: [source.quarter_payment_records[0]],
    },
  };
  irs1040.build(owned, { pending: one });
  irs1040Pdf.projectFields?.(owned, one);
  for (
    const [attached, reason] of [
      [
        { f1040es: { payment_q1: 400 } },
        "needs retained quarter payment records",
      ],
      [{
        f1040es: {
          payment_q1: 401,
          quarter_payment_records: one.f1040es.quarter_payment_records,
        },
      }, "q1 differs from payment records"],
      [{
        f1040es: {
          payment_q1: 400,
          quarter_payment_records: [{
            ...source.quarter_payment_records[0],
            payer_tin: "999887777",
          }],
        },
      }, "payer must be the taxpayer or joint spouse"],
      [{
        f1040es: {
          payment_q1: 800,
          quarter_payment_records: [
            source.quarter_payment_records[0],
            source.quarter_payment_records[0],
          ],
        },
      }, "payment records must be distinct"],
      [{
        f1040es: {
          payment_q1: 400,
          payment_q1_date: "2025-04-16",
          quarter_payment_records: one.f1040es.quarter_payment_records,
        },
      }, "q1 date differs from its payment record"],
    ] as const
  ) {
    assertThrows(
      () => irs1040.build(owned, { pending: attached }),
      Error,
      reason,
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(owned, attached),
      Error,
      reason,
    );
  }
});
