import { assert, assertEquals } from "@std/assert";
import { dirname, fromFileUrl } from "@std/path";
import { z } from "zod";
import { TaxNode } from "../../core/types/tax-node.ts";
import { OutputNodes } from "../../core/types/output-nodes.ts";
import type { FormDefinition } from "../../core/types/form-definition.ts";
import {
  applyBaseline,
  graphOf,
  isNodeSource,
  nodePlacement,
  placementProblems,
  readBaseline,
  registryKeyProblems,
  structureReport,
  unreachableProblems,
  unregisteredNodeProblems,
} from "./structure.ts";

const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));

class FakeNode extends TaxNode {
  readonly inputSchema = z.object({});
  readonly outputNodes: OutputNodes<readonly TaxNode[]>;
  constructor(readonly nodeType: string, outputs: readonly TaxNode[] = []) {
    super();
    this.outputNodes = new OutputNodes(outputs);
  }
  compute() {
    return { outputs: [] };
  }
}

function definition(
  registry: FormDefinition["registry"],
  inputNodes: FormDefinition["inputNodes"] = [],
): FormDefinition {
  return {
    formType: "f1040",
    taxYear: 2025,
    registry,
    inputNodes,
  } as unknown as FormDefinition;
}

const hatch = "forms/f1040/2025/domains/general/filing/form8886/public-node.ts";
const registryFile = "forms/f1040/2025/registry.ts";

Deno.test("canonical node paths and the year's start node pass", () => {
  for (
    const path of [
      "forms/f1040/nodes/inputs/income/investments/f1099int/index.ts",
      "forms/f1040/nodes/inputs/credits/business/f3800/production-allocation-node.ts",
      "forms/f1040/nodes/intermediate/forms/credits/foreign/form1116/index.ts",
      "forms/f1040/nodes/intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts",
      "forms/f1040/nodes/intermediate/worksheets/adjustments/retirement/ira_deduction_worksheet/index.ts",
      "forms/f1040/nodes/outputs/general/return-assembly/f1040/index.ts",
      "forms/f1041/nodes/inputs/income/other/k1_beneficiary/index.ts",
      "forms/f1040/2025/return-processing/start.ts",
      "forms/f1040/2026/return-processing/start.ts",
    ]
  ) assert(nodePlacement(path).ok, path);
});

Deno.test("the TY2026 branch's flat node files and main's escape hatches fail with the expected path", () => {
  for (
    const path of [
      "forms/f1040/2026/inputs/w2.ts",
      "forms/f1040/2026/nodes/agi.ts",
      "forms/f1040/2026/source-start.ts",
      "forms/f1040/start.ts",
      hatch,
      "forms/f1040/2025/domains/income/business/form172/form172_modified_income.ts",
      "forms/f1040/nodes/config/index.ts",
      "forms/f1040/nodes/inputs/misc/w2/index.ts",
      "forms/f1040/nodes/inputs/income/w2/index.ts",
      "forms/f1040/nodes/intermediate/income/business/schedule_c/index.ts",
    ]
  ) {
    const placement = nodePlacement(path);
    assert(!placement.ok, path);
    assert(
      placement.expected.startsWith(
        "forms/f1040/nodes/<inputs|intermediate|outputs>/",
      ),
      placement.expected,
    );
  }
});

Deno.test("node sources are detected by their base class, not their file name", () => {
  assert(isNodeSource("class W2Node extends TaxNode<typeof inputSchema> {"));
  assert(!isNodeSource("export const w2 = new W2Node();"));
});

Deno.test("a registry key that is not the node type is reported, because the executor resolves by node type", () => {
  const annual = new FakeNode("f8854_annual");
  const problems = registryKeyProblems([
    definition({ f8854Annual: annual, w2: new FakeNode("w2") }),
  ]);
  assertEquals(problems.map((p) => [p.kind, p.path, p.nodeType]), [[
    "registry-key",
    registryFile,
    "f8854Annual",
  ]]);
  assert(problems[0].fix.includes("f8854_annual: f8854Annual"));
});

Deno.test("a node class on disk that no registry holds is reported with the registration fix", () => {
  const w2 = new FakeNode("w2");
  const graph = graphOf([definition({ w2 })]);
  const path = "forms/f1040/nodes/inputs/general/filing/f911/index.ts";
  const problems = unregisteredNodeProblems(
    new Map([[path, [new FakeNode("f911")]]]),
    graph,
  );
  assertEquals(problems.map((p) => [p.kind, p.path, p.nodeType]), [[
    "not-in-registry",
    path,
    "f911",
  ]]);
  assert(problems[0].fix.includes("forms/f1040/<year>/registry.ts"));
  assertEquals(unregisteredNodeProblems(new Map([[path, [w2]]]), graph), []);
});

