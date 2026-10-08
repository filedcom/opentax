import { FormType } from "../../../../nodes/inputs/f4852/index.ts";
import { assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { registry } from "../../../registry.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;
const result = execute(buildExecutionPlan(registry), registry, fixture.inputs, {
  taxYear: 2025,
  formType: "f1040",
});
const pending = buildPending(result.pending);
const message =
  "Form 4852 requires a completed substitute-form filing and packet route";

for (
  const source of [{
    form_type: FormType.W2,
    payer_name: "Unissued Employer",
    wages: 1_200,
    federal_withheld: 120,
  }, {
    form_type: FormType.R_1099,
    payer_name: "Unissued Pension",
    gross_distribution: 1_200,
    federal_withheld: 120,
  }]
) {
  Deno.test(`Form 4852 ${source.form_type} source cannot leave without its filing route`, async () => {
    const withSubstitute = { ...pending, f4852: { f4852s: [source] } };
    assertThrows(
      () => buildMefXml(withSubstitute, fixture.filer),
      Error,
      message,
    );
    await assertRejects(
      () => buildPdfBytes(withSubstitute, fixture.filer),
      Error,
      message,
    );
  });
}
