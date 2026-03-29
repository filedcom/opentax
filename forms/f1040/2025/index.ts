import type { FormDefinition } from "../../../core/types/form-definition.ts";
import type { FilerIdentity, MefFormsPending } from "./mef/types.ts";
import { F1040_2025_CONFIG } from "./config.ts";
import { inputNodes } from "./inputs.ts";
import { registry } from "./registry.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";

export const f1040_2025: FormDefinition = {
  ...F1040_2025_CONFIG,
  inputNodes,
  registry,
  buildMefXml: (pending, filer) =>
    buildMefXml(
      pending as MefFormsPending,
      filer as FilerIdentity | undefined,
      F1040_2025_CONFIG.mefSchemaVersion,
      F1040_2025_CONFIG.taxYear,
      F1040_2025_CONFIG.formType === "f1040" ? "1040" : F1040_2025_CONFIG.formType,
    ),
  buildPending: (pending: Record<string, unknown>) =>
    buildPending(pending) as Record<string, unknown>,
};
