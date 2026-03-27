import type { NodeRegistry } from "../types/node-registry.ts";

export type ExecutionStep = {
  readonly id: string;       // instance ID (e.g., "start", "w2_01", "w2_02", "line_01z_wages")
  readonly nodeType: string; // which TaxNode to use from registry (base type, no suffix)
};

/**
 * Strips numeric instance suffix from a nodeType ID.
 * e.g. "w2_01" -> "w2", "line_01z_wages_01" -> "line_01z_wages", "start" -> "start"
 * Used to look up the base registry entry for suffixed instance IDs.
 */
function baseNodeType(id: string): string {
  return id.replace(/_\d+$/, "");
}

/**
 * Builds an ordered execution plan from the registry and raw inputs.
 *
 * Algorithm:
 * 1. Run start.compute(inputs) to learn which instances to create.
 * 2. Expand instances: multiple outputs of same nodeType get _01, _02 suffixes;
 *    single outputs use the nodeType as the ID.
 * 3. For each instance, use outputNodeTypes metadata to build downstream edges
 *    (singletons only — one downstream instance per nodeType).
 * 4. Topologically sort via Kahn's algorithm (BFS with in-degree tracking).
 * 5. Return sorted ExecutionStep[].
 */
export function buildExecutionPlan(
  registry: NodeRegistry,
  inputs: Record<string, unknown>,
): readonly ExecutionStep[] {
  const startNode = registry["start"];
  if (!startNode) {
    throw new Error("NodeRegistry must contain a 'start' node");
  }

  // Step 1: Run start.compute() to discover which instances to create.
  // The start node's inputSchema may or may not require strict validation here —
  // we do a direct compute with the raw inputs (safe because planner trusts registry owner).
  const parsedStart = startNode.inputSchema.safeParse(inputs);
  if (!parsedStart.success) {
    throw new Error(
      `start node inputSchema validation failed: ${parsedStart.error.message}`,
    );
  }
  const startResult = startNode.compute(parsedStart.data);

  // Step 2: Expand start outputs into instances.
  // StartNode may emit bare nodeTypes ("w2") or pre-suffixed IDs ("w2_01", "w2_02").
  // Normalize: use output.nodeType as the instance ID, and baseNodeType() as the registry key.
  // Count how many times each base nodeType appears to detect singletons vs. multi-instances.
  const baseTypeCounts: Record<string, number> = {};
  for (const output of startResult.outputs) {
    const base = baseNodeType(output.nodeType);
    baseTypeCounts[base] = (baseTypeCounts[base] ?? 0) + 1;
  }

  // Assign IDs to each output.
  const instanceCounters: Record<string, number> = {};
  const startOutputInstances: ExecutionStep[] = [];

  for (const output of startResult.outputs) {
    const base = baseNodeType(output.nodeType);
    const count = baseTypeCounts[base];
    if (count === 1 && output.nodeType === base) {
      // Singleton with bare nodeType: use nodeType directly as ID
      startOutputInstances.push({ id: output.nodeType, nodeType: output.nodeType });
    } else if (output.nodeType !== base) {
      // StartNode already emitted a suffixed ID (e.g. "w2_01") — use it as-is
      startOutputInstances.push({ id: output.nodeType, nodeType: base });
    } else {
      // Multiple outputs of same base type but bare nodeType: assign _01, _02 suffixes
      instanceCounters[base] = (instanceCounters[base] ?? 0) + 1;
      const suffix = String(instanceCounters[base]).padStart(2, "0");
      startOutputInstances.push({
        id: `${base}_${suffix}`,
        nodeType: base,
      });
    }
  }

  // Step 3: Build the full instance set and adjacency list.
  // We process all instances level by level.
  // For non-start nodes, downstream edges come from outputNodeTypes metadata (singletons only).
  const allSteps: ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    ...startOutputInstances,
  ];

  // Build set of known instance IDs to detect singletons vs already-expanded.
  // For downstream nodes of non-start nodes, they are always singletons (same ID as nodeType).
  const knownIds = new Set<string>(allSteps.map((s) => s.id));
  const queue = [...startOutputInstances];

  while (queue.length > 0) {
    const step = queue.shift()!;
    const node = registry[step.nodeType] ?? registry[baseNodeType(step.nodeType)];
    if (!node) continue;

    for (const downstreamType of node.outputNodeTypes) {
      if (!knownIds.has(downstreamType)) {
        knownIds.add(downstreamType);
        const newStep: ExecutionStep = { id: downstreamType, nodeType: downstreamType };
        allSteps.push(newStep);
        queue.push(newStep);
      }
    }
  }

  // Step 4: Build adjacency list and in-degree map for Kahn's algorithm.
  // Edges: from parent instance -> child instance ID.
  const adj: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  for (const step of allSteps) {
    adj[step.id] = adj[step.id] ?? [];
    inDegree[step.id] = inDegree[step.id] ?? 0;
  }

  // start -> each start output instance
  for (const output of startOutputInstances) {
    adj["start"].push(output.id);
    inDegree[output.id] = (inDegree[output.id] ?? 0) + 1;
  }

  // For each non-start instance, edges to their downstream singletons.
  for (const step of allSteps) {
    if (step.id === "start") continue;
    const node = registry[step.nodeType] ?? registry[baseNodeType(step.nodeType)];
    if (!node) continue;

    for (const downstreamType of node.outputNodeTypes) {
      // Downstream is always singleton ID = nodeType
      if (adj[step.id] && !adj[step.id].includes(downstreamType)) {
        adj[step.id].push(downstreamType);
        inDegree[downstreamType] = (inDegree[downstreamType] ?? 0) + 1;
      }
    }
  }

  // Step 5: Kahn's BFS topological sort.
  const topoQueue: string[] = [];
  for (const step of allSteps) {
    if (inDegree[step.id] === 0) {
      topoQueue.push(step.id);
    }
  }

  const sorted: ExecutionStep[] = [];
  const stepById: Record<string, ExecutionStep> = {};
  for (const step of allSteps) {
    stepById[step.id] = step;
  }

  while (topoQueue.length > 0) {
    const id = topoQueue.shift()!;
    sorted.push(stepById[id]);

    for (const neighbor of (adj[id] ?? [])) {
      inDegree[neighbor] -= 1;
      if (inDegree[neighbor] === 0) {
        topoQueue.push(neighbor);
      }
    }
  }

  if (sorted.length !== allSteps.length) {
    throw new Error(
      `Cycle detected in execution graph: sorted ${sorted.length} of ${allSteps.length} nodes`,
    );
  }

  return sorted;
}
