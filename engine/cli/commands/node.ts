import { catalog } from "../../catalog.ts";
import { zodToLines } from "../utils/zod-doc.ts";

const defaultDef = catalog["f1040:2025"];

export type NodeInspectArgs = {
  readonly nodeType: string;
  readonly json: boolean;
};

/**
 * Prints all registered node types in sorted columns.
 */
export function nodeListCommand(): void {
  const types = Object.keys(defaultDef.registry).sort();
  console.log(`Registered Nodes (${types.length})\n`);

  const COL_WIDTH = 28;
  const COLS = 4;
  for (let i = 0; i < types.length; i += COLS) {
    const row = types.slice(i, i + COLS);
    const line = row.map((t) => t.padEnd(COL_WIDTH)).join("").trimEnd();
    console.log(`  ${line}`);
  }
  console.log("");
}

/**
 * Prints a node's input schema (as a human-readable tree) and its declared output nodes.
 * With --json, prints structured JSON instead.
 */
export function nodeInspectCommand(args: NodeInspectArgs): void {
  const node = defaultDef.registry[args.nodeType];
  if (!node) throw new Error(`Unknown node type: ${args.nodeType}`);

  if (args.json) {
    const schemaLines = zodToLines(node.inputSchema, undefined, 0);
    console.log(
      JSON.stringify(
        {
          nodeType: args.nodeType,
          implemented: node.implemented,
          schema: schemaLines,
          outputNodes: node.outputNodeTypes,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Node: ${args.nodeType}\n`);

  if (!node.implemented) {
    console.log("  (not yet implemented)\n");
  }

  console.log("Input Schema:");
  const schemaLines = zodToLines(node.inputSchema, undefined, 1);
  for (const line of schemaLines) console.log(line);
  console.log("");

  const outputs = node.outputNodeTypes;
  console.log(`Output Nodes (${outputs.length}):`);
  if (outputs.length === 0) {
    console.log("  (none)");
  } else {
    const COLS = 5;
    for (let i = 0; i < outputs.length; i += COLS) {
      console.log("  " + outputs.slice(i, i + COLS).join("  "));
    }
  }
  console.log("");
}
