/**
 * components/VerifyStep.tsx
 *
 * Step 2: list of detected problems with view/edit modes. User can edit label/text/figures,
 * delete a problem, or add a new one. "Looks Good" dispatches SET_STEP to "figures" if any
 * problem has figure refs, else to "generating". Uses UPDATE_PROBLEM, DELETE_PROBLEM, ADD_PROBLEM.
 */

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
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Verify Detected Problems
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {count === 0
          ? "No problems detected. Add one manually or go back to upload a different image."
          : `${count} problem${count === 1 ? "" : "s"} found. Review and edit below.`}
      </p>

      <div className="mt-6 space-y-4">
        {problems.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
            <p className="text-sm">No problems in the list yet.</p>
            <p className="mt-1 text-xs">Click &quot;+ Add Problem&quot; to add one manually.</p>
          </div>
        )}

        {problems.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border-2 p-4 ${
              editingId === p.id
                ? "border-black bg-white"
                : "border-gray-200 bg-white"
            }`}
          >
            {editingId === p.id ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Label
                    </label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="e.g. Problem 1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Text
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={Math.max(3, editText.split("\n").length)}
                      className="mt-1 min-h-[80px] w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="Problem text..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Figure references
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {editFigures.map((fig) => (
                        <span
                          key={fig}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs text-gray-700"
                        >
                          {fig}
                          <button
                            type="button"
                            onClick={() => removeFigureInEdit(fig)}
                            className="ml-0.5 rounded p-0.5 text-gray-500 hover:bg-gray-300 hover:text-gray-900"
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
                          className="w-28 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                          placeholder="e.g. Fig 2.6"
                        />
                        <button
                          type="button"
                          onClick={addFigureInEdit}
                          className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
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
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-900">{p.label}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {p.text || "(No text)"}
                </p>
                {p.figures.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.figures.map((fig) => (
                      <span
                        key={fig}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs text-gray-700"
                      >
                        {fig}
                        <button
                          type="button"
                          onClick={() => removeFigure(p.id, fig)}
                          className="rounded p-0.5 text-gray-500 hover:bg-gray-300 hover:text-gray-900"
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
                    className="text-sm font-medium text-gray-900 hover:text-black"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "DELETE_PROBLEM", payload: p.id })}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
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
          className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-100"
        >
          + Add Problem
        </button>
        <button
          type="button"
          onClick={handleProceed}
          className="rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800"
        >
          Looks Good →
        </button>
      </div>
    </div>
  );
}
