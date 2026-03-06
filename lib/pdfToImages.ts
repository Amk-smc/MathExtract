/**
 * lib/pdfToImages.ts
 *
 * Converts a PDF file to an array of page image data URLs using pdf.js.
 * Each page is rendered to a canvas at 2x scale for sharpness, then
 * exported as JPEG. Returns one dataUrl per page.
 */

export type PdfPagePreview = {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
};

export async function pdfToPageImages(
  file: File,
  maxPages = 20
): Promise<PdfPagePreview[]> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const totalPages = Math.min(pdf.numPages, maxPages);
  const previews: PdfPagePreview[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    previews.push({
      pageNumber: pageNum,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return previews;
}
