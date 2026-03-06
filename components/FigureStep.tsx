/**
 * components/FigureStep.tsx
 *
 * Step 3: flat list of all figure refs from all problems. Each can be cropped (opens LassoCrop),
 * skipped, or re-cropped. Dispatches UPDATE_PROBLEM to store cropped image in problem.figureImages.
 * "Generate PDF" dispatches SET_STEP to "generating" when all figures are done or skipped.
 */

"use client";

import { useState } from "react";
import type { AppState, AppAction, Problem } from "@/lib/types";
import type { Dispatch } from "react";
import { LassoCrop } from "./LassoCrop";

type FigureStepProps = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

type FigureTask = {
  problemId: string;
  problemLabel: string;
  figureRef: string;
  pageId: string | null;
  pageLabel: string | null;
};

function taskKey(task: FigureTask): string {
  return `${task.problemId}__${task.figureRef}`;
}

export function FigureStep({ state, dispatch }: FigureStepProps) {
  const [activeCrop, setActiveCrop] = useState<{
    problemId: string;
    figureRef: string;
  } | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const figureTasks: FigureTask[] = state.problems.flatMap((p) =>
    p.figures.map((fig) => ({
      problemId: p.id,
      problemLabel: p.label,
      figureRef: fig,
      pageId: p.pageId ?? null,
      pageLabel: p.pageLabel ?? null,
    }))
  );

  const getImageForTask = (pageId: string | null): string | null => {
    if (!pageId) return state.imageDataUrl;
    const page = state.pages.find((p) => p.id === pageId);
    return page?.dataUrl ?? state.imageDataUrl;
  };

  const getStatus = (
    task: FigureTask
  ): "done" | "skipped" | "pending" => {
    const key = taskKey(task);
    const problem = state.problems.find((p) => p.id === task.problemId);
    if (problem?.figureImages?.[task.figureRef]) return "done";
    if (skipped.has(key)) return "skipped";
    return "pending";
  };

  const doneCount = figureTasks.filter((t) => getStatus(t) === "done").length;
  const allResolved = figureTasks.every((t) => getStatus(t) !== "pending");

  const handleCropDone = (base64DataUrl: string) => {
    if (!activeCrop) return;
    const { problemId, figureRef } = activeCrop;
    const problem = state.problems.find((p) => p.id === problemId);
    if (!problem) return;
    dispatch({
      type: "UPDATE_PROBLEM",
      payload: {
        ...problem,
        figureImages: { ...problem.figureImages, [figureRef]: base64DataUrl },
      },
    });
    setActiveCrop(null);
  };

  const handleSkip = (task: FigureTask) => {
    setSkipped((prev) => new Set(prev).add(taskKey(task)));
  };

  const handleCropAnyway = (task: FigureTask) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      next.delete(taskKey(task));
      return next;
    });
    setActiveCrop({ problemId: task.problemId, figureRef: task.figureRef });
  };

  const handleReCrop = (task: FigureTask) => {
    setActiveCrop({ problemId: task.problemId, figureRef: task.figureRef });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Crop Figures</h2>
      <p className="mt-1 text-sm text-gray-500">
        {figureTasks.length === 0
          ? "No figure references to crop."
          : `${figureTasks.length} figure${figureTasks.length === 1 ? "" : "s"} to crop. Select a region for each or skip.`}
      </p>
      {figureTasks.length > 0 && (
        <p className="mt-0.5 text-xs text-gray-500">
          {doneCount} of {figureTasks.length} figures cropped
        </p>
      )}

      <div className="mt-6 space-y-4">
        {figureTasks.map((task) => {
          const status = getStatus(task);
          const key = taskKey(task);
          const problem = state.problems.find((p) => p.id === task.problemId);
          const thumbnailUrl = problem?.figureImages?.[task.figureRef];
          const isActiveCrop =
            activeCrop?.problemId === task.problemId &&
            activeCrop?.figureRef === task.figureRef;

          return (
            <div
              key={key}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {task.figureRef}
                </span>
                {task.problemLabel && (
                  <span className="text-sm text-gray-500">
                    from {task.problemLabel}
                  </span>
                )}
                {task.pageLabel && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                    {task.pageLabel}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    status === "done"
                      ? "bg-green-100 text-green-700"
                      : status === "skipped"
                        ? "bg-gray-200 text-gray-600"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {status === "done"
                    ? "✓ Cropped"
                    : status === "skipped"
                      ? "Skipped"
                      : "Pending"}
                </span>
              </div>

              {status === "done" && thumbnailUrl && (
                <div className="mt-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl}
                    alt={task.figureRef}
                    className="max-h-[100px] rounded border border-gray-200 object-contain"
                  />
                  {getImageForTask(task.pageId) && (
                    <button
                      type="button"
                      onClick={() => handleReCrop(task)}
                      className="text-sm font-medium text-gray-900 hover:text-black"
                    >
                      Re-crop
                    </button>
                  )}
                </div>
              )}

              {status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveCrop({
                        problemId: task.problemId,
                        figureRef: task.figureRef,
                      })
                    }
                    className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Crop from image
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSkip(task)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Skip
                  </button>
                </div>
              )}

              {status === "skipped" && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleCropAnyway(task)}
                    className="text-sm font-medium text-gray-900 hover:text-black"
                  >
                    Crop anyway
                  </button>
                </div>
              )}

              {isActiveCrop &&
                (getImageForTask(task.pageId) ? (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <LassoCrop
                      imageDataUrl={getImageForTask(task.pageId)!}
                      figureRef={task.figureRef}
                      onCrop={handleCropDone}
                      onCancel={() => setActiveCrop(null)}
                    />
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Source image not available for this page. Please skip this
                    figure.
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "SET_STEP", payload: "generating" })
          }
          disabled={!allResolved}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
            allResolved
              ? "bg-black text-white hover:bg-gray-800"
              : "cursor-not-allowed bg-gray-200 text-gray-400"
          }`}
        >
          Generate PDF →
        </button>
      </div>
    </div>
  );
}
