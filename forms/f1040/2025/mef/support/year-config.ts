import { CONFIG_BY_YEAR, type F1040Config } from "../../../nodes/config/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";

/** The return's tax year; a descriptor built without a return is TY2025. */
export function mefTaxYear(context?: MefBuildContext): number {
  return context?.taxYear ?? 2025;
}

export function mefYearConfig(context?: MefBuildContext): F1040Config {
  const year = mefTaxYear(context);
  const cfg = CONFIG_BY_YEAR[year];
  if (!cfg) throw new Error(`No f1040 config for year ${year}`);
  return cfg;
}
