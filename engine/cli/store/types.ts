export type MetaJson = {
  readonly returnId: string;
  readonly year: number;
  readonly createdAt: string; // ISO 8601
};

export type InputEntry = {
  readonly id: string;        // e.g. "w2_01"
  readonly nodeType: string;  // e.g. "w2"
  readonly data: Readonly<Record<string, unknown>>;
};
