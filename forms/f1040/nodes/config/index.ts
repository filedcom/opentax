// forms/f1040/nodes/config/index.ts
//
// CONFIG_BY_YEAR — year-keyed config for all config-injected f1040 nodes.
//
// To add a new tax year, export `config{year}: F1040Config` from ./{year}.ts
// and add it here. Nodes read CONFIG_BY_YEAR[ctx.taxYear].
import { config2025 } from "./2025.ts";
import { config2026 } from "./2026.ts";
export type { F1040Config } from "./types.ts";

export const CONFIG_BY_YEAR: Record<number, import("./types.ts").F1040Config> = {
  2025: config2025,
  2026: config2026,
};
