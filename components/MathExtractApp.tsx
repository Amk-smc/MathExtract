/**
 * components/MathExtractApp.tsx
 *
 * Main app shell: holds global state (step, layoutPreference, imageDataUrl,
 * problems, error) via useReducer, renders the step indicator and the
 * active step (Upload, Verify, Figures, or Generate). When step is
 * "detecting", runs the detection API and transitions to verify on success.
 */

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
        layoutPreference: action.payload.layoutPreference,
        imageDataUrl: action.payload.imageDataUrl,
      };
    case "SET_LAYOUT":
      return { ...state, layoutPreference: action.payload };
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

  // Calls POST /api/detect with base64 image and mediaType; expects { text } or { error }
  const runDetection = useCallback(async () => {
    if (!state.imageDataUrl) {
      dispatch({ type: "SET_ERROR", payload: "No image found. Please upload again." });
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

      // Sanity check: avoid parsing huge payloads that could freeze the client
      if (typeof data.text !== "string" || data.text.length > 50000) {
        throw new Error("Response too large to process.");
      }

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
      const message = err instanceof Error ? err.message : "Unknown error";
      dispatch({ type: "SET_ERROR", payload: "Detection failed: " + message });
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
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
        <p className="text-sm text-gray-500">
          Analyzing your page with Gemini...
        </p>
      </div>
    );
  }

  return (
    <div className="dot-grid min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-black">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
            </svg>
          </div>
          <span className="text-sm font-bold uppercase tracking-widest text-gray-900">
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
              const currentIndex = order.indexOf(state.step);
              const thisIndex = order.indexOf(s);
              const isDone = currentIndex > thisIndex;
              const isActive =
                s === state.step ||
                (s === "upload" && state.step === "detecting");

              return (
                <div key={s} className="flex items-center">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isDone
                          ? "bg-black text-white"
                          : isActive
                            ? "border-2 border-black bg-white text-black"
                            : "border border-gray-300 bg-white text-gray-400"
                      }`}
                    >
                      {isDone ? "✓" : i + 1}
                    </div>
                    <span
                      className={`hidden text-xs font-medium sm:inline ${
                        isActive
                          ? "font-semibold text-gray-900"
                          : isDone
                            ? "text-gray-400"
                            : "text-gray-300"
                      }`}
                    >
                      {labels[s]}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`mx-2 h-px w-8 ${
                        isDone ? "bg-black" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {state.error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
