import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  calculateScheduleCLossLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
// Synthetic reviewed payroll; neither source references nor these tests authenticate issuer records.
type Row = Record<string, any>;
const cases = [
  {
    name: "both-loss",
    indices: [2, 3],
    wages: 600000,
    qbi: 150,
    tax: 137697,
    raw: [1993, 3919, -1007, -2061],
    offset: [1034, 2034, 0, 0],
    adjusted: [959, 1885, 0, 0],
    parentWages: [100, 200, 0, 0],
  },
  {
    name: "mixed-primary",
    indices: [0, 3],
    wages: 600000,
    qbi: 292,
    tax: 137648,
    raw: [1990, 3919, -1004, -2061],
    offset: [1032, 2033, 0, 0],
    adjusted: [958, 1886, 0, 0],
    parentWages: [3600, 200, 0, 0],
  },
  {
    name: "mixed-spouse",
    indices: [2, 1],
    wages: 600000,
    qbi: 427,
    tax: 137600,
    raw: [1993, 3919, -1007, -2061],
    offset: [1034, 2034, 0, 0],
    adjusted: [959, 1885, 0, 0],
    parentWages: [100, 3600, 0, 0],
  },
  {
    name: "both-loss-phase",
    indices: [2, 3],
    wages: 473256,
    qbi: 359,
    tax: 93827,
    raw: [1993, 3919, -1007, -2061],
    offset: [1034, 2034, 0, 0],
    adjusted: [959, 1885, 0, 0],
    parentWages: [100, 200, 0, 0],
  },
];
for (const c of cases) {
  test(`Independent spouse employers with QBI losses ${c.name}`, async () => {
    const { name, indices, wages } = c;
    const base = pdfReviewFixtures.find((f) =>
      f.id === "single-form8995a-two-business-loss-netting"
    )!;
    const joint = pdfReviewFixtures.find((f) =>
      f.id === "joint-primary-form8995a-accounting-sstb-phasein"
    )!;
    const original = base.inputs.schedule_c as Row[];
    const credit = pdfReviewFixtures.find((f) =>
      f.id === "single-certified-work-opportunity-credit"
    )!;
    const employee = structuredClone((credit.inputs.f5884 as Row).f5884s[0]);
    employee.direct_employer_review = {
      employer_ein: "123000004",
      business_reference: "se-loss-4",
      proprietor_recipient: "S",
      proprietor_ssn: "444556666",
      certification_employer_and_payroll_match_confirmed: true,
      source_review_reference:
        "Synthetic direct employer certification and payroll",
    };
    const filer = joint.filer;
    const input: Row = {
      ...structuredClone(base.inputs),
      general: {
        ...base.inputs.general as Row,
        ...joint.inputs.general as Row,
        qbi_not_patron_of_specified_cooperative_confirmed: true,
      },
      f5884: {
        ...structuredClone(credit.inputs.f5884 as Row),
        f5884s: [employee],
      },
      schedule_c: [2000, 4000, -1000, -2000].map((profit, i) => ({
        ...structuredClone(original[profit > 0 ? 0 : 1]),
        business_reference: `se-loss-${i + 1}`,
        line_c_business_name: `SE Trade ${i + 1}`,
        line_d_ein: String(123000001 + i),
        proprietor_recipient: i % 2 ? "S" : "T",
        qbi_unadjusted_basis: 0,
        qbi_loss_se_tax_allocation_review: {
          deduction_amount: 0,
          allocation_method: "owner_gross_income_proportion_with_cent_residual",
          all_owner_businesses_included_confirmed: true,
          no_other_qbi_adjustments_confirmed: true,
          workpaper_reference: `Synthetic dual owner gross ledger ${i}`,
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2026-03-01",
        },
      })),
      w2: (base.inputs.w2 as Row[]).map((w) => ({
        ...w,
        employee_ssn: filer.primarySSN,
        source_document_reference: "Synthetic primary external W2",
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918,
      })),
    };
    input.schedule_c[3].qbi_wotc_filing_review = {
      owner_ssn: "444556666",
      employee_w2_records: [{
        employee_reference: employee.employee_reference,
        box1_wages: 6000,
        box5_wages: 6000,
        source_document_reference: "Synthetic employer W2",
        ssa_filing_record_reference: "Synthetic employer SSA",
        filed_within_60_days_of_due_date_confirmed: true,
      }],
      all_business_payroll_included_confirmed: true,
      no_aggregation_confirmed: true,
      reviewed_other_business_references: [
        "se-loss-1",
        "se-loss-2",
        "se-loss-3",
      ],
      no_ptp_or_loss_carryforward_confirmed: true,
      qualified_dividends_zero_confirmed: true,
      no_qualified_property_confirmed: true,
      review_reference: "Synthetic WOTC current-loss review",
      reviewed_by: "Synthetic reviewer",
      reviewed_on: "2026-03-01",
    };
    input.schedule_c.forEach((b: Row) =>
      b.part_v_other_expenses = [{
        description: "Reviewed business expenses",
        amount: 0,
      }]
    );
    const template = structuredClone(
        input.schedule_c[3].qbi_wotc_filing_review,
      ),
      worker = structuredClone(input.f5884.f5884s[0]);
    const profits = [2000, 4000, -1000, -2000];
    const gross = [6000, 8000, indices.includes(2) ? 6000 : 2000, 6000];
    input.f5884.f5884s = [];
    for (let i = 0; i < 4; i++) {
      const b = input.schedule_c[i],
        employer = (indices as readonly number[]).includes(i);
      delete b.qbi_wotc_filing_review;
      b.line_1_gross_receipts = gross[i];
      b.line_26_wages = employer ? 6000 : ([100, 200, 0, 0][i]);
      b.qbi_w2_wages = employer ? 3600 : b.line_26_wages;
      b.part_v_other_expenses[0].amount = gross[i] - b.qbi_w2_wages -
        profits[i];
      if (employer) {
        const e = structuredClone(worker);
        e.employee_reference = `DUAL-EMP-${i}`;
        e.direct_employer_review = {
          ...e.direct_employer_review,
          employer_ein: b.line_d_ein,
          business_reference: b.business_reference,
          proprietor_recipient: b.proprietor_recipient,
          proprietor_ssn: i % 2 ? "444556666" : "111223333",
        };
        for (const w of e.wage_records) {
          w.deduction_location.business_reference = b.business_reference;
          w.payroll_record_reference = `Synthetic dual payroll ${i}`;
        }
        input.f5884.f5884s.push(e);
        b.qbi_wotc_filing_review = {
          ...structuredClone(template),
          owner_ssn: e.direct_employer_review.proprietor_ssn,
          reviewed_other_business_references: input.schedule_c.filter((
            _: unknown,
            j: number,
          ) => j !== i).map((x: { business_reference: string }) =>
            x.business_reference
          ),
          employee_w2_records: [{
            ...template.employee_w2_records[0],
            employee_reference: e.employee_reference,
            source_document_reference: `Synthetic dual W2 ${i}`,
            ssa_filing_record_reference: `Synthetic dual SSA ${i}`,
          }],
        };
      }
    }
    const allocations = gross[2] === 6000
      ? [7, 81.14, 7, 60.86]
      : [10.5, 81.14, 3.5, 60.86];
    input.schedule_c.forEach((b: Row, i: number) =>
      b.qbi_loss_se_tax_allocation_review.deduction_amount = allocations[i]
    );
    input.f5884.ordinary_joint_employer_control_review = {
      businesses: indices.map((i) => {
        const b = input.schedule_c[i];
        return {
          employer_ein: b.line_d_ein,
          business_reference: b.business_reference,
          proprietor_ssn: b.qbi_wotc_filing_review.owner_ssn,
          other_spouse_no_direct_interest_confirmed: true,
          other_spouse_no_director_fiduciary_employee_or_management_confirmed:
            true,
          passive_gross_income_not_more_than_half_confirmed: true,
          no_disposition_restrictions_favoring_spouse_or_minor_children_confirmed:
            true,
          ownership_and_income_source_reference:
            `Synthetic dual ownership ${i}`,
        };
      }),
      no_other_common_control_ownership_or_options_confirmed: true,
      reviewed_by: "Synthetic reviewer",
      reviewed_on: "2026-03-01",
      review_reference: "Synthetic separate employer attribution review",
    };
    input.w2[0].box1_wages = wages;
    input.w2[0].box5_medicare_wages = wages;
    input.w2[0].box6_medicare_withheld = Math.round(wages * 1.45) / 100;

    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const lines = calculateScheduleCLossLines(
      inputSchema.parse(pending.form8995a),
      2025,
    );
    assertEquals(lines.schedule.rows.map((r) => r.line1a), c.raw);
    assertEquals(lines.schedule.rows.map((r) => r.line1b), c.offset);
    assertEquals(lines.businessLines.map((r) => r.parent.line2), c.adjusted);
    assertEquals(lines.businessLines.map((r) => r.parent.line4), c.parentWages);
    assertEquals(pending.f1040.line13_qbi_deduction, c.qbi);
    assertEquals(pending.f1040.line24_total_tax, c.tax);
    assertEquals(pending.f3800.allowed_credit, 4800);
    assertEquals(pending.f1040.form5884_determined_credit, 4800);
    assertEquals(pending.schedule1.line15_se_deduction, 156);
    assertEquals(pending.schedule2.line4_se_tax, 310);
    assertEquals(
      (pending.schedule_c.wotc_wage_reductions as Row[]).map((r: Row) =>
        r.credit_amount
      ),
      [2400, 2400],
    );
    const reversed = f1040_2025.executeReturn({
      ...input,
      schedule_c: [...input.schedule_c].reverse(),
      f5884: { ...input.f5884, f5884s: [...input.f5884.f5884s].reverse() },
    });
    assertEquals(reversed.diagnostics, []);
    assertEquals(reversed.pending.f1040.line24_total_tax, c.tax);
    for (
      const kind of [
        "control",
        "owner",
        "payroll",
        "other-businesses",
        "se-allocation",
      ]
    ) {
      const changed = structuredClone(input);
      if (kind === "control") {
        delete changed.f5884.ordinary_joint_employer_control_review;
      }
      if (kind === "owner") {
        changed.f5884.ordinary_joint_employer_control_review.businesses[0]
          .proprietor_ssn = "999887777";
      }
      if (kind === "payroll") {
        changed.schedule_c[indices[0]].qbi_wotc_filing_review
          .employee_w2_records[0].box1_wages = 6001;
      }
      if (kind === "other-businesses") {
        changed.schedule_c[indices[1]].qbi_wotc_filing_review
          .reviewed_other_business_references = [];
      }
      if (kind === "se-allocation") {
        changed.schedule_c[indices[1]].qbi_loss_se_tax_allocation_review
          .deduction_amount = 0;
      }
      assert(f1040_2025.executeReturn(changed).diagnostics.length > 0, kind);
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const root = process.env.FORM8995A_DUAL_LOSS_DIR;
    const dir = root ? `${root}/${name}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      for (
        const [key, value] of Object.entries({
          input,
          filer,
          pending: prepared.bundle.pending,
        })
      ) {
        await fs.writeFile(
          `${dir}/${key}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
      const xsd = await new sys.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
            import.meta.url,
          ).pathname,
          `${dir}/return.xml`,
        ],
        stderr: "piped",
        stdout: "piped",
      }).output();
      await fs.writeFile(`${dir}/xsd.log`, xsd.stderr);
      assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
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
        const kind of [
          "control",
          "owner",
          "employer",
          "payroll",
          "credit",
          "reduction",
          "qbi-owner",
          "se-allocation",
        ]
      ) {
        const changed = structuredClone(prepared.bundle.pending) as Record<
          string,
          Row
        >;
        if (kind === "control") {
          delete changed.f5884.ordinary_joint_employer_control_review;
        }
        if (kind === "owner") {
          changed.f5884.ordinary_joint_employer_control_review.businesses[0]
            .proprietor_ssn = "999887777";
        }
        if (kind === "employer") {
          changed.f5884.f5884s[1].direct_employer_review.employer_ein =
            "999887777";
        }
        if (kind === "payroll") {
          changed.f5884.f5884s[1].wage_records[0].qualified_wages = 6001;
        }
        if (kind === "credit") changed.f1040.form5884_determined_credit = 2400;
        if (kind === "reduction") {
          changed.schedule_c.wotc_wage_reductions[1].credit_amount = 2401;
        }
        if (kind === "qbi-owner") {
          changed.schedule_c.schedule_cs[indices[1]].qbi_wotc_filing_review
            .owner_ssn = "999887777";
        }
        if (kind === "se-allocation") {
          changed.form8995a.schedule_c_qbi_businesses[indices[0]]
            .source_schedule_c.qbi_loss_se_tax_allocation_review
            .deduction_amount = 0;
        }
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
          undefined,
          kind,
        );
        await assertRejects(
          () => buildPdfBytes(changed, filer, ".pdf-cache"),
          Error,
          undefined,
          kind,
        );
      }
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
  });
}
