import type { FormDefinition } from "./core/types/form-definition.ts";
import { f1040_2025 } from "./forms/f1040/2025/index.ts";

export const catalog: Record<string, FormDefinition> = {
  "f1040:2025": f1040_2025,
};
