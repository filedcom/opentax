import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  jointAptcCases,
  jointAptcInputs,
} from "./form8962-joint-aptc.fixture.ts";
import expected from "./form8962-joint-aptc.expected.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form8962Pdf } from "../../../../pdf/forms/credits/health/f8962.ts";
import { inputSchema as policySchema } from "../../../../../nodes/inputs/credits/health/f1095a/index.ts";

for (
  const id of Object.keys(jointAptcCases) as Array<keyof typeof jointAptcCases>
) {
  Deno.test(`Joint APTC received policy to repayment/net credit and final return: ${id}`, async () => {
    const c = jointAptcCases[id], e = expected[id];
    const inputs = jointAptcInputs(
      c.wages,
      c.advance,
      c.firstMonth,
      c.benefits,
    );
    const held = structuredClone(inputs),
      result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), f = p.f1040!, ptc = p.form8962!;
    assertEquals(ptc.household_income, e.household);
    assertEquals(ptc.federal_poverty_pct, e.pct);
    assertEquals(ptc.monthly_applicable_contribution, e.monthly);
    assertEquals(ptc.total_premium_tax_credit, e.ptc);
    assertEquals(ptc.total_advance_ptc, e.advance);
    assertEquals(ptc.repayment_limitation, e.cap ?? undefined);
    assertEquals(ptc.excess_advance_premium ?? 0, e.repay);
    assertEquals(ptc.net_premium_tax_credit ?? 0, e.net);
    assertEquals(p.schedule2?.line1a_excess_advance_premium ?? 0, e.repay);
    assertEquals(p.schedule3?.line9_premium_tax_credit ?? 0, e.net);
    assertEquals(f.line24_total_tax, e.tax);
    assertEquals(f.line35a_refund ?? 0, e.refund);
    assertEquals(f.line37_amount_owed ?? 0, e.owed);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const all = normalizeAllPending(prepared.bundle.pending);
    const projected = form8962Pdf.projectFields!(ptc, all);
    assertEquals(form8962Pdf.instances!(projected, filer, all).length, 1);
    assertEquals(
      (prepared.bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
      13 - c.firstMonth,
    );
    assertEquals(inputs, held);
  });
}

Deno.test("Joint APTC native and PDF filing reject edited source, eligibility, cap and return totals", async () => {
  for (const wages of [30000, 92400]) {
    const input = jointAptcInputs(wages, 900);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = {
      ...buildPending(result.pending),
      f1095a: policySchema.parse(result.pending.f1095a),
    };
    const filer = extractFilerIdentity(p.f1040!)!;
    const changes: Array<(x: typeof p) => void> = [
      (x) => {
        x.f1095a.f1095as[0].monthly_aptcs![0] -= 1;
      },
      (x) => {
        x.f1095a.f1095as[0].annual_aptc = 1;
      },
      (x) => {
        x.f1095a.f1095as[0].aptc_monthly_evidence = undefined;
      },
      (x) => {
        x.f1095a.f1095as[0].aptc_monthly_evidence!.pop();
      },
      (x) => {
        x.f1095a.f1095as[0].aptc_monthly_evidence![0]
          .coverage_eligibility_review.individuals[0].individual_ssn =
            "345678901";
      },
      (x) => {
        x.general!.ptc_joint_income_review = undefined;
      },
      (x) => {
        x.form8962!.repayment_limitation = 975;
      },
      (x) => {
        x.form8962!.excess_advance_premium = 975;
      },
      (x) => {
        x.f1040!.line17_additional_taxes = 975;
      },
      (x) => {
        x.schedule2!.line1a_excess_advance_premium = 975;
      },
      (x) => {
        x.form8962!.household_income = 1;
      },
    ];
    for (const change of changes) {
      const changed = structuredClone(p);
      change(changed);
      await assertRejects(
        () => buildMefBundle(changed, { filer, attachments: [] }),
        Error,
      );
      assertThrows(() => {
        const all = normalizeAllPending(changed);
        const projected = form8962Pdf.projectFields!(changed.form8962!, all);
        form8962Pdf.instances!(projected, filer, all);
      }, Error);
    }
  }
});

Deno.test("Joint APTC public source refuses unpaid, premature, duplicate and disqualified coverage reviews", () => {
  const base = jointAptcInputs(30000, 100);
  const changes: Array<(x: typeof base) => void> = [
    (x) => {
      x.f1095a[0].aptc_monthly_evidence[0].premium_payment.amount = 799;
    },
    (x) => {
      x.f1095a[0].aptc_monthly_evidence[0].premium_payment.paid_on =
        "2026-04-16";
    },
    (x) => {
      x.f1095a[0].aptc_monthly_evidence[0].coverage_eligibility_review
        .reviewed_on = "2025-01-01";
    },
    (x) => {
      x.f1095a[0].aptc_monthly_evidence[0].month = 2;
    },
    (x) => {
      x.f1095a[0].aptc_monthly_evidence[0].coverage_eligibility_review
        .individuals.pop();
    },
  ];
  for (const change of changes) {
    const changed = structuredClone(base);
    change(changed);
    assertEquals(
      f1040_2025.executeReturn(changed).diagnostics.length > 0,
      true,
    );
  }
  const row = base.f1095a[0].aptc_monthly_evidence[0];
  const invalid = {
    ...row,
    coverage_eligibility_review: {
      ...row.coverage_eligibility_review,
      individuals: row.coverage_eligibility_review.individuals.map((p) => ({
        ...p,
        government_mec_eligibility_review: "eligible",
      })),
    },
  };
  assertEquals(
    f1040_2025.executeReturn({
      ...base,
      f1095a: [{
        ...base.f1095a[0],
        aptc_monthly_evidence: [
          invalid,
          ...base.f1095a[0].aptc_monthly_evidence.slice(1),
        ],
      }],
    }).diagnostics.length > 0,
    true,
  );
});
