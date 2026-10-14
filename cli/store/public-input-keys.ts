import type { FormDefinition } from "../../core/types/form-definition.ts";

/** Stored buckets use the public start-node key, which can differ from nodeType. */
export function singletonPublicInputKeys(
  def: FormDefinition,
): ReadonlySet<string> {
  return new Set(
    def.inputNodes.filter((entry) => !entry.isArray).map((entry) =>
      entry.inputKey ?? entry.node.nodeType
    ),
  );
}
