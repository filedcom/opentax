import type { NodeRegistry } from "../types/node-registry.ts";

// A node in the static dependency tree
export type GraphNode = {
  readonly nodeType: string;
  readonly depth: number;
  readonly registered: boolean;
  readonly children: readonly GraphNode[];
};

/**
 * Build a static dependency tree rooted at rootNodeType by traversing
 * outputNodeTypes metadata. No execution — purely structural metadata walk.
 *
 * @param rootNodeType - The node type to start traversal from
 * @param registry - Registry mapping nodeType strings to TaxNode instances
 * @param maxDepth - Maximum traversal depth (default: Infinity)
 * @returns GraphNode tree rooted at rootNodeType
 * @throws Error if rootNodeType is not found in registry
 */
export function computeTaxGraph(
  rootNodeType: string,
  registry: NodeRegistry,
  maxDepth: number = Infinity,
): GraphNode {
  if (!(rootNodeType in registry)) {
    const validTypes = Object.keys(registry).join(", ");
    throw new Error(
      `Unknown node type '${rootNodeType}'. Valid: ${validTypes}`,
    );
  }

  return buildNode(rootNodeType, registry, 0, maxDepth, new Set<string>());
}

function buildNode(
  nodeType: string,
  registry: NodeRegistry,
  depth: number,
  maxDepth: number,
  visited: ReadonlySet<string>,
): GraphNode {
  const node = registry[nodeType];

  // Unregistered node — return as leaf with registered=false
  if (node === undefined) {
    return { nodeType, depth, registered: false, children: [] };
  }

  // At or beyond maxDepth — return node with no children
  if (depth >= maxDepth) {
    return { nodeType, depth, registered: true, children: [] };
  }

  // Cycle guard — if this node type is already on the current path, stop
  if (visited.has(nodeType)) {
    return { nodeType, depth, registered: true, children: [] };
  }

  // Clone visited set per branch (allows diamond patterns, only prevents same-path cycles)
  const branchVisited = new Set(visited);
  branchVisited.add(nodeType);

  const children: GraphNode[] = node.outputNodeTypes.map((childType) =>
    buildNode(childType, registry, depth + 1, maxDepth, branchVisited)
  );

  return { nodeType, depth, registered: true, children };
}
