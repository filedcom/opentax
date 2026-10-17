import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../scripts/support/sys.ts";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { Box12Code } from "../../../../nodes/inputs/income/wages/w2/index.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { registry } from "../../../registry.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

test("elected W-2 code-Q combat pay reaches Form 1040 line 1i and both exports", async () => {
  const [wage] = base.inputs.w2 as Record<string, unknown>[];
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    w2: [{
      ...wage,
      box12_entries: [{ code: Box12Code.Q, amount: 1_000 }],
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1i_combat_pay, 1_000);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<NontxCombatPayElectionAmt>1000</NontxCombatPayElectionAmt>",
  );
  const xsd = new URL(
    "../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(xmlPath, xml);
    const validation = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(validation.code, 0, new TextDecoder().decode(validation.stderr));
  } finally {
    await sys.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, base.filer);
  const pdfPath = await sys.makeTempFile({ suffix: ".pdf" });
  try {
    await fs.writeFile(pdfPath, pdf);
    const extracted = await new sys.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    assertEquals(/1,?000/.test(new TextDecoder().decode(extracted.stdout)), true);
  } finally {
    await sys.remove(pdfPath);
  }

  const altered = structuredClone(pending);
  (altered.w2 as unknown as {
    w2s: { box12_entries: { amount: number }[] }[];
  }).w2s[0]!.box12_entries[0]!.amount = 2_000;
  assertThrows(
    () => buildMefXml(altered, base.filer),
    Error,
    "line 1i combat-pay election differs from retained W-2 box 12 code Q",
  );
  await assertRejects(
    () => buildPdfBytes(altered, base.filer),
    Error,
    "line 1i combat-pay election differs from retained W-2 box 12 code Q",
  );

  const noElection = structuredClone(pending);
  delete noElection.f1040!.line1i_combat_pay;
  const noElectionXml = buildMefXml(noElection, base.filer);
  assertEquals(noElectionXml.includes("NontxCombatPayElectionAmt"), false);
  assertEquals((await buildPdfBytes(noElection, base.filer)).byteLength > 0, true);
});
