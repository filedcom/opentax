import { MEF_RETURN_VERSION_BY_TAX_YEAR } from "../mef/return-versions.ts";

export const F1040_2026_CONFIG = {
  formType: "f1040" as const,
  taxYear: 2026 as const,
  mefSchemaVersion: MEF_RETURN_VERSION_BY_TAX_YEAR[2026],
} as const;
