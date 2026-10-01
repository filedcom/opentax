import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { form8862 as nativeForm8862 } from "../mef/forms/f8862.ts";
import { buildPending } from "../mef/pending.ts";
import { form8862Pdf } from "./forms/f8862.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((item) =>
  item.id === "single-8862-ctc-reinstatement"
)!;
const inputs = base.inputs;
const general = inputs.general as Record<string, unknown>;
const dependent = (general.dependents as Record<string, unknown>[])[0];
const f8812 = (inputs.f8812 as Record<string, unknown>[])[0];

function standaloneOdcPending() {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      general: {
        ...general,
        dependents: [{
          ...dependent,
          dob: "2003-06-15",
          full_time_student: true,
        }],
      },
      f8812: [{
        ...f8812,
        qualifying_children_count: 0,
        other_dependents_count: 1,
      }],
      f8862: {
        ...(inputs.f8862 as Record<string, unknown>),
        ctc_children: [],
        other_dependents: [{
          first_name: "Jamie",
          last_name: "Example",
          dependent: true,
          us_citizen_national_or_resident: true,
        }],
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line19_child_tax_credit, 500);
  return buildPending(result.pending);
}

Deno.test("reviewed ODC credit calculates, but unauthenticated notice blocks both exports", async () => {
  const pending = standaloneOdcPending();
  assertThrows(
    () => nativeForm8862.build(pending.f8862!, { pending }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  assertThrows(
    () =>
      form8862Pdf.instances?.(pending.f8862!, base.filer, {
        f1040: pending.f1040!,
        general: pending.general!,
        f8812: pending.f8812!,
      }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  await assertRejects(
    () => buildMefBundle(pending, { filer: base.filer, attachments: [] }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
});

Deno.test("standalone ODC rejects altered Schedule 8812, dependent TIN, and Form 1040 amounts in both exports", () => {
  const pending = standaloneOdcPending();
  const general = pending.general!;
  const sourceDependents = general.dependents!;
  const form8812 = pending.f8812!;
  const filedDependents = pending.f1040!.dependent_details!;
  const changed = [
    {
      ...pending,
      f1040: { ...pending.f1040, line19_child_tax_credit: 501 },
    },
    {
      ...pending,
      f1040: {
        ...pending.f1040,
        dependent_details: [{ ...filedDependents[0], ssn: "999887777" }],
      },
    },
    {
      ...pending,
      general: {
        ...general,
        dependents: [{ ...sourceDependents[0], ssn: "999887777" }],
      },
    },
    {
      ...pending,
      f8812: { ...form8812, form8862_filed: false },
    },
    {
      ...pending,
      f8812: {
        ...form8812,
        f8812s: [{
          ...form8812.f8812s![0],
          other_dependents_count: 2,
        }],
      },
    },
  ];
  for (const altered of changed) {
    assertThrows(
      () =>
        nativeForm8862.build(pending.f8862!, {
          filer: base.filer,
          pending: altered,
        }),
      Error,
    );
    assertThrows(
      () =>
        form8862Pdf.instances?.(pending.f8862!, base.filer, {
          f1040: altered.f1040!,
          general: altered.general!,
          f8812: altered.f8812!,
        }),
      Error,
    );
  }
});
