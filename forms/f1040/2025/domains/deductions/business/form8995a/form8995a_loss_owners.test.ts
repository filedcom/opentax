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
import {
  calculateLossBusinessPhase,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";

const base = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-two-business-loss-netting"
)!;
const cases = [
  {
    id: "joint-primary",
    fixture: "joint-primary-form8995a-accounting-sstb-phasein",
    income: 475800,
    owners: ["T", "T", "T", "T"],
    wageOwner: "T",
    expectedTax: 98412,
  },
  {
    id: "joint-both-spouse-wages",
    fixture: "joint-primary-form8995a-accounting-sstb-phasein",
    income: 475800,
    owners: ["T", "S", "T", "S"],
    wageOwner: "S",
    expectedTax: 98412,
  },
  {
    id: "hoh",
    fixture: "hoh-w2-nonclaimed-custodial-release-child",
    income: 245625,
    owners: ["T", "T", "T", "T"],
    wageOwner: "T",
    expectedTax: 46853,
  },
  {
    id: "qss-half-dollar",
    fixture: "qss-w2-nonclaimed-joint-return-child",
    income: 253500,
    owners: ["T", "T", "T", "T"],
    wageOwner: "T",
    expectedTax: 39514,
  },
  {
    id: "qss-adjacent-dollar",
    fixture: "qss-w2-nonclaimed-joint-return-child",
    income: 253501,
    owners: ["T", "T", "T", "T"],
    wageOwner: "T",
    expectedTax: 39515,
  },
];
for (const c of cases) {
  test(`Form8995A current loss owners ${c.id} reconcile QBI sources and complete exports`, async () => {
    const statusFixture = pdfReviewFixtures.find((f) => f.id === c.fixture)!;
    const filer = statusFixture.filer;
    const original = base.inputs.schedule_c as Record<string, unknown>[];
    const amounts = [1000, 2000, -900, -1800];
    const businessWages = [30, 100, 0, 0];
    const rows = amounts.map((amount, i) => ({
      ...original[amount > 0 ? 0 : 1],
      business_reference: `owner-trade-${i + 1}`,
      proprietor_recipient: c.owners[i],
      line_c_business_name: `Owner Trade ${i + 1}`,
      line_d_ein: String(123000001 + i),
      ...(amount > 0
        ? {
          line_1_gross_receipts: amount + businessWages[i],
          line_26_wages: businessWages[i],
          qbi_w2_wages: businessWages[i],
          qbi_unadjusted_basis: 0,
        }
        : {
          part_v_other_expenses: [{
            description: `Owner trade ${i + 1} costs`,
            amount: -amount,
          }],
        }),
    }));
    const inputs = {
      ...base.inputs,
      general: {
        ...(base.inputs.general as Record<string, unknown>),
        ...(statusFixture.inputs.general as Record<string, unknown>),
      },
      schedule_c: rows,
      w2: (base.inputs.w2 as Record<string, unknown>[]).map((w) => ({
        ...w,
        employee_ssn: c.wageOwner === "S"
          ? filer.spouse!.ssn
          : filer.primarySSN,
        source_document_reference:
          `Synthetic ${c.wageOwner} issued wage record 2025`,
        box1_wages: c.income,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918,
        box5_medicare_wages: c.income,
        box6_medicare_withheld: Math.round(c.income * 1.45) / 100,
      })),
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.schedule1.line3_schedule_c, 300);
    assertEquals(pending.f1040.line11_agi, c.income + 300);
    assertEquals(pending.f1040.line13_qbi_deduction, 57);
    assertEquals(pending.f1040.line24_total_tax, c.expectedTax);
    assertEquals(pending.schedule1.line15_se_deduction ?? 0, 0);
    assertEquals(pending.schedule2.line4_se_tax ?? 0, 0);
    const joint = c.id.startsWith("joint");
    if (joint) {
      assertEquals(pending.schedule_se.owner_instances, []);
      assertEquals(
        (pending.schedule_se.owner_business_sources as { recipient: string }[])
          .map((r) => r.recipient),
        c.owners,
      );
    }
    const parent = form8995aPdf.projectFields!(pending.form8995a, pending);
    assertEquals(
      [parent.line21, parent.line23],
      joint ? [394600, 100000] : [197300, 50000],
    );
    assertEquals(
      String(parent.line24),
      c.id === "qss-adjacent-dollar" ? "50.002" : "50",
    );
    assertEquals([parent.line12, parent.line13, parent.line13_b], [17, 17, 40]);
    const reversed = f1040_2025.executeReturn({
      ...inputs,
      schedule_c: [...rows].reverse(),
    });
    assertEquals(reversed.diagnostics, []);
    assertEquals(reversed.pending.f1040.line13_qbi_deduction, 57);
    for (const mutation of ["missing-owner", "unsupported-owner-net"]) {
      const altered = structuredClone(inputs);
      if (mutation === "missing-owner") {
        Reflect.deleteProperty(altered.schedule_c[0], "proprietor_recipient");
      } else if (joint) {
        // Overall QBI remains 300, but one proprietor has 1,000 of SE profit.
        altered.schedule_c.forEach((row, i) => {
          row.proprietor_recipient = i === 0 ? "T" : "S";
        });
      } else {
        altered.schedule_c[0].proprietor_recipient = "S";
      }
      assert(
        f1040_2025.executeReturn(altered).diagnostics.length > 0,
        mutation,
      );
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertStringIncludes(
      prepared.bundle.xml,
      `<FilingStatusThresholdCd>${
        joint ? 394600 : 197300
      }</FilingStatusThresholdCd>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<QualifiedBusinessIncomeDedAmt>57</QualifiedBusinessIncomeDedAmt>",
    );
    for (const row of rows) {
      assertStringIncludes(
        prepared.bundle.xml,
        `<BusinessNameLine1Txt>${row.line_c_business_name}</BusinessNameLine1Txt>`,
      );
    }
    const retained = process.env.FORM8995A_OWNERS_DIR;
    const dir = retained ? `${retained}/${c.id}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      for (
        const [name, value] of Object.entries({
          input: inputs,
          filer,
          pending: prepared.bundle.pending,
          projection: parent,
          // Retain the independent final-tax audit with the QBI evidence.
          final_tax_audit: {
            expected: c.expectedTax,
            actual: pending.f1040.line24_total_tax,
            matches: pending.f1040.line24_total_tax === c.expectedTax,
          },
        })
      ) {
        await fs.writeFile(
          `${dir}/${name}.json`,
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
        stdout: "piped",
        stderr: "piped",
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
      assertEquals(origins.filter((p) => p.formKey === "form8995a").length, 3);
      assertEquals(
        origins.filter((p) => p.formKey === "form8995a_schedule_c").length,
        2,
      );
      for (
        const mutation of ["deduction", "owner", "missing-source", "status"]
      ) {
        const altered = structuredClone(prepared.bundle.pending);
        if (mutation === "deduction") {
          Object.assign(altered.f1040!, { line13_qbi_deduction: 58 });
        }
        if (mutation === "owner") {
          const q = inputSchema.parse(altered.form8995a);
          q.schedule_c_qbi_businesses![0].source_schedule_c
            .proprietor_recipient = TS.S;
          altered.form8995a = q;
          altered.form8995a_schedule_c = structuredClone(q);
        }
        if (mutation === "missing-source") {
          (altered.schedule_c as { schedule_cs: unknown[] }).schedule_cs.pop();
        }
        if (mutation === "status") {
          Object.assign(altered.general!, { filing_status: "single" });
        }
        await assertRejects(() => f1040_2025.prepareReturn(altered, filer));
        await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
      }
      const detachedFiler = { ...filer, primarySSN: "999887777" };
      await assertRejects(() =>
        f1040_2025.prepareReturn(prepared.bundle.pending, detachedFiler)
      );
      await assertRejects(() =>
        buildPdfBytes(prepared.bundle.pending, detachedFiler, ".pdf-cache")
      );
      if (joint) {
        const absentOwners = structuredClone(prepared.bundle.pending);
        Object.assign(absentOwners.schedule_se!, {
          owner_business_sources: [],
        });
        await assertRejects(() =>
          f1040_2025.prepareReturn(absentOwners, filer)
        );
        await assertRejects(() =>
          buildPdfBytes(absentOwners, filer, ".pdf-cache")
        );
        const altered = structuredClone(prepared.bundle.pending);
        Object.assign(altered.schedule_se!, {
          owner_identity: {
            primary_ssn: filer.primarySSN,
            spouse_ssn: "999887777",
          },
        });
        await assertRejects(() => f1040_2025.prepareReturn(altered, filer));
        await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
      }
    } finally {
      if (!retained) await sys.remove(dir, { recursive: true });
    }
  });
}
test("ordinary loss phase-in uses joint thresholds only for MFJ", () => {
  for (
    const status of [FilingStatus.Single, FilingStatus.HOH, FilingStatus.QSS]
  ) {
    assertEquals(
      calculateLossBusinessPhase(222300, 20, 15, status, 2025)?.ratio,
      0.5,
    );
  }
  assertEquals(
    calculateLossBusinessPhase(444600, 20, 15, FilingStatus.MFJ, 2025)?.ratio,
    0.5,
  );
  assertEquals(
    calculateLossBusinessPhase(494600, 20, 15, FilingStatus.MFJ, 2025)?.ratio,
    1,
  );
  assertEquals(
    calculateLossBusinessPhase(494601, 20, 15, FilingStatus.MFJ, 2025),
    undefined,
  );
});
