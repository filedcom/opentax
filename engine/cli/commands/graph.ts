import type { GraphNode } from "../../core/runtime/graph.ts";
import { computeTaxGraph } from "../../core/runtime/graph.ts";
import { registry } from "../../nodes/2025/registry.ts";

export type GraphViewArgs = {
  readonly nodeType: string;
  readonly depth: number; // Infinity by default
  readonly json: boolean;
};

/**
 * Formats a GraphNode tree as a Mermaid `graph TD` diagram.
 *
 * Unregistered nodes are pre-declared with a descriptive label and highlighted
 * in red so they stand out visually in the rendered diagram.
 *
 * @param root - The root GraphNode to render
 * @returns Mermaid diagram string starting with `graph TD`
 */
export function formatMermaid(root: GraphNode): string {
  const unregistered = new Set<string>();
  const edgeSet = new Set<string>();

  function visit(node: GraphNode): void {
    if (!node.registered) {
      unregistered.add(node.nodeType);
    }
    for (const child of node.children) {
      edgeSet.add(`  ${node.nodeType} --> ${child.nodeType}`);
      visit(child);
    }
  }

  visit(root);

  const lines: string[] = ["graph TD"];

  // Pre-declare unregistered nodes with a descriptive label
  for (const nodeType of unregistered) {
    lines.push(`  ${nodeType}["${nodeType} (unregistered)"]`);
  }

  // Emit edges (registered nodes are implicitly declared by their ID)
  if (edgeSet.size === 0) {
    lines.push(`  ${root.nodeType}`);
  } else {
    lines.push(...Array.from(edgeSet));
  }

  // Style unregistered nodes in red
  for (const nodeType of unregistered) {
    lines.push(`  style ${nodeType} fill:#faa,stroke:#c00`);
  }

  return lines.join("\n");
}

/**
 * CLI command handler for `tax graph view`.
 *
 * - json=false: prints a Mermaid diagram to stdout via console.log, returns void
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

  console.log(formatMermaid(result));
}
