import { assertEquals } from "@std/assert";
import { buildStartNode, inputNodes } from "./start.ts";

Deno.test("inputNodes has 69 entries (37 array + 32 singleton)", () => {
  const arrayEntries = inputNodes.filter((e) => e.isArray === true);
  const singletonEntries = inputNodes.filter((e) => e.isArray === false);
  assertEquals(arrayEntries.length, 37);
  assertEquals(singletonEntries.length, 32);
  assertEquals(inputNodes.length, 69);
});

Deno.test("buildStartNode returns a node with nodeType 'start'", () => {
  const startNode = buildStartNode(inputNodes);
  assertEquals(startNode.nodeType, "start");
});

Deno.test("empty input produces no outputs", () => {
  const startNode = buildStartNode(inputNodes);
  const result = startNode.compute({ taxYear: 2025 }, {});
  assertEquals(result.outputs.length, 0);
});

Deno.test("single w2 item routes to w2 node", () => {
  const startNode = buildStartNode(inputNodes);
  const w2Item = {
    box1_wages: 50000,
    box2_fed_withheld: 5000,
  };
  const result = startNode.compute({ taxYear: 2025 }, { w2: [w2Item] });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "w2");
});

Deno.test("singleton general entry routes to general node", () => {
  const startNode = buildStartNode(inputNodes);
  const generalInput = { filing_status: "single" as const };
  const result = startNode.compute({ taxYear: 2025 }, { general: generalInput });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "general");
});
