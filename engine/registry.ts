import type { NodeRegistry } from "./core/types/node-registry.ts";
import { StartNode } from "./nodes/start/2025/index.ts";
import { W2Node } from "./nodes/inputs/w2/2025/index.ts";
import { Line01zWagesNode } from "./nodes/form_1040/line_01z_wages/2025/index.ts";

export const registry: NodeRegistry = {
  start: new StartNode(),
  w2: new W2Node(),
  line_01z_wages: new Line01zWagesNode(),
};
