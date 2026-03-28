export const JPEG_QUALITY = 85;

export class PageMd {
  readonly type = "md" as const;
  constructor(readonly pageNumber: number, readonly content: string) {}
}

export class PageJpg {
  readonly type = "jpg" as const;
  constructor(readonly pageNumber: number, readonly jpeg: Uint8Array) {}
}

export type Page = PageMd | PageJpg;

export class ParsedDocument {
  constructor(readonly sourcePath: string, readonly pages: readonly Page[]) {}
}
