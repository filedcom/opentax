import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { refundAllocationGraph2026 } from "../inputs/refund-allocation.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  buildForm8888PdfBytes2026,
  projectRefundFields2026,
} from "./refund-allocation.ts";
import { buildF1040PdfBytes2026 } from "./f1040.ts";
import { form1062GraphFixture2026 } from "../inputs/form1062-graph.fixture.ts";
import { landGraphFixture2026 } from "../inputs/land-graph.fixture.ts";

Deno.test("2026 refund allocation composes with QBI and an evidenced farmland election in attachment order", async () => {
  const base = landGraphFixture2026(45000, [], 40000);
  base.w2s[0].box2_fed_withheld = 10000;
  const land = await form1062GraphFixture2026(base);
  const refund = refundAllocationGraph2026().refund_allocation;
  refund.claim.accounts.forEach((a) =>
    a.owner_name =
      `${base.general.taxpayer_first_name} ${base.general.taxpayer_last_name}`
  );
  const bundle = await buildDraftReturnPdf2026({
    ...land.graph,
    refund_allocation: refund,
  }, land.documents);
  const index = (name: string) =>
    bundle.attachments.findIndex((a) => a.form === name);
  assert(index("form8995") >= 0);
  assert(index("form8995") < index("form8888"));
  assert(index("form8888") < index("form1062"));
  assertEquals(bundle.sourceAttachments.length, 1);
  const f = bundle.calculation.pending.f1040;
  assertEquals(f.line35a_refund, 6655);
  const allocation = projectRefundFields2026(f, refund.claim).result;
  assertEquals(allocation.total_allocation, f.line35a_refund);
  assertEquals(allocation.accounts[0].amount, Number(f.line35a_refund) - 1000);
});

async function inspect(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", file, "-"],
    }).output();
    assertEquals(result.code, 0);
    return new TextDecoder().decode(result.stdout).split("\f").slice(0, -1);
  } finally {
    await Deno.remove(file);
  }
}

Deno.test("2026 split refund bundle prints the computed remainder and keeps single-account fields empty", async () => {
  const input = refundAllocationGraph2026();
  const bundle = await buildDraftReturnPdf2026(input);
  assertEquals(bundle.calculation.diagnostics, []);
  assertEquals(bundle.filingReady, false);
  const pages = await inspect(bundle.bytes);
  const attachment = bundle.attachments.find((a) => a.form === "form8888")!;
  assertEquals(attachment.formPages.length, 1);
  assertEquals(attachment.statementPages, []);
  const form = pages[attachment.formPages[0] - 1];
  assertStringIncludes(form, "5385");
  assertStringIncludes(form, "1000");
  assertStringIncludes(form, "6385");
  assertStringIncludes(form, "Sam Wheat");
  assertStringIncludes(form, "26");
  assertStringIncludes(form.replace(/\s/g, ""), "012345672");
  assertStringIncludes(form.replace(/\s/g, ""), "12345678");
  assert(!pages[1].replace(/\s/g, "").includes("012345672"));
  assertStringIncludes(pages[1], "6385");
  const mapped = projectRefundFields2026(
    bundle.calculation.pending.f1040,
    input.refund_allocation.claim,
  ).fields;
  assertEquals(mapped.form8888_attached, true);
  assertEquals(mapped.line35b_routing_number, undefined);
});

Deno.test("2026 one-account refund prints on 1040 and does not attach Form 8888", async () => {
  const input = refundAllocationGraph2026();
  input.refund_allocation.claim.accounts.splice(1);
  const bundle = await buildDraftReturnPdf2026(input);
  assert(!bundle.attachments.some((a) => a.form === "form8888"));
  const pages = await inspect(bundle.bytes);
  assertStringIncludes(pages[1].replace(/\s/g, ""), "012345672");
  assertStringIncludes(pages[1].replace(/\s/g, ""), "12345678");
  await assertRejects(
    () =>
      buildForm8888PdfBytes2026(
        input.refund_allocation.claim,
        bundle.calculation.pending.f1040,
      ),
    Error,
    "One refund account",
  );
});

Deno.test("2026 three-account refund preserves the 2027 election and omits reserved line 4", async () => {
  const base = refundAllocationGraph2026();
  base.refund_allocation.claim.accounts.push({
    ...base.refund_allocation.claim.accounts[1],
    record_reference: "third-account",
    account_number: "ABC-1234567890123",
    allocation: 500,
  });
  const bundle = await buildDraftReturnPdf2026({
    ...base,
    general: {
      ...base.general,
      apply_overpayment_to_2027_estimated_tax_amount: 300,
    },
  });
  const pages = await inspect(bundle.bytes);
  const form = pages[
    bundle.attachments.find((a) => a.form === "form8888")!.formPages[0] - 1
  ];
  for (const value of ["4585", "1000", "500", "6085"]) {
    assertStringIncludes(form, value);
  }
  assertStringIncludes(form.replace(/\s/g, ""), "ABC-1234567890123");
  assertStringIncludes(pages[1], "6385");
  assertStringIncludes(pages[1], "6085");
  assertStringIncludes(pages[1], "300");
  const reserved = form.split("\n").find((line) =>
    /4\s+Reserved for future use/.test(line)
  );
  assert(reserved);
  assert(!/\d{2}/.test(reserved));
});

Deno.test("2026 PDF refund routing rejects missing sources, altered totals and direct-deposit conflicts", async () => {
  const input = refundAllocationGraph2026();
  const f = (await executeDraftSources2026(input)).pending.f1040;
  await assertRejects(
    () => buildF1040PdfBytes2026({ ...f, form8888_attached: true }),
    Error,
    "retained allocation",
  );
  await assertRejects(
    () => buildF1040PdfBytes2026({ ...f, line35b_routing_number: "012345672" }),
    Error,
    "retained allocation",
  );
  await assertRejects(
    () => buildF1040PdfBytes2026({ ...f, bank_routing_number: "012345672" }),
    Error,
    "reviewed",
  );
  input.refund_allocation.claim.accounts[0].allocation = 5385;
  await assertRejects(
    () =>
      buildForm8888PdfBytes2026(input.refund_allocation.claim, {
        ...f,
        line35a_refund: 6384,
      }),
    Error,
    "line 5",
  );
  await assertRejects(
    () =>
      buildDraftReturnPdf2026({
        ...input,
        general: {
          ...input.general,
          bank_routing_number: "012345672",
          bank_account_number: "12345678",
          bank_account_type: "checking",
        },
      }),
    Error,
    "conflicts",
  );
  input.refund_allocation.claim.accounts[1].owner_name = "Someone Else";
  await assertRejects(
    () => buildDraftReturnPdf2026(input),
    Error,
    "account owner",
  );
});
