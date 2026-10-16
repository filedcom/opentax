/** Read actual registered objects; do not execute returns or download templates. */
import { registry } from "../../../forms/f1040/2025/registry.ts";
import { ALL_MEF_FORMS } from "../../../forms/f1040/2025/mef/forms/index.ts";
import { ALL_PDF_FORMS } from "../../../forms/f1040/2025/pdf/forms/index.ts";
import { sourceRegistry2026 } from "../../../forms/f1040/2026/source-registry.ts";
import type { NodeRegistry } from "../../../core/types/node-registry.ts";

interface Binding {
  key: string;
  module: string;
  exported: string;
}
interface Request {
  nodes2025: Binding[];
  nodes2026: Binding[];
  pdf: Binding[];
  mef: Binding[];
}

async function verifyBindings(
  bindings: Binding[],
  actual: Readonly<Record<string, unknown>>,
  skipStart = false,
) {
  const keys = Object.keys(actual);
  if (JSON.stringify(bindings.map((b) => b.key)) !== JSON.stringify(keys)) {
    throw new Error("Parsed inventory does not match runtime keys/order");
  }
  for (const binding of bindings) {
    if (skipStart && binding.key === "start") continue;
    const exports = await import(binding.module);
    if (exports[binding.exported] !== actual[binding.key]) {
      throw new Error(`Runtime binding mismatch: ${binding.key}`);
    }
  }
}

function nodes(value: NodeRegistry) {
  return Object.entries(value).map(([key, node]) => ({
    key,
    node_type: node.nodeType,
    implemented: node.implemented,
    targets: [...node.outputNodeTypes],
  }));
}

const request: Request = JSON.parse(
  await new Response(Deno.stdin.readable).text(),
);
await verifyBindings(request.nodes2025, registry, true);
await verifyBindings(request.nodes2026, sourceRegistry2026, true);
await verifyBindings(
  request.pdf,
  Object.fromEntries(ALL_PDF_FORMS.map((v, i) => [String(i), v])),
);
await verifyBindings(
  request.mef,
  Object.fromEntries(ALL_MEF_FORMS.map((v, i) => [String(i), v])),
);
console.log(JSON.stringify({
  nodes2025: nodes(registry),
  nodes2026: nodes(sourceRegistry2026),
  pdf: ALL_PDF_FORMS.map((d) => ({ pending_key: d.pendingKey, url: d.pdfUrl })),
  mef: ALL_MEF_FORMS.map((d) => ({ pending_key: d.pendingKey })),
}));
