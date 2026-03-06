"use client";

import { useState } from "react";
import type { AppState, AppAction, Problem } from "@/lib/types";
import type { Dispatch } from "react";

type VerifyStepProps = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

export function VerifyStep({ state, dispatch }: VerifyStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editText, setEditText] = useState("");
  const [editFigures, setEditFigures] = useState<string[]>([]);
  const [newFigureInput, setNewFigureInput] = useState("");

  const problems = state.problems;
  const count = problems.length;

  const startEditing = (p: Problem) => {
    setEditingId(p.id);
    setEditLabel(p.label);
    setEditText(p.text);
    setEditFigures([...p.figures]);
    setNewFigureInput("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setNewFigureInput("");
  };

  const saveEditing = () => {
    if (editingId === null) return;
    const updated: Problem = {
      ...problems.find((x) => x.id === editingId)!,
      label: editLabel.trim() || "Problem",
      text: editText.trim(),
      figures: editFigures.filter(Boolean),
    };
    dispatch({ type: "UPDATE_PROBLEM", payload: updated });
    setEditingId(null);
    setNewFigureInput("");
  };

  const removeFigure = (problemId: string, figureRef: string) => {
    const p = problems.find((x) => x.id === problemId);
    if (!p) return;
    dispatch({
      type: "UPDATE_PROBLEM",
      payload: {
        ...p,
        figures: p.figures.filter((f) => f !== figureRef),
      },
    });
  };

  const removeFigureInEdit = (figureRef: string) => {
    setEditFigures((prev) => prev.filter((f) => f !== figureRef));
  };

  const addFigureInEdit = () => {
    const value = newFigureInput.trim();
    if (value && !editFigures.includes(value)) {
      setEditFigures((prev) => [...prev, value]);
      setNewFigureInput("");
    }
  };

  const handleAdd = () => {
    const newProblem: Problem = {
      id: `prob_${Date.now()}`,
      label: `Problem ${problems.length + 1}`,
      text: "",
      figures: [],
      figureImages: {},
      confirmed: false,
    };
    dispatch({ type: "ADD_PROBLEM", payload: newProblem });
    setEditingId(newProblem.id);
    setEditLabel(newProblem.label);
    setEditText(newProblem.text);
    setEditFigures(newProblem.figures);
    setNewFigureInput("");
  };

  const handleProceed = () => {
    const hasFigures = problems.some((p) => p.figures.length > 0);
    dispatch({
      type: "SET_STEP",
      payload: hasFigures ? "figures" : "generating",
    });
  };

  return (
    <div className="rounded-xl border border-[#1e1e2a] bg-[#111118] p-8">
      <h2 className="text-lg font-semibold text-zinc-100">
        Verify Detected Problems
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        {count === 0
          ? "No problems detected. Add one manually or go back to upload a different image."
          : `${count} problem${count === 1 ? "" : "s"} found. Review and edit below.`}
      </p>

      <div className="mt-6 space-y-4">
        {problems.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#1e1e2a] bg-[#111118] p-8 text-center text-zinc-400">
            <p className="text-sm">No problems in the list yet.</p>
            <p className="mt-1 text-xs">Click &quot;+ Add Problem&quot; to add one manually.</p>
          </div>
        )}

        {problems.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border-2 p-4 ${
              editingId === p.id
                ? "border-indigo-500 bg-[#111118]"
                : "border-[#1e1e2a] bg-[#111118]"
            }`}
          >
            {editingId === p.id ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">
                      Label
                    </label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Problem 1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">
                      Text
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={Math.max(3, editText.split("\n").length)}
                      className="mt-1 min-h-[80px] w-full resize-y rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Problem text..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">
                      Figure references
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {editFigures.map((fig) => (
                        <span
                          key={fig}
                          className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-2.5 py-0.5 text-xs text-zinc-200"
                        >
                          {fig}
                          <button
                            type="button"
                            onClick={() => removeFigureInEdit(fig)}
                            className="ml-0.5 rounded p-0.5 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200"
                            aria-label={`Remove ${fig}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newFigureInput}
                          onChange={(e) => setNewFigureInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && (e.preventDefault(), addFigureInEdit())
                          }
                          className="w-28 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                          placeholder="e.g. Fig 2.6"
                        />
                        <button
                          type="button"
                          onClick={addFigureInEdit}
                          className="rounded bg-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-500"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={saveEditing}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold text-zinc-100">{p.label}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                  {p.text || "(No text)"}
                </p>
                {p.figures.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.figures.map((fig) => (
                      <span
                        key={fig}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-2.5 py-0.5 text-xs text-zinc-200"
                      >
                        {fig}
                        <button
                          type="button"
                          onClick={() => removeFigure(p.id, fig)}
                          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200"
                          aria-label={`Remove ${fig}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(p)}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "DELETE_PROBLEM", payload: p.id })}
                    className="text-sm font-medium text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg border-2 border-dashed border-[#1e1e2a] bg-[#111118] px-4 py-2 text-sm font-medium text-zinc-300 hover:border-indigo-500/50 hover:bg-[#1a1a24]"
        >
          + Add Problem
        </button>
        <button
          type="button"
          onClick={handleProceed}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
        >
          Looks Good →
        </button>
      </div>
    </div>
  );
}
