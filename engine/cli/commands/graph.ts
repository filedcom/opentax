import type { GraphNode } from "../../core/runtime/graph.ts";
import { computeTaxGraph } from "../../core/runtime/graph.ts";
import { registry } from "../../nodes/2025/registry.ts";

export type GraphViewArgs = {
  readonly nodeType: string;
  readonly depth: number; // Infinity by default
  readonly json: boolean;
};

/**
 * Recursively formats a GraphNode tree as an ASCII tree string.
 *
 * @param node - The current node to render
 * @param prefix - The prefix accumulated from ancestor indentation
 * @param isLast - Whether this node is the last child of its parent
 * @param isRoot - Whether this is the root node (no connector prefix)
 * @returns Multi-line string representation of the tree
 */
export function formatAsciiTree(
  node: GraphNode,
  prefix: string = "",
  isLast: boolean = true,
  isRoot: boolean = true,
): string {
  const label = node.registered
    ? node.nodeType
    : `${node.nodeType} (unregistered)`;

  let line: string;
  if (isRoot) {
    line = label;
  } else {
    const connector = isLast ? "└── " : "├── ";
    line = prefix + connector + label;
  }

  if (node.children.length === 0) {
    return line;
  }

  const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
  const childLines = node.children.map((child, index) => {
    const childIsLast = index === node.children.length - 1;
    return formatAsciiTree(child, childPrefix, childIsLast, false);
  });

  return [line, ...childLines].join("\n");
}

/**
 * CLI command handler for `tax graph view`.
 *
 * - json=false: prints ASCII tree to stdout via console.log, returns void
 * - json=true: returns GraphNode (caller JSON.stringifies via runCommand)
 *
 * @throws Error if nodeType is not found in registry
 */
export function graphViewCommand(
  args: GraphViewArgs,
): GraphNode | void {
  const result = computeTaxGraph(args.nodeType, registry, args.depth);

  if (args.json) {
    return result;
  }

  console.log(formatAsciiTree(result));
}
