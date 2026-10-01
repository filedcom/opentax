import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { inputSchema as form1095aSchema } from "../../nodes/inputs/f1095a/index.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-sequential-no-aptc-policies-200-fpl"
)!;
const threePolicyFixture = pdfReviewFixtures.find((item) =>
  item.id === "single-sequential-three-no-aptc-policies-200-fpl"
)!;

Deno.test("two sequential no-APTC policies at 200% FPL reconcile every paid month through Form 8962, Schedule 3, Form 1040, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 7_200);
  assertEquals(result.pending.form8962.total_advance_ptc, 0);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 7_200);
  assertEquals(result.pending.f1040.line31_additional_payments, 7_200);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
    12,
  );
  assertStringIncludes(
    bundle.xml,
    "<TotalPremiumTaxCreditAmt>7200</TotalPremiumTaxCreditAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>7200</ReconciledPremiumTaxCreditAmt>",
  );
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const source = form1095aSchema.parse(pending.f1095a);
  const missingJulyPayment = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], {
        ...source.f1095as[1],
        no_aptc_monthly_evidence: source.f1095as[1]
          .no_aptc_monthly_evidence?.slice(1),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(missingJulyPayment, {
        filer: fixture.filer,
        attachments: [],
      }),
    Error,
    "determination and payment for every policy-covered month",
  );
  await assertRejects(
    () =>
      buildPdfBytes(
        missingJulyPayment,
        fixture.filer,
        ".pdf-cache",
        bundle,
      ),
    Error,
    "determination and payment for every policy-covered month",
  );
  const lateJulyPayment = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], {
        ...source.f1095as[1],
        no_aptc_monthly_evidence: source.f1095as[1]
          .no_aptc_monthly_evidence?.map((item) =>
            item.month === 7
              ? {
                ...item,
                premium_payment: {
                  ...item.premium_payment,
                  paid_on: "2026-04-16",
                },
              }
              : item
          ),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(lateJulyPayment, {
        filer: fixture.filer,
        attachments: [],
      }),
    Error,
    "lacks matching SLCSP or full payment evidence",
  );
});

Deno.test("three sequential no-APTC policies at 200% FPL reconcile their own reviewed months through the complete return", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    threePolicyFixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 7_800);
  assertEquals(result.pending.form8962.total_advance_ptc, 0);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 7_800);
  assertEquals(result.pending.f1040.line31_additional_payments, 7_800);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: threePolicyFixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
    12,
  );
  for (const slcsp of [600, 700, 800]) {
    assertEquals(
      (bundle.xml.match(
        new RegExp(
          `<MonthlyPremiumSLCSPAmt>${slcsp}</MonthlyPremiumSLCSPAmt>`,
          "g",
        ),
      ) ?? []).length,
      4,
    );
  }
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>7800</ReconciledPremiumTaxCreditAmt>",
  );
  const pdf = await buildPdfBytes(
    pending,
    threePolicyFixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const source = form1095aSchema.parse(pending.f1095a);
  const missingThirdPolicyProof = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], source.f1095as[1], {
        ...source.f1095as[2],
        no_aptc_monthly_evidence: source.f1095as[2]
          .no_aptc_monthly_evidence?.slice(1),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(missingThirdPolicyProof, {
        filer: threePolicyFixture.filer,
        attachments: [],
      }),
    Error,
    "three-policy monthly PTC needs a determination and payment for every policy-covered month",
  );
  await assertRejects(
    () =>
      buildPdfBytes(
        missingThirdPolicyProof,
        threePolicyFixture.filer,
        ".pdf-cache",
        bundle,
      ),
    Error,
    "three-policy monthly PTC needs a determination and payment for every policy-covered month",
  );
  const overlappingThirdPolicy = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], source.f1095as[1], {
        ...source.f1095as[2],
        monthly_premiums: source.f1095as[2].monthly_premiums?.map(
          (amount, index) => index === 7 ? 900 : amount,
        ),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(overlappingThirdPolicy, {
        filer: threePolicyFixture.filer,
        attachments: [],
      }),
    Error,
    "three-policy monthly PTC needs distinct same-state nonshared policies",
  );
  const returningFirstPolicy = {
    ...pending,
    f1095a: {
      f1095as: [
        {
          ...source.f1095as[0],
          monthly_premiums: source.f1095as[0].monthly_premiums?.map(
            (amount, index) => index === 11 ? 900 : amount,
          ),
        },
        source.f1095as[1],
        {
          ...source.f1095as[2],
          monthly_premiums: source.f1095as[2].monthly_premiums?.map(
            (amount, index) => index === 11 ? 0 : amount,
          ),
        },
      ],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(returningFirstPolicy, {
        filer: threePolicyFixture.filer,
        attachments: [],
      }),
    Error,
    "three-policy monthly PTC needs distinct same-state nonshared policies",
  );
});
