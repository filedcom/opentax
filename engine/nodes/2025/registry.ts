import type { NodeRegistry } from "../../core/types/node-registry.ts";
import { div } from "./f1040/inputs/DIV/index.ts";
import { int } from "./f1040/inputs/INT/index.ts";
import { w2 } from "./f1040/inputs/W2/index.ts";
import { f1040 } from "./f1040/outputs/f1040/index.ts";
import { schedule1 } from "./f1040/outputs/schedule1/index.ts";
import { start } from "./f1040/start/index.ts";

export const registry: NodeRegistry = {
  start,
  w2,
  int,
  div,
  f1040,
  schedule1,
};
