export type GetReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
};

export type GetReturnResult = {
  readonly returnId: string;
  readonly year: number;
  readonly lines: {
    readonly line_1a: number;
  };
};

// Stub — full implementation in Task 2
export async function getReturnCommand(
  _args: GetReturnArgs,
): Promise<GetReturnResult> {
  throw new Error("not implemented");
}
