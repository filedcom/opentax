import type { Form8990Workpaper } from "../../forms/f1040/2025/form8990_projection.ts";

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
  readonly form8990CalculatedWorkpaper?: {
    readonly recordVersion: 1;
    readonly status: "calculated-unfiled";
    readonly returnId: string;
    readonly taxpayerSsn: string;
    readonly sourceRecordsSha256: string;
    readonly form8990Line31: number;
    readonly workpaper: Form8990Workpaper;
  };
};

export type Form8990CalculatedWorkpaperRecord = NonNullable<
  ReturnJson["form8990CalculatedWorkpaper"]
>;
