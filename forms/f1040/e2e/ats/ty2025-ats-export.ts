import * as fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as sys from "../../../../scripts/support/sys.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../../cli/commands/export.ts";
import { f1040_2025 } from "../../2025/index.ts";
import { normalizeAllPending } from "../../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";

export const TY2025_RETURN1040_XSD = fileURLToPath(
  new URL(
    "../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ),
);

/** Builds a signed ATS fixture the way `return export --type mef` does. */
export async function atsMefExport(inputs: Record<string, unknown>) {
  const result = f1040_2025.executeReturn(signed(inputs));
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  const xml = (await f1040_2025.prepareReturn(pending, filer, [])).bundle.xml;
  const rejects = [
    ...new Set(
      businessRuleReport(pending, filer, emittedValidationScope(xml)).entries
        .filter((entry) =>
          entry.severity === "reject" || entry.severity === "reject_and_stop"
        )
        .map((entry) => entry.ruleNumber),
    ),
  ].sort();
  return { diagnostics: result.diagnostics, pending, xml, rejects };
}

/** xmllint result against the TY2025 v5.4 Return1040 schema. */
export async function validateTy2025Xsd(
  xml: string,
): Promise<{ success: boolean; stderr: string }> {
  const file = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(file, xml);
    const { code, stderr } = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", TY2025_RETURN1040_XSD, file],
      stderr: "piped",
      stdout: "null",
    }).output();
    return { success: code === 0, stderr: new TextDecoder().decode(stderr) };
  } finally {
    await sys.remove(file).catch(() => {});
  }
}

/** The text of one native element, or undefined when it is absent. */
export function xmlValue(
  xml: string,
  document: string,
  tag: string,
): string | undefined {
  const body = new RegExp(`<${document}\\b[^>]*>([\\s\\S]*?)</${document}>`)
    .exec(xml)?.[1];
  return body
    ? new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(body)?.[1]
    : undefined;
}
