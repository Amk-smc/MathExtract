"use client";

import { useReducer, useEffect, useCallback } from "react";
import type { AppState, AppAction } from "@/lib/types";
import type { Problem } from "@/lib/types";
import { UploadStep } from "./UploadStep";
import { VerifyStep } from "./VerifyStep";
import { FigureStep } from "./FigureStep";
import { GenerateStep } from "./GenerateStep";

const initialState: AppState = {
  step: "upload",
  inputType: null,
  layoutPreference: "below",
  imageDataUrl: null,
  problems: [],
  error: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_FILE":
      return {
        ...state,
        inputType: action.payload.inputType,
        layoutPreference: action.payload.layoutPreference,
        imageDataUrl: action.payload.imageDataUrl,
      };
    case "SET_INPUT_TYPE":
      return { ...state, inputType: action.payload };
    case "SET_LAYOUT":
      return { ...state, layoutPreference: action.payload };
    case "SET_IMAGE":
      return { ...state, imageDataUrl: action.payload };
    case "SET_PROBLEMS":
      return { ...state, problems: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "UPDATE_PROBLEM":
      return {
        ...state,
        problems: state.problems.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PROBLEM":
      return {
        ...state,
        problems: state.problems.filter((p) => p.id !== action.payload),
      };
    case "ADD_PROBLEM":
      return {
        ...state,
        problems: [...state.problems, action.payload],
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function MathExtractApp() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const runDetection = useCallback(async () => {
    if (!state.imageDataUrl) {
      dispatch({
        type: "SET_ERROR",
        payload: "No image found. Please upload again.",
      });
      dispatch({ type: "SET_STEP", payload: "upload" });
      return;
    }

    try {
      const [header, base64] = state.imageDataUrl.split(",");
      const mediaType = header.match(/:(.*?);/)?.[1] || "image/jpeg";

      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      const clean = data.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as Array<{
        id: string;
        label: string;
        text: string;
        figures: string[];
      }>;

      const problems: Problem[] = parsed.map((p) => ({
        ...p,
        figureImages: {},
        confirmed: false,
      }));

      dispatch({ type: "SET_PROBLEMS", payload: problems });
      dispatch({ type: "SET_STEP", payload: "verify" });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      dispatch({
        type: "SET_ERROR",
        payload: "Detection failed: " + message,
      });
      dispatch({ type: "SET_STEP", payload: "upload" });
    }
  }, [state.imageDataUrl]);

  useEffect(() => {
    if (state.step === "detecting") {
      runDetection();
    }
  }, [state.step, runDetection]);

  if (state.step === "detecting") {
    return (
      <div className="dot-grid flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-400">
          Analyzing your page with Gemini...
        </p>
      </div>
    );
  }

  return (
    <div className="dot-grid relative min-h-screen">
      <svg
        className="pointer-events-none absolute right-0 top-0 opacity-[0.06]"
        width="400"
        height="300"
        viewBox="0 0 400 300"
        fill="none"
      >
        <line x1="400" y1="0" x2="0" y2="300" stroke="#6366f1" strokeWidth="1" />
        <line x1="400" y1="40" x2="40" y2="300" stroke="#6366f1" strokeWidth="1" />
        <line x1="400" y1="80" x2="80" y2="300" stroke="#6366f1" strokeWidth="1" />
        <line x1="400" y1="120" x2="120" y2="300" stroke="#6366f1" strokeWidth="1" />
        <circle cx="400" cy="0" r="3" fill="#6366f1" />
        <circle cx="400" cy="40" r="2" fill="#6366f1" />
        <circle cx="400" cy="80" r="2" fill="#6366f1" />
      </svg>
      <svg
        className="pointer-events-none absolute bottom-0 left-0 opacity-[0.05]"
        width="300"
        height="200"
        viewBox="0 0 300 200"
        fill="none"
      >
        <line x1="0" y1="200" x2="300" y2="0" stroke="#818cf8" strokeWidth="1" />
        <line x1="0" y1="160" x2="260" y2="0" stroke="#818cf8" strokeWidth="1" />
        <circle cx="0" cy="200" r="3" fill="#818cf8" />
        <circle cx="0" cy="160" r="2" fill="#818cf8" />
      </svg>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-indigo-500/40 bg-indigo-500/10">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
            >
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
            </svg>
          </div>
          <span className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            MathExtract
          </span>
        </div>

        {state.step !== "generating" && (
          <div className="mb-8 flex items-center gap-0">
            {(["upload", "verify", "figures"] as const).map((s, i) => {
              const labels = {
                upload: "Upload",
                verify: "Verify",
                figures: "Figures",
              };
              const order = ["upload", "detecting", "verify", "figures"];
              const currentOrder = order.indexOf(state.step);
              const thisOrder = order.indexOf(s);
              const isDone = currentOrder > thisOrder;
              const isActive =
                s === state.step ||
                (s === "upload" && state.step === "detecting");

              return (
                <div key={s} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isDone
                          ? "bg-indigo-500 text-white"
                          : isActive
                            ? "border border-indigo-500 bg-indigo-500/20 text-indigo-400"
                            : "border border-[#1e1e2a] bg-[#111118] text-slate-600"
                      }`}
                    >
                      {isDone ? "✓" : i + 1}
                    </div>
                    <span
                      className={`hidden text-xs font-medium transition-all sm:inline ${
                        isActive
                          ? "text-slate-200"
                          : isDone
                            ? "text-slate-500"
                            : "text-slate-600"
                      }`}
                    >
                      {labels[s]}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`mx-2 h-px w-8 ${
                        currentOrder > thisOrder
                          ? "bg-indigo-500/50"
                          : "bg-[#1e1e2a]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {state.error && (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-950/80 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        )}

        <main>
          {state.step === "upload" && (
            <UploadStep state={state} dispatch={dispatch} />
          )}
          {state.step === "verify" && (
            <VerifyStep state={state} dispatch={dispatch} />
          )}
          {state.step === "figures" && (
            <FigureStep state={state} dispatch={dispatch} />
          )}
          {state.step === "generating" && (
            <GenerateStep state={state} dispatch={dispatch} />
          )}
        </main>
      </div>
    </div>
  );
}
