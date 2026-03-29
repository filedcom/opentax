import type { NodeRegistry } from "../types/node-registry.ts";

export type ExecutionStep = {
  readonly id: string;
  readonly nodeType: string;
};

/**
 * Builds a topologically-sorted execution plan from the registry.
 *
 * Each node type fires exactly once — no instance expansion.
 * Step IDs equal nodeTypes.
 * All nodes in the registry appear in the plan; optional nodes are skipped
 * at execution time by the executor when their Zod parse fails.
 *
 * Algorithm: Kahn's BFS topological sort over the static node type graph.
 */
export function buildExecutionPlan(
  registry: NodeRegistry,
): readonly ExecutionStep[] {
  if (!registry["start"]) {
    throw new Error("NodeRegistry must contain a 'start' node");
  }

  const nodeTypes = Object.keys(registry);

  // Build adjacency sets and in-degree map from outputNodeTypes declarations.
  const adj: Record<string, Set<string>> = {};
  const inDegree: Record<string, number> = {};

  for (const nodeType of nodeTypes) {
    adj[nodeType] = adj[nodeType] ?? new Set();
    inDegree[nodeType] = inDegree[nodeType] ?? 0;
  }

  for (const nodeType of nodeTypes) {
    const node = registry[nodeType];
    if (!node) continue;
    for (const downstream of node.outputNodeTypes) {
      // Only include edges to nodes that exist in the registry.
      if (!(downstream in inDegree)) continue;
      if (!adj[nodeType].has(downstream)) {
        adj[nodeType].add(downstream);
        inDegree[downstream] = (inDegree[downstream] ?? 0) + 1;
      }
    }
  }

  // Kahn's BFS: start with nodes that have no incoming edges.
  const queue: string[] = [];
  for (const nodeType of nodeTypes) {
    if (inDegree[nodeType] === 0) queue.push(nodeType);
  }

  const sorted: ExecutionStep[] = [];
  let head = 0;

  while (head < queue.length) {
    const nodeType = queue[head++];
    sorted.push({ id: nodeType, nodeType });

    for (const neighbor of adj[nodeType]) {
      inDegree[neighbor] -= 1;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== nodeTypes.length) {
    throw new Error(
      `Cycle detected in execution graph: sorted ${sorted.length} of ${nodeTypes.length} nodes`,
    );
  }

  return sorted;
}
