/** The MeF PDF filename boundary shared by bundle preparation and ZIP export. */
export function isValidMefPdfFilename(fileName: string): boolean {
  const forbidden = /[\\/;|\[\]<>^`&"':?*]/;
  return fileName.length <= 64 &&
    fileName === fileName.trim() &&
    /^[\x20-\x7E]+\.pdf$/.test(fileName) &&
    !forbidden.test(fileName) &&
    !fileName.includes("..");
}
