export type NodeContext = {
  readonly taxYear: number;
  /** The form type this node belongs to, e.g. "f1040", "f1120". */
  readonly formType: string;
};
