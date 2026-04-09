// forms/f1040/nodes/config/index.ts
//
// CONFIG_BY_YEAR — year-keyed config for all config-injected f1040 nodes.
//
// To add a new tax year:
//   1. Create forms/f1040/{year}/config.ts with the new constants
//   2. Export `config{year}: F1040Config` from that file
//   3. Add an entry here: `{year}: config{year}`

// config2025 lives in ./2025.ts (forms/f1040/nodes/config/2025.ts).
// For future forms (f1120), their barrel would import from ../../2025/config.ts
// because f1120's year constants live in forms/f1120/2025/config.ts.
import { config2025 } from "./2025.ts";
export type { F1040Config } from "./types.ts";

export const CONFIG_BY_YEAR: Record<number, import("./types.ts").F1040Config> = {
  2025: config2025,
};
