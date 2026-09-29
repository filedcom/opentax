/**
 * Keeps the node and input counts on opentax.filed.com in step with the engine.
 *
 * Counts the registered nodes and input types for the current 1040 form and
 * rewrites every "<n> registered nodes" and "<n> input types" on the site.
 * The Pages workflow runs this before each deploy. It can also be run locally:
 *
 *   deno run --allow-read --allow-write scripts/site-stats.ts
 */
import { registry } from "../forms/f1040/2025/registry.ts";
import { inputNodes } from "../forms/f1040/2025/inputs.ts";

const nodes = Object.keys(registry).length;
const inputs = inputNodes.length;

const pages = ["docs/index.html", "docs/build/index.html"];

// Matches "186 registered nodes" and "<b>186</b> registered nodes".
const nodePattern = /(\b|<b>)\d+(<\/b>)?(\s+registered nodes)/g;
const inputPattern = /(\b|<b>)\d+(<\/b>)?(\s+input types)/g;

for (const path of pages) {
  let html: string;
  try {
    html = await Deno.readTextFile(path);
  } catch {
    continue;
  }
  const updated = html
    .replace(nodePattern, (_m, open, close, rest) => `${open}${nodes}${close ?? ""}${rest}`)
    .replace(inputPattern, (_m, open, close, rest) => `${open}${inputs}${close ?? ""}${rest}`);
  if (updated !== html) {
    await Deno.writeTextFile(path, updated);
    console.log(`${path}: ${nodes} registered nodes, ${inputs} input types`);
  }
}
