import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import {
  DistributionCode,
  inputSchema as f1099rInputSchema,
  RolloverCode,
} from "../../nodes/inputs/f1099r/index.ts";
import { buildMefXml } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { irs1040Pdf } from "./forms/f1040.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-ira-rollover"
)!;

Deno.test("IRA rollover eligibility review is required again at native and PDF export", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const pdf = await PDFDocument.load(
    await buildPdfBytes(pending, fixture.filer),
  );
  assertEquals(pdf.getPageCount() > 0, true);
  const projected = irs1040Pdf.projectFields?.(
    result.pending.f1040,
    result.pending,
  );
  assertEquals(projected?.line4c_ira_rollover, true);
  assertEquals(projected?.line4b_ira_taxable, "0");
  const source = pending.f1099r!.f1099rs![0]!;
  for (
    const unlinked of [
      { ...source, source_document_reference: undefined },
      { ...source, account_number: undefined },
      { ...source, recipient_ssn: undefined },
      { ...source, ts: undefined },
    ]
  ) {
    const drift = {
      ...pending,
      f1099r: { f1099rs: [unlinked] },
    } as unknown as ReturnType<typeof buildPending>;
    assertThrows(
      () => buildMefXml(drift, fixture.filer),
      Error,
      "identified payer copy, account, recipient, and filed owner",
    );
    await assertRejects(
      () => buildPdfBytes(drift, fixture.filer),
      Error,
      "identified payer copy, account, recipient, and filed owner",
    );
  }
  for (
    const [field, ira_rollover] of [
      ["not_inherited_ira_confirmed", {
        ...source.ira_rollover!,
        not_inherited_ira_confirmed: undefined,
      }],
      ["not_required_minimum_distribution_confirmed", {
        ...source.ira_rollover!,
        not_required_minimum_distribution_confirmed: undefined,
      }],
      ["rollover_eligibility_review_reference", {
        ...source.ira_rollover!,
        rollover_eligibility_review_reference: "",
      }],
    ] as const
  ) {
    const drift = {
      ...pending,
      f1099r: { f1099rs: [{ ...source, ira_rollover }] },
    } as unknown as ReturnType<typeof buildPending>;
    assertThrows(
      () => buildMefXml(drift, fixture.filer),
      Error,
      "1099-R owner review needs valid payer source rows",
    );
    await assertRejects(
      () => buildPdfBytes(drift, fixture.filer),
      Error,
      field,
    );
  }
  for (
    const registration of [
      { registered_owner_ssn: "999887777" },
      { registered_account_number: "different-account" },
      {
        account_registration_source_reference: source.source_document_reference,
      },
    ]
  ) {
    const drift = {
      ...pending,
      f1099r: {
        f1099rs: [{
          ...source,
          ira_rollover: { ...source.ira_rollover!, ...registration },
        }],
      },
    } as unknown as ReturnType<typeof buildPending>;
    assertThrows(
      () => buildMefXml(drift, fixture.filer),
      Error,
      "distinct account registration identifying the payer account and recipient as owner",
    );
    await assertRejects(
      () => buildPdfBytes(drift, fixture.filer),
      Error,
      "distinct account registration identifying the payer account and recipient as owner",
    );
  }
  const coded = {
    ...pending,
    f1099r: {
      f1099rs: [{ ...source, box7_code2: DistributionCode.CodeQ }],
    },
  };
  assertThrows(
    () => buildMefXml(coded, fixture.filer),
    Error,
    "conflicts with the payer distribution code",
  );
  await assertRejects(
    () => buildPdfBytes(coded, fixture.filer),
    Error,
    "conflicts with the payer distribution code",
  );
});

Deno.test("IRA code G payer box 2a conflict is rejected before native and PDF export", async () => {
  const direct = pdfReviewFixtures.find((item) =>
    item.id === "single-ira-qualified-plan-rollover"
  )!;
  const source = f1099rInputSchema.parse({ f1099rs: direct.inputs.f1099r })
    .f1099rs[0]!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...direct.inputs,
      f1099r: [{
        ...source,
        box7_distribution_code: DistributionCode.CodeG,
        rollover_code: RolloverCode.G,
        direct_rollover_confirmed: true,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const pdf = await PDFDocument.load(
    await buildPdfBytes(pending, direct.filer),
  );
  assertEquals(pdf.getPageCount(), 3);
  const xml = buildMefXml(pending, direct.filer);
  assertEquals(xml.includes("<IRADistributionRolloverInd"), true);

  const persisted = pending.f1099r!.f1099rs![0]!;
  for (const box2a_taxable_amount of [undefined, 1000]) {
    const drift = {
      ...pending,
      f1099r: { f1099rs: [{ ...persisted, box2a_taxable_amount }] },
    } as unknown as ReturnType<typeof buildPending>;
    assertThrows(
      () => buildMefXml(drift, direct.filer),
      Error,
      "IRA code G direct plan payment needs payer box 2a zero and determined",
    );
    await assertRejects(
      () => buildPdfBytes(drift, direct.filer),
      Error,
      "IRA code G direct plan payment needs payer box 2a zero and determined",
    );
  }
});
