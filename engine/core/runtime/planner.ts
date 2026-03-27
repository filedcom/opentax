import type { NodeRegistry } from "../types/node-registry.ts";

export type ExecutionStep = {
  readonly id: string; // instance ID (e.g., "start", "w2_01", "w2_02", "line_01z_wages")
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

  const parsedStart = startNode.inputSchema.safeParse(inputs);
  if (!parsedStart.success) {
    throw new Error(
      `start node inputSchema validation failed: ${parsedStart.error.message}`,
    );
  }
  const startResult = startNode.compute(parsedStart.data);

  // Count how many times each base nodeType appears to detect singletons vs. multi-instances.
  const baseTypeCounts: Record<string, number> = {};
  for (const output of startResult.outputs) {
    const base = baseNodeType(output.nodeType);
    baseTypeCounts[base] = (baseTypeCounts[base] ?? 0) + 1;
  }

  const instanceCounters: Record<string, number> = {};
  const startOutputInstances: ExecutionStep[] = [];

  for (const output of startResult.outputs) {
    const base = baseNodeType(output.nodeType);
    const count = baseTypeCounts[base];
    if (count === 1 && output.nodeType === base) {
      // Singleton with bare nodeType: use nodeType directly as ID
      startOutputInstances.push({
        id: output.nodeType,
        nodeType: output.nodeType,
      });
    } else if (output.nodeType !== base) {
      // StartNode already emitted a suffixed ID (e.g. "w2_01") — use it as-is
      startOutputInstances.push({ id: output.nodeType, nodeType: base });
    } else {
      // Multiple outputs of same base type but bare nodeType: assign _01, _02 suffixes
      instanceCounters[base] = (instanceCounters[base] ?? 0) + 1;
      const suffix = String(instanceCounters[base]).padStart(2, "0");
      startOutputInstances.push({ id: `${base}_${suffix}`, nodeType: base });
    }
  }

  // BFS to discover all reachable steps. Use index pointer to avoid O(n) Array.shift().
  const allSteps: ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    ...startOutputInstances,
  ];
  const knownIds = new Set<string>(allSteps.map((s) => s.id));
  let bfsHead = 1; // start at index 1 to skip the "start" node itself

  while (bfsHead < allSteps.length) {
    const step = allSteps[bfsHead++];
    const node = registry[step.nodeType] ??
      registry[baseNodeType(step.nodeType)];
    if (!node) continue;

    for (const downstreamType of node.outputNodeTypes) {
      if (!knownIds.has(downstreamType)) {
        knownIds.add(downstreamType);
        allSteps.push({ id: downstreamType, nodeType: downstreamType });
      }
    }
  }

  // Build adjacency (as Sets to avoid duplicate edges) and in-degree map.
  const adjSets: Record<string, Set<string>> = {};
  const inDegree: Record<string, number> = {};

  for (const step of allSteps) {
    adjSets[step.id] = adjSets[step.id] ?? new Set();
    inDegree[step.id] = inDegree[step.id] ?? 0;
  }

  for (const output of startOutputInstances) {
    adjSets.start.add(output.id);
    inDegree[output.id] = (inDegree[output.id] ?? 0) + 1;
  }

  for (const step of allSteps) {
    if (step.id === "start") continue;
    const node = registry[step.nodeType] ??
      registry[baseNodeType(step.nodeType)];
    if (!node) continue;

    for (const downstreamType of node.outputNodeTypes) {
      if (!adjSets[step.id].has(downstreamType)) {
        adjSets[step.id].add(downstreamType);
        inDegree[downstreamType] = (inDegree[downstreamType] ?? 0) + 1;
      }
    }
  }

  // Kahn's BFS topological sort. Use index pointer to avoid O(n) Array.shift().
  const stepById: Record<string, ExecutionStep> = {};
  for (const step of allSteps) stepById[step.id] = step;

  const topoQueue: string[] = [];
  for (const step of allSteps) {
    if (inDegree[step.id] === 0) topoQueue.push(step.id);
  }

  const sorted: ExecutionStep[] = [];
  let topoHead = 0;

  while (topoHead < topoQueue.length) {
    const id = topoQueue[topoHead++];
    sorted.push(stepById[id]);

    for (const neighbor of adjSets[id]) {
      inDegree[neighbor] -= 1;
      if (inDegree[neighbor] === 0) topoQueue.push(neighbor);
    }
  }

  if (sorted.length !== allSteps.length) {
    throw new Error(
      `Cycle detected in execution graph: sorted ${sorted.length} of ${allSteps.length} nodes`,
    );
  }

  return sorted;
}
