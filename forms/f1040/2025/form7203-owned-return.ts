import { isDeepStrictEqual } from "node:util";

/** Required copies are source-driven; deleting both projections cannot erase
 * the owned shareholder's basis limitation and qualified-loss workpaper. */
export function assertOwned7203RequiredCopies(
  pending: Readonly<Record<string, unknown>>,
): void {
  const k = pending.k1_s_corp as
    | { k1_s_corps?: Record<string, unknown>[] }
    | undefined;
  const owned =
    k?.k1_s_corps?.filter((s) =>
      (s.form7203_debt_evidence as Record<string, unknown> | undefined)
        ?.owned_current_records !== undefined
    ) ?? [];
  if (!owned.length) return;
  const basis = pending.form7203 as Record<string, unknown> | undefined;
  const qbi = pending.form8995 as Record<string, unknown> | undefined;
  if (
    owned.length !== 1 || k!.k1_s_corps!.length !== 1 || !basis || !qbi ||
    !isDeepStrictEqual(qbi.owned_s_corp_loss_source, owned[0]) ||
    !isDeepStrictEqual(
      basis.reviewed_debt_evidence,
      owned[0].form7203_debt_evidence,
    )
  ) {
    throw Error(
      "Owned shareholder direct-debt source requires both actual Form7203 and basis-limited Form8995 loss/carry copies",
    );
  }
}
