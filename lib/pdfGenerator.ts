import jsPDF from "jspdf";
import type { Problem, LayoutPreference } from "./types";

export type GenerateOptions = {
  problems: Problem[];
  layoutPreference: LayoutPreference;
};

const PAGE_W = 595; // A4 pt
const PAGE_H = 842;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BLANK_SPACE = 200; // generous blank area below each problem
const PROBLEM_GAP = 24; // space between problems

/**
 * Replace Unicode characters that jsPDF cannot render in Helvetica.
 * These cause font fallback to Courier and line-width miscalculations.
 */
function sanitizeForPDF(text: string): string {
  return text
    .replace(/•/g, "-")
    .replace(/ₓ/g, "x")
    .replace(/₀/g, "0")
    .replace(/₁/g, "1")
    .replace(/₂/g, "2")
    .replace(/₃/g, "3")
    .replace(/ₙ/g, "n")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/≈/g, "~")
    .replace(/≠/g, "!=")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/∞/g, "inf")
    .replace(/√/g, "sqrt")
    .replace(/°/g, " deg")
    .replace(/μ/g, "u")
    .replace(/Δ/g, "delta ")
    .replace(/θ/g, "theta")
    .replace(/α/g, "alpha")
    .replace(/β/g, "beta")
    .replace(/ω/g, "omega")
    .replace(/λ/g, "lambda")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x00-\x7F]/g, "?");
}

export async function generatePDF(
  options: GenerateOptions
): Promise<string> {
  const { problems, layoutPreference } = options;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = MARGIN;

  // ── Title ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text("MathExtract — Problem Set", MARGIN, y);
  y += 32;

  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 20;

  // ── Problems ───────────────────────────────────────────────────────────
  for (let i = 0; i < problems.length; i++) {
    const prob = problems[i];

    // Estimate space needed for this problem (sanitize first to avoid font fallback)
    doc.setFontSize(11);
    const sanitizedTextEarly = sanitizeForPDF(prob.text || "");
    const textLinesEarly = doc.splitTextToSize(
      sanitizedTextEarly,
      CONTENT_W - 10
    );
    const textH = textLinesEarly.length * 15;

    // Figure dimensions (if any cropped images)
    const figEntries = Object.entries(prob.figureImages || {});
    const figH = figEntries.length > 0 ? 160 : 0;

    const totalNeeded =
      24 + textH + figH + BLANK_SPACE + PROBLEM_GAP;

    // Page break if needed
    if (y + totalNeeded > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }

    // ── Problem Label ──────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(
      sanitizeForPDF(prob.label || `Problem ${i + 1}`),
      MARGIN,
      y
    );
    y += 20;

    // ── Problem Text ───────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(textLinesEarly, MARGIN, y);
    y += textH + 10;

    // ── Figures ────────────────────────────────────────────────────────
    if (figEntries.length > 0) {
      for (const [figRef, imgData] of figEntries) {
        if (!imgData) continue;

        // Figure caption
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(sanitizeForPDF(figRef), MARGIN, y);
        y += 13;

        if (layoutPreference === "beside") {
          // Two-column: text already printed, put image on right half
          const imgX = MARGIN + CONTENT_W / 2 + 10;
          const imgW = CONTENT_W / 2 - 10;
          const imgH = 150;

          // Check page space
          if (y + imgH > PAGE_H - MARGIN) {
            doc.addPage();
            y = MARGIN;
          }

          try {
            doc.addImage(
              imgData,
              "PNG",
              imgX,
              y - textH - 23,
              imgW,
              imgH
            );
          } catch {
            // Image failed silently
          }
          y += 10; // small gap after figure row
        } else {
          // Below layout: image full width below text
          const imgW = Math.min(CONTENT_W, 320);
          const imgH = 150;

          if (y + imgH > PAGE_H - MARGIN) {
            doc.addPage();
            y = MARGIN;
          }

          try {
            doc.addImage(imgData, "PNG", MARGIN, y, imgW, imgH);
            y += imgH + 10;
          } catch {
            y += 10;
          }
        }
      }
    }

    // ── Blank working area (no box, no label — just space) ─────────────────
    if (y + BLANK_SPACE > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }

    y += BLANK_SPACE + PROBLEM_GAP;

    // ── Divider between problems ───────────────────────────────────────
    if (i < problems.length - 1) {
      doc.setDrawColor(230, 230, 230);
      doc.line(MARGIN, y - 12, PAGE_W - MARGIN, y - 12);
    }
  }

  return doc.output("datauristring");
}
