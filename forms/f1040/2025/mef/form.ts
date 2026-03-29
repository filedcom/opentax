import type { MefFormsPending } from "./types.ts";

export abstract class MefNode {
  abstract readonly pdfUrl: string;
  abstract build(pending: MefFormsPending): string;
}
