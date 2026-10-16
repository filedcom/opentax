/** Bun file imports (`with { type: "file" }`) resolve to a readable path. */
declare module "*.pdf" {
  const path: string;
  export default path;
}
