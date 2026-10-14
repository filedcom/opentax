import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { form4255Row } from "../../taxes/credit-recapture/form4255/form4255.fixture.ts";

const base = pdfReviewFixtures.find((f) => f.id === "single-w2-refund")!;
for (
  const c of [
    { id: "first-positive", amount: 12000, year: 2025, expected: 3000 },
    { id: "last-remainder", amount: 10001, year: 2022, expected: 2501 },
    { id: "expired-positive", amount: 12000, year: 2021, expected: 0 },
    { id: "current-negative", amount: -6000, year: 2025, expected: -6000 },
    { id: "prior-negative", amount: -6000, year: 2024, expected: 0 },
    {
      id: "one-year-election",
      amount: 49999,
      year: 2025,
      expected: 49999,
      election: true,
    },
  ]
) {
  Deno.test(`Form3115 public business adjustment and export boundary: ${c.id}`, async () => {
    const r = f1040_2025.executeReturn({
      ...base.inputs,
      schedule_c: [{
        business_reference: "DESIGN",
        line_a_principal_business: "DESIGNER",
        line_b_business_code: "541310",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        line_1_gross_receipts: 20000,
      }],
      f3115: [{
        business_reference: "DESIGN",
        designated_change_number: "222",
        filing_type: "automatic",
        reporting_schedule: "schedule_c",
        year_of_change: c.year,
        section_481_adjustment: c.amount,
        ...(c.election ? { one_year_positive_election_verified: true } : {}),
      }],
    });
    assertEquals(r.diagnostics, []);
    const p = buildPending(r.pending);
    assertEquals(p.schedule1?.line3_schedule_c, 20000 + c.expected);
    assertEquals(p.f1040?.line9_total_income, 95000 + c.expected);
    assertThrows(
      () => buildMefXml(p, base.filer),
      Error,
      "Form 3115 accounting-method change requires a native attachment",
    );
    await assertRejects(
      () => buildPdfBytes(p, base.filer),
      Error,
      "Form 3115 accounting-method change requires a native attachment",
    );
  });
}
for (
  const c of [
    { id: "ep-only-2a", creditLine: "2a", recapture: false, reasonable: false },
    {
      id: "recapture-2a",
      creditLine: "2a",
      recapture: true,
      reasonable: false,
    },
    {
      id: "recapture-1d",
      creditLine: "1d",
      recapture: true,
      reasonable: false,
    },
    {
      id: "reasonable-cause",
      creditLine: "1d",
      recapture: false,
      reasonable: true,
    },
  ]
) {
  Deno.test(`Form4255 public tax routing and export boundary: ${c.id}`, async () => {
    const row = {
      ...form4255Row,
      credit_line: c.creditLine,
      prior_credit_evidence: {
        ...form4255Row.prior_credit_evidence,
        original_form: c.creditLine === "1d" ? "3468_part_iv" : "8933",
      },
      excessive_payment_notice: {
        ...form4255Row.excessive_payment_notice,
        reasonable_cause_accepted: c.reasonable,
      },
      excessive_payment_20_percent: c.reasonable ? 0 : 60,
      ...(!c.recapture
        ? {
          recaptured_total: 0,
          recaptured_carryover: 0,
          recaptured_net_epe: 0,
        }
        : {}),
    };
    const r = f1040_2025.executeReturn({
      ...base.inputs,
      f4255: { rows: [row] },
    });
    assertEquals(r.diagnostics, []);
    const p = buildPending(r.pending);
    assertEquals(p.schedule2?.line1e_form4255_excessive_payment, 300);
    assertEquals(
      p.schedule2?.line1f_form4255_20_percent_ep ?? 0,
      c.reasonable ? 0 : 60,
    );
    assertEquals(
      p.schedule2?.line1d_form4255_net_epe ?? 0,
      c.recapture && c.creditLine === "2a" ? 1500 : 0,
    );
    assertEquals(
      p.schedule2?.line19_form4255_net_epe ?? 0,
      c.recapture && c.creditLine === "1d" ? 1500 : 0,
    );
    assertEquals(
      p.f1040?.line24_total_tax,
      7955 + 300 + (c.reasonable ? 0 : 60) + (c.recapture ? 1500 : 0),
    );
    assertThrows(
      () => buildMefXml(p, base.filer),
      Error,
      "authenticated prior-credit and IRS determination source bytes",
    );
    await assertRejects(
      () => buildPdfBytes(p, base.filer),
      Error,
      "Form 4255 PDF needs authenticated prior-return and IRS determination bytes",
    );
  });
}
