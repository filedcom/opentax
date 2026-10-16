import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { form8995aPdf } from "../../../../pdf/forms/deductions/business/f8995a.ts";

type Row = Record<string, unknown>;
type Pending = Record<string, Row>;
const base = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-two-business-loss-netting"
)!;
const cases = [
  {
    id: "co-midpoint",
    fixture: "mfs-primary-form8995a-accounting-sstb-phasein",
    wages: 237750,
    deduction: 57,
    tax: 49196,
    phase: "50",
  },
  {
    id: "ak-ceiling",
    fixture: "mfs-ak-primary-form8995a-accounting-sstb-phasein",
    wages: 262750,
    deduction: 55,
    tax: 57421,
    phase: "100",
  },
  {
    id: "ny-fractional",
    fixture: "mfs-ny-primary-form8995a-accounting-sstb-phasein",
    wages: 237751,
    deduction: 57,
    tax: 49196,
    phase: "50.002",
  },
];
for (const c of cases) {
  test(`MFS ordinary QBI losses ${c.id} retain separate owner and complete return`, async () => {
    const status = pdfReviewFixtures.find((f) => f.id === c.fixture)!;
    const filer = status.filer;
    const reviewed = (status.inputs.schedule_c as Row[])[0]
      .qbi_sstb_filing_review as Row;
    const sourceReview = {
      ...(reviewed.mfs_filing_review as Row),
      owner_ssn: filer.primarySSN,
    };
    const original = base.inputs.schedule_c as Row[];
    const amounts = [1000, 2000, -900, -1800];
    const wages = [30, 100, 0, 0];
    const rows = amounts.map((amount, i): Row => ({
      ...original[amount > 0 ? 0 : 1],
      proprietor_recipient: "T",
      business_reference: `mfs-trade-${i + 1}`,
      line_c_business_name: `Separate Trade ${i + 1}`,
      line_d_ein: String(123000001 + i),
      qbi_mfs_loss_review: structuredClone(sourceReview),
      ...(amount > 0
        ? {
          line_1_gross_receipts: amount + wages[i],
          line_26_wages: wages[i],
          qbi_w2_wages: wages[i],
          qbi_unadjusted_basis: 0,
        }
        : {
          part_v_other_expenses: [{
            description: `Separate trade ${i + 1} costs`,
            amount: -amount,
          }],
        }),
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
        box1_wages: c.wages,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918,
        box5_medicare_wages: c.wages,
        box6_medicare_withheld: Math.round(c.wages * 1.45) / 100,
        source_document_reference:
          "Synthetic separately owned issued wage record 2025",
      })),
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals([
      pending.schedule1.line3_schedule_c,
      pending.f1040.line11_agi,
      pending.f1040.line13_qbi_deduction,
      pending.f1040.line24_total_tax,
      pending.f1040.line35a_refund,
    ], [300, c.wages + 300, c.deduction, c.tax, 60000 - c.tax]);
    assertEquals(pending.schedule1.line15_se_deduction ?? 0, 0);
    const projection = form8995aPdf.projectFields!(pending.form8995a, pending);
    assertEquals([
      projection.line21,
      projection.line23,
      String(projection.line24),
    ], [197300, 50000, c.phase]);
    const reverse = f1040_2025.executeReturn({
      ...inputs,
      schedule_c: [...rows].reverse(),
    });
    assertEquals(reverse.diagnostics, []);
    assertEquals(reverse.pending.f1040.line24_total_tax, c.tax);
    for (
      const mutation of [
        "missing-review",
        "spouse-owner",
        "community-domicile",
        "community-election",
        "missing-property-record",
        "itemizing-review",
      ]
    ) {
      const changed = structuredClone(inputs);
      const row = changed.schedule_c[0];
      const review = row.qbi_mfs_loss_review as Row;
      if (mutation === "missing-review") delete row.qbi_mfs_loss_review;
      if (mutation === "spouse-owner") row.proprietor_recipient = "S";
      if (mutation === "community-domicile") review.domicile_state = "CA";
      if (mutation === "community-election") {
        review.no_elected_community_property_regime_confirmed = false;
      }
      if (mutation === "missing-property-record") {
        review.property_regime_record_reference = "";
      }
      if (mutation === "itemizing-review") {
        review.spouse_does_not_itemize_confirmed = false;
      }
      assert(
        f1040_2025.executeReturn(changed).diagnostics.length > 0,
        mutation,
      );
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertStringIncludes(
      prepared.bundle.xml,
      `<QualifiedBusinessIncomeDedAmt>${c.deduction}</QualifiedBusinessIncomeDedAmt>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<FilingStatusThresholdCd>197300</FilingStatusThresholdCd>",
    );
    const retained = process.env.FORM8995A_MFS_LOSSES_DIR;
    const dir = retained ? `${retained}/${c.id}` : await sys.makeTempDir();
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
      assertEquals(origins.filter((p) => p.formKey === "form8995a").length, 3);
      assertEquals(
        origins.filter((p) => p.formKey === "form8995a_schedule_c").length,
        2,
      );
      for (
        const mutation of [
          "deduction",
          "general-spouse",
          "final-spouse",
          "general-itemizing",
          "final-itemizing",
          "mail",
          "wage-owner",
          "review-owner",
          "review-spouse",
          "review-property",
        ]
      ) {
        const changed = structuredClone(prepared.bundle.pending) as Pending;
        if (mutation === "deduction") {
          changed.f1040.line13_qbi_deduction = c.deduction + 1;
        }
        if (mutation === "general-spouse") {
          changed.general.spouse_ssn = "999887777";
        }
        if (mutation === "final-spouse") changed.f1040.spouse_ssn = "999887777";
        if (mutation === "general-itemizing") {
          changed.general.mfs_spouse_itemizing = true;
        }
        if (mutation === "final-itemizing") {
          changed.f1040.mfs_spouse_itemizing = true;
        }
        if (mutation === "mail") changed.general.address_state = "WA";
        if (mutation === "wage-owner") {
          (changed.w2.w2s as Row[])[0].employee_ssn = filer.spouse!.ssn;
        }
        if (mutation.startsWith("review-")) {
          const business = (changed.schedule_c.schedule_cs as Row[])[0];
          const review = business.qbi_mfs_loss_review as Row;
          if (mutation === "review-owner") review.owner_ssn = "999887777";
          if (mutation === "review-spouse") review.spouse_ssn = "999887777";
          if (mutation === "review-property") {
            review.no_current_or_retained_community_income_confirmed = false;
          }
          for (const key of ["form8995a", "form8995a_schedule_c"]) {
            (changed[key].schedule_c_qbi_businesses as Row[])[0]
              .source_schedule_c = structuredClone(business);
          }
        }
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
          undefined,
          mutation,
        );
        await assertRejects(
          () => buildPdfBytes(changed, filer, ".pdf-cache"),
          Error,
          undefined,
          mutation,
        );
      }
      for (
        const changedFiler of [{ ...filer, primarySSN: "999887777" }, {
          ...filer,
          spouse: { ...filer.spouse!, ssn: "999887777" },
        }, { ...filer, address: { ...filer.address, state: "WA" } }]
      ) {
        await assertRejects(() =>
          f1040_2025.prepareReturn(prepared.bundle.pending, changedFiler)
        );
        await assertRejects(() =>
          buildPdfBytes(prepared.bundle.pending, changedFiler, ".pdf-cache")
        );
      }
    } finally {
      if (!retained) await sys.remove(dir, { recursive: true });
    }
  });
}
