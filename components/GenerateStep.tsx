"use client";

import { useState, useEffect } from "react";
import type { AppState, AppAction } from "@/lib/types";
import type { Dispatch } from "react";
import { generatePDF } from "@/lib/pdfGenerator";

type GenerateStepProps = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

export function GenerateStep({ state, dispatch }: GenerateStepProps) {
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Run PDF generation once when entering this step (use state at mount time only)
  useEffect(() => {
    const run = async () => {
      setGenerating(true);
      setGenError(null);
      try {
        const uri = await generatePDF({
          problems: state.problems,
          layoutPreference: state.layoutPreference,
        });
        setPdfDataUri(uri);
      } catch (err: unknown) {
        setGenError(
          err instanceof Error ? err.message : "PDF generation failed."
        );
      } finally {
        setGenerating(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with current state
  }, []);

  if (generating) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-[#1e1e2a] bg-[#111118] p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Building your PDF...</p>
      </div>
    );
  }

  if (genError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-[#1e1e2a] bg-[#111118] py-12">
        <p className="text-sm text-red-400">{genError}</p>
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "SET_STEP", payload: "figures" })
          }
          className="text-sm text-slate-400 underline hover:text-slate-200"
        >
          Go back
        </button>
      </div>
    );
  }

  const totalProblems = state.problems.length;
  const totalFigures = state.problems.reduce(
    (acc, p) => acc + Object.keys(p.figureImages || {}).length,
    0
  );

  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-[#1e1e2a] bg-[#111118] p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#818cf8"
          strokeWidth="2.5"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div className="text-center">
        <h2 className="mb-1 text-lg font-semibold text-white">PDF Ready</h2>
        <p className="text-sm text-slate-500">
          {totalProblems} problem{totalProblems !== 1 ? "s" : ""} &middot;{" "}
          {totalFigures} figure{totalFigures !== 1 ? "s" : ""} &middot; working
          space included
        </p>
      </div>

      {pdfDataUri && (
        <a
          href={pdfDataUri}
          download="mathextract-problems.pdf"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Download PDF
        </a>
      )}

      {pdfDataUri && (
        <a
          href={pdfDataUri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-300"
        >
          Preview in browser
        </a>
      )}

      <div className="mt-1 flex w-full flex-col items-center gap-2 border-t border-[#1e1e2a] pt-2">
        <button
          type="button"
          onClick={() => dispatch({ type: "RESET" })}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-[#1a1a24] hover:text-white"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12l7-7 7 7" />
          </svg>
          Extract another page
        </button>
        <p className="text-xs text-slate-700">
          Upload a new photo or PDF to generate another problem set
        </p>
      </div>
    </div>
  );
}
