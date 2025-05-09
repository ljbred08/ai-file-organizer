import { extractText, getDocumentProxy } from "unpdf";
import { readFile } from "fs/promises";

export async function GetTextFromPDF(filePath: string): Promise<string> {
  const buffer = await readFile(filePath); // returns a Buffer
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  // `text` is a string containing all text from the PDF, merged across pages
  return text;
}