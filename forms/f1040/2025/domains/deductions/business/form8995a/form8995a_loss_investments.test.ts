import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { form8995aPdf } from "../../../../pdf/forms/deductions/business/f8995a.ts";
import {
  calculateScheduleCLossLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
type Row = Record<string, unknown>;
const base = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-two-business-loss-netting"
)!;
const cases = [
  { id: "single-high", fixture: base.id, wages: 300000, joint: false },
  { id: "single-phase", fixture: base.id, wages: 235090, joint: false },
  {
    id: "joint-two-owners",
    fixture: "joint-primary-form8995a-accounting-sstb-phasein",
    wages: 600000,
    joint: true,
  },
  {
    id: "hoh",
    fixture: "hoh-w2-nonclaimed-custodial-release-child",
    wages: 300000,
    joint: false,
  },
  {
    id: "qss",
    fixture: "qss-w2-nonclaimed-joint-return-child",
    wages: 300000,
    joint: false,
  },
  {
    id: "mfs",
    fixture: "mfs-primary-form8995a-accounting-sstb-phasein",
    wages: 300000,
    joint: false,
  },
];
for (const c of cases) {
  test(`QBI losses with SE tax and investment income ${c.id}`, async () => {
    const status = pdfReviewFixtures.find((f) => f.id === c.fixture)!;
    const filer = status.filer;
    const original = base.inputs.schedule_c as Row[];
    const gross = [6000, 8000, 2000, 4000];
    const profits = [2000, 4000, -1000, -2000];
    const payroll = [100, 200, 0, 0];
    // Independent ledger: single-owner Medicare tax 80 / half-SE 40;
    // joint owners 27/283 of SE tax and 14/142 of deductible half-SE.
    const allocation = c.joint ? [10.5, 94.67, 3.5, 47.33] : [12, 16, 4, 8];
    const rows = profits.map((amount, i): Row => ({
      ...original[amount > 0 ? 0 : 1],
      business_reference: `se-loss-${i + 1}`,
      line_c_business_name: `SE Trade ${i + 1}`,
      line_d_ein: String(123000001 + i),
      proprietor_recipient: c.joint && i % 2 ? "S" : "T",
      line_1_gross_receipts: gross[i],
      line_26_wages: payroll[i],
      qbi_w2_wages: payroll[i],
      qbi_unadjusted_basis: 0,
      part_v_other_expenses: [{
        description: "Reviewed business expenses",
        amount: gross[i] - payroll[i] - amount,
      }],
      qbi_loss_se_tax_allocation_review: {
        deduction_amount: allocation[i],
        allocation_method: "owner_gross_income_proportion_with_cent_residual",
        all_owner_businesses_included_confirmed: true,
        no_other_qbi_adjustments_confirmed: true,
        workpaper_reference: `Synthetic 2025 gross-income ledger ${i + 1}`,
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-02-01",
      },
      ...(c.id === "mfs"
        ? {
          qbi_mfs_loss_review: {
            ...((status.inputs.schedule_c as Row[])[0]
              .qbi_sstb_filing_review as Row).mfs_filing_review as Row,
            owner_ssn: filer.primarySSN,
          },
        }
        : {}),
    }));
    const inputs: Record<string, unknown> & { schedule_c: Row[] } = {
      ...base.inputs,
      general: {
        ...(base.inputs.general as Row),
        ...(status.inputs.general as Row),
      },
      schedule_c: rows,
      w2: (base.inputs.w2 as Row[]).map((w) => ({
        ...w,
        employee_ssn: filer.primarySSN,
        source_document_reference: "Synthetic issued taxpayer wage record",
        box1_wages: c.wages,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918,
        box5_medicare_wages: c.wages,
        box6_medicare_withheld: Math.round(c.wages * 1.45) / 100,
      })),
    };
    inputs.schedule_b_part_iii = {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    };
    inputs.f1099int = [1000, 700].map((amount, i) => ({
      payer_name: `Example Bank ${i + 1}`,
      payer_tin: String(234567890 + i),
      recipient_tin: "111223333",
      account_number: `SYNTHETIC-INT-${i}`,
      source_document_reference: `Synthetic issued INT copy ${i}`,
      box1: amount,
    }));
    inputs.f1099div = [2000, 1000].map((amount, i) => ({
      payerName: `Example Fund ${i + 1}`,
      payerTin: String(345678901 + i),
      recipient_tin: "111223333",
      account_number: `SYNTHETIC-DIV-${i}`,
      source_document_reference: `Synthetic issued DIV copy ${i}`,
      isNominee: false,
      box11: false,
      box1a: amount,
      box1b: [1200, 600][i],
      box2a: [1000, 800][i],
      qualified_dividend_filing_review: {
        ex_dividend_date: "2025-07-14",
        qualified_held_days_in_121_day_window: 91,
        diminished_risk_days_excluded: 0,
        ordinary_stock_rule_confirmed: true,
        eligible_issuer_and_no_disqualified_dividend_confirmed: true,
        no_related_payment_obligation_confirmed: true,
        review_reference: `Synthetic qualified dividend review ${i}`,
        reviewed_on: "2026-02-01",
      },
    }));

    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.schedule1.line3_schedule_c, 3000);
    assertEquals(pending.schedule1.line15_se_deduction, c.joint ? 156 : 40);
    assertEquals(pending.schedule2.line4_se_tax, c.joint ? 310 : 80);
    assertEquals(
      pending.f1040.line11_agi,
      c.wages + 9500 - (c.joint ? 156 : 40),
    );
    const lines = calculateScheduleCLossLines(
      inputSchema.parse(pending.form8995a),
    );
    assertEquals(
      lines.schedule.rows.map((r) => r.line1a),
      c.joint ? [1990, 3905, -1004, -2047] : [1988, 3984, -1004, -2008],
    );
    assertEquals(lines.schedule.line3, c.joint ? 3051 : 3012);
    assertEquals(lines.schedule.line4, c.joint ? 5895 : 5972);
    assertEquals(
      pending.f1040.line13_qbi_deduction,
      c.id === "single-phase" ? 313 : 150,
    );
    assertEquals(
      pending.f1040.line24_total_tax,
      ({
        "single-high": 72825,
        "single-phase": 50235,
        "joint-two-owners": 144299,
        hoh: 68331,
        qss: 53296,
        mfs: 73500,
      } as Record<string, number>)[c.id],
    );
    const reversed = f1040_2025.executeReturn({
      ...inputs,
      schedule_c: [...rows].reverse(),
    });
    assertEquals(reversed.diagnostics, []);
    assertEquals(
      reversed.pending.f1040.line13_qbi_deduction,
      pending.f1040.line13_qbi_deduction,
    );
    for (
      const change of [
        "missing-review",
        "wrong-allocation",
        "wrong-owner",
        "wrong-gross",
      ]
    ) {
      const changed = structuredClone(inputs);
      if (change === "missing-review") {
        delete changed.schedule_c[2].qbi_loss_se_tax_allocation_review;
      }
      if (change === "wrong-allocation") {
        (changed.schedule_c[2].qbi_loss_se_tax_allocation_review as Row)
          .deduction_amount = 0;
      }
      if (change === "wrong-owner") {
        changed.schedule_c[2].proprietor_recipient = "S";
      }
      if (change === "wrong-gross") {
        changed.schedule_c[2].line_1_gross_receipts = 3000;
        (changed.schedule_c[2].part_v_other_expenses as Row[])[0].amount = 4000;
      }
      assert(f1040_2025.executeReturn(changed).diagnostics.length > 0, change);
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const projection = form8995aPdf.projectFields!(pending.form8995a, pending);
    const root = process.env.FORM8995A_LOSS_INVESTMENTS_DIR;
    const dir = root ? `${root}/${c.id}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      for (
        const [name, value] of Object.entries({
          input: inputs,
          filer,
          pending: prepared.bundle.pending,
          projection,
        })
      ) {
        await fs.writeFile(
          `${dir}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
      const check = await new sys.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
            import.meta.url,
          ).pathname,
          `${dir}/return.xml`,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      await fs.writeFile(`${dir}/xsd.log`, check.stderr);
      assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
      const origins: Parameters<typeof buildPdfBytes>[4] = [];
      await fs.writeFile(
        `${dir}/return.pdf`,
        await buildPdfBytes(
          prepared.bundle.pending,
          filer,
          ".pdf-cache",
          prepared.bundle,
          origins,
        ),
      );
      await fs.writeFile(
        `${dir}/origins.json`,
        JSON.stringify(origins, null, 2),
      );
      for (
        const change of [
          "investment-owner",
          "capital-source-collapse",
          "dividend-review",
          "interest-print",
          "agi",
          "adjustments",
          "regular-tax",
          "se-deduction",
          "se-tax",
          "wage-owner",
          "source-gross",
          "retained-deduction",
          "source-allocation",
        ]
      ) {
        const changed = structuredClone(prepared.bundle.pending) as Record<
          string,
          Row
        >;
        if (change === "investment-owner") {
          (changed.f1099int.f1099ints as Row[])[0].recipient_tin = "999887777";
          (changed.form8995a.investment_interest_sources as Row[])[0]
            .recipient_tin = "999887777";
        }
        if (change === "capital-source-collapse") {
          changed.form8995a.qbi_capital_sources = [{
            source: "f1099div.qualified_dividends",
            amount: 3600,
          }];
        }
        if (change === "dividend-review") {
          for (
            const row of [
              (changed.f1099div.f1099divs as Row[])[0],
              (changed.form8995a.investment_dividend_sources as Row[])[0],
            ]
          ) {
            (row.qualified_dividend_filing_review as Row)
              .qualified_held_days_in_121_day_window = 1;
          }
        }
        if (change === "interest-print") {
          changed.schedule_b.print_int_amount_1 = 1001;
        }
        if (change === "agi") {
          changed.f1040.line11_agi = Number(changed.f1040.line11_agi) + 1;
        }
        if (change === "adjustments") changed.f1040.line10_adjustments = 0;
        if (change === "regular-tax") {
          changed.f1040.line16_income_tax =
            Number(changed.f1040.line16_income_tax) + 1;
        }
        if (change === "se-deduction") {
          changed.schedule1.line15_se_deduction = 0;
        }
        if (change === "se-tax") changed.schedule2.line4_se_tax = 0;
        if (change === "wage-owner") {
          (changed.w2.w2s as Row[])[0].employee_ssn = "999887777";
        }
        if (change === "source-gross") {
          (changed.schedule_c.schedule_cs as Row[])[2].line_1_gross_receipts =
            2001;
        }
        if (change === "retained-deduction") {
          (changed.form8995a.loss_se_tax_source as Row).deduction = 1;
        }
        if (change === "source-allocation") {
          (((changed.form8995a.schedule_c_qbi_businesses as Row[])[2]
            .source_schedule_c as Row).qbi_loss_se_tax_allocation_review as Row)
            .deduction_amount = 0;
        }
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
          undefined,
          change,
        );
        await assertRejects(
          () => buildPdfBytes(changed, filer, ".pdf-cache"),
          Error,
          undefined,
          change,
        );
      }
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
  });
}
