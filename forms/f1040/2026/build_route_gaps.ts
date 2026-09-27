/** Inventory declared edges whose target is absent from the TY2026 registry. */
import { registry as registry2025 } from "../2025/registry.ts";
import { registry as registry2026 } from "./registry.ts";

const rows: string[] = ["source,target,in_2025_registry"];
for (
  const [source, node] of Object.entries(registry2026).sort(([a], [b]) =>
    a.localeCompare(b)
  )
) {
  for (const target of [...node.outputNodeTypes].sort()) {
    if (registry2026[target]) continue;
    rows.push(`${source},${target},${registry2025[target] ? "yes" : "no"}`);
  }
}

const output = new URL(
  "../../../docs/ty2026/graph-route-gaps.csv",
  import.meta.url,
);
await Deno.writeTextFile(output, rows.join("\n") + "\n");
console.log(
  `${rows.length - 1} declared TY2026 route gaps: ${output.pathname}`,
);
