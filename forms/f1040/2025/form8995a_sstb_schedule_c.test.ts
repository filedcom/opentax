import type { MefFormsPending } from "./mef/types.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import {
  calculateOneSstb8995ALines,
  inputSchema,
} from "../nodes/intermediate/forms/form8995a/index.ts";

const fixture = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-accounting-sstb-phasein"
)!;
type Pending = Record<string, Record<string, unknown>>;
function prepared(): Pending {
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending) as Pending;
}
function bundle(pending: Pending, filer = fixture.filer) {
  return buildMefBundle(pending as MefFormsPending, {
    filer,
    year: 2025,
    returnType: "1040",
    schemaVersion: "2025v5.4",
    attachments: [],
  });
}
Deno.test("owned accounting SSTB payroll and filed SE reach Schedule A, fractional phase-in and full return", async () => {
  const p = prepared();
  assertEquals(p.schedule1.line3_schedule_c, 28431);
  assertEquals(p.schedule1.line15_se_deduction, 381);
  assertEquals(p.f1040.line11_agi, 238050);
  assertEquals(p.f1040.line13_qbi_deduction, 2652);
  assertEquals(p.f1040.line15_taxable_income, 219648);
  assertEquals(p.f1040.line24_total_tax, 48437);
  const l = calculateOneSstb8995ALines(inputSchema.parse(p.form8995a));
  assertEquals([l.line2, l.line4, l.line3, l.line19, l.line25, l.line39], [
    14025,
    5000,
    2805,
    305,
    153,
    2652,
  ]);
  const b = await bundle(p);
  assertStringIncludes(b.xml, "<IRS8995AScheduleA");
  assertStringIncludes(b.xml, "<ApplicablePct>0.50000</ApplicablePct>");
  assertStringIncludes(
    b.xml,
    "<ApplicablePctQBIAmt>14025</ApplicablePctQBIAmt>",
  );
  assertEquals(b.xml.includes("<IRS8995 "), false);
  assertEquals(
    (await buildPdfBytes(p, fixture.filer, ".pdf-cache", b)).length > 1000,
    true,
  );
});
Deno.test("SSTB native and PDF exports reject detached payroll, source classification, owner and filed amounts", async () => {
  const base = prepared();
  const mutations: ((p: Pending) => void)[] = [
    (p) => {
      delete p.form8995a_schedule_a;
    },
    (p) => {
      p.form8995 = { ...p.form8995, qbi_deduction: 2652 };
    },
    (p) => {
      p.schedule1.line15_se_deduction = 380;
    },
    (p) => {
      p.schedule_se.w2_ss_wages = 176099;
    },
    (p) => {
      p.f1040.line13_qbi_deduction = 2653;
    },
    (p) => {
      p.f1040.line11_agi = 238051;
    },
    (p) => {
      p.general.qbi_no_prior_loss_or_suspended_loss_confirmed = false;
    },
    (p) => {
      p.f1040.line3a_qualified_dividends = 1;
    },
  ];
  for (const change of mutations) {
    const p = structuredClone(base);
    change(p);
    await assertRejects(() => bundle(p));
    await assertRejects(() => buildPdfBytes(p, fixture.filer, ".pdf-cache"));
  }
  const sourceMutations:
    ((c: Record<string, unknown>, r: Record<string, unknown>) => void)[] = [
      (c) => {
        c.line_b_business_code = "541330";
      },
      (c) => {
        c.line_1_gross_receipts = 38432;
      },
      (_c, r) => {
        r.owner_ssn = "222334444";
      },
      (_c, r) => {
        r.reviewed_on = "2026-02-31";
      },
      (_c, r) => {
        r.reviewed_on = "2025-03-01";
      },
      (_c, r) => {
        (r.employee_w2_records as Record<string, unknown>[])[0].employer_ein =
          "999999999";
      },
      (_c, r) => {
        (r.employee_w2_records as Record<string, unknown>[])[0].box1_wages =
          9999;
      },
      (_c, r) => {
        const rows = r.employee_w2_records as Record<string, unknown>[];
        rows.push(structuredClone(rows[0]));
      },
      (_c, r) => {
        (r.employee_w2_records as Record<string, unknown>[])[0]
          .filed_within_60_days_of_due_date_confirmed = false;
      },
    ];
  for (const change of sourceMutations) {
    const p = structuredClone(base);
    const c = (p.schedule_c.schedule_cs as Record<string, unknown>[])[0];
    change(c, c.qbi_sstb_filing_review as Record<string, unknown>);
    // Change both retained copies so the payroll/classification join itself must reject.
    for (const key of ["form8995a", "form8995a_schedule_a"]) {
      const copied = p[key].single_sstb_schedule_c_source as Record<
        string,
        unknown
      >;
      (copied.business as Record<string, unknown>).source_schedule_c =
        structuredClone(c);
    }
    await assertRejects(() => bundle(p));
    await assertRejects(() => buildPdfBytes(p, fixture.filer, ".pdf-cache"));
  }
  const wrongFiler = { ...fixture.filer, primarySSN: "222334444" };
  await assertRejects(() => bundle(base, wrongFiler));
  await assertRejects(() => buildPdfBytes(base, wrongFiler, ".pdf-cache"));
});

