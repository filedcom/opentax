import { join } from "@std/path";
import { execute } from "../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../core/runtime/planner.ts";
import { registry } from "../../nodes/2025/registry.ts";
import { buildMefXml } from "../../export/mef/builder.ts";
import { buildEngineInputs, loadInputs } from "../store/store.ts";
import type { F8949Transaction, MefFormsPending } from "../../export/mef/types.ts";

const executionPlan = buildExecutionPlan(registry);

export type ExportReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
};

function extractForm8949Transactions(
  raw: Record<string, unknown> | undefined,
): F8949Transaction[] | undefined {
  if (raw === undefined) return undefined;
  const tx = raw["transaction"];
  if (tx === undefined) return undefined;
  return (Array.isArray(tx) ? tx : [tx]) as F8949Transaction[];
}

function buildPending(result: ReturnType<typeof execute>): MefFormsPending {
  const p = result.pending;
  return {
    f1040: p["f1040"] as MefFormsPending["f1040"],
    schedule1: p["schedule1"] as MefFormsPending["schedule1"],
    schedule2: p["schedule2"] as MefFormsPending["schedule2"],
    schedule3: p["schedule3"] as MefFormsPending["schedule3"],
    schedule_d: p["schedule_d"] as MefFormsPending["schedule_d"],
    form8889: p["form8889"] as MefFormsPending["form8889"],
    form2441: p["form2441"] as MefFormsPending["form2441"],
    form8949: extractForm8949Transactions(p["form8949"]),
    form8959: p["form8959"] as MefFormsPending["form8959"],
    form8960: p["form8960"] as MefFormsPending["form8960"],
    form4137: p["form4137"] as MefFormsPending["form4137"],
    form8919: p["form8919"] as MefFormsPending["form8919"],
    form4972: p["form4972"] as MefFormsPending["form4972"],
    schedule_se: p["schedule_se"] as MefFormsPending["schedule_se"],
    form8606: p["form8606"] as MefFormsPending["form8606"],
    form_1116: p["form_1116"] as MefFormsPending["form_1116"],
    form8582: p["form8582"] as MefFormsPending["form8582"],
    schedule_f: p["schedule_f"] as MefFormsPending["schedule_f"],
    schedule_b: p["schedule_b"] as MefFormsPending["schedule_b"],
    form4797: p["form4797"] as MefFormsPending["form4797"],
    form8880: p["form8880"] as MefFormsPending["form8880"],
    form8995: p["form8995"] as MefFormsPending["form8995"],
    form4562: p["form4562"] as MefFormsPending["form4562"],
    form8995a: p["form8995a"] as MefFormsPending["form8995a"],
    form6251: p["form6251"] as MefFormsPending["form6251"],
    form5329: p["form5329"] as MefFormsPending["form5329"],
    form8853: p["form8853"] as MefFormsPending["form8853"],
    form_8829: p["form_8829"] as MefFormsPending["form_8829"],
    form8839: p["form8839"] as MefFormsPending["form8839"],
  };
}

export async function exportMefCommand(
  args: ExportReturnArgs,
): Promise<string> {
  const returnPath = join(args.baseDir, args.returnId);
  const inputs = await loadInputs(returnPath);
  const engineInputs = buildEngineInputs(inputs);
  const result = execute(executionPlan, registry, engineInputs);
  return buildMefXml(buildPending(result));
}
