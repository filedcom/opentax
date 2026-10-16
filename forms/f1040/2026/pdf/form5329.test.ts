import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  earlyRetirementGraph2026,
  earlyRetirementSource2026,
} from "../inputs/retirement-early.fixture.ts";
import { buildForm5329PdfBytes2026 } from "./form5329.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { FilingStatus } from "../../nodes/types.ts";

export function jointEarlyRetirementGraph2026() {
  const graph = earlyRetirementGraph2026(true);
  Object.assign(graph.general, {
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Alex",
    spouse_last_name: "Wheat",
    spouse_ssn: "555667777",
    spouse_dob: "1991-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  });
  const spouse = earlyRetirementSource2026(true, 4000);
  const c = spouse.claim.copies[0];
  c.source_document_reference = "spouse-early";
  c.statement_identifier = "spouse-early";
  c.account_number = "spouse-account";
  c.recipient = "spouse";
  c.recipient_tin = "555667777";
  spouse.claim.reviews[0].source_document_reference =
    c.source_document_reference;
  graph.f1099r.claim.copies.push(c);
  graph.f1099r.claim.reviews.push(spouse.claim.reviews[0]);
  return graph;
}
async function inspect(
  bytes: Uint8Array,
  check: (
    read: (page: number, rect?: number[]) => Promise<string>,
  ) => Promise<void>,
) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    await check(async (page, rect) => {
      const args = ["-layout", "-f", String(page), "-l", String(page)];
      if (rect) {
        const [x, y, w, h] = rect;
        args.push(
          "-x",
          String(x),
          "-y",
          String(y),
          "-W",
          String(w),
          "-H",
          String(h),
        );
      }
      const r = await new Deno.Command("pdftotext", {
        args: [...args, path, "-"],
      }).output();
      assertEquals(r.code, 0);
      return new TextDecoder().decode(r.stdout).trim();
    });
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 all-code-1 draft uses direct Schedule 2 tax without Form 5329", async () => {
  const b = await buildDraftReturnPdf2026(earlyRetirementGraph2026());
  assertEquals(b.attachments.map((a) => a.form), ["f1040", "schedule2"]);
  assertEquals(b.calculation.pending.schedule2.line5_form5329_early_tax, 1000);
  await inspect(b.bytes, async (read) => {
    assertStringIncludes(await read(3), "1000");
    assertEquals(await read(3, [467, 421, 9, 9]), "✔");
    assertStringIncludes(await read(2), "1000");
  });
});
Deno.test("2026 SIMPLE draft prints source-derived Part I and omits unused parts and draft cover", async () => {
  const b = await buildDraftReturnPdf2026(earlyRetirementGraph2026(true));
  const part = b.attachments.find((a) => a.form === "form5329:taxpayer")!;
  assertEquals(part.formPages, [5, 6, 7]);
  assertEquals(part.statementPages, []);
  await inspect(b.bytes, async (read) => {
    assertEquals(await read(3, [467, 421, 9, 9]), "");
    assertEquals(await read(5, [36, 94, 438, 14]), "Sam Wheat");
    assertEquals(await read(5, [476, 94, 100, 14]), "400001037");
    assertEquals(await read(5, [505, 252, 71, 12]), "10000");
    assertEquals(await read(5, [505, 276, 71, 12]), "");
    assertEquals(await read(5, [505, 288, 71, 12]), "10000");
    assertEquals(await read(5, [505, 300, 71, 12]), "2500");
    assertStringIncludes(await read(7), "DRAFT - NOT FOR FILING");
  });
});
Deno.test("2026 joint early drafts retain separate owner identities and reconcile the combined tax", async () => {
  const b = await buildDraftReturnPdf2026(jointEarlyRetirementGraph2026());
  const forms = b.attachments.filter((a) => a.form.startsWith("form5329:"));
  assertEquals(forms.map((a) => a.form), [
    "form5329:taxpayer",
    "form5329:spouse",
  ]);
  assertEquals(b.calculation.pending.schedule2.line5_form5329_early_tax, 3500);
  await inspect(b.bytes, async (read) => {
    assertEquals(await read(forms[0].formPages[0], [505, 300, 71, 12]), "2500");
    assertEquals(
      await read(forms[1].formPages[0], [36, 94, 438, 14]),
      "Alex Wheat",
    );
    assertEquals(
      await read(forms[1].formPages[0], [476, 94, 100, 14]),
      "555667777",
    );
    assertEquals(await read(forms[1].formPages[0], [505, 300, 71, 12]), "1000");
  });
  const s = earlyRetirementSource2026(true);
  await assertRejects(
    () =>
      buildForm5329PdfBytes2026(s, "taxpayer", 2499, {
        name: "Sam Wheat",
        ssn: s.taxpayer_ssn,
      }),
    Error,
    "Schedule 2",
  );
  await assertRejects(
    () =>
      buildForm5329PdfBytes2026(s, "taxpayer", 2500, {
        name: "Alex Wheat",
        ssn: "555667777",
      }),
    Error,
    "identity",
  );
  await assertRejects(
    () =>
      buildForm5329PdfBytes2026(earlyRetirementSource2026(), "taxpayer", 1000, {
        name: "Sam Wheat",
        ssn: s.taxpayer_ssn,
      }),
    Error,
    "source-derived",
  );
});

