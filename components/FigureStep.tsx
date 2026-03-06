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
    }))
  );

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

  const imageDataUrl = state.imageDataUrl;

  return (
    <div className="rounded-xl border border-[#1e1e2a] bg-[#111118] p-8">
      <h2 className="text-lg font-semibold text-zinc-100">Crop Figures</h2>
      <p className="mt-1 text-sm text-zinc-400">
        {figureTasks.length === 0
          ? "No figure references to crop."
          : `${figureTasks.length} figure${figureTasks.length === 1 ? "" : "s"} to crop. Select a region for each or skip.`}
      </p>
      {figureTasks.length > 0 && (
        <p className="mt-0.5 text-xs text-zinc-500">
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
              className="rounded-lg border border-[#1e1e2a] bg-[#111118] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-100">
                  {task.figureRef}
                </span>
                <span className="text-sm text-zinc-500">
                  from {task.problemLabel}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    status === "done"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : status === "skipped"
                        ? "bg-zinc-600 text-zinc-400"
                        : "bg-amber-500/20 text-amber-400"
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
                    className="max-h-[100px] rounded border border-zinc-600 object-contain"
                  />
                  {imageDataUrl && (
                    <button
                      type="button"
                      onClick={() => handleReCrop(task)}
                      className="text-sm font-medium text-blue-400 hover:text-blue-300"
                    >
                      Re-crop
                    </button>
                  )}
                </div>
              )}

              {status === "pending" && (
                <div className="mt-3 flex gap-2">
                  {imageDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCrop({
                          problemId: task.problemId,
                          figureRef: task.figureRef,
                        })
                      }
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      Crop from image
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSkip(task)}
                    className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
                  >
                    Skip
                  </button>
                </div>
              )}

              {status === "skipped" && imageDataUrl && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleCropAnyway(task)}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    Crop anyway
                  </button>
                </div>
              )}

              {isActiveCrop && imageDataUrl && (
                <div className="mt-4 rounded-lg border border-[#1e1e2a] bg-[#0f0f14] p-4">
                  <LassoCrop
                    imageDataUrl={imageDataUrl}
                    figureRef={task.figureRef}
                    onCrop={handleCropDone}
                    onCancel={() => setActiveCrop(null)}
                  />
                </div>
              )}
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
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "cursor-not-allowed bg-[#1e1e2a] text-slate-500"
          }`}
        >
          Generate PDF →
        </button>
      </div>
    </div>
  );
}
