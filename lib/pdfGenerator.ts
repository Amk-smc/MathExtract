/**
 * lib/pdfGenerator.ts
 *
 * Generates an A4 PDF from the problems list.
 * Layout: title → per problem (label, text, figures, working space).
 * Figures can be "below" (full width below text) or "beside" (right half, aligned to text top).
 * Page numbers added in footer. sanitizeForPDF converts Unicode → ASCII for Helvetica.
 */

import jsPDF from "jspdf";
import type { Problem, LayoutPreference } from "./types";

export type GenerateOptions = {
  problems: Problem[];
  layoutPreference: LayoutPreference;
  pageBreaks?: Set<string>; // problem IDs after which a forced page break occurs
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 30;
const BOTTOM = PAGE_H - MARGIN - FOOTER_H;

/**
 * Converts Unicode characters to ASCII equivalents that jsPDF Helvetica can render.
 * Greek: global replace without \b (word boundary fails on Unicode). Must be applied to ALL text before doc.text().
 */
function sanitizeForPDF(text: string): string {
  return text
    .replace(/β/g, "beta")
    .replace(/α/g, "alpha")
    .replace(/ω/g, "omega")
    .replace(/θ/g, "theta")
    .replace(/Δ/g, "Delta")
    .replace(/δ/g, "delta")
    .replace(/π/g, "pi")
    .replace(/μ/g, "mu")
    .replace(/λ/g, "lambda")
    .replace(/σ/g, "sigma")
    .replace(/ρ/g, "rho")
    .replace(/φ/g, "phi")
    .replace(/γ/g, "gamma")
    .replace(/ε/g, "epsilon")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/ₓ/g, "x")
    .replace(/₀/g, "0")
    .replace(/₁/g, "1")
    .replace(/₂/g, "2")
    .replace(/[•·]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/≈/g, "~")
    .replace(/≠/g, "!=")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/∞/g, "inf")
    .replace(/√/g, "sqrt")
    .replace(/°/g, " deg")
    .replace(/[^\x00-\x7F]/g, "?");
}

/** Loads image and returns natural dimensions for aspect ratio calculation. */
function getImageDimensions(
  dataUrl: string
): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

/** Adds "Page N of M" footer to every page. Call after all content is added. */
function addPageNumbers(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${total}`, PAGE_W / 2, PAGE_H - 18, {
      align: "center",
    });
  }
}

export async function generatePDF(
  options: GenerateOptions
): Promise<string> {
  const { problems, layoutPreference, pageBreaks } = options;
  const list = problems.slice(0, 100);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("MathExtract — Problem Set", MARGIN, y);
  y += 28;

  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 22;

  const LINE_H = 15;

  for (let i = 0; i < list.length; i++) {
    const prob = list[i];
    const sanitizedLabel = sanitizeForPDF(prob.label || `Problem ${i + 1}`);
    const sanitizedText = sanitizeForPDF(prob.text || "");

    doc.setFontSize(11);
    const textLines = doc.splitTextToSize(sanitizedText, CONTENT_W - 8);
    const textH = textLines.length * LINE_H;

    const figEntries = Object.entries(prob.figureImages || {}).filter(
      ([, v]) => !!v
    );

    const figH = figEntries.length > 0 ? 180 : 0;
    const contentH =
      layoutPreference === "beside"
        ? Math.max(textH, figH)
        : textH + figH;

    const subparts = (prob.text?.match(/\([a-z]\)/g) || []).length;
    const workingSpace = Math.max(180, 60 + subparts * 60);
    const totalNeeded = 26 + contentH + workingSpace + 30;

    if (y + totalNeeded > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }

    const problemStartY = y;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text(sanitizedLabel, MARGIN, y);
    y += 20;

    const textWidth =
      layoutPreference === "beside" && figEntries.length > 0
        ? CONTENT_W * 0.52
        : CONTENT_W - 8;

    const finalTextLines = doc.splitTextToSize(sanitizedText, textWidth);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(finalTextLines, MARGIN, y);
    const actualTextH = finalTextLines.length * LINE_H;
    y += actualTextH + 8;

    if (figEntries.length > 0) {
      for (const [figRef, imgData] of figEntries) {
        if (!imgData) continue;

        const caption = sanitizeForPDF(`Figure: ${figRef}`);

        if (layoutPreference === "beside") {
          const figX = MARGIN + CONTENT_W * 0.56;
          const figMaxW = CONTENT_W * 0.42;
          const figMaxH = 200;

          const dims = await getImageDimensions(imgData);
          const ratio = dims.w / dims.h;
          const dispH = Math.min(figMaxH, figMaxW / ratio);
          const dispW = dispH * ratio;
          const figY = problemStartY;

          if (figY + dispH > BOTTOM) {
            doc.addPage();
            y = MARGIN;
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(caption, MARGIN, y);
            y += 11;
            try {
              doc.addImage(
                imgData,
                "PNG",
                MARGIN,
                y,
                dispW,
                dispH,
                undefined,
                "FAST"
              );
            } catch {
              /* skip */
            }
            y += dispH + 8;
          } else {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(caption, figX, figY - 1);
            try {
              doc.addImage(
                imgData,
                "PNG",
                figX,
                figY + 10,
                dispW,
                dispH,
                undefined,
                "FAST"
              );
            } catch {
              /* skip */
            }
            y = Math.max(y, figY + 10 + dispH + 8);
          }
        } else {
          const figMaxW = CONTENT_W * 0.85;
          const figMaxH = 220;

          const dims = await getImageDimensions(imgData);
          const ratio = dims.w / dims.h;
          const dispH = Math.min(figMaxH, figMaxW / ratio);
          const dispW = dispH * ratio;

          if (y + dispH + 20 > BOTTOM) {
            doc.addPage();
            y = MARGIN;
          }

          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(caption, MARGIN, y);
          y += 11;

          try {
            doc.addImage(
              imgData,
              "PNG",
              MARGIN,
              y,
              dispW,
              dispH,
              undefined,
              "FAST"
            );
            y += dispH + 10;
          } catch {
            y += 10;
          }
        }
      }
    }

    if (y + workingSpace > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
    y += workingSpace;

    if (i < list.length - 1) {
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10);
      y += 10;
    }

    if (pageBreaks?.has(prob.id) && i < list.length - 1) {
      doc.addPage();
      y = MARGIN;
    }
  }

  addPageNumbers(doc);
  return doc.output("datauristring");
}
