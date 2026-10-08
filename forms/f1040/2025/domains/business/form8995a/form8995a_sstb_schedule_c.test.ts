import type { MefFormsPending } from "../../../mef/types.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import {
  calculateOneSstb8995ALines,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form8995a/index.ts";

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

Deno.test("joint primary-owner SSTB uses joint threshold, source SE and fractional applicability", async () => {
  const joint = pdfReviewFixtures.find((f) =>
    f.id === "joint-primary-form8995a-accounting-sstb-phasein"
  )!;
  const result = f1040_2025.executeReturn({ ...joint.inputs });
  assertEquals(result.diagnostics, []);
  const p = buildPending(result.pending) as Pending;
  assertEquals(p.schedule1.line15_se_deduction, 381);
  assertEquals(p.f1040.line11_agi, 448050);
  assertEquals(p.f1040.line12a_standard_deduction, 31500);
  assertEquals(p.f1040.line13_qbi_deduction, 4275);
  assertEquals(p.f1040.line15_taxable_income, 412275);
  assertEquals(p.f1040.line16_income_tax, 86054);
  assertEquals(p.f1040.line24_total_tax, 88581);
  const l = calculateOneSstb8995ALines(inputSchema.parse(p.form8995a));
  assertEquals([l.threshold, l.phaseInRange, l.phaseIn, l.applicable], [
    394600,
    100000,
    0.2195,
    0.7805,
  ]);
  assertEquals([
    l.line2,
    l.line4,
    l.line3,
    l.line10,
    l.line19,
    l.line25,
    l.line39,
  ], [21893, 7805, 4379, 3903, 476, 104, 4275]);
  const b = await bundle(p, joint.filer);
  assertStringIncludes(b.xml, "<ApplicablePct>0.78050</ApplicablePct>");
  assertEquals(
    (await buildPdfBytes(p, joint.filer, ".pdf-cache", b)).length > 1000,
    true,
  );
  const wrongFiler = {
    ...joint.filer,
    filingStatus: fixture.filer.filingStatus,
    spouse: undefined,
  };
  await assertRejects(() => bundle(p, wrongFiler));
  await assertRejects(() => buildPdfBytes(p, wrongFiler, ".pdf-cache"));
  const changed = structuredClone(p);
  const c = (changed.schedule_c.schedule_cs as Record<string, unknown>[])[0];
  c.proprietor_recipient = "S";
  for (const key of ["form8995a", "form8995a_schedule_a"]) {
    ((changed[key].single_sstb_schedule_c_source as Record<string, unknown>)
      .business as Record<string, unknown>).source_schedule_c = structuredClone(
        c,
      );
  }
  await assertRejects(() => bundle(changed, joint.filer));
  await assertRejects(() => buildPdfBytes(changed, joint.filer, ".pdf-cache"));
});

