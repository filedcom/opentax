import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import {
  f4868,
  inputSchema as f4868InputSchema,
} from "../nodes/inputs/general/filing/f4868/index.ts";

export const inputNodes: readonly InputNodeEntry[] = [
  { node: f4868, inputSchema: f4868InputSchema, isArray: false },
];
