export type MetaJson = {
  readonly returnId: string;
  readonly year: number;
  readonly formType?: string; // optional for backward-compat with old return files
  readonly createdAt: string; // ISO 8601
};

export type NodeInputEntry = {
  readonly id: string; // e.g. "w2_01"
  readonly fields: Readonly<Record<string, unknown>>;
};

export type InputsJson = Record<string, NodeInputEntry[]>;

export type ReturnJson = {
  readonly meta: MetaJson;
  readonly inputs: InputsJson;
};
