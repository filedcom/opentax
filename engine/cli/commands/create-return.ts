import { createReturn } from "../store/store.ts";

export type CreateReturnArgs = {
  readonly year: number;
  readonly baseDir: string;
};

export async function createReturnCommand(
  args: CreateReturnArgs,
): Promise<{ returnId: string }> {
  const { returnId } = await createReturn(args.year, args.baseDir);
  return { returnId };
}