Deno.test("owner-only SSTB has a positive phase-in deduction with no employee wages", async () => {
  const noPayroll = pdfReviewFixtures.find((f) =>
    f.id === "single-form8995a-accounting-sstb-no-payroll"
  )!;
  const result = f1040_2025.executeReturn({ ...noPayroll.inputs });
  assertEquals(result.diagnostics, []);
  const p = buildPending(result.pending) as Pending;
  assertEquals(p.f1040.line11_agi, 238050);
  assertEquals(p.f1040.line13_qbi_deduction, 1402);
  assertEquals(p.f1040.line15_taxable_income, 220898);
  const l = calculateOneSstb8995ALines(inputSchema.parse(p.form8995a));
  assertEquals([
    l.line2,
    l.line4,
    l.line3,
    l.line10,
    l.line19,
    l.line25,
    l.line39,
  ], [14025, 0, 2805, 0, 2805, 1403, 1402]);
  const b = await bundle(p);
  assertStringIncludes(
    b.xml,
    "<AllocableShareW2WagesAmt>0</AllocableShareW2WagesAmt>",
  );
  assertEquals(
    (await buildPdfBytes(p, noPayroll.filer, ".pdf-cache", b)).length > 1000,
    true,
  );
  for (
    const mutation of [
      "missing-ledger",
      "claimed-wages",
      "claimed-expense",
      "both-workforces",
    ]
  ) {
    const changed = structuredClone(p);
    const c = (changed.schedule_c.schedule_cs as Record<string, unknown>[])[0];
    const review = c.qbi_sstb_filing_review as Record<string, unknown>;
    if (mutation === "missing-ledger") {
      delete review.no_business_employees_review;
    }
    if (mutation === "claimed-wages") c.qbi_w2_wages = 1;
    if (mutation === "claimed-expense") c.line_26_wages = 1;
    if (mutation === "both-workforces") {
      review.employee_w2_records = [{
        employee_ssn: "222334444",
        employer_ein: "123456789",
        source_document_reference: "Synthetic conflicting employee W2",
        box1_wages: 1,
        box5_wages: 1,
        ssa_filing_record_reference: "Synthetic submission",
        filed_within_60_days_of_due_date_confirmed: true,
      }];
    }
    for (const key of ["form8995a", "form8995a_schedule_a"]) {
      ((changed[key].single_sstb_schedule_c_source as Record<string, unknown>)
        .business as Record<string, unknown>).source_schedule_c =
          structuredClone(c);
    }
    await assertRejects(() => bundle(changed));
    await assertRejects(() =>
      buildPdfBytes(changed, noPayroll.filer, ".pdf-cache")
    );
  }
});
