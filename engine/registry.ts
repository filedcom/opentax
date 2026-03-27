import type { NodeRegistry } from "./core/types/node-registry.ts";
import { StartNode } from "./nodes/2025/start/index.ts";
import { W2Node } from "./nodes/2025/source-docs/w2/index.ts";
import { Line01zWagesNode } from "./nodes/2025/lines/line_01z_wages/index.ts";

export const registry: NodeRegistry = {
  start: new StartNode(),
  w2: new W2Node(),
  line_01z_wages: new Line01zWagesNode(),
};