Deno.test("MFS Colorado primary SSTB actual source joins status, spouse deductions and full return", async () => {
  const mfs = pdfReviewFixtures.find((f) =>
    f.id === "mfs-primary-form8995a-accounting-sstb-phasein"
  )!;
  const result = f1040_2025.executeReturn({ ...mfs.inputs });
  assertEquals(result.diagnostics, []);
  const p = buildPending(result.pending) as Pending;
  assertEquals([
    p.f1040.line11_agi,
    p.f1040.line12a_standard_deduction,
    p.f1040.line13_qbi_deduction,
    p.f1040.line15_taxable_income,
    p.f1040.line24_total_tax,
  ], [238050, 15750, 2652, 219648, 49112]);
  assertEquals(p.f1040.mfs_spouse_itemizing, false);
  const l = calculateOneSstb8995ALines(inputSchema.parse(p.form8995a));
  assertEquals([l.threshold, l.phaseInRange, l.applicable, l.line39], [
    197300,
    50000,
    0.5,
    2652,
  ]);
  const b = await bundle(p, mfs.filer);
  assertStringIncludes(b.xml, "<ApplicablePct>0.50000</ApplicablePct>");
  assertEquals(
    (await buildPdfBytes(p, mfs.filer, ".pdf-cache", b)).length > 1000,
    true,
  );
  assertEquals(p.f1040.line23_other_taxes, 1762);
  assertEquals(p.f1040.line35a_refund, 888);
  const mutations: ((p: Pending) => void)[] = [
    (p) => {
      p.f1040.line24_total_tax = 49113;
    },
    (p) => {
      p.form8959.filing_status = "Single";
    },
    (p) => {
      p.general.address_state = "CA";
    },
    (p) => {
      delete p.general.mfs_spouse_itemizing;
    },
    (p) => {
      p.general.mfs_spouse_itemizing = true;
    },
    (p) => {
      p.f1040.mfs_spouse_itemizing = true;
    },
    (p) => {
      p.general.spouse_ssn = "777889999";
    },
    (p) => {
      p.f1040.spouse_ssn = "777889999";
    },
    (p) => {
      p.general.filing_status = "Single";
    },
    (p) => {
      p.f1040.line13_qbi_deduction = 2653;
    },
    (p) => {
      p.schedule_se.w2_ss_wages = 0;
    },
  ];
  const sourceMutations:
    ((r: Record<string, unknown>, c: Record<string, unknown>) => void)[] = [
      (r) => {
        delete r.mfs_filing_review;
      },
      (r) => {
        (r.mfs_filing_review as Record<string, unknown>).domicile_state = "CA";
      },
      (r) => {
        (r.mfs_filing_review as Record<string, unknown>)
          .full_year_noncommunity_domiciles_confirmed = false;
      },
      (r) => {
        (r.mfs_filing_review as Record<string, unknown>)
          .spouse_does_not_itemize_confirmed = false;
      },
      (r) => {
        (r.mfs_filing_review as Record<string, unknown>)
          .spouse_deduction_record_reference = "";
      },
      (r) => {
        (r.mfs_filing_review as Record<string, unknown>).spouse_ssn =
          "777889999";
      },
      (_r, c) => {
        c.proprietor_recipient = "S";
      },
    ];
  for (const change of sourceMutations) {
    mutations.push((p) => {
      const c = (p.schedule_c.schedule_cs as Record<string, unknown>[])[0];
      change(c.qbi_sstb_filing_review as Record<string, unknown>, c);
      for (const key of ["form8995a", "form8995a_schedule_a"]) {
        ((p[key].single_sstb_schedule_c_source as Record<string, unknown>)
          .business as Record<string, unknown>).source_schedule_c =
            structuredClone(c);
      }
    });
  }
  for (const change of mutations) {
    const changed = structuredClone(p);
    change(changed);
    await assertRejects(() => bundle(changed, mfs.filer));
    await assertRejects(() => buildPdfBytes(changed, mfs.filer, ".pdf-cache"));
  }
  const wrongFiler = { ...mfs.filer, primarySSN: "444556666" };
  await assertRejects(() => bundle(p, wrongFiler));
  await assertRejects(() => buildPdfBytes(p, wrongFiler, ".pdf-cache"));
});

Deno.test("public MFS SSTB input rejects an absent filing review or spouse-owned business", () => {
  const mfs = pdfReviewFixtures.find((f) =>
    f.id === "mfs-primary-form8995a-accounting-sstb-phasein"
  )!;
  for (const missingReview of [true, false]) {
    const inputs = structuredClone(mfs.inputs);
    const c = (inputs.schedule_c as Record<string, unknown>[])[0];
    if (missingReview) {
      delete (c.qbi_sstb_filing_review as Record<string, unknown>)
        .mfs_filing_review;
    } else c.proprietor_recipient = "S";
    const result = f1040_2025.executeReturn({ ...inputs });
    assertEquals(result.diagnostics.length > 0, true);
  }
});

