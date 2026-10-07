import {
  assertAlmostEquals,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../nodes/inputs/schedule_c/model.ts";
import type { MefFormsPending } from "./mef/types.ts";
import type { PdfReviewFixture } from "./pdf/review-fixtures.ts";

type Pending = Record<string, Record<string, unknown>>;
function prepared(f: PdfReviewFixture): Pending {
  const r = f1040_2025.executeReturn({ ...f.inputs });
  assertEquals(r.diagnostics, []);
  return buildPending(r.pending) as Pending;
}
function bundle(p: Pending, f: PdfReviewFixture, attachments = f.attachments) {
  return buildMefBundle(p as MefFormsPending, {
    filer: f.filer,
    attachments: [...(attachments ?? [])],
  });
}
const fixtures = ["full", "partial", "zero"].map((kind) =>
  pdfReviewFixtures.find((f) =>
    f.id === `single-form8994-direct-employer-${kind}`
  )!
);
Deno.test("Form8994 reviewed public employer sources preserve full wage reduction under full, partial and zero tax use", async () => {
  const expected = [[51250, 3621, 47629, 6376, 25503, 1250, 8817], [
    26250,
    1855,
    24395,
    1729,
    6916,
    693,
    3709,
  ], [16250, 1148, 15102, 0, 0, 0, 2296]];
  for (const [i, f] of fixtures.entries()) {
    const p = prepared(f);
    const c = projectScheduleCItems(scheduleCSchema.parse(p.schedule_c))[0];
    assertEquals(c.line_26_wages, 50000);
    assertEquals(c.line_26_other_employment_credits, 1250);
    assertEquals(
      (p.schedule_c.schedule_cs as Record<string, unknown>[])[0]
        .line_26_other_employment_credits,
      undefined,
    );
    assertEquals([
      p.schedule1.line3_schedule_c,
      p.schedule1.line15_se_deduction,
      p.f1040.line11_agi,
      p.f1040.line13_qbi_deduction ?? 0,
      p.f1040.line15_taxable_income,
      p.f3800.form8994_applied_credit,
      p.f1040.line24_total_tax,
    ], expected[i]);
    const b = await bundle(p, f);
    assertStringIncludes(b.xml, "<IRS8994");
    assertStringIncludes(
      b.xml,
      "<TotPaidFamilyMedicalLeaveCrAmt>1250</TotPaidFamilyMedicalLeaveCrAmt>",
    );
    assertEquals(
      b.form3800Parts!.currentAmounts.find((r) => r.line === "4j")!
        .appliedCredit,
      expected[i][5],
    );
    assertEquals(b.attachments.length, 6);
    assertEquals(
      (await buildPdfBytes(p, f.filer, ".pdf-cache", b)).length > 1000,
      true,
    );
  }
});
Deno.test("Form8994 actual native/PDF source packet rejects detached employer, wage, tax and reviewed bytes", async () => {
  const f = fixtures[1];
  const base = prepared(f);
  const valid = await bundle(base, f);
  const changes: ((p: Pending) => void)[] = [
    (p) => {
      p.f1040.taxpayer_ssn = "111223333";
    },
    (p) => {
      (p.schedule_c.schedule_cs as Record<string, unknown>[])[0]
        .proprietor_recipient = "S";
    },
    (p) => {
      (p.schedule_c.schedule_cs as Record<string, unknown>[])[0].line_d_ein =
        "111111111";
    },
    (p) => {
      (p.schedule_c.schedule_cs as Record<string, unknown>[])[0].line_26_wages =
        49999;
    },
    (p) => {
      delete p.schedule_c.form8994_wage_reductions;
    },
    (p) => {
      (p.schedule_c.form8994_wage_reductions as Record<string, unknown>[])[0]
        .credit_amount = 693;
    },
    (p) => {
      (p.schedule_c.schedule_cs as Record<string, unknown>[])[0]
        .line_26_other_employment_credits = 1250;
    },
    (p) => {
      p.f3800.form8994_applied_credit = 694;
    },
    (p) => {
      p.f1040.line20_nonrefundable_credits = 694;
    },
    (p) => {
      p.f1040.line24_total_tax = 3708;
    },
    (p) => {
      p.schedule1.line15_se_deduction = 1854;
    },
    (p) => {
      p.f1040.line13_qbi_deduction = 1728;
    },
    (p) => {
      p.f8994.schedule_c_business_reference = "other-business";
    },
    (p) => {
      const e = p.f8994.reviewed_evidence as Record<string, unknown>;
      (e.written_policy as Record<string, unknown>).employer_ein = "111111111";
    },
    (p) => {
      const e = p.f8994.reviewed_evidence as Record<string, unknown>;
      (e.written_policy as Record<string, unknown>).sha256 = "0".repeat(64);
    },
    (p) => {
      const rows = (p.f8994.reviewed_evidence as Record<string, unknown>)
        .employee_records as Record<string, unknown>[];
      (rows[0].leave_payroll as Record<string, unknown>).employee_ssn =
        "123450002";
    },
    (p) => {
      const rows = (p.f8994.reviewed_evidence as Record<string, unknown>)
        .employee_records as Record<string, unknown>[];
      (rows[0].prior_2024_compensation as Record<string, unknown>)
        .compensation_amount = 79999;
    },
  ];
  for (const change of changes) {
    const p = structuredClone(base);
    change(p);
    await assertRejects(() => bundle(p, f));
    await assertRejects(() => buildPdfBytes(p, f.filer, ".pdf-cache", valid));
  }
  const uploads = f.attachments!;
  for (
    const attachments of [
      uploads.slice(1),
      [...uploads, uploads[0]],
      uploads.map((a, i) =>
        i ? a : { ...a, bytes: new Uint8Array([...a.bytes, 10]) }
      ),
    ]
  ) {
    await assertRejects(() => bundle(base, f, attachments));
    await assertRejects(() =>
      buildPdfBytes(base, f.filer, ".pdf-cache", { ...valid, attachments })
    );
  }
  await assertRejects(() => buildPdfBytes(base, f.filer, ".pdf-cache"));
  const wrong = { ...f, filer: { ...f.filer, primarySSN: "111223333" } };
  await assertRejects(() => bundle(base, wrong));
  await assertRejects(() =>
    buildPdfBytes(base, wrong.filer, ".pdf-cache", valid)
  );
});

Deno.test("Form8994 partial-use public receipts retain cents through filed SE/QBI/native equations", async () => {
  for (const cents of [0.49, 0.50]) {
    const inputs = structuredClone(fixtures[1].inputs);
    (inputs.schedule_c as Record<string, unknown>[])[0].line_1_gross_receipts =
      75000 + cents;
    const f = { ...fixtures[1], inputs };
    const p = prepared(f);
    assertAlmostEquals(
      p.schedule1.line3_schedule_c as number,
      26250 + cents,
      0.000001,
    );
    assertAlmostEquals(p.f1040.line11_agi as number, 24395 + cents, 0.000001);
    assertEquals(p.f1040.line13_qbi_deduction, 1729);
    assertEquals(p.f3800.form8994_applied_credit, 693);
    const b = await bundle(p, f);
    assertStringIncludes(
      b.xml,
      `<AdjustedGrossIncomeAmt>${
        24395 + Math.round(cents)
      }</AdjustedGrossIncomeAmt>`,
    );
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(b.xml));
    await writer.close();
    const validation = await child.output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
    assertEquals(
      (await buildPdfBytes(p, f.filer, ".pdf-cache", b)).length > 1000,
      true,
    );
  }
});
