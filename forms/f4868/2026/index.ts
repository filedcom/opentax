import type { FormDefinition } from "../../../core/types/form-definition.ts";
import type { ExecuteResult } from "../../../core/runtime/executor.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { sha256Hex } from "../../f1040/2025/return-processing/prepared-source.ts";
import { inputSchema } from "../nodes/inputs/general/filing/f4868/index.ts";
import { form4868RuleReport } from "../validation/rules/index.ts";
import { F4868_2026_CONFIG } from "./config.ts";
import { inputNodes } from "./inputs.ts";
import { buildForm4868Xml } from "./mef/builder.ts";
import { registry } from "./registry.ts";

const plan = buildExecutionPlan(registry);

function executeReturn(inputs: Record<string, unknown>): ExecuteResult {
  return execute(plan, registry, inputs, {
    taxYear: F4868_2026_CONFIG.taxYear,
    formType: F4868_2026_CONFIG.formType,
  });
}

const unsupportedPdf = (): Promise<Uint8Array> =>
  Promise.reject(new Error("Form 4868 has no PDF export; use --type mef"));

/** Form 4868 (2026): automatic extension of time to file, its own MeF submission. */
export const f4868_2026: FormDefinition = {
  formType: F4868_2026_CONFIG.formType,
  taxYear: F4868_2026_CONFIG.taxYear,
  mefSchemaVersion: F4868_2026_CONFIG.mefSchemaVersion,
  inputNodes,
  registry,
  executeReturn,
  prepareReturn: async (pending) => {
    const xml = buildForm4868Xml(pending);
    return {
      bundle: {
        xml,
        attachments: [],
        pending: {},
        sourceSha256: await sha256Hex(
          new TextEncoder().encode(JSON.stringify(pending)),
        ),
        xmlSha256: await sha256Hex(new TextEncoder().encode(xml)),
        attachmentSha256ByFileName: {},
      },
      renderPdf: unsupportedPdf,
    };
  },
  buildMefXml: (pending) => buildForm4868Xml(pending),
  buildPdfBytes: unsupportedPdf,
  buildPending: (pending) => pending,
  mefRuleReport: (pending, xml) =>
    form4868RuleReport(xml, {
      atsTestSubmission: inputSchema.safeParse(pending.f4868).data
        ?.ats_test_submission,
    }),
};
