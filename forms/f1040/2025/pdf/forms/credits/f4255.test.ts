import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import {
  calculateForm4255Routes,
  f4255,
  inputSchema,
} from "../../../../nodes/inputs/f4255/index.ts";
import { schedule2 } from "../../../../nodes/intermediate/aggregation/schedule2/index.ts";
import { form4255Row } from "../../../domains/credits/form4255/form4255.fixture.ts";
import { form8992Filer } from "../../../domains/international/form8992/form8992.fixture.ts";
import { form4255 } from "../../../mef/forms/credits/f4255.ts";
import { form4255Pdf } from "./f4255.ts";
import { fillFormPdf } from "../../builder.ts";

const row2a = {
  ...form4255Row,
  recaptured_total: 0,
  recaptured_carryover: 0,
  recaptured_net_epe: 0,
};
const row1d = {
  ...row2a,
  credit_line: "1d" as const,
  source_document_reference: "2024 Form 3468 Part IV and IRS notice",
  prior_credit_evidence: {
    ...row2a.prior_credit_evidence,
    original_form: "3468_part_iv" as const,
    filed_return_reference: "accepted-2024-form3468-partiv",
    filed_return_sha256: "c".repeat(64),
  },
  excessive_payment_notice: {
    ...row2a.excessive_payment_notice,
    notice_reference: "irs-2025-form3468-ep-determination",
    notice_sha256: "d".repeat(64),
    determined_excessive_payment: 200,
    net_epe_portion: 200,
  },
  excessive_payment_net_epe: 200,
  excessive_payment_20_percent: 40,
};

const source = { rows: [row1d, row2a] };
const pending = {
  schedule2: {
    line1e_form4255_excessive_payment: 500,
    line1f_form4255_20_percent_ep: 100,
  },
};

Deno.test("Form 4255 EP-only rows route through Schedule 2 and project to matching PDF Part I", () => {
  const parsed = inputSchema.parse(source);
  const result = f4255.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  );
  const schedule2Fields = fieldsOf(result.outputs, schedule2);
  assertEquals(schedule2Fields?.line1e_form4255_excessive_payment, 500);
  assertEquals(schedule2Fields?.line1f_form4255_20_percent_ep, 100);
  assertEquals(calculateForm4255Routes(parsed).line19, 0);
  const [pdf] = form4255Pdf.instances!(source, form8992Filer, pending);
  assertEquals(form4255Pdf.pageIndices!(pdf), [0, 1, 2]);
  assertEquals(pdf["1d_a"], 10_000);
  assertEquals(pdf["1d_d"], 5_000);
  assertEquals(pdf["1d_f"], 1_000);
  assertEquals(pdf["1d_n1"], 200);
  assertEquals(pdf["1d_n3"], 40);
  assertEquals(pdf["2a_n1"], 300);
  assertEquals(pdf["2a_n3"], 60);
  assertEquals(pdf["3_q"], 600);
  assertEquals(pdf["3_s"], 500);
  assertEquals(pdf["3_t"], 100);
  assertEquals(
    form4255Pdf.fields.find((field) => field.domainKey === "2a_n3")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_Part1_ColJ-N3[0].Row2a[0].f2_153[0]",
  );
  assertThrows(
    () => form4255.build(source, { pending }),
    Error,
    "authenticated prior-credit and IRS determination source bytes",
  );
});

Deno.test("Form 4255 EP-only PDF retains its three populated Part I pages", async () => {
  const [fields] = form4255Pdf.instances!(source, form8992Filer, pending);
  const pdf = await fillFormPdf(
    form4255Pdf,
    fields,
    form8992Filer,
    ".pdf-cache",
    pending,
  );
  if (!pdf) throw new Error("Missing Form 4255 PDF");
  const filled = await PDFDocument.load(pdf);
  assertEquals(filled.getPageCount(), 5);
  const packet = await PDFDocument.create();
  for (
    const page of await packet.copyPages(
      filled,
      [...form4255Pdf.pageIndices!(fields)],
    )
  ) packet.addPage(page);
  assertEquals(packet.getPageCount(), 3);
});

Deno.test("Form 4255 PDF rejects source, return, and unsupported recapture changes", () => {
  assertThrows(
    () => form4255Pdf.instances!(source, form8992Filer),
    Error,
    "finalized return",
  );
  assertThrows(
    () =>
      form4255Pdf.instances!(source, form8992Filer, {
        schedule2: {
          ...pending.schedule2,
          line1e_form4255_excessive_payment: 499,
        },
      }),
    Error,
    "differs from Schedule 2",
  );
  assertThrows(
    () =>
      form4255Pdf.instances!({ rows: [form4255Row] }, form8992Filer, {
        schedule2: {
          line1e_form4255_excessive_payment: 300,
          line1f_form4255_20_percent_ep: 60,
          line1d_form4255_net_epe: 1_500,
        },
      }),
    Error,
    "EP-only row",
  );
  assertThrows(
    () =>
      form4255Pdf.instances!(
        { rows: [row2a, row2a] },
        form8992Filer,
        {
          schedule2: {
            line1e_form4255_excessive_payment: 600,
            line1f_form4255_20_percent_ep: 120,
          },
        },
      ),
    Error,
    "one staged row per credit line",
  );
  assertThrows(
    () =>
      form4255Pdf.instances!(
        {
          rows: [{
            ...row2a,
            excessive_payment_notice: {
              ...row2a.excessive_payment_notice,
              net_epe_portion: 299,
            },
          }],
        },
        form8992Filer,
        pending,
      ),
    Error,
  );
  assertThrows(
    () =>
      form4255Pdf.instances!(
        {
          rows: [{
            ...row1d,
            prior_credit_evidence: {
              ...row1d.prior_credit_evidence,
              prior_credit_claimed: 9_999,
            },
          }],
        },
        form8992Filer,
        pending,
      ),
    Error,
  );
});