Deno.test("2026 fully exempt early distribution retains Form 5329 with printed exception and zero tax", async () => {
  const { exceptionRetirementGraph2026 } = await import(
    "../inputs/retirement-exceptions.fixture.ts"
  );
  const b = await buildDraftReturnPdf2026(exceptionRetirementGraph2026());
  assertEquals(b.attachments.map((a) => a.form), [
    "f1040",
    "form5329:taxpayer",
  ]);
  const page = b.attachments[1].formPages[0];
  await inspect(b.bytes, async (read) => {
    assertEquals(await read(page, [505, 252, 71, 12]), "10000");
    assertEquals(await read(page, [315, 276, 40, 12]), "10");
    assertEquals(await read(page, [505, 276, 71, 12]), "10000");
    assertEquals(await read(page, [505, 288, 71, 12]), "0");
    assertEquals(await read(page, [505, 300, 71, 12]), "0");
  });
});
Deno.test("2026 owner draft prints multiple-exception code and taxable partial exemption", async () => {
  const { claimEarlyExceptions2026 } = await import(
    "../inputs/retirement-exceptions.fixture.ts"
  );
  const s = earlyRetirementSource2026(false, 15000);
  s.taxpayer_dob = "1967-03-01";
  const e = s.claim.reviews[0].early_distribution!;
  e.payments = [
    {
      record_reference: "levy",
      payment_date: "2026-02-01",
      gross: 5000,
      taxable: 5000,
    },
    {
      record_reference: "ordinary",
      payment_date: "2026-08-01",
      gross: 5000,
      taxable: 5000,
    },
    {
      record_reference: "older",
      payment_date: "2026-09-01",
      gross: 5000,
      taxable: 5000,
    },
  ];
  claimEarlyExceptions2026(s, [
    {
      kind: "irs_levy",
      record_reference: "levy-order",
      payment_reference: "levy",
      levy_date: "2026-01-01",
      amount_paid_under_levy: 5000,
      irs_levy_on_this_retirement_account_verified: true,
    },
    {
      kind: "age59_half",
      record_reference: "birth-record",
      payment_reference: "older",
      actual_payment_date_and_birth_record_verified: true,
    },
  ]);
  const bytes = await buildForm5329PdfBytes2026(s, "taxpayer", 500, {
    name: "Sam Wheat",
    ssn: s.taxpayer_ssn,
  });
  await inspect(bytes, async (read) => {
    assertEquals(await read(1, [315, 276, 40, 12]), "99");
    assertEquals(await read(1, [505, 276, 71, 12]), "10000");
    assertEquals(await read(1, [505, 288, 71, 12]), "5000");
    assertEquals(await read(1, [505, 300, 71, 12]), "500");
  });
});

Deno.test("2026 death and terminal exceptions print owner forms and keep private medical evidence out of the return", async () => {
  const { deathRetirementSource2026, terminalRetirementSource2026 } =
    await import("../inputs/retirement-life-events.fixture.ts");
  const { exceptionRetirementGraph2026 } = await import(
    "../inputs/retirement-exceptions.fixture.ts"
  );
  for (
    const [s, code] of [[deathRetirementSource2026(), "04"], [
      terminalRetirementSource2026(true),
      "20",
    ]] as const
  ) {
    const b = await buildDraftReturnPdf2026(exceptionRetirementGraph2026(s));
    assertEquals(b.attachments.map((a) => a.form), [
      "f1040",
      "form5329:taxpayer",
    ]);
    const page = b.attachments[1].formPages[0];
    await inspect(b.bytes, async (read) => {
      assertEquals(await read(page, [315, 276, 40, 12]), code);
      assertEquals(await read(page, [505, 276, 71, 12]), "10000");
      assertEquals(await read(page, [505, 300, 71, 12]), "0");
      for (let p = 1; p <= 5; p++) {
        const text = await read(p);
        assertEquals(text.includes("Synthetic Physician"), false);
        assertEquals(text.includes("private-supporting-records"), false);
        assertEquals(text.includes("111223333"), false);
      }
    });
    assertEquals(b.sourceAttachments, []);
  }
});

Deno.test("2026 disability exception prints code 03 for a SIMPLE distribution without medical evidence in the draft", async () => {
  const { disabilityWithdrawal2026 } = await import(
    "../inputs/retirement-disability.fixture.ts"
  );
  const { exceptionRetirementGraph2026 } = await import(
    "../inputs/retirement-exceptions.fixture.ts"
  );
  const b = await buildDraftReturnPdf2026(
    exceptionRetirementGraph2026(disabilityWithdrawal2026(true)),
  );
  assertEquals(b.attachments.map((a) => a.form), [
    "f1040",
    "form5329:taxpayer",
  ]);
  const page = b.attachments[1].formPages[0];
  await inspect(b.bytes, async (read) => {
    assertEquals(await read(page, [315, 276, 40, 12]), "03");
    assertEquals(await read(page, [505, 252, 71, 12]), "10000");
    assertEquals(await read(page, [505, 276, 71, 12]), "10000");
    assertEquals(await read(page, [505, 288, 71, 12]), "0");
    assertEquals(await read(page, [505, 300, 71, 12]), "0");
    for (let p = 1; p <= 5; p++) {
      const text = await read(p);
      assertEquals(text.includes("private-disability"), false);
      assertEquals(text.includes("2027-01-15"), false);
    }
  });
  assertEquals(b.sourceAttachments, []);
});
