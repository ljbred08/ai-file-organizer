import { readFile } from "fs/promises";
import { fileTypeFromBuffer } from "file-type/core";
import mime from "mime-types";
import WordExtractor from "word-extractor";
import { GetTextFromPDF } from './pdfExport';
// import textract from "@nosferatu500/textract"; // Removed textract import
import path from "path";

export async function universalFileReader(filePath: string): Promise<{ buffer: Buffer, modality: string | null }> {
  const buffer = await readFile(filePath);
  if (buffer.length === 0) {
    console.warn("File is empty:", filePath);
    return { buffer, modality: null };
  }
  const fileType = await fileTypeFromBuffer(buffer);
  const mimeType = fileType?.mime || mime.lookup(filePath);

  let modality: string | null = null;
  let outBuffer = buffer;

  try {
    if (!mimeType) {
      console.error("Unknown file type for file:", filePath);
      outBuffer = Buffer.from(path.basename(filePath));
      modality = "text";
    } else if (mimeType && mimeType.startsWith("text/")) {
      outBuffer = Buffer.from(await readFile(filePath, "utf8"));
      modality = "text";
    } else if (mimeType === "application/pdf") {
      const text = await GetTextFromPDF(filePath);
      outBuffer = Buffer.from(text);
      modality = "text";
    } else if (
      mimeType === "application/msword" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(filePath);
      outBuffer = Buffer.from(doc.getBody());
      modality = "text";
    // } else if (mimeType.startsWith("image/")) {
      // modality = "vision";
    } else {
      outBuffer = Buffer.from(path.basename(filePath));
      modality = "text";
    }
  } catch (err) {
    console.error("Error extracting file:", filePath, err);
    outBuffer = Buffer.from(path.basename(filePath));
    modality = "text";
  }

  return { buffer: outBuffer, modality };
}