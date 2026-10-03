import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { agreedMfsJointPayment } from "../../nodes/inputs/f1040es/agreed-payment.fixture.ts";
import { registry } from "../registry.ts";
import { buildMefBundle, buildMefXml } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "mfs-w2-lived-apart-all-year-social-security-box"
)!;

Deno.test("signed MFS joint estimated payment reaches line 26 without a former-spouse mark", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, f1040es: agreedMfsJointPayment },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.filing_status, "mfs");
  assertEquals(pending.f1040?.line26_estimated_tax, 300);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<EstimatedTaxPaymentsAmt>300</EstimatedTaxPaymentsAmt>",
  );
  assertEquals(bundle.xml.includes("divorcedSpouseSSN"), false);
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 2);

  const changed = buildPending({
    ...result.pending,
    f1040es: {
      ...agreedMfsJointPayment,
      joint_estimated_payment_allocation: {
        ...agreedMfsJointPayment.joint_estimated_payment_allocation,
        payments: [{
          ...agreedMfsJointPayment.joint_estimated_payment_allocation
            .payments[0],
          taxpayer_allocated_amount: 301,
        }],
      },
    },
  });
  assertThrows(
    () => buildMefXml(changed, base.filer),
    Error,
    "agreed allocation must equal",
  );
  await assertRejects(
    () => buildPdfBytes(changed, base.filer),
    Error,
    "agreed allocation must equal",
  );
});
