/**
 * components/LayoutStep.tsx
 *
 * Step 4: PDF layout editor. User controls:
 * - Problems per page (quick preset: 1, 2, 3, or Auto)
 * - Manual page breaks between specific problems
 * - Problem reordering via drag and drop
 * Dispatches SET_PAGE_BREAKS and REORDER_PROBLEMS before generating.
 */

"use client";

import { useState } from "react";
import type { AppState, AppAction, Problem } from "@/lib/types";
import type { Dispatch } from "react";

type LayoutStepProps = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

export function LayoutStep({ state, dispatch }: LayoutStepProps) {
  const [problems, setProblems] = useState<Problem[]>(state.problems);
  const [pageBreaks, setPageBreaks] = useState<Set<string>>(
    state.pageBreaks ?? new Set()
  );
  const [problemsPerPage, setProblemsPerPage] = useState<number>(1);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const applyPreset = (n: number) => {
    setProblemsPerPage(n);
    const newBreaks = new Set<string>();
    problems.forEach((p, i) => {
      if ((i + 1) % n === 0 && i < problems.length - 1) {
        newBreaks.add(p.id);
      }
    });
    setPageBreaks(newBreaks);
  };

  const toggleBreak = (problemId: string) => {
    setPageBreaks((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  };

  const getPages = (): Problem[][] => {
    const pages: Problem[][] = [];
    let current: Problem[] = [];
    for (const p of problems) {
      current.push(p);
      if (pageBreaks.has(p.id)) {
        pages.push(current);
        current = [];
      }
    }
    if (current.length > 0) pages.push(current);
    return pages;
  };

  const pages = getPages();

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...problems];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setProblems(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleGenerate = () => {
    dispatch({ type: "REORDER_PROBLEMS", payload: problems });
    dispatch({ type: "SET_PAGE_BREAKS", payload: pageBreaks });
    dispatch({ type: "SET_STEP", payload: "generating" });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">PDF Layout</h2>
      <p className="mt-1 text-sm text-gray-500">
        Control how problems are arranged across pages. Drag to reorder. Click
        the divider between problems to add or remove a page break.
      </p>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-gray-500">
          Problems per page
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => applyPreset(n)}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                problemsPerPage === n
                  ? "border-black bg-black text-white"
                  : "border-gray-200 text-gray-700 hover:border-gray-400"
              }`}
            >
              {n} per page
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setProblemsPerPage(0);
              setPageBreaks(new Set());
            }}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
              problemsPerPage === 0
                ? "border-black bg-black text-white"
                : "border-gray-200 text-gray-700 hover:border-gray-400"
            }`}
          >
            Auto
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Or manually click between problems below to set page breaks.
        </p>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-sm font-semibold text-gray-900">
          {pages.length}
        </span>
        <span className="text-sm text-gray-500">
          page{pages.length !== 1 ? "s" : ""} · {problems.length} problems
        </span>
      </div>

      <div className="mt-6 space-y-1">
        {problems.map((p, i) => {
          const hasBreakAfter = pageBreaks.has(p.id);
          const isLastProblem = i === problems.length - 1;
          const isDragTarget = dragOverIndex === i;

          return (
            <div key={p.id}>
              <div
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={`flex cursor-grab items-center gap-3 rounded-lg border p-3 transition active:cursor-grabbing ${
                  isDragTarget
                    ? "border-black bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex shrink-0 flex-col gap-0.5 text-gray-300">
                  <div className="h-0.5 w-4 rounded bg-current" />
                  <div className="h-0.5 w-4 rounded bg-current" />
                  <div className="h-0.5 w-4 rounded bg-current" />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {p.label}
                  </span>
                  {p.pageLabel && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                      {p.pageLabel}
                    </span>
                  )}
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {(p.text || "").substring(0, 80)}
                    {(p.text || "").length > 80 ? "..." : ""}
                  </p>
                </div>

                {p.figures.length > 0 && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {p.figures.length} fig{p.figures.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {!isLastProblem && (
                <button
                  type="button"
                  onClick={() => toggleBreak(p.id)}
                  className={`group flex w-full items-center gap-2 px-3 py-1 transition ${
                    hasBreakAfter ? "opacity-100" : "opacity-40 hover:opacity-80"
                  }`}
                  title={
                    hasBreakAfter
                      ? "Remove page break"
                      : "Add page break here"
                  }
                >
                  <div
                    className={`h-px flex-1 transition ${
                      hasBreakAfter
                        ? "bg-black"
                        : "bg-gray-200 group-hover:bg-gray-400"
                    }`}
                  />
                  <span
                    className={`shrink-0 text-xs font-medium transition ${
                      hasBreakAfter
                        ? "text-black"
                        : "text-gray-300 group-hover:text-gray-500"
                    }`}
                  >
                    {hasBreakAfter ? "✂ page break" : "+ page break"}
                  </span>
                  <div
                    className={`h-px flex-1 transition ${
                      hasBreakAfter
                        ? "bg-black"
                        : "bg-gray-200 group-hover:bg-gray-400"
                    }`}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pages.length > 1 && (
        <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-medium text-gray-500">
            Page preview
          </p>
          <div className="space-y-2">
            {pages.map((page, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-semibold text-gray-400">
                  Page {i + 1}
                </span>
                <div className="flex flex-wrap gap-1">
                  {page.map((p) => (
                    <span
                      key={p.id}
                      className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700"
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_STEP", payload: "figures" })}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Generate PDF →
        </button>
      </div>
    </div>
  );
}