Deno.test("a registered node is reachable when it is a CLI input or a routing target, else reported", () => {
  const leaf = new FakeNode("form6198");
  const routed = new FakeNode("schedule_e");
  const feeder = new FakeNode("k1_partnership", [routed]);
  const input = new FakeNode("w2");
  const def = definition(
    { form6198: leaf, schedule_e: routed, k1_partnership: feeder, w2: input },
    [
      { node: input, itemSchema: z.object({}), isArray: true },
      { node: feeder, itemSchema: z.object({}), isArray: true },
    ],
  );
  const problems = unreachableProblems([def], graphOf([def]));
  assertEquals(problems.map((p) => [p.kind, p.path, p.nodeType]), [[
    "unreachable",
    registryFile,
    "form6198",
  ]]);
  assert(problems[0].fix.includes("forms/f1040/2025/inputs.ts"));
});

Deno.test("a node registered under an input key counts as a CLI input", () => {
  const review = new FakeNode("form6251_prior_iso_sale_review");
  const def = definition({ form6251_prior_iso_sale_review: review }, [{
    node: review,
    inputKey: "form6251_prior_iso_sale",
    inputSchema: z.object({}),
    isArray: false,
  }]);
  assertEquals(unreachableProblems([def], graphOf([def])), []);
});

Deno.test("baseline exceptions allow a problem until they expire, and go stale once it is gone", () => {
  const raw = placementProblems([hatch]);
  const entry = {
    path: hatch,
    reason: "migrate",
    expires: "2027-01-31",
    approvedBy: "a7ul",
  };
  assertEquals(applyBaseline(raw, [], "2026-10-16").map((p) => p.kind), [
    "placement",
  ]);
  assertEquals(applyBaseline(raw, [entry], "2026-10-16"), []);
  assertEquals(
    applyBaseline(raw, [entry], "2027-02-01").map((p) => p.kind),
    ["expired-baseline"],
  );
  assertEquals(applyBaseline([], [entry], "2026-10-16").map((p) => p.kind), [
    "stale-baseline",
  ]);
});

Deno.test("a baseline entry for a registry problem is matched by path and node type", () => {
  const raw = registryKeyProblems([
    definition({ f8854Annual: new FakeNode("f8854_annual") }),
  ]);
  const entry = {
    path: registryFile,
    nodeType: "f8854Annual",
    reason: "fix the key",
    expires: "2027-01-31",
    approvedBy: "a7ul",
  };
  assertEquals(applyBaseline(raw, [entry], "2026-10-16"), []);
  assertEquals(
    applyBaseline(raw, [{ ...entry, nodeType: "other" }], "2026-10-16").map((
      p,
    ) => p.kind),
    ["registry-key", "stale-baseline"],
  );
});

Deno.test("the checkout satisfies the contract, and the baseline covers exactly main's recorded mistakes", async () => {
  const { catalog } = await import("../../catalog.ts");
  const definitions = Object.values(catalog);
  const clean = await structureReport(root, definitions, "2026-10-16");
  assertEquals(clean.problems, []);
  assert(clean.nodeFiles > 200, String(clean.nodeFiles));

  const baseline = await readBaseline(root);
  const bare = await structureReport(root, definitions, "2026-10-16", []);
  assertEquals(bare.problems.length, baseline.length);
  const keys = bare.problems
    .filter((p) => p.kind === "registry-key")
    .map((p) => p.nodeType)
    .sort();
  assertEquals(keys, [
    "f8854Annual",
    "form8995aScheduleA",
    "form8995aScheduleC",
    "form8995aScheduleD",
    "jointOccupancyStatementNode",
  ]);
});

Deno.test("dropping a CLI input that nothing routes to reproduces the silently-ignored miss on the real graph", async () => {
  const { catalog } = await import("../../catalog.ts");
  const definitions = Object.values(catalog);
  const graph = graphOf(definitions);
  const victim = definitions[0].inputNodes.find((entry) =>
    !graph.targets.has(entry.node.nodeType) &&
    definitions[0].registry[entry.node.nodeType] === entry.node
  );
  assert(victim, "an input node that is only reachable through the CLI");
  const without = definitions.map((definition) => ({
    ...definition,
    inputNodes: definition.inputNodes.filter((entry) =>
      entry.node.nodeType !== victim.node.nodeType
    ),
  }));
  const regression = await structureReport(root, without, "2026-10-16");
  assertEquals(
    regression.problems.map((p) => [p.kind, p.nodeType]),
    [["unreachable", victim.node.nodeType]],
  );
});