Deno.test("reviewed ordinary noncommunity MFS states retain actual source and return amounts", async () => {
  for (const state of ["ny", "ak", "tn", "sd"]) {
    const f = pdfReviewFixtures.find((f) =>
      f.id === `mfs-${state}-primary-form8995a-accounting-sstb-phasein`
    )!;
    const result = f1040_2025.executeReturn({ ...f.inputs });
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending) as Pending;
    assertEquals([
      p.f1040.line11_agi,
      p.f1040.line13_qbi_deduction,
      p.f1040.line15_taxable_income,
      p.f1040.line24_total_tax,
      p.f1040.line35a_refund,
    ], [238050, 2652, 219648, 49112, 888]);
    const b = await bundle(p, f.filer);
    assertStringIncludes(b.xml, "<ApplicablePct>0.50000</ApplicablePct>");
    assertEquals(
      (await buildPdfBytes(p, f.filer, ".pdf-cache", b)).length > 1000,
      true,
    );
  }
});

Deno.test("MFS domicile/property review rejects community states, elections and missing records independently of mail", async () => {
  const f = pdfReviewFixtures.find((f) =>
    f.id === "mfs-ak-primary-form8995a-accounting-sstb-phasein"
  )!;
  const result = f1040_2025.executeReturn({ ...f.inputs });
  assertEquals(result.diagnostics, []);
  const base = buildPending(result.pending) as Pending;
  const mutations: ((r: Record<string, unknown>) => void)[] = [];
  for (const state of ["AZ", "CA", "ID", "LA", "NV", "NM", "TX", "WA", "WI"]) {
    for (const key of ["domicile_state", "spouse_domicile_state"]) {
      mutations.push((r) => {
        r[key] = state;
      });
    }
  }
  for (
    const key of [
      "no_elected_community_property_regime_confirmed",
      "no_current_or_retained_community_income_confirmed",
      "business_and_wages_are_primary_separate_income_confirmed",
      "full_year_noncommunity_domiciles_confirmed",
    ]
  ) {
    mutations.push((r) => {
      r[key] = false;
    });
  }
  for (
    const key of [
      "property_regime_record_reference",
      "spouse_domicile_record_reference",
      "primary_separate_earnings_record_reference",
      "domicile_record_reference",
    ]
  ) {
    mutations.push((r) => {
      r[key] = "";
    });
  }
  for (const state of ["AK", "TN", "SD"]) {
    mutations.push((r) => {
      r.domicile_state = state;
      delete r.no_elected_community_property_regime_confirmed;
    });
  }
  for (const change of mutations) {
    const p = structuredClone(base);
    const c = (p.schedule_c.schedule_cs as Record<string, unknown>[])[0];
    change(
      (c.qbi_sstb_filing_review as Record<string, unknown>)
        .mfs_filing_review as Record<string, unknown>,
    );
    for (const key of ["form8995a", "form8995a_schedule_a"]) {
      ((p[key].single_sstb_schedule_c_source as Record<string, unknown>)
        .business as Record<string, unknown>).source_schedule_c =
          structuredClone(c);
    }
    await assertRejects(() => bundle(p, f.filer));
    await assertRejects(() => buildPdfBytes(p, f.filer, ".pdf-cache"));
  }
  const wrongHeader = {
    ...f.filer,
    address: { ...f.filer.address, state: "CA" },
  };
  await assertRejects(() => bundle(base, wrongHeader));
  await assertRejects(() => buildPdfBytes(base, wrongHeader, ".pdf-cache"));
  // A mailing address in a community state does not change reviewed AK domicile.
  const inputs = structuredClone(f.inputs) as Record<string, unknown>;
  Object.assign(inputs.general as Record<string, unknown>, {
    address_state: "WA",
    address_city: "Seattle",
    address_zip: "98101",
  });
  const c = (inputs.schedule_c as Record<string, unknown>[])[0];
  ((c.qbi_sstb_filing_review as Record<string, unknown>)
    .mfs_filing_review as Record<string, unknown>).mailing_address_state = "WA";
  const changed = f1040_2025.executeReturn({ ...inputs });
  assertEquals(changed.diagnostics, []);
  const p = buildPending(changed.pending) as Pending;
  const header = { ...f.filer, address: { ...f.filer.address, state: "WA" } };
  const b = await bundle(p, header);
  assertEquals(
    (await buildPdfBytes(p, header, ".pdf-cache", b)).length > 1000,
    true,
  );
});
