import type { NodeRegistry } from "../../core/types/node-registry.ts";
import { f1040_line_1z } from "./f1040/f1040_line_01z/index.ts";
import { w2 } from "./source-docs/w2/index.ts";
import { start } from "./start/index.ts";

export const registry: NodeRegistry = {
  start,
  w2,
  f1040_line_1z,
};
