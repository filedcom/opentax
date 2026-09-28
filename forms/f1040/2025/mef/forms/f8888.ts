import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { inputSchema } from "../../../nodes/inputs/f8888/index.ts";
import { reconcileForm8888 } from "../../form8888_reconciliation.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = z.input<typeof inputSchema> | readonly [];

function buildIRS8888(raw: Input, context?: MefBuildContext): string {
  if (Array.isArray(raw) && raw.length === 0) return "";
  const source = reconcileForm8888(raw, context?.filer, context?.pending);
  const accounts = [source.account_1, source.account_2, source.account_3]
    .filter((account) => account !== undefined);
  return elements("IRS8888", [
    ...accounts.map((account) =>
      elements("DirectDepositInfoGroup", [
        element("DirectDepositRefundAmt", account.amount),
        element("RoutingTransitNum", account.routing_number),
        element(
          "BankAccountTypeCd",
          account.account_type === "checking" ? "1" : "2",
        ),
        element("DepositorAccountNum", account.account_number),
      ])
    ),
    element("TotalAllocationOfRefundAmt", source.total_allocation),
  ]);
}

export const form8888: MefFormDescriptor<"f8888", Input> = {
  pendingKey: "f8888",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8888--2025.pdf",
  build: buildIRS8888,
};
