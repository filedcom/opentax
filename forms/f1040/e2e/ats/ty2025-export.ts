import * as fs from "node:fs/promises";
import * as sys from "../../../../scripts/support/sys.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../../cli/commands/export.ts";
import { f1040_2025 } from "../../2025/index.ts";
import type { MefPdfAttachment } from "../../2025/mef/form-descriptor.ts";
import { normalizeAllPending } from "../../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";

export const RETURN_1040_XSD_2025 = new URL(
  "../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

export function xsdAvailable(): boolean {
  try {
    sys.statSync(RETURN_1040_XSD_2025);
    return true;
  } catch {
    return false;
  }
}

/** The packet prints no signatures; ATS returns are signed with test PINs. */
export const ATS_TEST_SIGNATURES = {
  taxpayer_signature_pin: "12345",
  taxpayer_signature_date: "2026-02-01",
  spouse_signature_pin: "54321",
  spouse_signature_date: "2026-02-01",
} as const;

function signedAts(inputs: Record<string, unknown>): Record<string, unknown> {
  const general = inputs.general as Record<string, unknown>;
  const joint = general.filing_status === "mfj";
  return {
    ...inputs,
    general: {
      ...general,
      taxpayer_signature_pin: ATS_TEST_SIGNATURES.taxpayer_signature_pin,
      taxpayer_signature_date: ATS_TEST_SIGNATURES.taxpayer_signature_date,
      ...(joint && {
        spouse_signature_pin: ATS_TEST_SIGNATURES.spouse_signature_pin,
        spouse_signature_date: ATS_TEST_SIGNATURES.spouse_signature_date,
      }),
    },
  };
}

/** Export as `return export --type mef` does, without --force. */
export async function exportAtsReturn(
  inputs: Record<string, unknown>,
  attachments: readonly MefPdfAttachment[] = [],
) {
  const result = f1040_2025.executeReturn(signedAts(inputs));
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  const prepared = await f1040_2025.prepareReturn(
    pending,
    filer,
    [...attachments],
  );
  const report = businessRuleReport(
    pending,
    filer,
    emittedValidationScope(prepared.bundle.xml),
  );
  return {
    diagnostics: result.diagnostics,
    pending,
    xml: prepared.bundle.xml,
    attachments: prepared.bundle.attachments.map((item) => item.fileName),
    rejects: report.entries
      .filter((entry) =>
        entry.severity === "reject" || entry.severity === "reject_and_stop"
      )
      .map((entry) => entry.ruleNumber),
  };
}

export async function validateReturn1040Xsd(
  xml: string,
): Promise<{ success: boolean; stderr: string }> {
  const file = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(file, xml);
    const { code, stderr } = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", RETURN_1040_XSD_2025, file],
      stderr: "piped",
      stdout: "null",
    }).output();
    return {
      success: code === 0,
      stderr: new TextDecoder().decode(stderr).trim(),
    };
  } finally {
    await sys.remove(file).catch(() => {});
  }
}

/** The text of one leaf element, or of each repeated leaf, in document order. */
export function xmlValues(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}(?: [^>]*)?>([^<]*)</${tag}>`, "g"))]
    .map((match) => match[1]);
}

/** Each emitted document with this root tag. */
export function xmlDocuments(xml: string, root: string): string[] {
  return [...xml.matchAll(new RegExp(`<${root}[ >][\\s\\S]*?</${root}>`, "g"))]
    .map((match) => match[0]);
}

/** One leaf amount from the single document with this root tag. */
export function xmlAmount(xml: string, root: string, tag: string): number {
  const [document, ...others] = xmlDocuments(xml, root);
  const [value, ...more] = document ? xmlValues(document, tag) : [];
  if (others.length > 0 || more.length > 0 || value === undefined) {
    throw new Error(`Expected one ${root} ${tag}`);
  }
  return Number(value);
}
