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
  { id: "single-limited", fixture: base.id, wages: 300000, joint: false },
  { id: "single-phase", fixture: base.id, wages: 235090, joint: false },
  {
    id: "joint-two-owners",
    fixture: "joint-primary-form8995a-accounting-sstb-phasein",
    wages: 600000,
    joint: true,
  },
  {
    id: "joint-spouse",
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
  test(`Loss-making WOTC employers retain SE and independent wage limits ${c.id}`, async () => {
    const status = pdfReviewFixtures.find((f) => f.id === c.fixture)!;
    const filer = status.filer;
    const original = base.inputs.schedule_c as Row[];
    const limited = c.id === "single-limited";
    const employerIndex = c.id === "joint-spouse" ? 3 : 2;
    const gross = [
      6000,
      8000,
      employerIndex === 2 ? (limited ? 310000 : 6000) : 2000,
      employerIndex === 3 ? 6000 : 4000,
    ];
    const profits = [2000, 4000, -1000, -2000];
    const payroll = [100, 200, 0, 0];
    // Independent ledger: single-owner Medicare tax 80 / half-SE 40;
    // joint owners 27/283 of SE tax and 14/142 of deductible half-SE.
    const allocation = c.id === "joint-spouse"
      ? [10.5, 81.14, 3.5, 60.86]
      : c.joint
      ? [7, 94.67, 7, 47.33]
      : limited
      ? [.73, .98, 37.8, .49]
      : [10, 13.33, 10, 6.67];
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
    const inputs = {
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
    const credit = structuredClone(
      pdfReviewFixtures.find((f) =>
        f.id === "single-certified-work-opportunity-credit"
      )!.inputs.f5884,
    ) as Row;
    if (limited) {
      const employee = (credit.f5884s as Row[])[0];
      credit.f5884s = Array.from({ length: 80 }, (_, i) => ({
        ...structuredClone(employee),
        employee_reference: `LIMITED-EMP-${i + 1}`,
        wage_records: (employee.wage_records as Row[]).map((r) => ({
          ...r,
          payroll_record_reference: `Synthetic limited payroll ${i + 1}`,
        })),
      }));
    }
    const employees = credit.f5884s as Row[];
    rows[employerIndex].line_26_wages = limited ? 480000 : 6000;
    rows[employerIndex].qbi_w2_wages = limited ? 288000 : 3600;
    (rows[employerIndex].part_v_other_expenses as Row[])[0].amount = limited
      ? 23000
      : employerIndex === 3
      ? 4400
      : 3400;
    rows[employerIndex].qbi_wotc_filing_review = {
      owner_ssn: (employerIndex === 3 ? filer.spouse!.ssn : filer.primarySSN)
        .replaceAll("-", ""),
      employee_w2_records: employees.map((e) => ({
        employee_reference: e.employee_reference,
        source_document_reference:
          `Synthetic employer W2 ${e.employee_reference}`,
        box1_wages: 6000,
        box5_wages: 6000,
        ssa_filing_record_reference:
          `Synthetic employer SSA ${e.employee_reference}`,
        filed_within_60_days_of_due_date_confirmed: true,
      })),
      all_business_payroll_included_confirmed: true,
      no_aggregation_confirmed: true,
      reviewed_other_business_references: rows.filter((_, i) =>
        i !== employerIndex
      ).map((r) => r.business_reference),
      no_ptp_or_loss_carryforward_confirmed: true,
      qualified_dividends_zero_confirmed: true,
      no_qualified_property_confirmed: true,
      review_reference: "Synthetic WOTC and current-loss review",
      reviewed_by: "Synthetic reviewer",
      reviewed_on: "2026-03-01",
    };
    for (const employee of employees) {
      for (const record of employee.wage_records as Row[]) {
        (record.deduction_location as Row).business_reference =
          rows[employerIndex].business_reference;
      }
      employee.direct_employer_review = {
        employer_ein: rows[employerIndex].line_d_ein,
        proprietor_recipient: employerIndex === 3 ? "S" : "T",
        proprietor_ssn:
          (employerIndex === 3 ? filer.spouse!.ssn : filer.primarySSN)
            .replaceAll("-", ""),
        business_reference: rows[employerIndex].business_reference,
        certification_employer_and_payroll_match_confirmed: true,
        source_review_reference:
          "Synthetic direct employer certification and payroll",
      };
    }
    const sourceInputs = {
      ...inputs,
      f5884: credit,
      general: {
        ...inputs.general,
        qbi_not_patron_of_specified_cooperative_confirmed: true,
        ...(c.id === "mfs" ? { spouse_has_business_credit: false } : {}),
      },
    };
    const result = f1040_2025.executeReturn(sourceInputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.schedule1.line3_schedule_c, 3000);
    assertEquals(pending.schedule1.line15_se_deduction, c.joint ? 156 : 40);
    assertEquals(pending.schedule2.line4_se_tax, c.joint ? 310 : 80);
    assertEquals(
      pending.f1040.line11_agi,
      c.wages + 3000 - (c.joint ? 156 : 40),
    );
    const lines = calculateScheduleCLossLines(
      inputSchema.parse(pending.form8995a),
    );
    const qbiRows = c.id === "joint-spouse"
      ? [1990, 3919, -1004, -2061]
      : c.joint
      ? [1993, 3905, -1007, -2047]
      : limited
      ? [1999, 3999, -1038, -2000]
      : [1990, 3987, -1010, -2007];
    assertEquals(lines.schedule.rows.map((r) => r.line1a), qbiRows);
    assertEquals(
      lines.schedule.line3,
      -qbiRows.slice(2).reduce((a, b) => a + b, 0),
    );
    assertEquals(lines.schedule.line4, qbiRows[0] + qbiRows[1]);
    assertEquals(
      pending.f1040.line13_qbi_deduction,
      c.id === "single-phase" ? 370 : 150,
    );
    assertEquals(
      lines.businesses[employerIndex].w2_wages,
      limited ? 288000 : 3600,
    );
    assertEquals(lines.businessLines.map((r) => r.parent.line4), [
      100,
      200,
      0,
      0,
    ]);
    assertEquals(lines.businessLines.map((r) => r.parent.line10), [
      50,
      100,
      0,
      0,
    ]);
    const reversed = f1040_2025.executeReturn({
      ...sourceInputs,
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
        "payroll-review",
        "business-inventory",
      ]
    ) {
      const changed = structuredClone(sourceInputs);
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
      if (change === "payroll-review") {
        ((changed.schedule_c[employerIndex].qbi_wotc_filing_review as Row)
          .employee_w2_records as Row[])[0].box1_wages = 6001;
      }
      if (change === "business-inventory") {
        (changed.schedule_c[employerIndex].qbi_wotc_filing_review as Row)
          .reviewed_other_business_references = ["missing-business"];
      }
      assert(f1040_2025.executeReturn(changed).diagnostics.length > 0, change);
    }
    assertEquals(pending.f3800.allowed_credit, limited ? 58763 : 2400);
    assertEquals(
      pending.f1040.form5884_determined_credit,
      limited ? 192000 : 2400,
    );
    assertEquals(
      (pending.schedule_c.wotc_wage_reductions as Row[])[0].credit_amount,
      limited ? 192000 : 2400,
    );
    const totalTax = {
      "single-high": 68623,
      "single-limited": 12260,
      "single-phase": 46102,
      "joint-two-owners": 140097,
      "joint-spouse": 140097,
      hoh: 64129,
      qss: 49413,
      mfs: 69298,
    };
    assertEquals(
      pending.f1040.line24_total_tax,
      totalTax[c.id as keyof typeof totalTax],
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const projection = form8995aPdf.projectFields!(pending.form8995a, pending);
    const root = process.env.FORM8995A_LOSS_EMPLOYER_DIR;
    const dir = root ? `${root}/${c.id}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      for (
        const [name, value] of Object.entries({
          input: sourceInputs,
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
          "se-deduction",
          "se-tax",
          "wage-owner",
          "source-gross",
          "retained-deduction",
          "source-allocation",
          "determined-credit",
          "credit-payroll",
          "credit-employer",
          "wotc-owner",
          "retained-reduction",
          "form3800-credit",
        ]
      ) {
        const changed = structuredClone(prepared.bundle.pending) as Record<
          string,
          Row
        >;
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
        if (change === "determined-credit") {
          changed.f1040.form5884_determined_credit = 2399;
        }
        if (change === "form3800-credit") {
          (changed.f3800.f5884_credit as Row).credit_amount = 2399;
        }
        if (change === "credit-payroll") {
          ((changed.f5884.f5884s as Row[])[0].wage_records as Row[])[0]
            .qualified_wages = 5999;
        }
        if (change === "credit-employer") {
          ((changed.f5884.f5884s as Row[])[0].direct_employer_review as Row)
            .employer_ein = "999887777";
        }
        if (change === "wotc-owner") {
          ((changed.schedule_c.schedule_cs as Row[])[employerIndex]
            .qbi_wotc_filing_review as Row).owner_ssn = "999887777";
        }
        if (change === "retained-reduction") {
          (changed.form8995a.schedule_c_qbi_businesses as Row[])[employerIndex]
            .wotc_wage_reduction = 2399;
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
